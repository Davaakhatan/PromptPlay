use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const MODEL: &str = "claude-sonnet-4-20250514";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<Message>,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<ContentBlock>,
    #[serde(default)]
    #[allow(dead_code)]
    stop_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct AIResponse {
    pub content: String,
    pub success: bool,
    pub error: Option<String>,
}

pub struct AIClient {
    client: Client,
    api_key: Option<String>,
}

impl AIClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            api_key: std::env::var("ANTHROPIC_API_KEY").ok(),
        }
    }

    pub fn set_api_key(&mut self, key: String) {
        self.api_key = Some(key);
    }

    pub fn has_api_key(&self) -> bool {
        self.api_key.is_some()
    }

    pub async fn send_message(
        &self,
        messages: Vec<Message>,
        game_context: &str,
    ) -> Result<String, String> {
        let api_key = self.api_key.as_ref().ok_or("API key not set")?;

        let system_prompt = format!(
            r#"You are an AI game development assistant for PromptPlay, a 2D game engine.
You help users create and modify games by editing the game specification JSON.

Current Game Context:
{}

When the user asks to modify the game, respond with:
1. A brief explanation of what you're doing
2. The updated JSON wrapped in a code block with the format: ```json:game.json

Important guidelines:
- Preserve all existing entities unless explicitly asked to remove them
- Use realistic coordinates (canvas is typically 800x600)
- Common entity types: player (with input component), platform (static), enemy (with aiBehavior), coin (collectible)
- All entities need: transform (x, y, rotation, scaleX, scaleY), sprite (texture, width, height, tint)
- Dynamic entities need: velocity (vx, vy), collider (type, width/height or radius)
- Players need: input (moveSpeed, jumpForce)
- Enemies can have: aiBehavior (type: patrol/chase/idle, speed, detectionRadius)

Be concise and helpful. If you can't fulfill a request, explain why and suggest alternatives."#,
            game_context
        );

        let request = AnthropicRequest {
            model: MODEL.to_string(),
            max_tokens: 4096,
            system: system_prompt,
            messages,
        };

        let response = self
            .client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, error_text));
        }

        let result: AnthropicResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        let content = result
            .content
            .into_iter()
            .filter_map(|block| {
                if block.content_type == "text" {
                    block.text
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("");

        Ok(content)
    }
}

// Tauri state wrapper
pub struct AIClientState(pub Arc<Mutex<AIClient>>);

impl Default for AIClientState {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(AIClient::new())))
    }
}

// Tauri commands
#[tauri::command]
pub async fn ai_send_message(
    state: tauri::State<'_, AIClientState>,
    messages: Vec<Message>,
    game_context: String,
) -> Result<AIResponse, String> {
    let client = state.0.lock().await;

    if !client.has_api_key() {
        return Ok(AIResponse {
            content: String::new(),
            success: false,
            error: Some("API key not configured. Set ANTHROPIC_API_KEY environment variable or configure in settings.".to_string()),
        });
    }

    match client.send_message(messages, &game_context).await {
        Ok(content) => Ok(AIResponse {
            content,
            success: true,
            error: None,
        }),
        Err(e) => Ok(AIResponse {
            content: String::new(),
            success: false,
            error: Some(e),
        }),
    }
}

#[tauri::command]
pub async fn ai_set_api_key(
    state: tauri::State<'_, AIClientState>,
    api_key: String,
) -> Result<(), String> {
    let mut client = state.0.lock().await;
    client.set_api_key(api_key);
    Ok(())
}

#[tauri::command]
pub async fn ai_check_api_key(
    state: tauri::State<'_, AIClientState>,
) -> Result<bool, String> {
    let client = state.0.lock().await;
    Ok(client.has_api_key())
}
