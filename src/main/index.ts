import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { initDatabase } from './database'
import {
  getBatches,
  getBatchList,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  deleteOrders,
  createShipment,
  updateShipment,
  deleteShipment,
  toggleOrderCheck,
  importOrdersToBatch,
  exportOrdersToExcel,
  getStats,
  createBatch,
  parseExcelFile
} from './database'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: '订单跟踪系统'
  })

  if (process.env.NODE_ENV === 'development' || process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerIpcHandlers(): void {
  // Batches
  ipcMain.handle('db:getBatches', async () => {
    return getBatchList()
  })

  // Orders
  ipcMain.handle('db:getOrders', async (_event, batchId?: string, filters?: Record<string, string>) => {
    return getOrders(batchId || null, filters || {})
  })

  ipcMain.handle('db:createOrder', async (_event, order) => {
    return createOrder(order)
  })

  ipcMain.handle('db:updateOrder', async (_event, id: number, data) => {
    return updateOrder(id, data)
  })

  ipcMain.handle('db:deleteOrder', async (_event, id: number) => {
    return deleteOrder(id)
  })

  ipcMain.handle('db:deleteOrders', async (_event, ids: number[]) => {
    return deleteOrders(ids)
  })

  ipcMain.handle('db:toggleCheck', async (_event, id: number, field: string) => {
    return toggleOrderCheck(id, field)
  })

  // Shipments
  ipcMain.handle('db:createShipment', async (_event, orderId: number, shipment) => {
    return createShipment(orderId, shipment)
  })

  ipcMain.handle('db:updateShipment', async (_event, id: number, data) => {
    return updateShipment(id, data)
  })

  ipcMain.handle('db:deleteShipment', async (_event, id: number) => {
    return deleteShipment(id)
  })

  // Import / Export
  ipcMain.handle('db:importOrders', async (_event, orders, batchName: string) => {
    return importOrdersToBatch(orders, batchName)
  })

  ipcMain.handle('db:exportOrders', async (_event, batchId?: string) => {
    return exportOrdersToExcel(batchId || null)
  })

  // Stats
  ipcMain.handle('db:getStats', async (_event, batchId?: string) => {
    return getStats(batchId || null)
  })

  // File dialogs
  ipcMain.handle('dialog:openExcel', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '导入 Excel 清单',
      filters: [{ name: 'Excel 文件', extensions: ['xlsx', 'xls'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:saveExcel', async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出 Excel',
      defaultPath: defaultName,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle('excel:parse', async (_event, filePath: string) => {
    return parseExcelFile(filePath)
  })
}
