import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { InstalledApp } from '../types'
import { getInstalledApps } from '../utils/ksu'

export const useAppsStore = defineStore('apps', () => {
  const installedApps = ref<InstalledApp[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  // 计算过滤后的应用列表
  const filteredApps = computed(() => {
    if (!searchQuery.value) {
      return installedApps.value
    }
    const q = searchQuery.value.toLowerCase()
    return installedApps.value.filter(
      (app: InstalledApp) =>
        app.packageName.toLowerCase().includes(q) || app.appName.toLowerCase().includes(q)
    )
  })

  // 加载已安装应用列表
  async function loadInstalledApps() {
    loading.value = true
    error.value = null
    try {
      installedApps.value = (await getInstalledApps()).map((app) => ({
        ...app,
        installed: app.installed ?? true,
      }))
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  // 搜索应用
  function searchApps(query: string) {
    searchQuery.value = query
  }

  return {
    installedApps,
    filteredApps, // 返回计算后的过滤列表
    loading,
    error,
    searchQuery,
    loadInstalledApps,
    searchApps,
    // 保留原来的函数用于兼容性
    getFilteredApps: () => filteredApps.value,
  }
})