use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchItem {
    pub id: String,
    pub index: usize,
    #[serde(default)]
    pub build_id: Option<String>,
    pub build_fingerprint_name: String,
    pub pda_version: String,
    pub csc_version: String,
    pub baseband_version: String,
    #[serde(default)]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PortalConfig {
    #[serde(default = "default_base_url")]
    pub base_url: String,
    #[serde(default = "default_form_url")]
    pub form_url: String,
    #[serde(default = "default_true")]
    pub headless: bool,
    #[serde(default = "default_delay")]
    pub delay_ms: u64,
    #[serde(default = "default_timeout")]
    pub timeout_ms: u64,
    #[serde(default)]
    pub mock: bool,
    #[serde(default = "default_true")]
    pub track_progress: bool,
    #[serde(default = "default_concurrency")]
    pub concurrency: usize,
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
}

fn default_base_url() -> String {
    "https://android.qb.sec.samsung.net/overview/28905".to_string()
}
fn default_form_url() -> String {
    "https://android.qb.sec.samsung.net/wicket/page?6".to_string()
}
fn default_true() -> bool {
    true
}
fn default_concurrency() -> usize {
    3
}
fn default_delay() -> u64 {
    1000
}
fn default_timeout() -> u64 {
    30000
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchPayload {
    pub portal: PortalConfig,
    pub items: Vec<BatchItem>,
}

pub type RunnerState = Arc<Mutex<Option<Child>>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusUpdateEvent {
    #[serde(default)]
    pub id: Option<String>,
    pub index: usize,
    #[serde(default)]
    pub build_id: Option<String>,
    pub status: String,
    pub message: String,
    #[serde(default)]
    pub error: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogStreamEvent {
    pub level: String,
    pub message: String,
    #[serde(default)]
    pub index: Option<usize>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskFinishedEvent {
    pub total: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub cancelled: bool,
    pub timestamp: String,
}

pub async fn execute_batch(
    payload: BatchPayload,
    app_handle: AppHandle,
    state: RunnerState,
) -> Result<(), String> {
    // 1. Resolve path to engine/runner.mjs across Dev & Production Package environments
    let mut resolved_script: Option<PathBuf> = None;
    let mut working_dir: Option<PathBuf> = None;

    // A. Check Tauri Resource Directory (Production Bundle)
    if let Ok(resource_path) = app_handle.path().resolve("engine/runner.mjs", tauri::path::BaseDirectory::Resource) {
        if resource_path.exists() {
            working_dir = resource_path.parent().map(|p| p.to_path_buf());
            resolved_script = Some(resource_path);
        }
    }

    // B. Check relative to resource_dir() directly
    if resolved_script.is_none() {
        if let Ok(res_dir) = app_handle.path().resource_dir() {
            let candidates = [
                res_dir.join("engine/runner.mjs"),
                res_dir.join("runner.mjs"),
                res_dir.join("_up_/engine/runner.mjs"),
            ];
            for c in candidates {
                if c.exists() {
                    working_dir = c.parent().map(|p| p.to_path_buf());
                    resolved_script = Some(c);
                    break;
                }
            }
        }
    }

    // C. Check relative to current executable location (Windows / Linux install dir)
    if resolved_script.is_none() {
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                let candidates = [
                    exe_dir.join("engine/runner.mjs"),
                    exe_dir.join("resources/engine/runner.mjs"),
                    exe_dir.join("../Resources/engine/runner.mjs"),
                    exe_dir.join("../resources/engine/runner.mjs"),
                    exe_dir.join("../engine/runner.mjs"),
                ];
                for c in candidates {
                    if c.exists() {
                        working_dir = c.parent().map(|p| p.to_path_buf());
                        resolved_script = Some(c);
                        break;
                    }
                }
            }
        }
    }

    // D. Check relative to Current Working Directory (Dev mode)
    if resolved_script.is_none() {
        let current_dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let candidates = [
            current_dir.join("engine/runner.mjs"),
            current_dir.join("../engine/runner.mjs"),
            current_dir.join("src-tauri/../engine/runner.mjs"),
        ];
        for c in candidates {
            if c.exists() {
                working_dir = c.parent().map(|p| p.to_path_buf());
                resolved_script = Some(c);
                break;
            }
        }
    }

    let script_path = resolved_script.unwrap_or_else(|| PathBuf::from("engine/runner.mjs"));

    // Helper to strip Windows UNC \\?\ prefix which causes Node.js realpathSync EISDIR 'C:' errors
    let clean_str = |p: &std::path::Path| -> PathBuf {
        let s = p.to_string_lossy();
        if s.starts_with(r"\\?\") {
            PathBuf::from(&s[4..])
        } else {
            p.to_path_buf()
        }
    };

    let serialized_payload = serde_json::to_string(&payload)
        .map_err(|e| format!("Failed to serialize batch payload: {}", e))?;

    let mut cmd = Command::new("node");
    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    if let Some(ref wd) = working_dir {
        let clean_wd = clean_str(wd);
        cmd.current_dir(&clean_wd);
        // Running node with runner.mjs directly inside working_dir prevents Windows path/drive resolution crashes
        cmd.arg("runner.mjs");
    } else {
        cmd.arg(clean_str(&script_path));
    }
    cmd.stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn node automation engine at {:?}: {}. Ensure Node.js is installed.", script_path, e))?;

    // Write payload to stdin
    if let Some(mut stdin) = child.stdin.take() {
        tokio::spawn(async move {
            let _ = stdin.write_all(serialized_payload.as_bytes()).await;
            let _ = stdin.shutdown().await;
        });
    }

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    // Store child handle into global state for cancellation
    {
        let mut lock = state.lock().await;
        *lock = Some(child);
    }

    let app_stdout = app_handle.clone();
    let stdout_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stdout).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let line_trimmed = line.trim();
            if line_trimmed.is_empty() {
                continue;
            }

            // Attempt to parse line as structured JSON
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(line_trimmed) {
                if let Some(event_type) = val.get("type").and_then(|v| v.as_str()) {
                    match event_type {
                        "progress" => {
                            if let Ok(progress) = serde_json::from_value::<StatusUpdateEvent>(val.clone()) {
                                let _ = app_stdout.emit("item-status-update", progress);
                            }
                        }
                        "log" => {
                            if let Ok(log_ev) = serde_json::from_value::<LogStreamEvent>(val.clone()) {
                                let _ = app_stdout.emit("task-log", log_ev);
                            }
                        }
                        "done" => {
                            let total = val.get("total").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                            let success_count = val.get("successCount").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                            let failed_count = val.get("failedCount").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                            let _ = app_stdout.emit(
                                "task-finished",
                                TaskFinishedEvent {
                                    total,
                                    success_count,
                                    failed_count,
                                    cancelled: false,
                                    timestamp: chrono_now(),
                                },
                            );
                        }
                        _ => {
                            let _ = app_stdout.emit(
                                "task-log",
                                LogStreamEvent {
                                    level: "info".to_string(),
                                    message: line_trimmed.to_string(),
                                    index: None,
                                    timestamp: chrono_now(),
                                },
                            );
                        }
                    }
                    continue;
                }
            }

            // Raw line fallback
            let _ = app_stdout.emit(
                "task-log",
                LogStreamEvent {
                    level: "info".to_string(),
                    message: line_trimmed.to_string(),
                    index: None,
                    timestamp: chrono_now(),
                },
            );
        }
    });

    let app_stderr = app_handle.clone();
    let stderr_task = tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        while let Ok(Some(line)) = reader.next_line().await {
            let line_trimmed = line.trim();
            if !line_trimmed.is_empty() {
                let _ = app_stderr.emit(
                    "task-log",
                    LogStreamEvent {
                        level: "error".to_string(),
                        message: line_trimmed.to_string(),
                        index: None,
                        timestamp: chrono_now(),
                    },
                );
            }
        }
    });

    // Wait for stdout/stderr readers
    let _ = tokio::join!(stdout_task, stderr_task);

    // Clean up state
    let mut lock = state.lock().await;
    if let Some(mut child) = lock.take() {
        let _ = child.wait().await;
    }

    Ok(())
}

pub async fn cancel_batch(state: RunnerState, app_handle: AppHandle) -> Result<(), String> {
    let mut lock = state.lock().await;
    if let Some(mut child) = lock.take() {
        let _ = child.kill().await;
        let _ = app_handle.emit(
            "task-log",
            LogStreamEvent {
                level: "warn".to_string(),
                message: "Batch execution cancelled by user.".to_string(),
                index: None,
                timestamp: chrono_now(),
            },
        );
        let _ = app_handle.emit(
            "task-finished",
            TaskFinishedEvent {
                total: 0,
                success_count: 0,
                failed_count: 0,
                cancelled: true,
                timestamp: chrono_now(),
            },
        );
        Ok(())
    } else {
        Ok(())
    }
}

fn chrono_now() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let hours = (now / 3600) % 24;
    let minutes = (now / 60) % 60;
    let seconds = now % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}
