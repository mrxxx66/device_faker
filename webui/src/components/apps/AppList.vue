<template>
  <div v-loading="loading" class="apps-list">
    <div
      v-for="app in appsWithStatus"
      :key="app.packageName"
      class="app-card glass-effect"
      @click="emit('select', app)"
    >
      <div class="app-info">
        <h3 class="app-name">{{ app.appName }}</h3>
        <p class="app-package">{{ app.packageName }}</p>
        <div class="app-status-group">
          <p v-if="app.isConfigured" class="app-status configured">
            <Check :size="14" />
            {{ t('apps.status.configured') }}
          </p>
          <p v-else class="app-status unconfigured">{{ t('apps.status.unconfigured') }}</p>
          <p v-if="!app.isInstalled" class="app-status not-installed">
            {{ t('apps.status.not_installed') }}
          </p>
        </div>
      </div>
      <div class="app-actions">
        <ChevronRight :size="20" />
      </div>
    </div>

    <div v-if="!loading && apps.length === 0" class="empty-state">
      <p class="empty-text">{{ emptyText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Check } from 'lucide-vue-next'
import { useConfigStore } from '../../stores/config'
import { useI18n } from '../../utils/i18n'
import type { InstalledApp } from '../../types'

const props = defineProps<{
  apps: InstalledApp[]
  emptyText: string
  loading: boolean
}>()

const emit = defineEmits<{ select: [InstalledApp] }>()

const { t } = useI18n()
const configStore = useConfigStore()

// 使用computed缓存应用的状态信息，避免在模板中重复计算
const appsWithStatus = computed(() => {
  return props.apps.map(app => ({
    ...app,
    isConfigured: configStore.packageConfigMap.has(app.packageName),
    isInstalled: app.installed !== false
  }))
})

const loading = computed(() => props.loading)
</script>

<style scoped>
.apps-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.app-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px var(--shadow);
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.app-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px var(--shadow);
}

.app-info {
  flex: 1;
  min-width: 0;
}

.app-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-package {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-status-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.app-status {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
}

.app-status.configured {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.app-status.unconfigured {
  background: rgba(156, 163, 175, 0.1);
  color: var(--text-secondary);
}

.app-status.not-installed {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

.app-actions {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.empty-text {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--text);
}
</style>