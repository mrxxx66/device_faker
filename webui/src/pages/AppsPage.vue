<template>
  <div class="apps-page">
    <AppFilters
      v-model:search-query="searchQuery"
      v-model:filter-type="filterType"
      :total-count="allApps.length"
      :configured-count="configuredCount"
    />

    <AppList :apps="filteredApps" :empty-text="emptyText" :loading="loading" @select="openConfig" />

    <AppConfigDialog v-model="configDialogVisible" :app="currentApp" @saved="handleConfigSaved" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppConfigDialog from '../components/apps/AppConfigDialog.vue'
import AppFilters from '../components/apps/AppFilters.vue'
import AppList from '../components/apps/AppList.vue'
import { useAppsStore } from '../stores/apps'
import { useConfigStore } from '../stores/config'
import { useI18n } from '../utils/i18n'
import { normalizePackageName } from '../utils/package'
import type { InstalledApp } from '../types'

type FilterType = 'all' | 'configured'

const configStore = useConfigStore()
const appsStore = useAppsStore()
const { t } = useI18n()

const searchQuery = ref('')
const filterType = ref<FilterType>('all')
const configDialogVisible = ref(false)
const currentApp = ref<InstalledApp | null>(null)

const loading = computed(() => appsStore.loading)
const installedApps = computed(() => appsStore.installedApps)

const configuredApps = computed<InstalledApp[]>(() => {
  const map = new Map<string, InstalledApp>()

  for (const appConfig of configStore.getApps()) {
    if (map.has(appConfig.package)) continue

    map.set(appConfig.package, {
      packageName: appConfig.package,
      appName: appConfig.package,
      installed: false,
    })
  }

  const templates = configStore.getTemplates()
  for (const template of Object.values(templates)) {
    if (!template.packages) continue
    for (const pkg of template.packages) {
      if (map.has(pkg)) continue

      map.set(pkg, {
        packageName: pkg,
        appName: pkg,
        installed: false,
      })
    }
  }

  return Array.from(map.values())
})

// 缓存allApps的计算结果，避免每次重新计算
const allApps = computed<InstalledApp[]>(() => {
  // 使用Set来快速检查包名是否已存在，避免重复添加
  const packageSet = new Set<string>()
  const normalizedSet = new Map<string, number>() // 归一化包名到索引的映射
  const result: InstalledApp[] = []

  // 首先添加已安装应用
  for (const app of installedApps.value) {
    const normalized = normalizePackageName(app.packageName)
    
    // 如果包名或归一化包名已存在，则跳过
    if (packageSet.has(app.packageName) || normalizedSet.has(normalized)) continue

    const entry = {
      ...app,
      installed: app.installed ?? true,
    }

    const idx = result.length
    result.push(entry)
    packageSet.add(app.packageName)
    normalizedSet.set(normalized, idx)
  }

  // 然后添加已配置但未安装的应用
  for (const app of configuredApps.value) {
    // 如果包名已存在，则跳过
    if (packageSet.has(app.packageName)) continue

    const normalized = normalizePackageName(app.packageName)
    const existingIdx = normalizedSet.get(normalized)

    const entry = {
      // 如果有相同归一化包名的应用，复用其展示信息，否则使用默认信息
      ...(existingIdx !== undefined ? result[existingIdx] : {}),
      packageName: app.packageName,
      appName: existingIdx !== undefined ? result[existingIdx].appName : app.packageName,
      installed: existingIdx !== undefined ? result[existingIdx].installed : (app.installed ?? false),
    }

    result.push(entry)
    packageSet.add(app.packageName)
  }

  return result
})

const configuredCount = computed(
  () => allApps.value.filter((app) => configStore.packageConfigMap.has(app.packageName)).length
)

// 使用memoization优化filteredApps的计算
const filteredApps = computed(() => {
  let apps = allApps.value

  // 添加搜索过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    apps = apps.filter(
      (app) => app.packageName.toLowerCase().includes(q) || app.appName.toLowerCase().includes(q)
    )
  }

  // 添加配置状态过滤
  if (filterType.value === 'configured') {
    apps = apps.filter((app) => configStore.isPackageConfigured(app.packageName))
  }

  // 对于较小的数据集，直接排序；对于较大的数据集，可以考虑优化排序策略
  // 当应用数量超过一定阈值时，可考虑在UI上提示用户进一步筛选
  if (apps.length > 1000) {
    console.warn(`[Performance Warning] Rendering ${apps.length} apps, consider refining filters.`)
  }
  
  // 排序：已安装应用排在前面
  // 为了优化性能，我们可以使用更高效的排序算法，但JavaScript的内置sort已经相当优化
  return apps.sort((a, b) => {
    const aInstalled = a.installed !== false
    const bInstalled = b.installed !== false

    if (aInstalled === bInstalled) return 0
    return aInstalled ? -1 : 1
  })
})

const emptyText = computed(() => {
  if (searchQuery.value) return t('apps.empty.search')
  if (filterType.value === 'configured') return t('apps.empty.configured')
  return t('apps.empty.all')
})

function openConfig(app: InstalledApp) {
  currentApp.value = app
  configDialogVisible.value = true
}

function handleConfigSaved() {
  // 预留钩子，未来可在保存后刷新列表或提示
}

onMounted(() => {
  if (appsStore.installedApps.length === 0 && !appsStore.loading) {
    // 延迟到下一帧再加载，先完成页面切换体验
    requestAnimationFrame(() => {
      void appsStore.loadInstalledApps()
    })
  }
})
</script>

<style scoped>
.apps-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
  overflow: hidden;
}
</style>