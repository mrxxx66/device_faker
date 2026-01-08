<template>
  <div class="template-page">
    <div class="page-header">
      <h2 class="page-title">{{ t('templates.title') }}</h2>
      <el-button-group>
        <el-button type="primary" @click="showCreateTemplateDialog()">
          {{ t('templates.create_btn') }}
        </el-button>
        <el-button type="primary" @click="showOnlineTemplateDialog()">
          {{ t('templates.online_btn') }}
        </el-button>
      </el-button-group>
    </div>

    <TemplateList :templates="templates" @edit="handleEdit" @delete="deleteTemplateConfirm" />

    <TemplateDialog
      v-model="showCreateDialog"
      @saved="handleTemplateSaved"
    />

    <TemplateDialog
      v-model="showEditDialog"
      :template="editingTemplate"
      :is-editing="true"
      @saved="handleTemplateSaved"
    />

    <OnlineTemplateDialog v-model="showOnlineDialog" @imported="handleTemplateSaved" />
  </div>

  <style scoped>
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text);
    margin: 0;
  }

  .el-button-group {
    display: flex;
  }
  </style>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import TemplateDialog from '../components/templates/TemplateDialog.vue'
import TemplateHeader from '../components/templates/TemplateHeader.vue'
import TemplateList from '../components/templates/TemplateList.vue'
import OnlineTemplateDialog from '../components/OnlineTemplateDialog.vue'
import { useConfigStore } from '../stores/config'
import { useI18n } from '../utils/i18n'
import { useLazyMessageBox } from '../utils/elementPlus'
import { toast } from 'kernelsu-alt'
import type { Template } from '../types'

const configStore = useConfigStore()
const { t, locale } = useI18n()
const getMessageBox = useLazyMessageBox()

const templates = computed(() => configStore.getTemplates())

const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showOnlineDialog = ref(false)
const editingTemplate = ref<Partial<Template> | null>(null)

function showOnlineTemplateDialog() {
  showOnlineDialog.value = true
}

function showCreateTemplateDialog() {
  editingTemplate.value = null
  showCreateDialog.value = true
}

function handleEdit(name: string, template: Template) {
  editingTemplate.value = { ...template, name }
  showEditDialog.value = true
}

async function deleteTemplateConfirm(name: string) {
  try {
    const messageBox = await getMessageBox()
    await messageBox.confirm(
      t('templates.dialog.delete_confirm', { name }),
      t('templates.dialog.delete_title'),
      {
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        type: 'warning',
        appendTo: 'body',
        customClass: 'delete-confirm-box',
        modalClass: 'delete-confirm-modal',
      }
    )

    configStore.deleteTemplate(name)
    await configStore.saveConfig()
    toast(t('templates.messages.deleted'))
  } catch {
    // 用户取消
  }
}

function handleTemplateSaved() {
  showCreateDialog.value = false
  showEditDialog.value = false
  editingTemplate.value = null
}
</script>

<style scoped>
.template-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: box;
  overflow: hidden;
}
</style>

<style>
.delete-confirm-modal {
  backdrop-filter: blur(12px) saturate(120%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(120%) !important;
  background-color: rgba(0, 0, 0, 0.15) !important;
}

.dark .delete-confirm-modal {
  backdrop-filter: blur(12px) saturate(120%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(120%) !important;
  background-color: rgba(0, 0, 0, 0.4) !important;
}

.delete-confirm-box {
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(40px) saturate(150%) brightness(1.1) !important;
  -webkit-backdrop-filter: blur(40px) saturate(150%) brightness(1.1) !important;
  border: 1px solid rgba(0, 0, 0, 0.1) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.dark .delete-confirm-box {
  background: rgba(20, 20, 20, 0.6) !important;
  backdrop-filter: blur(40px) saturate(150%) brightness(0.9) !important;
  -webkit-backdrop-filter: blur(40px) saturate(150%) brightness(0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
}
</style>