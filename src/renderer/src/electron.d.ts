import type { ElectronAPI } from '../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronAPI & {
      parseExcel: (filePath: string) => Promise<Partial<import('./types/index').OrderRow>[]>
      onDbReady: (callback: () => void) => void
      onDbError: (callback: (msg: string) => void) => void
    }
  }
}

export {}
