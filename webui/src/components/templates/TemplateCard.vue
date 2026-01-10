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
  </div>
</template>

<script setup lang="ts">
import { Edit2, Trash2 } from 'lucide-vue-next'
import { toRefs, ref, computed } from 'vue'
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
</script>
