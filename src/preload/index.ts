import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getBatches: () => Promise<BatchRow[]>
  getOrders: (batchId?: string | null, filters?: Record<string, string>, shipmentNo?: string, showDeleted?: boolean) => Promise<OrderRow[]>
  createOrder: (order: Partial<OrderRow>) => Promise<OrderRow>
  updateOrder: (id: number, data: Partial<OrderRow>) => Promise<void>
  deleteOrder: (id: number) => Promise<void>
  deleteOrders: (ids: number[]) => Promise<void>
  toggleCheck: (id: number) => Promise<void>
  restoreOrder: (id: number) => Promise<void>
  restoreOrders: (ids: number[]) => Promise<void>
  permanentDeleteOrder: (id: number) => Promise<void>
  permanentDeleteOrders: (ids: number[]) => Promise<void>
  createShipment: (orderId: number, shipment: Partial<ShipmentRow>) => Promise<ShipmentRow>
  updateShipment: (id: number, data: Partial<ShipmentRow>) => Promise<void>
  deleteShipment: (id: number) => Promise<void>
  importOrders: (orders: Partial<OrderRow>[], batchName: string) => Promise<number>
  exportOrders: (batchId?: string | null, filePath?: string) => Promise<void>
  getStats: (batchId?: string | null) => Promise<StatsRow>
  openExcelDialog: () => Promise<string | null>
  saveExcelDialog: (defaultName: string) => Promise<string | null>
  parseExcel: (filePath: string) => Promise<Partial<OrderRow>[]>
  onDbReady: (callback: () => void) => void
  onDbError: (callback: (msg: string) => void) => void
}

export interface BatchRow {
  id: number
  name: string
  count: number
  created_at: string
}

export interface OrderRow {
  id: number
  batch_id: number | null
  batch_name: string
  项目号: string
  钣金单据编码: string
  物料长代码: string
  物料名称: string
  数量: number
  色号: string
  weight_value: number
  weight_unit: string
  送货地址: string
  来料日期: string
  打标: boolean
  贴标: number
  备注: string
  shipments_total_qty: number
  shipments: ShipmentRow[]
  created_at: string
}

export interface ShipmentRow {
  id: number
  order_id: number
  出货日期: string
  出货单号: string
  出货数量: number
}

export interface StatsRow {
  total_count: number
  total_incoming: number
  total_shipped: number
}

let dbReadyFlag = false
let dbErrorFlag: string | null = null
ipcRenderer.on('db-ready', () => { dbReadyFlag = true })
ipcRenderer.on('db-error', (_e, msg) => { dbErrorFlag = String(msg) })

const api: ElectronAPI = {
  getBatches: () => ipcRenderer.invoke('db:getBatches'),
  getOrders: (batchId, filters, shipmentNo, showDeleted) => ipcRenderer.invoke('db:getOrders', batchId, filters, shipmentNo, showDeleted),
  createOrder: (order) => ipcRenderer.invoke('db:createOrder', order),
  updateOrder: (id, data) => ipcRenderer.invoke('db:updateOrder', id, data),
  deleteOrder: (id) => ipcRenderer.invoke('db:deleteOrder', id),
  deleteOrders: (ids) => ipcRenderer.invoke('db:deleteOrders', ids),
  toggleCheck: (id) => ipcRenderer.invoke('db:toggleCheck', id),
  restoreOrder: (id) => ipcRenderer.invoke('db:restoreOrder', id),
  restoreOrders: (ids) => ipcRenderer.invoke('db:restoreOrders', ids),
  permanentDeleteOrder: (id) => ipcRenderer.invoke('db:permanentDeleteOrder', id),
  permanentDeleteOrders: (ids) => ipcRenderer.invoke('db:permanentDeleteOrders', ids),
  createShipment: (orderId, shipment) => ipcRenderer.invoke('db:createShipment', orderId, shipment),
  updateShipment: (id, data) => ipcRenderer.invoke('db:updateShipment', id, data),
  deleteShipment: (id) => ipcRenderer.invoke('db:deleteShipment', id),
  importOrders: (orders, batchName) => ipcRenderer.invoke('db:importOrders', orders, batchName),
  exportOrders: (batchId, filePath) => ipcRenderer.invoke('db:exportOrders', batchId, filePath),
  getStats: (batchId) => ipcRenderer.invoke('db:getStats', batchId),
  openExcelDialog: () => ipcRenderer.invoke('dialog:openExcel'),
  saveExcelDialog: (defaultName) => ipcRenderer.invoke('dialog:saveExcel', defaultName),
  parseExcel: (filePath) => ipcRenderer.invoke('excel:parse', filePath),
  onDbReady: (callback) => {
    if (dbReadyFlag) callback()
    else ipcRenderer.once('db-ready', () => callback())
  },
  onDbError: (callback) => {
    if (dbErrorFlag) callback(dbErrorFlag)
    else ipcRenderer.once('db-error', (_e, msg) => callback(msg))
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
