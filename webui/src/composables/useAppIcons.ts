import { nextTick, ref } from 'vue'
import { wrapInputStream } from 'webuix'
import { normalizePackageName } from '../utils/package'

const ICON_CONTAINER_SELECTOR = '.app-icon-container'

type IconMap = Record<string, string>
type IconLoadedMap = Record<string, boolean>

async function loadWrapInputStream() {
  // 优先使用 webuix 库的 wrapInputStream
  if (typeof window.wrapInputStream === 'undefined') {
    window.wrapInputStream = wrapInputStream
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer)
  let binary = ''
  uint8Array.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary)
}

// 尝试从系统数据库获取应用图标（通用方法，适用于 Magisk 和其他环境）
async function loadAppIconFromSystem(packageName: string): Promise<string | null> {
  try {
    // 在浏览器环境中，我们无法直接执行 shell 命令
    // 这里只是提供一个可能的实现思路
    // 实际上在 WebUI 环境中可能需要通过 native API 来实现
    if (typeof (globalThis as any).shell?.exec !== 'undefined') {
      // 尝试使用可能存在的 shell API
      // 注意：这只是一个概念实现，实际 API 可能不同
      const result = (globalThis as any).shell.exec(`cmd package resolve-activity --brief ${packageName} | head -n 1`)
      // 实际上获取应用图标需要更复杂的处理
    }
    return null
  } catch (error) {
    console.warn(`Failed to load icon for ${packageName} from system:`, error)
    return null
  }
}

export function useAppIcons() {
  // 将缓存移到函数内部，避免多个实例间共享
  const iconCache = new Map<string, string>()

  const appIcons = ref<IconMap>({})
  const iconLoaded = ref<IconLoadedMap>({})
  const iconObserver = ref<IntersectionObserver | null>(null)
  const loadingIcons = new Set<string>() // 用于跟踪正在加载的图标
  // 使用普通变量而不是 ref，避免多个实例间共享
  let currentLoadCount = 0
  const maxConcurrentLoads = 3

  const onIconLoad = (packageName: string) => {
    iconLoaded.value[packageName] = true
  }

  const onIconError = (packageName: string) => {
    appIcons.value[packageName] = 'fallback'
    iconLoaded.value[packageName] = true
  }

  // 批量加载图标，控制并发数量
  const loadAppIcon = async (packageName: string) => {
    // 首先检查缓存中是否有图标
    if (iconCache.has(packageName)) {
      appIcons.value[packageName] = iconCache.get(packageName)!
      iconLoaded.value[packageName] = true
      return
    }

    if (appIcons.value[packageName] || loadingIcons.has(packageName)) return

    // 控制并发数量
    if (currentLoadCount >= maxConcurrentLoads) {
      // 如果达到最大并发数，延迟加载
      return new Promise((resolve) => {
        const checkAndLoad = () => {
          if (currentLoadCount < maxConcurrentLoads && !loadingIcons.has(packageName)) {
            // 直接调用内部逻辑
            internalLoadIcon(packageName).then(resolve)
          } else {
            setTimeout(checkAndLoad, 50) // 50ms 后重试
          }
        }
        checkAndLoad()
      })
    }

    // 直接调用内部加载函数
    return internalLoadIcon(packageName)
  }

  // 内部加载图标函数
  const internalLoadIcon = async (packageName: string) => {
    return new Promise(async (resolve) => {
      currentLoadCount++
      loadingIcons.add(packageName) // 标记为正在加载

      const normalizedPackage = normalizePackageName(packageName)

      try {
        if (typeof window.$packageManager !== 'undefined') {
          const pm = window.$packageManager

          try {
            const stream = pm.getApplicationIcon(normalizedPackage, 0, 0)
            if (!stream) {
              appIcons.value[packageName] = 'fallback'
              iconLoaded.value[packageName] = true
              loadingIcons.delete(packageName)
              // 缓存结果
              iconCache.set(packageName, 'fallback')
              resolve(undefined)
              return
            }

            await loadWrapInputStream()
            const wrapInputStream = window.wrapInputStream

            if (wrapInputStream) {
              const wrapped = await wrapInputStream(stream)
              const buffer = await wrapped.arrayBuffer()
              const base64 = arrayBufferToBase64(buffer)
              const iconData = `data:image/png;base64,${base64}`
              appIcons.value[packageName] = iconData
              iconLoaded.value[packageName] = true
              loadingIcons.delete(packageName)
              // 缓存结果
              iconCache.set(packageName, iconData)
              resolve(undefined)
              return
            }
          } catch (error) {
            console.warn(`Failed to load icon for ${packageName} via PackageManager:`, error)
            // ignore and fallback
          }
        }

        // 尝试 KSU API
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (globalThis as any).ksu?.getPackagesInfo !== 'undefined') {
          try {
            // KSU 环境下使用 ksu:// 协议
            const iconData = `ksu://icon/${normalizedPackage}`
            appIcons.value[packageName] = iconData
            iconLoaded.value[packageName] = true
            loadingIcons.delete(packageName)
            // 缓存结果
            iconCache.set(packageName, iconData)
            resolve(undefined)
            return
          } catch (error) {
            console.warn(`Failed to load icon for ${packageName} via KSU API:`, error)
            // 如果 KSU API 获取失败，继续执行 fallback
          }
        }

        // 尝试通用系统方法
        const systemIcon = await loadAppIconFromSystem(normalizedPackage)
        if (systemIcon) {
          appIcons.value[packageName] = systemIcon
          iconLoaded.value[packageName] = true
          loadingIcons.delete(packageName)
          // 缓存结果
          iconCache.set(packageName, systemIcon)
          resolve(undefined)
          return
        }

        // 所有方法都失败，使用 fallback
        appIcons.value[packageName] = 'fallback'
        iconLoaded.value[packageName] = true
        // 缓存结果
        iconCache.set(packageName, 'fallback')
      } catch (error) {
        console.error(`Unexpected error when loading icon for ${packageName}:`, error)
        appIcons.value[packageName] = 'fallback'
        iconLoaded.value[packageName] = true
        // 缓存结果
        iconCache.set(packageName, 'fallback')
      } finally {
        loadingIcons.delete(packageName) // 确保无论成功或失败都删除标记
        currentLoadCount--
        resolve(undefined)
      }
    })
  }

