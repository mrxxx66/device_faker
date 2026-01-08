use std::fs::OpenOptions;
use std::io::Write;
use std::sync::Mutex;
use log::{LevelFilter, Metadata, Record, SetLoggerError};
use chrono::Local;
use std::path::Path;

pub struct SimpleLogger {
    file: Mutex<std::fs::File>,
    level: LevelFilter,
}

impl log::Log for SimpleLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= self.level
    }

    fn log(&self, record: &Record) {
        if self.enabled(record.metadata()) {
            let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            let log_line = format!("[{}] {} - {}: {}\n", 
                timestamp,
                record.level(),
                record.target(),
                record.args()
            );
            
            if let Ok(mut file) = self.file.lock() {
                let _ = file.write_all(log_line.as_bytes());
                let _ = file.flush();
            }
        }
    }

    fn flush(&self) {
        if let Ok(mut file) = self.file.lock() {
            let _ = file.flush();
        }
    }
}

pub fn log_to_file<P: AsRef<Path>>(path: P, level: LevelFilter) -> Result<(), SetLoggerError> {
    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .expect("Failed to open log file");

    let logger = SimpleLogger {
        file: Mutex::new(file),
        level,
    };

    log::set_boxed_logger(Box::new(logger))?;
    log::set_max_level(level);
    Ok(())
}