use font_kit::source::SystemSource;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufWriter, Read};

// DOCX
use docx_rs::*;

// PDF
use printpdf::*;

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

fn find_fallback_font_path() -> Option<String> {
    let source = SystemSource::new();
    
    let fallback_fonts = [
        "Malgun Gothic",
        "맑은 고딕", 
        "NanumGothic",
        "나눔고딕",
        "Noto Sans KR",
        "Pretendard",
    ];
    
    for fallback in fallback_fonts {
        if let Ok(handle) = source.select_family_by_name(fallback) {
            if let Some(font) = handle.fonts().first() {
                if let font_kit::handle::Handle::Path { path, .. } = font {
                    let path_str = path.to_string_lossy().to_string();
                    let lower = path_str.to_lowercase();
                    if lower.ends_with(".ttf") || lower.ends_with(".otf") {
                        return Some(path_str);
                    }
                }
            }
        }
    }
    
    let windows_fonts = [
        r"C:\Windows\Fonts\malgun.ttf",
        r"C:\Windows\Fonts\NanumGothic.ttf",
    ];
    
    for font_path in windows_fonts {
        if std::path::Path::new(font_path).exists() {
            return Some(font_path.to_string());
        }
    }
    
    None
}

fn is_valid_font_path(path: &str) -> bool {
    if path.is_empty() {
        return false;
    }
    let lower = path.to_lowercase();
    let has_valid_ext = lower.ends_with(".ttf") || lower.ends_with(".otf");
    let exists = std::path::Path::new(path).exists();
    has_valid_ext && exists
}

#[tauri::command]
fn read_project_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_project_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn export_to_docx(path: String, content: ExportContent) -> Result<(), String> {
    let mut docx = Docx::new();

    // Title
    docx = docx.add_paragraph(
        Paragraph::new()
            .add_run(
                Run::new()
                    .add_text(&content.title)
                    .size(48)
                    .bold()
            )
            .align(AlignmentType::Center)
    );

    // Author
    if !content.author.is_empty() {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(
                    Run::new()
                        .add_text(&content.author)
                        .size(24)
                )
                .align(AlignmentType::Center)
        );
    }

    docx = docx.add_paragraph(Paragraph::new());

    // Chapters
    for chapter in &content.chapters {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(
                    Run::new()
                        .add_text(&chapter.title)
                        .size(36)
                        .bold()
                )
        );

        for line in chapter.content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                docx = docx.add_paragraph(Paragraph::new());
            } else {
                docx = docx.add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(trimmed).size(22))
                );
            }
        }

        if !chapter.footnotes.is_empty() {
            docx = docx.add_paragraph(Paragraph::new());
            docx = docx.add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text("───────────").size(20))
            );

            for footnote in &chapter.footnotes {
                docx = docx.add_paragraph(
                    Paragraph::new()
                        .add_run(
                            Run::new()
                                .add_text(&format!("{} {}", footnote.marker, footnote.content))
                                .size(18)
                        )
                );
            }
        }

        docx = docx.add_paragraph(
            Paragraph::new().page_break_before(true)
        );
    }

    let file = File::create(&path).map_err(|e| format!("Failed to create file: {}", e))?;
    docx.build()
        .pack(file)
        .map_err(|e| format!("Failed to write DOCX: {}", e))?;

    Ok(())
}

