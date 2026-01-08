#[cfg(target_os = "android")]
mod atexit;
mod companion;
mod config;
mod hooks;
mod simple_logging;
mod state;

use anyhow::Context;
use companion::{
    handle_companion_request, restore_previous_resetprop_if_needed,
    spoof_system_props_via_companion,
};
use config::{Config, MergedAppConfig};
use hooks::{hook_build_fields, hook_system_properties};
use jni::JNIEnv;
use log::{LevelFilter, error, info};
use state::{FAKE_PROPS, IS_FULL_MODE};
use std::fs;
use std::path::Path;
use chrono::Local;
use zygisk_api::ZygiskModule;
use zygisk_api::api::v4::ZygiskOption;
use zygisk_api::api::{V4, ZygiskApi};
use zygisk_api::raw::ZygiskRaw;

const CONFIG_PATH: &str = "/data/adb/device_faker/config/config.toml";
const LOG_DIR: &str = "/data/adb/device_faker/logs";

#[derive(Default)]
struct MyModule;

impl ZygiskModule for MyModule {
    type Api = V4;

    fn on_load(&self, _api: ZygiskApi<V4>, _env: JNIEnv) {
        // 只初始化 Android 系统日志，文件日志在需要时再初始化
        #[cfg(target_os = "android")]
        android_logger::init_once(
            android_logger::Config::default()
                .with_max_level(LevelFilter::Error)
                .with_tag("DeviceFaker"),
        );
    }

    fn pre_app_specialize(
        &self,
        mut api: ZygiskApi<V4>,
        mut env: JNIEnv,
        args: &mut <V4 as ZygiskRaw>::AppSpecializeArgs,
    ) {
        if let Err(err) = self.handle_app_specialize(&mut api, &mut env, args) {
            error!("pre_app_specialize failed: {err:?}");
        }
    }

    fn post_app_specialize(
        &self,
        mut api: ZygiskApi<V4>,
        _env: JNIEnv,
        _args: &<V4 as ZygiskRaw>::AppSpecializeArgs,
    ) {
        let is_full_mode = *IS_FULL_MODE.lock().unwrap();
        if !is_full_mode {
            api.set_option(ZygiskOption::DlCloseModuleLibrary);
        }
    }

    fn pre_server_specialize(
        &self,
        mut api: ZygiskApi<V4>,
        _env: JNIEnv,
        _args: &mut <V4 as ZygiskRaw>::ServerSpecializeArgs,
    ) {
        api.set_option(ZygiskOption::DlCloseModuleLibrary);
    }
}

impl MyModule {
    fn handle_app_specialize(
        &self,
        api: &mut ZygiskApi<V4>,
        env: &mut JNIEnv,
        args: &mut <V4 as ZygiskRaw>::AppSpecializeArgs,
    ) -> anyhow::Result<()> {
        let package_name = Self::extract_package_name(env, args)?;
        let user_id = Self::extract_android_user_id(args);
        let package_with_user = format!("{package_name}@{user_id}");
        restore_previous_resetprop_if_needed(api, &package_with_user)?;

        let config = match load_config() {
            Ok(Some(cfg)) => cfg,
            Ok(None) => {
                api.set_option(ZygiskOption::DlCloseModuleLibrary);
                return Ok(());
            }
            Err(err) => {
                error!("Failed to load config: {err:#}");
                api.set_option(ZygiskOption::DlCloseModuleLibrary);
                return Ok(());
            }
        };

        configure_log_level(config.debug);

        if config.debug {
            info!(
                "Config loaded with {} apps and {} templates",
                config.apps.len(),
                config.templates.len()
            );
        }

        let merged = config
            .get_merged_config(&package_with_user)
            .or_else(|| config.get_merged_config(&package_name));

        let Some(merged) = merged else {
            if config.debug {
                info!("App {package_name} (user {user_id}) not in config, unloading module");
            }
            api.set_option(ZygiskOption::DlCloseModuleLibrary);
            return Ok(());
        };

        if merged.force_denylist_unmount {
            api.set_option(ZygiskOption::ForceDenylistUnmount);
            if config.debug {
                info!("Force denylist unmount enabled for {package_name}");
            }
        }

        if config.debug {
            info!(
                "Using mode: {} for app: {package_name} (user {user_id})",
                merged.mode
            );
        }

        hook_build_fields(env, &merged)?;
        if config.debug {
            info!("Build fields hooked successfully");
        }

        // 尝试初始化文件日志（在应用专门化时，权限更充分）
        if config.debug {
            init_file_logging_if_needed();
        }

        match SpoofMode::from_mode_str(&merged.mode) {
            SpoofMode::Lite => Self::apply_lite_mode(api, config.debug),
            SpoofMode::Full => Self::apply_full_mode(api, env, &merged, config.debug),
            SpoofMode::Resetprop => {
                Self::apply_resetprop_mode(api, &package_with_user, &merged, config.debug)
            }
        }
    }

    fn extract_android_user_id(args: &<V4 as ZygiskRaw>::AppSpecializeArgs) -> u32 {
        // Android 的 app UID = userId * 100000 + appId
        // 这里的 userId 对应 /data/user/<userId>/... 里的数字
        const AID_USER_OFFSET: u32 = 100_000;
        let uid = *args.uid;
        if uid <= 0 {
            return 0;
        }
        (uid as u32) / AID_USER_OFFSET
    }

