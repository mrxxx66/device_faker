import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Settings } from '../types'

const SETTINGS_KEY = 'device_faker_settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    theme: 'system',
    language: 'system',
  })

  // 加载设置
  function loadSettings() {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      try {
        settings.value = JSON.parse(stored)
      } catch {
        // 使用默认设置
      }
    }
  }

  // 保存设置
  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
  }

  // 主题设置
  const theme = ref<'system' | 'light' | 'dark'>('system')

  function setTheme(newTheme: 'system' | 'light' | 'dark') {
    settings.value.theme = newTheme
    theme.value = newTheme
    saveSettings()
  }

  // 语言设置
  const language = ref<'system' | 'zh' | 'en'>('system')

  function setLanguage(newLanguage: 'system' | 'zh' | 'en') {
    settings.value.language = newLanguage
    language.value = newLanguage
    saveSettings()
  }

  // 监听设置变化
  watch(settings, saveSettings, { deep: true })

  // 初始化
  loadSettings()
  theme.value = settings.value.theme
  language.value = settings.value.language

  return {
    settings,
    theme,
    language,
    setTheme,
    setLanguage,
  }
})