#[tauri::command]
fn export_to_pdf(path: String, content: ExportContent) -> Result<(), String> {
    // A4 size: 210mm x 297mm
    let page_width = 210.0;
    let page_height = 297.0;
    
    // 여백 설정 (좌우 균형)
    let margin_left = 30.0;   // 왼쪽 여백
    let margin_right = 30.0;  // 오른쪽 여백
    let margin_top = 27.0;    // 위쪽 여백 (페이지 상단에서 시작 위치)
    let margin_bottom = 25.0; // 아래쪽 여백
    
    // 텍스트 영역 너비: 210 - 30 - 30 = 150mm
    let text_width = page_width - margin_left - margin_right;
    
    let (doc, page1, layer1) = PdfDocument::new(
        &content.title,
        Mm(page_width),
        Mm(page_height),
        "Layer 1",
    );

    let font_path = content.font_path
        .as_ref()
        .filter(|p| is_valid_font_path(p))
        .cloned()
        .or_else(find_fallback_font_path);

    let (font, font_bold) = if let Some(ref fp) = font_path {
        let mut font_file = File::open(fp)
            .map_err(|e| format!("Failed to open font file '{}': {}", fp, e))?;
        let mut font_data = Vec::new();
        font_file.read_to_end(&mut font_data)
            .map_err(|e| format!("Failed to read font file: {}", e))?;
        
        let font = doc.add_external_font(&*font_data)
            .map_err(|e| format!("Failed to add font: {}", e))?;
        
        (font.clone(), font)
    } else {
        let font = doc.add_builtin_font(BuiltinFont::Helvetica)
            .map_err(|e| format!("Failed to add font: {}", e))?;
        let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)
            .map_err(|e| format!("Failed to add bold font: {}", e))?;
        (font, font_bold)
    };

    let mut current_layer = doc.get_page(page1).get_layer(layer1);
    let mut y_position = page_height - margin_top; // 위에서부터 시작
    let line_height = 6.0;

    let add_new_page = |doc: &PdfDocumentReference| -> PdfLayerReference {
        let (page, layer) = doc.add_page(Mm(page_width), Mm(page_height), "Layer 1");
        doc.get_page(page).get_layer(layer)
    };

    // 한글 기준 한 줄에 들어갈 수 있는 대략적인 글자 수 (11pt 기준, 150mm 너비)
    // 한글 한 글자 ≈ 3.5~4mm, 150mm / 3.8mm ≈ 39자
    let max_chars = 38;

    // Title (중앙 정렬)
    let title_x = margin_left + (text_width / 2.0) - ((content.title.chars().count() as f32 * 6.0) / 2.0);
    current_layer.use_text(&content.title, 24.0, Mm(title_x.max(margin_left)), Mm(y_position), &font_bold);
    y_position -= 15.0;

    // Author (중앙 정렬)
    if !content.author.is_empty() {
        let author_x = margin_left + (text_width / 2.0) - ((content.author.chars().count() as f32 * 3.0) / 2.0);
        current_layer.use_text(&content.author, 12.0, Mm(author_x.max(margin_left)), Mm(y_position), &font);
        y_position -= 10.0;
    }

    y_position -= 15.0;

    // Chapters
    for chapter in &content.chapters {
        if y_position < margin_bottom + 30.0 {
            current_layer = add_new_page(&doc);
            y_position = page_height - margin_top;
        }

        // Chapter title
        current_layer.use_text(&chapter.title, 16.0, Mm(margin_left), Mm(y_position), &font_bold);
        y_position -= 12.0;

        for line in chapter.content.lines() {
            let trimmed = line.trim();
            
            if y_position < margin_bottom {
                current_layer = add_new_page(&doc);
                y_position = page_height - margin_top;
            }

            if trimmed.is_empty() {
                y_position -= line_height / 2.0;
            } else {
                let mut remaining = trimmed;
                
                while !remaining.is_empty() {
                    if y_position < margin_bottom {
                        current_layer = add_new_page(&doc);
                        y_position = page_height - margin_top;
                    }

                    let (chunk, rest) = if remaining.chars().count() <= max_chars {
                        (remaining, "")
                    } else {
                        let char_indices: Vec<_> = remaining.char_indices().collect();
                        let mut split_at = max_chars;
                        
                        // 단어 경계에서 줄바꿈
                        for i in (0..max_chars.min(char_indices.len())).rev() {
                            if let Some((_, c)) = char_indices.get(i) {
                                if *c == ' ' || *c == ',' || *c == '.' || *c == '。' || *c == '，' || *c == '!' || *c == '?' {
                                    split_at = i + 1;
                                    break;
                                }
                            }
                        }
                        
                        if split_at < char_indices.len() {
                            let byte_idx = char_indices[split_at].0;
                            (&remaining[..byte_idx], &remaining[byte_idx..])
                        } else {
                            (remaining, "")
                        }
                    };

                    current_layer.use_text(chunk.trim(), 11.0, Mm(margin_left), Mm(y_position), &font);
                    y_position -= line_height;
                    remaining = rest.trim();
                }
            }
        }

        // Footnotes
        if !chapter.footnotes.is_empty() {
            y_position -= 8.0;
            
            if y_position < margin_bottom + 20.0 {
                current_layer = add_new_page(&doc);
                y_position = page_height - margin_top;
            }

            current_layer.use_text("─────────────────", 10.0, Mm(margin_left), Mm(y_position), &font);
            y_position -= line_height;

            for footnote in &chapter.footnotes {
                if y_position < margin_bottom {
                    current_layer = add_new_page(&doc);
                    y_position = page_height - margin_top;
                }

                let footnote_text = format!("{} {}", footnote.marker, footnote.content);
                current_layer.use_text(&footnote_text, 9.0, Mm(margin_left), Mm(y_position), &font);
                y_position -= line_height * 0.9;
            }
        }

        y_position -= 20.0;
    }

    doc.save(&mut BufWriter::new(
        File::create(&path).map_err(|e| format!("Failed to create PDF: {}", e))?
    )).map_err(|e| format!("Failed to save PDF: {}", e))?;

    Ok(())
}

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
