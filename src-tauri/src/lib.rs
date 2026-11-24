use font_kit::source::SystemSource;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::path::{Path, PathBuf};

// DOCX
use docx_rs::*;

// Typst
use typst::diag::{FileError, FileResult};
use typst::foundations::{Bytes, Datetime};
use typst::syntax::{FileId, Source};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, World};

#[derive(Debug, Serialize, Deserialize)]
pub struct FontInfo {
    pub family: String,
    pub full_name: String,
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct ExportContent {
    pub title: String,
    pub author: String,
    pub chapters: Vec<ChapterContent>,
    pub font_family: Option<String>,
    pub font_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ChapterContent {
    pub title: String,
    pub content: String,
    pub footnotes: Vec<FootnoteContent>,
}

#[derive(Debug, Deserialize)]
pub struct FootnoteContent {
    pub marker: String,
    pub content: String,
}

// ============ Typst World Implementation ============

struct HypewriterWorld {
    library: LazyHash<Library>,
    book: LazyHash<FontBook>,
    source: Source,
    fonts: Vec<Font>,
    primary_font_name: Option<String>,
}

// 앱에 동봉한 기본 본문 글꼴. 화면(@font-face)과 같은 Pretendard를 PDF에도 보장한다.
// Typst 0.12는 woff2를 못 읽으므로 정적 OTF를 내장한다.
const BUNDLED_FONT_FAMILY: &str = "Pretendard";
static BUNDLED_FONTS: &[&[u8]] = &[
    include_bytes!("../fonts/Pretendard-Regular.otf"),
    include_bytes!("../fonts/Pretendard-Bold.otf"),
];

impl HypewriterWorld {
    /// 글꼴을 한 번만 모아 World를 만든다. 본문 마크업은 `with_source`로 나중에 넣는다.
    fn new(font_path: Option<&str>, font_family: Option<&str>) -> Self {
        let (fonts, loaded_name) = Self::load_fonts(font_path);
        let book = FontBook::from_fonts(&fonts);

        // 우선순위: 경로로 직접 읽은 글꼴의 실제 이름 → 사용자가 고른 이름 → 내장 Pretendard
        let primary_font_name = loaded_name.or_else(|| {
            font_family
                .map(str::trim)
                .filter(|f| !f.is_empty())
                .map(str::to_string)
        });

        Self {
            library: LazyHash::new(Library::builder().build()),
            book: LazyHash::new(book),
            source: Source::detached(String::new()),
            fonts,
            primary_font_name,
        }
    }

    fn with_source(mut self, content: String) -> Self {
        self.source = Source::detached(content);
        self
    }

    fn push_font_file(fonts: &mut Vec<Font>, path: &Path) {
        if let Ok(data) = fs::read(path) {
            fonts.extend(Font::iter(Bytes::from(data)));
        }
    }

    /// 글꼴 디렉터리를 하위 폴더까지 훑는다. 리눅스는 /usr/share/fonts/noto-cjk/,
    /// ~/.local/share/fonts/<vendor>/<family>/ 처럼 거의 모든 글꼴이 하위 폴더에 있다.
    fn collect_font_dir(fonts: &mut Vec<Font>, dir: &Path, depth: usize) {
        const MAX_DEPTH: usize = 8;
        let Ok(entries) = fs::read_dir(dir) else { return };
        for entry in entries.flatten() {
            let path = entry.path();
            // 심볼릭 링크 순환을 피하려고 링크를 따라간 디렉터리는 내려가지 않는다
            let Ok(file_type) = entry.file_type() else { continue };
            if file_type.is_dir() {
                if depth < MAX_DEPTH {
                    Self::collect_font_dir(fonts, &path, depth + 1);
                }
                continue;
            }
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ["ttf", "otf", "ttc", "otc"].iter().any(|e| ext.eq_ignore_ascii_case(e)) {
                Self::push_font_file(fonts, &path);
            }
        }
    }

    fn load_fonts(primary_font_path: Option<&str>) -> (Vec<Font>, Option<String>) {
        let mut fonts = Vec::new();
        let mut primary_font_name = None;

        // 선택된 폰트를 먼저 로드
        if let Some(path) = primary_font_path.filter(|p| !p.is_empty()) {
            let before = fonts.len();
            Self::push_font_file(&mut fonts, Path::new(path));
            primary_font_name = fonts.get(before).map(|f| f.info().family.clone());
        }

        // 플랫폼별 시스템 폰트 디렉토리 + 사용자 폰트 디렉토리
        let mut font_dirs: Vec<PathBuf> = Vec::new();
        #[cfg(target_os = "windows")]
        font_dirs.push(PathBuf::from(r"C:\Windows\Fonts"));
        #[cfg(target_os = "macos")]
        {
            font_dirs.push(PathBuf::from("/System/Library/Fonts"));
            font_dirs.push(PathBuf::from("/Library/Fonts"));
        }
        #[cfg(target_os = "linux")]
        {
            font_dirs.push(PathBuf::from("/usr/share/fonts"));
            font_dirs.push(PathBuf::from("/usr/local/share/fonts"));
        }
        if let Some(d) = dirs::font_dir() {
            font_dirs.push(d);
        }
        // Windows 사용자별 설치 글꼴
        #[cfg(target_os = "windows")]
        if let Some(d) = dirs::data_local_dir() {
            font_dirs.push(d.join(r"Microsoft\Windows\Fonts"));
        }
        for font_dir in &font_dirs {
            Self::collect_font_dir(&mut fonts, font_dir, 0);
        }

        // 내장 글꼴은 맨 뒤에: 시스템에 같은 이름이 설치돼 있으면 그쪽이 먼저 잡힌다
        for data in BUNDLED_FONTS {
            fonts.extend(Font::iter(Bytes::from_static(data)));
        }

        (fonts, primary_font_name)
    }

    fn get_primary_font_name(&self) -> &str {
        self.primary_font_name.as_deref().unwrap_or(BUNDLED_FONT_FAMILY)
    }
}

impl World for HypewriterWorld {
    fn library(&self) -> &LazyHash<Library> {
        &self.library
    }
    
    fn book(&self) -> &LazyHash<FontBook> {
        &self.book
    }
    
    fn main(&self) -> FileId {
        self.source.id()
    }
    
    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.source.id() {
            Ok(self.source.clone())
        } else {
            Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
        }
    }
    
    fn file(&self, id: FileId) -> FileResult<Bytes> {
        Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
    }
    
    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }
    
