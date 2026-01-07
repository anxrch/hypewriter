use font_kit::source::SystemSource;
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct FontInfo {
    pub family: String,
    pub full_name: String,
    pub path: String,
}

#[tauri::command]
fn get_system_fonts() -> Result<Vec<FontInfo>, String> {
    let source = SystemSource::new();
    let families = source.all_families().map_err(|e| e.to_string())?;

    let mut fonts: Vec<FontInfo> = Vec::new();
    let mut seen_families: std::collections::HashSet<String> = std::collections::HashSet::new();

    for family in families {
        // Skip duplicates
        if seen_families.contains(&family) {
            continue;
        }
        seen_families.insert(family.clone());

        // Try to get the font handle for path info
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

    // Sort by family name
    fonts.sort_by(|a, b| a.family.to_lowercase().cmp(&b.family.to_lowercase()));

    Ok(fonts)
}

#[tauri::command]
fn read_project_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_project_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_system_fonts,
            read_project_file,
            write_project_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
