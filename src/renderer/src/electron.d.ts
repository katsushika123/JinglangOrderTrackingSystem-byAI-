import type { ElectronAPI } from '../../preload/index'

declare global {
  interface Window {
    electronAPI: ElectronAPI & {
      parseExcel: (filePath: string) => Promise<Partial<import('./types/index').OrderRow>[]>
    }
  }
}

export {}
