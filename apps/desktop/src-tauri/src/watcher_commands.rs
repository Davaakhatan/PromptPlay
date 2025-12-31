use crate::file_watcher::{start_watching, stop_watching, FileWatcherState};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, State};

/// Start watching a directory for file changes
#[tauri::command]
pub async fn start_file_watcher(
    app_handle: AppHandle,
    path: String,
    state: State<'_, Mutex<FileWatcherState>>,
) -> Result<(), String> {
    let mut watcher_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    // Stop existing watcher if any
    stop_watching(&mut watcher_state.watcher);

    // Start new watcher
    let path_buf = PathBuf::from(&path);
    let watcher = start_watching(app_handle, path_buf.clone())?;

    watcher_state.watcher = Some(watcher);
    watcher_state.watched_path = Some(path_buf);

    Ok(())
}

/// Stop watching the current directory
#[tauri::command]
pub async fn stop_file_watcher(state: State<'_, Mutex<FileWatcherState>>) -> Result<(), String> {
    let mut watcher_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    stop_watching(&mut watcher_state.watcher);
    watcher_state.watched_path = None;

    Ok(())
}

/// Get the currently watched path
#[tauri::command]
pub async fn get_watched_path(
    state: State<'_, Mutex<FileWatcherState>>,
) -> Result<Option<String>, String> {
    let watcher_state = state.lock().map_err(|e| format!("Lock error: {}", e))?;

    Ok(watcher_state
        .watched_path
        .as_ref()
        .map(|p| p.to_string_lossy().to_string()))
}
