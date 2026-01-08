<template>
  <div class="template-card glass-effect">
    <div class="template-header">
      <div class="template-info">
        <h3 class="template-name">{{ name }}</h3>
        <p class="template-device">{{ template.brand }} {{ template.model }}</p>
      </div>
      <div class="template-actions">
        <button class="icon-btn" @click="emit('edit', name, template)">
          <Edit2 :size="18" />
        </button>
        <button class="icon-btn danger" @click="emit('delete', name)">
          <Trash2 :size="18" />
        </button>
      </div>
    </div>

    <div class="template-details">
      <div class="detail-item">
        <span class="detail-label">{{ t('templates.fields.manufacturer') }}:</span>
        <span class="detail-value">{{ template.manufacturer }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">{{ t('templates.fields.device') }}:</span>
        <span class="detail-value">{{ template.device }}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">{{ t('templates.fields.model') }}:</span>
        <span class="detail-value">{{ template.model }}</span>
      </div>
      <div v-if="template.mode" class="detail-item">
        <span class="detail-label">{{ t('templates.labels.mode') }}:</span>
        <span class="detail-value">
          {{
            template.mode === 'lite'
              ? t('templates.values.lite')
              : template.mode === 'full'
                ? t('templates.values.full')
                : t('templates.values.resetprop')
          }}
        </span>
      </div>
      <div v-if="template.characteristics" class="detail-item">
        <span class="detail-label">{{ t('templates.fields.characteristics') }}:</span>
        <span class="detail-value">{{ template.characteristics }}</span>
      </div>
      <div v-if="template.force_denylist_unmount !== undefined" class="detail-item">
        <span class="detail-label">{{ t('templates.fields.force_denylist_unmount') }}:</span>
        <span class="detail-value">
          {{ template.force_denylist_unmount ? t('common.enabled') : t('common.disabled') }}
        </span>
      </div>
      <div v-if="template.packages && template.packages.length > 0" class="detail-item">
        <span class="detail-label">{{ t('templates.labels.packages') }}:</span>
        <div class="packages-container">
          <div class="package-list">
            <div
              v-for="pkg in displayedPackages"
              :key="pkg"
              class="package-item"
              :title="getAppName(pkg) || pkg"
            >
              <div class="package-info">
                <div class="package-name">{{ getAppName(pkg) || pkg }}</div>
              </div>
            </div>
          </div>
          <div v-if="showMoreButton" class="more-packages" @click="toggleShowAll">
            {{ showingAll ? t('common.show_less') : t('common.show_more') }} ({{ template.packages.length }})
          </div>
        </div>
      </div>
    </div>

    <!-- 可选元数据字段 -->
    <div
      v-if="template.version || template.version_code || template.author || template.description"
      class="template-meta"
    >
      <div v-if="template.version || template.version_code" class="meta-item">
        <span class="meta-label">{{ t('templates.labels.version') }}:</span>
        <span class="meta-value">
          {{ template.version || '' }}
          <span v-if="template.version_code" class="version-code"
            >({{ template.version_code }})</span
          >
        </span>
      </div>
      <div v-if="template.author" class="meta-item">
        <span class="meta-label">{{ t('templates.labels.author') }}:</span>
        <span class="meta-value">{{ template.author }}</span>
      </div>
      <div v-if="template.description" class="meta-item meta-description">
        <span class="meta-label">{{ t('templates.labels.description') }}:</span>
        <span class="meta-value">{{ template.description }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Edit2, Trash2 } from 'lucide-vue-next'
import { toRefs, ref, computed, onMounted } from 'vue'
import { useI18n } from '../../utils/i18n'
import { useAppsStore } from '../../stores/apps'
import { useConfigStore } from '../../stores/config'
import type { Template } from '../../types'

const props = defineProps<{ name: string; template: Template }>()
const { name, template } = toRefs(props)
const emit = defineEmits<{ edit: [string, Template]; delete: [string] }>()

const { t } = useI18n()
const appsStore = useAppsStore()
const configStore = useConfigStore()

// 控制是否显示所有包
const showingAll = ref(false)

// 限制显示的包数量
const MAX_DISPLAYED_PACKAGES = 5

// 计算属性：获取要显示的包
const displayedPackages = computed(() => {
  if (!template.value.packages) return []
  return showingAll.value 
    ? template.value.packages 
    : template.value.packages.slice(0, MAX_DISPLAYED_PACKAGES)
})

// 计算属性：是否需要显示"查看更多"按钮
const showMoreButton = computed(() => {
  return template.value.packages && template.value.packages.length > MAX_DISPLAYED_PACKAGES
})

// 切换显示状态
const toggleShowAll = () => {
  showingAll.value = !showingAll.value
}

// 根据包名获取应用名称 - 优化版本，使用映射
const getAppName = (packageName: string) => {
  // 使用 configStore 的 appMap 以获得 O(1) 的查找性能
  const app = configStore.appMap.get(packageName)
  return app ? app.appName : packageName
}

onMounted(() => {
  // 组件挂载时不需要预加载图标，因为我们已经移除了图标
})
</script>

<style scoped>
.template-card {
  padding: 1.25rem;
  border-radius: 1rem;
  box-shadow: 0 2px 8px var(--shadow);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  position: relative;
  transform: translateZ(0);
  contain: layout style paint;
  box-shadow:
    0 2px 8px var(--shadow),
    0 0 0 0 transparent;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  width: 100%;
  box-sizing: border-box;
}

.template-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.template-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.template-device {
  font-size: 0.875rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.template-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  min-width: fit-content;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--background);
  border: none;
  border-radius: 0.5rem;
  color: var(--text);
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.icon-btn:active {
  background: var(--primary);
  color: white;
  transform: scale(0.95);
}

.icon-btn.danger:active {
  background: #ef4444;
}

.template-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.detail-label {
  color: var(--text-secondary);
  min-width: 100px;
}

.detail-value {
  color: var(--text);
  flex: 1;
  word-break: break-all;
}

.packages-container {
  width: 100%;
}

.package-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.package-item {
  display: flex;
  align-items: center;
  padding: 0.25rem;
  background: var(--card);
  border-radius: 0.375rem;
  max-width: 100%;
}

.package-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.package-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.package-name {
  font-size: 0.75rem;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-packages {
  color: var(--primary);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.25rem 0;
  text-align: center;
  user-select: none;
}

.more-packages:hover {
  text-decoration: underline;
}

.template-meta {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.meta-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.meta-label {
  color: var(--text-secondary);
  min-width: 50px;
  flex-shrink: 0;
}

.meta-value {
  color: var(--text);
  flex: 1;
  word-break: break-all;
}

.version-code {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.meta-description .meta-value {
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.meta-description .meta-label {
  font-size: 0.75rem;
  line-height: 1.4;
}
</style>