// ... existing code ...

  // 预加载可见区域的图标，而不是全部图标
  const preloadVisibleIcons = async (packageNames: string[]) => {
    // 只预加载前几个可见的应用图标，其余的交给 IntersectionObserver
    const visiblePackageNames = packageNames.slice(0, 10) // 只预加载前10个
    
    // 使用 Promise.all 批量处理，但不会阻塞主线程
    return Promise.all(
      visiblePackageNames.map(packageName => 
        new Promise<void>(resolve => {
          // 使用 setTimeout 将任务推迟到下一个事件循环
          setTimeout(() => {
            loadAppIcon(packageName).then(resolve)
          }, 0)
        })
      )
    )
  }

// ... existing code ...

  const observeContainers = () => {
    nextTick(() => {
      const containers = document.querySelectorAll(ICON_CONTAINER_SELECTOR)
      containers.forEach((container) => {
        iconObserver.value?.observe(container)
      })
    })
  }

  const setupIconObserver = () => {
    if (iconObserver.value) {
      iconObserver.value.disconnect()
    }

    iconObserver.value = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const container = entry.target as HTMLElement
            const packageName = container.dataset.package
            if (packageName) {
              // 使用 setTimeout 避免阻塞 UI 线程
              setTimeout(() => {
                loadAppIcon(packageName)
              }, 0)
              iconObserver.value?.unobserve(container)
            }
          }
        })
      },
      {
        rootMargin: '100px',
        threshold: 0.1,
      }
    )

    observeContainers()
  }

  const teardownIconObserver = () => {
    if (iconObserver.value) {
      iconObserver.value.disconnect()
      iconObserver.value = null
    }
  }

  // 添加清除缓存的方法
  const clearCache = () => {
    iconCache.clear()
    // 重置状态
    appIcons.value = {}
    iconLoaded.value = {}
  }

  return {
    appIcons,
    iconLoaded,
    loadAppIcon,
    preloadVisibleIcons, // 添加预加载可见图标的方法
    onIconLoad,
    onIconError,
    setupIconObserver,
    teardownIconObserver,
    clearCache, // 暴露清除缓存的方法
  }
}