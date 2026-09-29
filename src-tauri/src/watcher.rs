use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileChangePayload {
    pub kind: String,
    pub paths: Vec<String>,
}

pub struct FileWatcher {
    // Keep watcher alive: dropping it stops watching
    _watcher: RecommendedWatcher,
}

impl FileWatcher {
    pub fn new(path: PathBuf, app: AppHandle) -> notify::Result<Self> {
        let (tx, mut rx) = mpsc::channel::<notify::Result<Event>>(256);

        let mut watcher = RecommendedWatcher::new(
            move |res| {
                let _ = tx.blocking_send(res);
            },
            Config::default(),
        )?;

        watcher.watch(&path, RecursiveMode::Recursive)?;

        tokio::spawn(async move {
            while let Some(res) = rx.recv().await {
                if let Ok(event) = res {
                    let payload = FileChangePayload {
                        kind: format!("{:?}", event.kind),
                        paths: event
                            .paths
                            .iter()
                            .filter_map(|p| p.to_str().map(String::from))
                            .collect(),
                    };
                    let _ = app.emit("file-changed", payload);
                }
            }
        });

        Ok(Self { _watcher: watcher })
    }
}
