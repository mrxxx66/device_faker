<template>
  <div class="settings-page">
    <div class="settings-section glass-effect">
      <h2 class="section-title">显示设置</h2>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <Moon :size="24" />
          </div>
          <div class="setting-text">
            <h3 class="setting-name">主题</h3>
            <p class="setting-desc">选择界面主题</p>
          </div>
        </div>
        <el-select v-model="currentTheme" class="setting-control" @change="onThemeChange">
          <el-option label="跟随系统" value="system" />
          <el-option label="浅色模式" value="light" />
          <el-option label="深色模式" value="dark" />
        </el-select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <Globe :size="24" />
          </div>
          <div class="setting-text">
            <h3 class="setting-name">语言</h3>
            <p class="setting-desc">选择界面语言</p>
          </div>
        </div>
        <el-select v-model="currentLanguage" class="setting-control" @change="onLanguageChange">
          <el-option label="跟随系统" value="system" />
          <el-option label="简体中文" value="zh" />
          <el-option label="English" value="en" />
        </el-select>
      </div>
    </div>

    <div class="settings-section glass-effect">
      <h2 class="section-title">模块设置</h2>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <Settings :size="24" />
          </div>
          <div class="setting-text">
            <h3 class="setting-name">默认工作模式</h3>
            <p class="setting-desc">选择模块的默认工作模式</p>
          </div>
        </div>
        <el-select v-model="defaultMode" class="setting-control" @change="onModeChange">
          <el-option label="轻量模式 (推荐)" value="lite" />
          <el-option label="完整模式" value="full" />
        </el-select>
      </div>

      <div class="setting-item setting-item-horizontal">
        <div class="setting-info">
          <div class="setting-icon">
            <Bug :size="24" />
          </div>
          <div class="setting-text">
            <h3 class="setting-name">调试模式</h3>
            <p class="setting-desc">启用后可在 logcat 中查看详细日志</p>
          </div>
        </div>
        <el-switch v-model="debugMode" class="setting-control-switch" @change="onDebugChange" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onActivated } from 'vue'
import { Moon, Globe, Settings, Bug } from 'lucide-vue-next'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '../stores/config'
import { useSettingsStore } from '../stores/settings'

const configStore = useConfigStore()
const settingsStore = useSettingsStore()

const currentTheme = ref(settingsStore.theme)
const currentLanguage = ref(settingsStore.language)
const defaultMode = ref(configStore.config.default_mode || 'lite')
const debugMode = ref(configStore.config.debug || false)

function onThemeChange(value: string) {
  settingsStore.setTheme(value as 'system' | 'light' | 'dark')
}

function onLanguageChange(value: string) {
  settingsStore.setLanguage(value as 'system' | 'zh' | 'en')
  ElMessage.info('语言切换功能待实现')
}

async function onModeChange(value: string) {
  configStore.config.default_mode = value as 'lite' | 'full'
  try {
    await configStore.saveConfig()
    ElMessage.success('默认模式已更新')
  } catch {
    ElMessage.error('保存失败')
  }
}

async function onDebugChange(value: boolean) {
  configStore.config.debug = value
  try {
    await configStore.saveConfig()
    ElMessage.success(value ? '调试模式已启用' : '调试模式已关闭')
  } catch {
    ElMessage.error('保存失败')
  }
}

// 监听配置变化（只创建一次监听器）
watch(
  () => configStore.config.default_mode,
  (newMode: 'lite' | 'full' | undefined) => {
    if (newMode && defaultMode.value !== newMode) {
      defaultMode.value = newMode
    }
  }
)

watch(
  () => configStore.config.debug,
  (newDebug: boolean | undefined) => {
    const newValue = newDebug || false
    if (debugMode.value !== newValue) {
      debugMode.value = newValue
    }
  }
)

// KeepAlive 激活时同步最新配置
onActivated(() => {
  currentTheme.value = settingsStore.theme
  currentLanguage.value = settingsStore.language
  defaultMode.value = configStore.config.default_mode || 'lite'
  debugMode.value = configStore.config.debug || false
})
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-section {
  padding: 1.5rem;
  border-radius: 1rem;
  box-shadow: 0 2px 8px var(--shadow);
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.setting-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--background);
  border-radius: 0.5rem;
  color: var(--primary);
  flex-shrink: 0;
}

.setting-text {
  flex: 1;
  overflow: hidden;
}

.setting-name {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text);
  margin: 0 0 0.25rem 0;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-desc {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

.setting-control {
  width: 100%;
}

.setting-item-horizontal {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.setting-control-switch {
  flex-shrink: 0;
  margin-left: 1rem;
}
</style>
