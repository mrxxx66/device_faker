type MessageModule = typeof import('element-plus/es/components/message/index')
type MessageBoxModule = typeof import('element-plus/es/components/message-box/index')

let messageLoader: Promise<MessageModule> | null = null
let messageStyleLoaded = false

let messageBoxLoader: Promise<MessageBoxModule> | null = null
let messageBoxStyleLoaded = false

async function loadMessage() {
  if (!messageLoader) {
    messageLoader = import('element-plus/es/components/message/index')
  }

  if (!messageStyleLoaded) {
    messageStyleLoaded = true
    await import('element-plus/es/components/message/style/css')
  }

  return messageLoader
}

async function loadMessageBox() {
  if (!messageBoxLoader) {
    messageBoxLoader = import('element-plus/es/components/message-box/index')
  }

  if (!messageBoxStyleLoaded) {
    messageBoxStyleLoaded = true
    await import('element-plus/es/components/message-box/style/css')
  }

  return messageBoxLoader
}

export function useLazyMessage() {
  return async () => {
    const mod = await loadMessage()
    return mod.ElMessage
  }
}

export function useLazyMessageBox() {
  return async () => {
    const mod = await loadMessageBox()
    return mod.ElMessageBox
  }
}
