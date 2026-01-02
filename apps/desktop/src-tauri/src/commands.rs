use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
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

/// Create a directory (and all parent directories)
#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create directory {}: {}", path, e))
}

/// Export game as a standalone HTML file
#[tauri::command]
pub async fn export_game_html(
    game_spec_json: String,
    output_path: String,
    game_title: String,
) -> Result<(), String> {
    let html_content = generate_standalone_html(&game_spec_json, &game_title);
    fs::write(&output_path, html_content)
        .map_err(|e| format!("Failed to write export file {}: {}", output_path, e))
}

/// Read a binary file and return as base64
#[tauri::command]
pub async fn read_binary_file(path: String) -> Result<Vec<u8>, String> {
    let mut file = fs::File::open(&path)
        .map_err(|e| format!("Failed to open file {}: {}", path, e))?;

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))?;

    Ok(buffer)
}

/// Write binary data to a file
#[tauri::command]
pub async fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    // Ensure parent directory exists
    if let Some(parent) = PathBuf::from(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }

    let mut file = fs::File::create(&path)
        .map_err(|e| format!("Failed to create file {}: {}", path, e))?;

    file.write_all(&data)
        .map_err(|e| format!("Failed to write file {}: {}", path, e))?;

    Ok(())
}

/// Delete a file or empty directory
#[tauri::command]
pub async fn delete_path(path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if path_buf.is_dir() {
        fs::remove_dir_all(&path)
            .map_err(|e| format!("Failed to delete directory {}: {}", path, e))?;
    } else {
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to delete file {}: {}", path, e))?;
    }

    Ok(())
}

/// Get file metadata (size, modification time, etc.)
#[tauri::command]
pub async fn get_file_info(path: String) -> Result<FileMetadata, String> {
    let metadata = fs::metadata(&path)
        .map_err(|e| format!("Failed to get metadata for {}: {}", path, e))?;

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    Ok(FileMetadata {
        size: metadata.len(),
        is_file: metadata.is_file(),
        is_directory: metadata.is_dir(),
        readonly: metadata.permissions().readonly(),
        modified,
    })
}

#[derive(Debug, Serialize)]
pub struct FileMetadata {
    pub size: u64,
    pub is_file: bool,
    pub is_directory: bool,
    pub readonly: bool,
    pub modified: u64,
}