    fn today(&self, _offset: Option<i64>) -> Option<Datetime> {
        let now = chrono::Local::now();
        Datetime::from_ymd(
            now.format("%Y").to_string().parse().ok()?,
            now.format("%m").to_string().parse().ok()?,
            now.format("%d").to_string().parse().ok()?,
        )
    }
}

// ============ Font Discovery ============

#[tauri::command]
fn get_system_fonts() -> Result<Vec<FontInfo>, String> {
    let source = SystemSource::new();
    let families = source.all_families().map_err(|e| e.to_string())?;

    let mut fonts: Vec<FontInfo> = Vec::new();
    let mut seen_families: std::collections::HashSet<String> = std::collections::HashSet::new();

    for family in families {
        if seen_families.contains(&family) {
            continue;
        }
        seen_families.insert(family.clone());

        let path = match source.select_family_by_name(&family) {
            Ok(handle) => {
                if let Some(font) = handle.fonts().first() {
                    match font {
                        font_kit::handle::Handle::Path { path, .. } => {
                            path.to_string_lossy().to_string()
                        }
                        _ => String::new(),
                    }
                } else {
                    String::new()
                }
            }
            Err(_) => String::new(),
        };

        fonts.push(FontInfo {
            family: family.clone(),
            full_name: family,
            path,
        });
    }

    fonts.sort_by(|a, b| a.family.to_lowercase().cmp(&b.family.to_lowercase()));

    Ok(fonts)
}

// ============ File Operations ============

#[tauri::command]
fn read_project_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_project_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

// ============ DOCX Export ============

#[tauri::command]
fn export_to_docx(path: String, content: ExportContent) -> Result<(), String> {
    let mut docx = Docx::new();

    docx = docx.add_paragraph(
        Paragraph::new()
            .add_run(Run::new().add_text(&content.title).size(48).bold())
            .align(AlignmentType::Center),
    );

    if !content.author.is_empty() {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(&content.author).size(24))
                .align(AlignmentType::Center),
        );
    }

    docx = docx.add_paragraph(Paragraph::new());

    for chapter in &content.chapters {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(&chapter.title).size(36).bold()),
        );

        for line in chapter.content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                docx = docx.add_paragraph(Paragraph::new());
            } else {
                docx = docx.add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(trimmed).size(22))
                        .align(AlignmentType::Both),
                );
            }
        }

        if !chapter.footnotes.is_empty() {
            docx = docx.add_paragraph(Paragraph::new());
            docx = docx.add_paragraph(
                Paragraph::new().add_run(Run::new().add_text("───────────").size(20)),
            );

            for footnote in &chapter.footnotes {
                docx = docx.add_paragraph(
                    Paragraph::new().add_run(
                        Run::new()
                            .add_text(&format!("{}) {}", footnote.marker, footnote.content))
                            .size(18),
                    ),
                );
            }
        }

        docx = docx.add_paragraph(Paragraph::new().page_break_before(true));
    }

    let file = File::create(&path).map_err(|e| format!("Failed to create file: {}", e))?;
    docx.build()
        .pack(file)
        .map_err(|e| format!("Failed to write DOCX: {}", e))?;

    Ok(())
}

// ============ PDF Export with Typst ============

fn escape_typst(text: &str) -> String {
    text.replace("\\", "\\\\")
        .replace("#", "\\#")
        .replace("$", "\\$")
        .replace("@", "\\@")
        .replace("<", "\\<")
        .replace(">", "\\>")
        .replace("[", "\\[")
        .replace("]", "\\]")
        .replace("*", "\\*")
        .replace("_", "\\_")
        .replace("`", "\\`")
}

