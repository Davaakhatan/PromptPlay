use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub struct FileWatcherState {
    pub watcher: Option<RecommendedWatcher>,
    pub watched_path: Option<PathBuf>,
}

impl Default for FileWatcherState {
    fn default() -> Self {
        Self {
            watcher: None,
            watched_path: None,
        }
    }
}

/// Start watching a directory for file changes
pub fn start_watching(
    app_handle: AppHandle,
    path: PathBuf,
) -> Result<RecommendedWatcher, String> {
    let (tx, rx) = channel();

    let app_handle_clone = app_handle.clone();

    // Create watcher with debounce
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                // Send event to channel
                let _ = tx.send(event);
            }
        },
        Config::default()
            .with_poll_interval(Duration::from_millis(500))
            .with_compare_contents(false),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    // Start watching the path
    watcher
        .watch(&path, RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to watch path: {}", e))?;

    // Spawn a thread to handle events
    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() {
            // Filter out non-modify events
            if !matches!(
                event.kind,
                notify::EventKind::Modify(_) | notify::EventKind::Create(_)
            ) {
                continue;
            }

            // Get the changed file path
            if let Some(path) = event.paths.first() {
                let path_str = path.to_string_lossy().to_string();

                // Ignore hidden files, temp files, and directories
                if path_str.contains("/.")
                    || path_str.ends_with('~')
                    || path_str.ends_with(".tmp")
                    || path.is_dir()
                {
                    continue;
                }

                // Emit event to frontend
                let _ = app_handle_clone.emit("file-changed", path_str);
            }
        }
    });

    Ok(watcher)
}

/// Stop watching the current directory
pub fn stop_watching(watcher: &mut Option<RecommendedWatcher>) {
    if let Some(w) = watcher.take() {
        drop(w);
    }
}
