pub mod runner;

use runner::{cancel_batch, execute_batch, BatchPayload, RunnerState};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;

#[tauri::command]
async fn start_batch_runner(
    payload: BatchPayload,
    app_handle: AppHandle,
    state: State<'_, RunnerState>,
) -> Result<(), String> {
    let runner_state = state.inner().clone();
    tokio::spawn(async move {
        if let Err(e) = execute_batch(payload, app_handle.clone(), runner_state).await {
            let _ = app_handle.emit(
                "task-log",
                runner::LogStreamEvent {
                    level: "error".to_string(),
                    message: format!("Execution failed to start: {}", e),
                    index: None,
                    timestamp: "00:00:00".to_string(),
                },
            );
        }
    });
    Ok(())
}

#[tauri::command]
async fn cancel_batch_runner(
    app_handle: AppHandle,
    state: State<'_, RunnerState>,
) -> Result<(), String> {
    let runner_state = state.inner().clone();
    cancel_batch(runner_state, app_handle).await
}

#[tauri::command]
async fn open_browser_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let runner_state: RunnerState = Arc::new(Mutex::new(None));

    tauri::Builder::default()
        .manage(runner_state)
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            start_batch_runner,
            cancel_batch_runner,
            open_browser_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