fn generate_standalone_html(game_spec_json: &str, title: &str) -> String {
    format!(r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: #1a1a2e;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }}
        #game-container {{
            position: relative;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }}
        canvas {{ display: block; }}
        .controls {{
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.3s;
        }}
        #game-container:hover .controls {{ opacity: 1; }}
        .controls button {{
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            background: rgba(255,255,255,0.9);
            color: #333;
            font-size: 14px;
            cursor: pointer;
        }}
        .controls button:hover {{ background: #fff; }}
        .game-title {{
            position: absolute;
            top: 10px;
            left: 10px;
            color: white;
            font-size: 14px;
            font-weight: 600;
            opacity: 0.7;
        }}
        .credits {{
            position: fixed;
            bottom: 10px;
            right: 10px;
            color: rgba(255,255,255,0.4);
            font-size: 12px;
        }}
        .credits a {{ color: rgba(255,255,255,0.6); text-decoration: none; }}
    </style>
</head>
<body>
    <div id="game-container">
        <div class="game-title">{title}</div>
        <canvas id="game-canvas" width="800" height="600"></canvas>
        <div class="controls">
            <button id="play-btn">Play</button>
            <button id="reset-btn">Reset</button>
        </div>
    </div>
    <div class="credits">Made with <a href="https://promptplay.dev" target="_blank">PromptPlay</a></div>

    <script id="game-spec" type="application/json">{game_spec}</script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
    <script type="module">
        const gameSpec = JSON.parse(document.getElementById('game-spec').textContent);

        class GameRuntime {{
            constructor(canvas, spec) {{
                this.canvas = canvas;
                this.ctx = canvas.getContext('2d');
                this.spec = spec;
                this.entities = [];
                this.isPlaying = false;
                this.keys = new Map();
                this.lastTime = 0;
                this.engine = Matter.Engine.create({{ gravity: {{ x: spec.config.gravity.x, y: spec.config.gravity.y }} }});
                this.bodies = new Map();
                this.setupInput();
                this.loadEntities();
            }}

            setupInput() {{
                window.addEventListener('keydown', (e) => this.keys.set(e.code, true));
                window.addEventListener('keyup', (e) => this.keys.set(e.code, false));
            }}

            loadEntities() {{
                this.entities = [];
                this.bodies.clear();
                Matter.Composite.clear(this.engine.world);

                for (const es of this.spec.entities) {{
                    const e = {{
                        name: es.name,
                        x: es.components.transform?.x || 0,
                        y: es.components.transform?.y || 0,
                        rotation: es.components.transform?.rotation || 0,
                        width: es.components.sprite?.width || 32,
                        height: es.components.sprite?.height || 32,
                        color: '#' + (es.components.sprite?.tint || 0x808080).toString(16).padStart(6, '0'),
                        hasInput: !!es.components.input,
                        moveSpeed: es.components.input?.moveSpeed || 200,
                        jumpForce: es.components.input?.jumpForce || -400,
                        tags: es.tags || [],
                        isGrounded: false
                    }};

                    if (es.components.collider) {{
                        const isStatic = !es.components.velocity && !es.components.input;
                        const body = Matter.Bodies.rectangle(e.x, e.y,
                            es.components.collider.width || e.width,
                            es.components.collider.height || e.height,
                            {{ isStatic, label: es.name }});
                        Matter.Composite.add(this.engine.world, body);
                        this.bodies.set(es.name, body);
                    }}
                    this.entities.push(e);
                }}

                Matter.Events.on(this.engine, 'collisionStart', (ev) => {{
                    for (const p of ev.pairs) {{
                        const a = this.entities.find(e => e.name === p.bodyA.label);
                        const b = this.entities.find(e => e.name === p.bodyB.label);
                        if (a?.hasInput && (b?.tags?.includes('ground') || b?.tags?.includes('platform'))) a.isGrounded = true;
                        if (b?.hasInput && (a?.tags?.includes('ground') || a?.tags?.includes('platform'))) b.isGrounded = true;
                    }}
                }});

                Matter.Events.on(this.engine, 'collisionEnd', (ev) => {{
                    for (const p of ev.pairs) {{
                        const a = this.entities.find(e => e.name === p.bodyA.label);
                        const b = this.entities.find(e => e.name === p.bodyB.label);
                        if (a?.hasInput && (b?.tags?.includes('ground') || b?.tags?.includes('platform'))) a.isGrounded = false;
                        if (b?.hasInput && (a?.tags?.includes('ground') || a?.tags?.includes('platform'))) b.isGrounded = false;
                    }}
                }});
            }}

            start() {{ this.isPlaying = true; this.lastTime = performance.now(); this.loop(); }}
            pause() {{ this.isPlaying = false; }}
            reset() {{ this.loadEntities(); }}

            loop() {{
                if (!this.isPlaying) return;
                const now = performance.now();
                const dt = Math.min((now - this.lastTime) / 1000, 0.1);
                this.lastTime = now;
                this.update(dt);
                this.render();
                requestAnimationFrame(() => this.loop());
            }}

            update(dt) {{
                for (const e of this.entities) {{
                    if (!e.hasInput) continue;
                    const body = this.bodies.get(e.name);
                    if (!body) continue;
                    let vx = 0;
                    if (this.keys.get('ArrowLeft') || this.keys.get('KeyA')) vx = -e.moveSpeed;
                    if (this.keys.get('ArrowRight') || this.keys.get('KeyD')) vx = e.moveSpeed;
                    Matter.Body.setVelocity(body, {{ x: vx * 0.01, y: body.velocity.y }});
                    if ((this.keys.get('Space') || this.keys.get('ArrowUp') || this.keys.get('KeyW')) && e.isGrounded) {{
                        Matter.Body.setVelocity(body, {{ x: body.velocity.x, y: e.jumpForce * 0.01 }});
                        e.isGrounded = false;
                    }}
                }}
                Matter.Engine.update(this.engine, dt * 1000);
                for (const e of this.entities) {{
                    const body = this.bodies.get(e.name);
                    if (body) {{ e.x = body.position.x; e.y = body.position.y; e.rotation = body.angle; }}
                }}
            }}

            render() {{
                const ctx = this.ctx;
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                for (const e of this.entities) {{
                    ctx.save();
                    ctx.translate(e.x, e.y);
                    ctx.rotate(e.rotation);
                    ctx.fillStyle = e.color;
                    ctx.fillRect(-e.width/2, -e.height/2, e.width, e.height);
                    ctx.restore();
                }}
            }}
        }}

        const canvas = document.getElementById('game-canvas');
        const runtime = new GameRuntime(canvas, gameSpec);
        let isPlaying = false;

        document.getElementById('play-btn').addEventListener('click', () => {{
            if (isPlaying) {{ runtime.pause(); document.getElementById('play-btn').textContent = 'Play'; }}
            else {{ runtime.start(); document.getElementById('play-btn').textContent = 'Pause'; }}
            isPlaying = !isPlaying;
        }});

        document.getElementById('reset-btn').addEventListener('click', () => {{
            runtime.reset();
            if (!isPlaying) runtime.render();
        }});

        runtime.render();
    </script>
</body>
</html>"##, title = title, game_spec = game_spec_json)
}
