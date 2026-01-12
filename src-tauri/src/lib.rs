use font_kit::source::SystemSource;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::path::PathBuf;

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

impl HypewriterWorld {
    fn new(content: String, font_path: Option<&str>) -> Self {
        let (fonts, primary_font_name) = Self::load_fonts(font_path);
        let book = FontBook::from_fonts(&fonts);
        
        Self {
            library: LazyHash::new(Library::builder().build()),
            book: LazyHash::new(book),
            source: Source::detached(content),
            fonts,
            primary_font_name,
        }
    }
    
    fn load_fonts(primary_font_path: Option<&str>) -> (Vec<Font>, Option<String>) {
        let mut fonts = Vec::new();
        let mut primary_font_name = None;
        
        // 선택된 폰트를 먼저 로드
        if let Some(path) = primary_font_path {
            if !path.is_empty() && std::path::Path::new(path).exists() {
                if let Ok(data) = fs::read(path) {
                    let buffer = Bytes::from(data);
                    for font in Font::iter(buffer) {
                        if primary_font_name.is_none() {
                            // 첫 번째 폰트의 이름을 저장
                            primary_font_name = font.info().family.clone().into();
                        }
                        fonts.push(font);
                    }
                }
            }
        }
        
        // Windows 폰트 디렉토리
        let font_dirs = vec![
            PathBuf::from(r"C:\Windows\Fonts"),
            dirs::font_dir().unwrap_or_default(),
        ];
        
        for font_dir in &font_dirs {
            if !font_dir.exists() {
                continue;
            }
            
            if let Ok(entries) = fs::read_dir(font_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                    
                    if ext.eq_ignore_ascii_case("ttf") || ext.eq_ignore_ascii_case("otf") || ext.eq_ignore_ascii_case("ttc") {
                        if let Ok(data) = fs::read(&path) {
                            let buffer = Bytes::from(data);
                            for font in Font::iter(buffer) {
                                fonts.push(font);
                            }
                        }
                    }
                }
            }
        }
        
        (fonts, primary_font_name)
    }
    
    fn get_primary_font_name(&self) -> &str {
        self.primary_font_name.as_deref().unwrap_or("Malgun Gothic")
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
  font: ("{}", "Malgun Gothic", "NanumGothic", "Noto Sans CJK KR"),
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
    // 폰트 경로를 전달하여 World 생성
    let font_path = content.font_path.as_deref();
    let world = HypewriterWorld::new(String::new(), font_path);
    
    // 실제 로드된 폰트 이름 가져오기
    let primary_font = world.get_primary_font_name().to_string();
    
    // Typst 마크업 생성
    let typst_content = generate_typst_markup(&content, &primary_font);
    
    // 새 World 생성 (마크업 포함)
    let world = HypewriterWorld::new(typst_content, font_path);
    
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
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
