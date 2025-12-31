use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectInfo {
    pub path: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
}

/// Read a file's contents
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file {}: {}", path, e))
}

/// List files and directories in a path
#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory {}: {}", path, e))?;

    let mut files = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to get metadata: {}", e))?;
        let path_buf = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        files.push(FileInfo {
            name,
            path: path_buf.to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
        });
    }

    // Sort: directories first, then files
    files.sort_by(|a, b| {
        if a.is_directory == b.is_directory {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_directory {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(files)
}

/// Load a game.json file and return its contents
#[tauri::command]
pub async fn load_game_spec(project_path: String) -> Result<String, String> {
    let game_json_path = PathBuf::from(&project_path).join("game.json");

    if !game_json_path.exists() {
        return Err(format!("game.json not found in {}", project_path));
    }

    fs::read_to_string(&game_json_path)
        .map_err(|e| format!("Failed to read game.json: {}", e))
}

/// Check if a path exists
#[tauri::command]
pub async fn path_exists(path: String) -> Result<bool, String> {
    Ok(PathBuf::from(path).exists())
}
