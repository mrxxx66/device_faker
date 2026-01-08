<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="90%"
    :close-on-click-modal="false"
    :append-to-body="true"
    :destroy-on-close="true"
    :z-index="2001"
    class="template-dialog"
    modal-class="template-modal"
  >
    <el-form :model="formData" label-width="120px" label-position="top" class="template-form">
      <el-form-item :label="t('templates.fields.name')">
        <el-input
          v-model="formData.name"
          :placeholder="t('templates.placeholders.name')"
          :disabled="isEditing"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.manufacturer')">
        <el-input
          v-model="formData.manufacturer"
          :placeholder="t('templates.placeholders.manufacturer')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.brand')">
        <el-input
          v-model="formData.brand"
          :placeholder="t('templates.placeholders.brand')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.model')">
        <el-input
          v-model="formData.model"
          :placeholder="t('templates.placeholders.model')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.device')">
        <el-input
          v-model="formData.device"
          :placeholder="t('templates.placeholders.device')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.product')">
        <el-input
          v-model="formData.product"
          :placeholder="t('templates.placeholders.product')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.name_field')">
        <el-input
          v-model="formData.name"
          :placeholder="t('templates.placeholders.name_field')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.market_name')">
        <el-input
          v-model="formData.marketname"
          :placeholder="t('templates.placeholders.market_name')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.fingerprint')">
        <el-input
          v-model="formData.fingerprint"
          type="textarea"
          :rows="3"
          :placeholder="t('templates.placeholders.fingerprint')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.fields.mode')">
        <el-select
          v-model="formData.mode"
          :placeholder="t('templates.placeholders.mode')"
          clearable
          style="width: 100%"
        >
          <el-option :label="t('templates.options.mode_lite')" value="lite" />
          <el-option :label="t('templates.options.mode_full')" value="full" />
          <el-option :label="t('templates.options.mode_resetprop')" value="resetprop" />
        </el-select>
      </el-form-item>

      <el-form-item
        v-if="
          formData.mode === 'resetprop' ||
          (!formData.mode && configStore.config.default_mode === 'resetprop')
        "
        :label="t('templates.fields.characteristics')"
      >
        <el-input
          v-model="formData.characteristics"
          :placeholder="t('templates.placeholders.characteristics')"
        />
      </el-form-item>

      <el-form-item :label="t('templates.fields.force_denylist_unmount')">
        <el-select
          v-model="formData.force_denylist_unmount"
          :placeholder="t('common.default')"
          style="width: 100%"
        >
          <el-option :label="t('common.default')" :value="undefined" />
          <el-option :label="t('common.enabled')" :value="true" />
          <el-option :label="t('common.disabled')" :value="false" />
        </el-select>
      </el-form-item>

      <!-- 元数据字段（可选） -->
      <el-divider>{{ t('templates.dividers.metadata') }}</el-divider>
      <el-form-item :label="t('templates.labels.version')">
        <el-input
          v-model="formData.version"
          :placeholder="t('templates.placeholders.version')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.labels.version_code')">
        <el-input
          v-model.number="formData.version_code"
          type="number"
          :placeholder="t('templates.placeholders.version_code')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.labels.author')">
        <el-input
          v-model="formData.author"
          :placeholder="t('templates.placeholders.author')"
        />
      </el-form-item>
      <el-form-item :label="t('templates.labels.description')">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="2"
          :placeholder="t('templates.placeholders.description')"
        />
      </el-form-item>

      <!-- 已选择的应用列表 -->
      <el-divider>{{ t('templates.dividers.selected_apps') }}</el-divider>
      <div v-if="formData.packages && formData.packages.length > 0" class="selected-apps">
        <div
          v-for="item in formData.packages"
          :key="item"
          class="selected-app-item"
          :title="getAppName(item) || item"
        >
          <div class="app-info">
            <div class="app-name">{{ getAppName(item) || item }}</div>
          </div>
          <button class="remove-btn" @click="removePackage(item)">
            <X :size="14" />
          </button>
        </div>
      </div>
      <div v-else class="no-selected">
        {{ t('templates.hints.no_selected_apps') }}
      </div>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="saveTemplate">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useConfigStore } from '../../stores/config'
import { useAppsStore } from '../../stores/apps'
import { useI18n } from '../../utils/i18n'
import { toast } from 'kernelsu-alt'
import type { Template } from '../../types'

const props = defineProps<{
  modelValue: boolean
  template?: Partial<Template>
  isEditing?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

const configStore = useConfigStore()
const appsStore = useAppsStore()
const { t } = useI18n()

const formData = ref<Partial<Template>>({
  packages: [],
  name: '',
  manufacturer: '',
  brand: '',
  model: '',
  device: '',
  product: '',
  name: '',
  marketname: '',
  fingerprint: '',
  mode: undefined,
  characteristics: '',
  force_denylist_unmount: undefined,
  version: undefined,
  version_code: undefined,
  author: undefined,
  description: undefined,
})

const visible = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
})

const dialogTitle = computed(() =>
  props.isEditing ? t('templates.edit_title') : t('templates.create_title')
)

const getAppName = (packageName: string) => {
  const app = appsStore.installedApps.find(app => app.packageName === packageName)
  return app ? app.appName : packageName
}

const removePackage = (packageName: string) => {
  if (formData.value.packages) {
    formData.value.packages = formData.value.packages.filter(p => p !== packageName)
  }
}

const saveTemplate = async () => {
  if (!formData.value.name) {
    toast(t('templates.messages.name_required'))
    return
  }

  try {
    if (props.isEditing && props.template?.name) {
      // 编辑现有模板
      configStore.setTemplate(props.template.name!, { ...formData.value } as Template)
    } else {
      // 创建新模板
      configStore.setTemplate(formData.value.name!, { ...formData.value } as Template)
    }

    await configStore.saveConfig()
    toast(t('templates.messages.saved'))
    visible.value = false
    emit('saved')
  } catch (error) {
    console.error('Failed to save template:', error)
    toast(t('common.failed'))
  }
}

watch(
  () => props.template,
  (newTemplate) => {
    if (newTemplate) {
      // 复制模板数据到表单
      formData.value = {
        ...JSON.parse(JSON.stringify(newTemplate)), // 深拷贝
        packages: [...(newTemplate.packages || [])], // 复制数组
      }
    } else {
      // 重置表单
      formData.value = {
        packages: [],
        name: '',
        manufacturer: '',
        brand: '',
        model: '',
        device: '',
        product: '',
        name: '',
        marketname: '',
        fingerprint: '',
        mode: undefined,
        characteristics: '',
        force_denylist_unmount: undefined,
        version: undefined,
        version_code: undefined,
        author: undefined,
        description: undefined,
      }
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.template-form {
  padding: 1rem 0;
}

.selected-apps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.selected-app-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: var(--card);
  border-radius: 0.375rem;
}

.app-info {
  flex: 1;
  min-width: 0;
}

.app-name {
  font-size: 0.875rem;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--danger);
  border: none;
  border-radius: 0.25rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  opacity: 0.8;
  transform: scale(1.05);
}

.no-selected {
  padding: 1rem;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

:deep(.el-divider) {
  margin: 1.5rem 0;
}

:deep(.el-divider__text) {
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
}
</style>
