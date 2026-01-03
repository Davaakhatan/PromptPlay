// Prevents additional console window on Windows in release builds
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_client;
mod commands;
mod file_watcher;
mod watcher_commands;

use ai_client::AIClientState;
use file_watcher::FileWatcherState;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(FileWatcherState::default()))
        .manage(AIClientState::default())
        .setup(|app| {
            // ==================== FILE MENU ====================
            let new_project = MenuItem::with_id(app, "new_project", "New Project", true, Some("CmdOrCtrl+Shift+N"))?;
            let open_project = MenuItem::with_id(app, "open_project", "Open Project...", true, Some("CmdOrCtrl+O"))?;
            let close_project = MenuItem::with_id(app, "close_project", "Close Project", true, Some("CmdOrCtrl+W"))?;
            let save = MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?;
            let save_as = MenuItem::with_id(app, "save_as", "Save As...", true, Some("CmdOrCtrl+Shift+S"))?;
            let import_game = MenuItem::with_id(app, "import_game", "Import Game...", true, Some("CmdOrCtrl+I"))?;
            let export_html = MenuItem::with_id(app, "export_html", "Export as HTML...", true, Some("CmdOrCtrl+E"))?;
            let export_zip = MenuItem::with_id(app, "export_zip", "Export as ZIP...", true, None::<&str>)?;
            let publish = MenuItem::with_id(app, "publish", "Publish to Gallery...", true, Some("CmdOrCtrl+Shift+P"))?;

            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &new_project,
                    &open_project,
                    &close_project,
                    &PredefinedMenuItem::separator(app)?,
                    &save,
                    &save_as,
                    &PredefinedMenuItem::separator(app)?,
                    &import_game,
                    &export_html,
                    &export_zip,
                    &PredefinedMenuItem::separator(app)?,
                    &publish,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, Some("Close Window"))?,
                ],
            )?;

            // ==================== EDIT MENU ====================
            let undo = MenuItem::with_id(app, "undo", "Undo", true, Some("CmdOrCtrl+Z"))?;
            let redo = MenuItem::with_id(app, "redo", "Redo", true, Some("CmdOrCtrl+Shift+Z"))?;
            let duplicate = MenuItem::with_id(app, "duplicate", "Duplicate Entity", true, Some("CmdOrCtrl+D"))?;
            let delete = MenuItem::with_id(app, "delete", "Delete Entity", true, Some("Backspace"))?;
            let select_all_entities = MenuItem::with_id(app, "select_all_entities", "Select All Entities", true, Some("CmdOrCtrl+A"))?;
            let deselect_all = MenuItem::with_id(app, "deselect_all", "Deselect All", true, Some("Escape"))?;
            let preferences = MenuItem::with_id(app, "preferences", "Preferences...", true, Some("CmdOrCtrl+,"))?;

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &undo,
                    &redo,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, Some("Cut"))?,
                    &PredefinedMenuItem::copy(app, Some("Copy"))?,
                    &PredefinedMenuItem::paste(app, Some("Paste"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &select_all_entities,
                    &deselect_all,
                    &duplicate,
                    &delete,
                    &PredefinedMenuItem::separator(app)?,
                    &preferences,
                ],
            )?;

            // ==================== VIEW MENU ====================
            let toggle_grid = MenuItem::with_id(app, "toggle_grid", "Toggle Grid", true, Some("G"))?;
            let toggle_debug = MenuItem::with_id(app, "toggle_debug", "Toggle Physics Debug", true, Some("P"))?;
            let toggle_2d_3d = MenuItem::with_id(app, "toggle_2d_3d", "Switch 2D/3D Mode", true, Some("CmdOrCtrl+Shift+M"))?;
            let zoom_in = MenuItem::with_id(app, "zoom_in", "Zoom In", true, Some("CmdOrCtrl+="))?;
            let zoom_out = MenuItem::with_id(app, "zoom_out", "Zoom Out", true, Some("CmdOrCtrl+-"))?;
            let zoom_reset = MenuItem::with_id(app, "zoom_reset", "Reset Zoom", true, Some("CmdOrCtrl+0"))?;
            let fit_view = MenuItem::with_id(app, "fit_view", "Fit All in View", true, Some("F"))?;
            let show_scene_tree = MenuItem::with_id(app, "show_scene_tree", "Scene Tree", true, Some("CmdOrCtrl+1"))?;
            let show_inspector = MenuItem::with_id(app, "show_inspector", "Inspector", true, Some("CmdOrCtrl+2"))?;
            let show_assets = MenuItem::with_id(app, "show_assets", "Asset Browser", true, Some("CmdOrCtrl+3"))?;
            let show_animation = MenuItem::with_id(app, "show_animation", "Animation Editor", true, Some("CmdOrCtrl+4"))?;
            let show_code = MenuItem::with_id(app, "show_code", "Code Editor", true, Some("CmdOrCtrl+5"))?;
            let show_ai = MenuItem::with_id(app, "show_ai", "AI Assistant", true, Some("CmdOrCtrl+J"))?;

            let view_menu = Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &toggle_grid,
                    &toggle_debug,
                    &PredefinedMenuItem::separator(app)?,
                    &toggle_2d_3d,
                    &PredefinedMenuItem::separator(app)?,
                    &zoom_in,
                    &zoom_out,
                    &zoom_reset,
                    &fit_view,
                    &PredefinedMenuItem::separator(app)?,
                    &show_scene_tree,
                    &show_inspector,
                    &show_assets,
                    &show_animation,
                    &show_code,
                    &show_ai,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::fullscreen(app, Some("Toggle Fullscreen"))?,
                ],
            )?;

            // ==================== GAME MENU ====================
            let play_game = MenuItem::with_id(app, "play_game", "Play", true, Some("CmdOrCtrl+Return"))?;
            let stop_game = MenuItem::with_id(app, "stop_game", "Stop", true, Some("CmdOrCtrl+."))?;
            let restart_game = MenuItem::with_id(app, "restart_game", "Restart", true, Some("CmdOrCtrl+R"))?;
            let ai_playtest = MenuItem::with_id(app, "ai_playtest", "AI Playtest...", true, None::<&str>)?;
            let game_settings = MenuItem::with_id(app, "game_settings", "Game Settings...", true, None::<&str>)?;

            let game_menu = Submenu::with_items(
                app,
                "Game",
                true,
                &[
                    &play_game,
                    &stop_game,
                    &restart_game,
                    &PredefinedMenuItem::separator(app)?,
                    &ai_playtest,
                    &PredefinedMenuItem::separator(app)?,
                    &game_settings,
                ],
            )?;

            // ==================== WINDOW MENU ====================
            let community_gallery = MenuItem::with_id(app, "community_gallery", "Community Gallery", true, None::<&str>)?;
            let marketplace = MenuItem::with_id(app, "marketplace", "Asset Marketplace", true, None::<&str>)?;

            let window_menu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, Some("Minimize"))?,
                    &PredefinedMenuItem::maximize(app, Some("Zoom"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &community_gallery,
                    &marketplace,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, Some("Close"))?,
                ],
            )?;

            // ==================== HELP MENU ====================
            let getting_started = MenuItem::with_id(app, "getting_started", "Getting Started", true, None::<&str>)?;
            let keyboard_shortcuts = MenuItem::with_id(app, "keyboard_shortcuts", "Keyboard Shortcuts", true, Some("CmdOrCtrl+/"))?;
            let documentation = MenuItem::with_id(app, "documentation", "Documentation", true, None::<&str>)?;
            let report_issue = MenuItem::with_id(app, "report_issue", "Report Issue...", true, None::<&str>)?;
            let about = MenuItem::with_id(app, "about", "About PromptPlay", true, None::<&str>)?;

            let help_menu = Submenu::with_items(
                app,
                "Help",
                true,
                &[
                    &getting_started,
                    &keyboard_shortcuts,
                    &documentation,
                    &PredefinedMenuItem::separator(app)?,
                    &report_issue,
                    &PredefinedMenuItem::separator(app)?,
                    &about,
                ],
            )?;

            // Build the menu
            let menu = Menu::with_items(
                app,
                &[
                    &Submenu::with_items(
                        app,
                        "PromptPlay",
                        true,
                        &[
                            &PredefinedMenuItem::about(app, Some("About PromptPlay"), None)?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::services(app, Some("Services"))?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::hide(app, Some("Hide PromptPlay"))?,
                            &PredefinedMenuItem::hide_others(app, Some("Hide Others"))?,
                            &PredefinedMenuItem::show_all(app, Some("Show All"))?,
                            &PredefinedMenuItem::separator(app)?,
                            &PredefinedMenuItem::quit(app, Some("Quit PromptPlay"))?,
                        ],
                    )?,
                    &file_menu,
                    &edit_menu,
                    &view_menu,
                    &game_menu,
                    &window_menu,
                    &help_menu,
                ],
            )?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(|app, event| {
                let window = app.get_webview_window("main").unwrap();
                match event.id().as_ref() {
                    // File menu
                    "new_project" => { let _ = window.emit("menu-event", "new_project"); }
                    "open_project" => { let _ = window.emit("menu-event", "open_project"); }
                    "close_project" => { let _ = window.emit("menu-event", "close_project"); }
                    "save" => { let _ = window.emit("menu-event", "save"); }
                    "save_as" => { let _ = window.emit("menu-event", "save_as"); }
                    "import_game" => { let _ = window.emit("menu-event", "import_game"); }
                    "export_html" => { let _ = window.emit("menu-event", "export_html"); }
                    "export_zip" => { let _ = window.emit("menu-event", "export_zip"); }
                    "publish" => { let _ = window.emit("menu-event", "publish"); }
                    // Edit menu
                    "undo" => { let _ = window.emit("menu-event", "undo"); }
                    "redo" => { let _ = window.emit("menu-event", "redo"); }
                    "duplicate" => { let _ = window.emit("menu-event", "duplicate"); }
                    "delete" => { let _ = window.emit("menu-event", "delete"); }
                    "select_all_entities" => { let _ = window.emit("menu-event", "select_all_entities"); }
                    "deselect_all" => { let _ = window.emit("menu-event", "deselect_all"); }
                    "preferences" => { let _ = window.emit("menu-event", "preferences"); }
                    // View menu
                    "toggle_grid" => { let _ = window.emit("menu-event", "toggle_grid"); }
                    "toggle_debug" => { let _ = window.emit("menu-event", "toggle_debug"); }
                    "toggle_2d_3d" => { let _ = window.emit("menu-event", "toggle_2d_3d"); }
                    "zoom_in" => { let _ = window.emit("menu-event", "zoom_in"); }
                    "zoom_out" => { let _ = window.emit("menu-event", "zoom_out"); }
                    "zoom_reset" => { let _ = window.emit("menu-event", "zoom_reset"); }
                    "fit_view" => { let _ = window.emit("menu-event", "fit_view"); }
                    "show_scene_tree" => { let _ = window.emit("menu-event", "show_scene_tree"); }
                    "show_inspector" => { let _ = window.emit("menu-event", "show_inspector"); }
                    "show_assets" => { let _ = window.emit("menu-event", "show_assets"); }
                    "show_animation" => { let _ = window.emit("menu-event", "show_animation"); }
                    "show_code" => { let _ = window.emit("menu-event", "show_code"); }
                    "show_ai" => { let _ = window.emit("menu-event", "show_ai"); }
                    // Game menu
                    "play_game" => { let _ = window.emit("menu-event", "play_game"); }
                    "stop_game" => { let _ = window.emit("menu-event", "stop_game"); }
                    "restart_game" => { let _ = window.emit("menu-event", "restart_game"); }
                    "ai_playtest" => { let _ = window.emit("menu-event", "ai_playtest"); }
                    "game_settings" => { let _ = window.emit("menu-event", "game_settings"); }
                    // Window menu
                    "community_gallery" => { let _ = window.emit("menu-event", "community_gallery"); }
                    "marketplace" => { let _ = window.emit("menu-event", "marketplace"); }
                    // Help menu
                    "getting_started" => { let _ = window.emit("menu-event", "getting_started"); }
                    "keyboard_shortcuts" => { let _ = window.emit("menu-event", "keyboard_shortcuts"); }
                    "documentation" => { let _ = window.emit("menu-event", "documentation"); }
                    "report_issue" => { let _ = window.emit("menu-event", "report_issue"); }
                    "about" => { let _ = window.emit("menu-event", "about"); }
                    _ => {}
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::write_file,
            commands::list_directory,
            commands::load_game_spec,
            commands::path_exists,
            commands::create_directory,
            commands::export_game_html,
            commands::read_binary_file,
            commands::write_binary_file,
            commands::delete_path,
            commands::get_file_info,
            watcher_commands::start_file_watcher,
            watcher_commands::stop_file_watcher,
            watcher_commands::get_watched_path,
            ai_client::ai_send_message,
            ai_client::ai_set_api_key,
            ai_client::ai_check_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
