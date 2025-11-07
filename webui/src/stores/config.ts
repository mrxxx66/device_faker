import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Config, Template, AppConfig } from '../types'
import { readFile, writeFile, fileExists, mkdir } from '../utils/ksu'
import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'

const CONFIG_PATH = '/data/adb/device_faker/config/config.toml'
const MODULE_PROP_PATH = '/data/adb/modules/device_faker/module.prop'

export const useConfigStore = defineStore('config', () => {
  const config = ref<Config>({})
  const moduleVersion = ref('0.0.0')
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 加载配置文件
  async function loadConfig() {
    loading.value = true
    error.value = null
    try {
      const exists = await fileExists(CONFIG_PATH)
      if (!exists) {
        // 创建默认配置
        await mkdir('/data/adb/device_faker/config')
        config.value = {
          default_mode: 'lite',
          templates: {},
          apps: [],
        }
        await saveConfig()
      } else {
        const content = await readFile(CONFIG_PATH)
        config.value = parseToml(content) as Config
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to load config:', e)
    } finally {
      loading.value = false
    }
  }

  // 保存配置文件
  async function saveConfig() {
    loading.value = true
    error.value = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const content = stringifyToml(config.value as any)
      await writeFile(CONFIG_PATH, content)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      console.error('Failed to save config:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  // 加载模块版本
  async function loadModuleVersion() {
    try {
      const content = await readFile(MODULE_PROP_PATH)
      const match = content.match(/version=(.+)/)
      if (match) {
        moduleVersion.value = match[1].trim()
      }
    } catch (e) {
      console.error('Failed to load module version:', e)
    }
  }

  // 获取所有模板（使用 computed 缓存）
  const templates = computed(() => config.value.templates || {})

  // 获取所有应用配置（使用 computed 缓存）
  const apps = computed(() => config.value.apps || [])

  // 获取应用伪装数量（使用 computed 自动缓存）
  const deviceFakerCount = computed(() => {
    let count = 0

    // 统计模板中的包名
    for (const template of Object.values(templates.value)) {
      if (template.packages) {
        count += template.packages.length
      }
    }

    // 统计直接配置的应用
    count += apps.value.length

    return count
  })

  // 获取模板数量（使用 computed 自动缓存）
  const templateCount = computed(() => Object.keys(templates.value).length)

  // 兼容旧的函数式 API
  function getTemplates(): Record<string, Template> {
    return templates.value
  }

  // 兼容旧的函数式 API
  function getApps(): AppConfig[] {
    return apps.value
  }

  // 兼容旧的函数式 API
  function getDeviceFakerCount(): number {
    return deviceFakerCount.value
  }

  // 添加或更新模板
  function setTemplate(name: string, template: Template) {
    if (!config.value.templates) {
      config.value.templates = {}
    }
    config.value.templates[name] = template
  }

  // 删除模板
  function deleteTemplate(name: string) {
    if (config.value.templates) {
      delete config.value.templates[name]
    }
  }

  // 添加或更新应用配置
  function setApp(appConfig: AppConfig) {
    if (!config.value.apps) {
      config.value.apps = []
    }
    const index = config.value.apps.findIndex((a: AppConfig) => a.package === appConfig.package)
    if (index >= 0) {
      config.value.apps[index] = appConfig
    } else {
      config.value.apps.push(appConfig)
    }
  }

  // 删除应用配置
  function deleteApp(packageName: string) {
    if (config.value.apps) {
      config.value.apps = config.value.apps.filter((a: AppConfig) => a.package !== packageName)
    }
  }

  // 检查包名是否已配置
  function isPackageConfigured(packageName: string): boolean {
    // 检查模板中的包名
    for (const template of Object.values(templates.value)) {
      if (template.packages?.includes(packageName)) {
        return true
      }
    }

    // 检查直接配置的应用
    return apps.value.some((a) => a.package === packageName)
  }

  // 获取包名的配置
  function getPackageConfig(
    packageName: string
  ): (Template & { source: string }) | AppConfig | null {
    // 先检查直接配置的应用（优先级更高）
    const appConfig = apps.value.find((a) => a.package === packageName)
    if (appConfig) {
      return appConfig
    }

    // 再检查模板中的包名
    for (const [name, template] of Object.entries(templates.value)) {
      if (template.packages?.includes(packageName)) {
        return { ...template, source: name }
      }
    }

    return null
  }

  // 切换工作模式
  async function toggleWorkMode() {
    const currentMode = config.value.default_mode || 'lite'
    config.value.default_mode = currentMode === 'lite' ? 'full' : 'lite'
    await saveConfig()
  }

  return {
    config,
    moduleVersion,
    loading,
    error,
    // Computed 属性（自动缓存）
    templates,
    apps,
    deviceFakerCount,
    templateCount,
    // 函数
    loadConfig,
    saveConfig,
    loadModuleVersion,
    getTemplates,
    setTemplate,
    deleteTemplate,
    getApps,
    setApp,
    deleteApp,
    getDeviceFakerCount,
    isPackageConfigured,
    getPackageConfig,
    toggleWorkMode,
  }
})