fn generate_typst_markup(content: &ExportContent, primary_font: &str) -> String {
    let mut markup = String::new();
    
    markup.push_str(&format!(r#"
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 3cm),
)

#set text(
  font: ("{}", "Pretendard", "Malgun Gothic", "NanumGothic", "Noto Sans CJK KR"),
  size: 11pt,
  lang: "ko",
)

#set par(
  justify: true,
  leading: 0.9em,
  first-line-indent: 1em,
)

#show heading.where(level: 1): it => {{
  pagebreak(weak: true)
  set text(size: 18pt, weight: "bold")
  set par(first-line-indent: 0pt)
  v(1em)
  it
  v(0.5em)
}}

#show heading.where(level: 2): it => {{
  set text(size: 14pt, weight: "bold")
  set par(first-line-indent: 0pt)
  v(0.8em)
  it
  v(0.3em)
}}

"#, primary_font));

    markup.push_str(&format!(r#"
#align(center)[
  #v(30%)
  #text(size: 28pt, weight: "bold")[{}]
  #v(1em)
  #text(size: 14pt)[{}]
  #v(40%)
]

#pagebreak()

"#, escape_typst(&content.title), escape_typst(&content.author)));

    for chapter in &content.chapters {
        markup.push_str(&format!("= {}\n\n", escape_typst(&chapter.title)));
        
        for line in chapter.content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                markup.push_str("\n");
            } else {
                markup.push_str(&escape_typst(trimmed));
                markup.push_str("\n\n");
            }
        }
        
        if !chapter.footnotes.is_empty() {
            markup.push_str("\n#v(1em)\n#line(length: 30%, stroke: 0.5pt)\n#v(0.5em)\n\n");
            markup.push_str("#set text(size: 9pt)\n");
            markup.push_str("#set par(first-line-indent: 0pt, hanging-indent: 1.5em)\n\n");
            
            for footnote in &chapter.footnotes {
                markup.push_str(&format!(
                    "{}) {}\n\n",
                    escape_typst(&footnote.marker),
                    escape_typst(&footnote.content)
                ));
            }
            
            markup.push_str("#set text(size: 11pt)\n");
            markup.push_str("#set par(first-line-indent: 1em, hanging-indent: 0pt)\n");
        }
        
        markup.push_str("\n");
    }
    
    markup
}

#[tauri::command]
fn export_to_pdf(path: String, content: ExportContent) -> Result<(), String> {
    // 글꼴을 한 번만 모은 뒤, 실제로 잡힌 본문 글꼴 이름으로 마크업을 만든다
    let world = HypewriterWorld::new(content.font_path.as_deref(), content.font_family.as_deref());
    let primary_font = world.get_primary_font_name().to_string();
    let typst_content = generate_typst_markup(&content, &primary_font);
    let world = world.with_source(typst_content);
    
    let result = typst::compile(&world);
    
    let document = result.output.map_err(|errors| {
        let error_msgs: Vec<String> = errors
            .iter()
            .map(|e| e.message.to_string())
            .collect();
        format!("Typst compilation error: {}", error_msgs.join(", "))
    })?;
    
    let pdf_bytes = typst_pdf::pdf(&document, &typst_pdf::PdfOptions::default())
        .map_err(|errors| {
            format!("PDF generation error: {:?}", errors)
        })?;
    
    fs::write(&path, pdf_bytes).map_err(|e| format!("Failed to write PDF: {}", e))?;
    
    Ok(())
}

// ============ Tauri Entry Point ============

/// AppImage는 ubuntu-22.04의 옛 GTK·librsvg를 묶어 가는데, 이것들이 사용자 시스템의 최신 아이콘 테마와
/// 맞지 않아 창 제목줄 버튼이 깨진다(breeze는 대각선 잔상, Adwaita 51은 아이콘을 못 찾음).
/// 옛 GTK는 symbolic SVG를 그릴 때 잔상이 생기므로, 창 버튼 아이콘만 symbolic PNG로 든 작은 테마
/// (HypewriterAppImage, 나머지는 Adwaita·hicolor에서 물려받음)를 넣고 AppImage로 실행될 때 그 테마를 쓴다.
/// 테마 파일은 tauri.conf.json의 bundle.linux.appimage.files로 들어가고, scripts/appimage-icons.sh로 만든다.
#[cfg(target_os = "linux")]
fn use_bundled_icon_theme_in_appimage() {
    use gtk::prelude::GtkSettingsExt;

    if std::env::var_os("APPIMAGE").is_none() {
        return;
    }
    if let Some(settings) = gtk::Settings::default() {
        settings.set_gtk_icon_theme_name(Some("HypewriterAppImage"));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            #[cfg(target_os = "linux")]
            use_bundled_icon_theme_in_appimage();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_fonts,
            read_project_file,
            write_project_file,
            export_to_docx,
            export_to_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