    fn extract_package_name(
        env: &mut JNIEnv,
        args: &mut <V4 as ZygiskRaw>::AppSpecializeArgs,
    ) -> anyhow::Result<String> {
        if let Ok(app_data_dir) = env.get_string(args.app_data_dir) {
            let app_data: String = app_data_dir.into();
            if let Some(package) = app_data.rsplit('/').next()
                && !package.is_empty()
            {
                return Ok(package.to_string());
            } else {
                log::warn!("Could not extract package name from app_data_dir: {}", app_data);
            }
        }

        let mut nice_name: String = env
            .get_string(args.nice_name)
            .context("Failed to get package name from nice_name")?
            .into();

        if let Some(idx) = nice_name.find(':') {
            nice_name.truncate(idx);
        }

        if nice_name.is_empty() {
            anyhow::bail!("Extracted package name is empty");
        }

        Ok(nice_name)
    }

    fn apply_lite_mode(api: &mut ZygiskApi<V4>, debug: bool) -> anyhow::Result<()> {
        *FAKE_PROPS.lock().unwrap() = None;
        *IS_FULL_MODE.lock().unwrap() = false;
        if debug {
            info!("Lite mode: only Build fields hooked, unloading module");
        }
        api.set_option(ZygiskOption::DlCloseModuleLibrary);
        Ok(())
    }

    fn apply_full_mode(
        api: &mut ZygiskApi<V4>,
        env: &JNIEnv,
        merged: &MergedAppConfig,
        debug: bool,
    ) -> anyhow::Result<()> {
        if debug {
            info!("Full mode: hooking SystemProperties");
        }

        let prop_map = Config::build_merged_property_map(merged);
        if debug {
            info!("Property map created with {} entries", prop_map.len());
        }

        *FAKE_PROPS.lock().unwrap() = Some(prop_map);
        *IS_FULL_MODE.lock().unwrap() = true;
        hook_system_properties(api, env)?;

        if debug {
            info!("SystemProperties hooked successfully, module will stay loaded");
        }

        Ok(())
    }

    fn apply_resetprop_mode(
        api: &mut ZygiskApi<V4>,
        package_name: &str,
        merged: &MergedAppConfig,
        debug: bool,
    ) -> anyhow::Result<()> {
        if debug {
            info!("Resetprop mode: using companion process");
        }

        let prop_map = Config::build_merged_property_map(merged);
        spoof_system_props_via_companion(api, &prop_map, package_name)?;

        if debug {
            info!("Resetprop spoofing completed");
        }

        *FAKE_PROPS.lock().unwrap() = None;
        *IS_FULL_MODE.lock().unwrap() = false;
        api.set_option(ZygiskOption::DlCloseModuleLibrary);
        Ok(())
    }
}

#[derive(Clone, Copy)]
enum SpoofMode {
    Lite,
    Full,
    Resetprop,
}

impl SpoofMode {
    fn from_mode_str(value: &str) -> Self {
        match value {
            "lite" => Self::Lite,
            "full" => Self::Full,
            "resetprop" => Self::Resetprop,
            other => {
                error!("Mode '{other}' not fully supported, falling back to 'lite' mode");
                Self::Lite
            }
        }
    }
}

fn load_config() -> anyhow::Result<Option<Config>> {
    if !Path::new(CONFIG_PATH).exists() {
        log::warn!("Config file does not exist at {CONFIG_PATH}, using default settings");
        return Ok(None);
    }

    let config_content = fs::read_to_string(CONFIG_PATH)
        .with_context(|| format!("Failed to read config at {CONFIG_PATH}"))?;
    let config = Config::from_toml(&config_content)
        .map_err(|e| {
            error!("Failed to parse config TOML: {:#}", e);
            e
        })?;
    Ok(Some(config))
}

fn configure_log_level(debug_enabled: bool) {
    let level = if debug_enabled {
        LevelFilter::Info
    } else {
        LevelFilter::Error
    };
    log::set_max_level(level);
}

// 初始化文件日志
fn init_file_logging() {
    // 创建日志目录
    if let Err(e) = fs::create_dir_all(LOG_DIR) {
        #[cfg(target_os = "android")]
        android_logger::init_once(
            android_logger::Config::default()
                .with_max_level(LevelFilter::Error)
                .with_tag("DeviceFaker"),
        );
        error!("Failed to create log directory: {e}");
        return;
    }

    // 配置文件日志 - 使用Result处理而不是expect
    let log_file_path = format!("{}/device_faker_{}.log", LOG_DIR, Local::now().format("%Y%m%d_%H%M%S"));
    if let Err(e) = simple_logging::log_to_file(&log_file_path, LevelFilter::Debug) {
        #[cfg(target_os = "android")]
        android_logger::init_once(
            android_logger::Config::default()
                .with_max_level(LevelFilter::Error)
                .with_tag("DeviceFaker"),
        );
        error!("Failed to initialize file logger: {e}");
    } else {
        info!("File logging initialized: {}", log_file_path);
    }
}

// 延迟初始化文件日志（在应用专门化时）
fn init_file_logging_if_needed() {
    use std::sync::Once;
    static INIT: Once = Once::new();
    
    INIT.call_once(|| {
        init_file_logging();
    });
}

zygisk_api::register_module!(MyModule);
zygisk_api::register_companion!(handle_companion_request);