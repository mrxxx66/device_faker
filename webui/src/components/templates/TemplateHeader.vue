<template>
  <div class="page-header">
    <h2 class="page-title">{{ t('templates.title') }}</h2>
    <div class="header-actions" :class="{ 'vertical-layout': locale === 'en' }">
      <button class="add-btn secondary" @click="emit('open-online')">
        <Download :size="20" />
        {{ t('templates.actions.online') }}
      </button>
      <button class="add-btn" @click="emit('open-create')">
        <Plus :size="20" />
        {{ t('templates.actions.new') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Download } from 'lucide-vue-next'
import { toRefs } from 'vue'
import { useI18n } from '../../utils/i18n'

const props = defineProps<{ locale: string }>()
const { locale } = toRefs(props)
const emit = defineEmits<{ 'open-online': []; 'open-create': [] }>()

const { t } = useI18n()
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
  line-height: 1.3;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.header-actions.vertical-layout {
  flex-direction: column;
  align-items: flex-start;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  white-space: nowrap;
}

.add-btn.secondary {
  background: var(--card);
  color: var(--text);
  border: 1px solid var(--border);
}

.add-btn:active {
  opacity: 0.8;
  transform: scale(0.98);
}
</style>
