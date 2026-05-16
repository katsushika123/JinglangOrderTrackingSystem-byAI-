import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  getBatches: () => Promise<BatchRow[]>
  getOrders: (batchId?: string | null, filters?: Record<string, string>, shipmentNo?: string) => Promise<OrderRow[]>
  createOrder: (order: Partial<OrderRow>) => Promise<OrderRow>
  updateOrder: (id: number, data: Partial<OrderRow>) => Promise<void>
  deleteOrder: (id: number) => Promise<void>
  deleteOrders: (ids: number[]) => Promise<void>
  toggleCheck: (id: number, field: string) => Promise<void>
  createShipment: (orderId: number, shipment: Partial<ShipmentRow>) => Promise<ShipmentRow>
  updateShipment: (id: number, data: Partial<ShipmentRow>) => Promise<void>
  deleteShipment: (id: number) => Promise<void>
  importOrders: (orders: Partial<OrderRow>[], batchName: string) => Promise<number>
  exportOrders: (batchId?: string | null, filePath?: string) => Promise<void>
  getStats: (batchId?: string | null) => Promise<StatsRow>
  openExcelDialog: () => Promise<string | null>
  saveExcelDialog: (defaultName: string) => Promise<string | null>
  parseExcel: (filePath: string) => Promise<Partial<OrderRow>[]>
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

const api: ElectronAPI = {
  getBatches: () => ipcRenderer.invoke('db:getBatches'),
  getOrders: (batchId, filters, shipmentNo) => ipcRenderer.invoke('db:getOrders', batchId, filters, shipmentNo),
  createOrder: (order) => ipcRenderer.invoke('db:createOrder', order),
  updateOrder: (id, data) => ipcRenderer.invoke('db:updateOrder', id, data),
  deleteOrder: (id) => ipcRenderer.invoke('db:deleteOrder', id),
  deleteOrders: (ids) => ipcRenderer.invoke('db:deleteOrders', ids),
  toggleCheck: (id, field) => ipcRenderer.invoke('db:toggleCheck', id, field),
  createShipment: (orderId, shipment) => ipcRenderer.invoke('db:createShipment', orderId, shipment),
  updateShipment: (id, data) => ipcRenderer.invoke('db:updateShipment', id, data),
  deleteShipment: (id) => ipcRenderer.invoke('db:deleteShipment', id),
  importOrders: (orders, batchName) => ipcRenderer.invoke('db:importOrders', orders, batchName),
  exportOrders: (batchId, filePath) => ipcRenderer.invoke('db:exportOrders', batchId, filePath),
  getStats: (batchId) => ipcRenderer.invoke('db:getStats', batchId),
  openExcelDialog: () => ipcRenderer.invoke('dialog:openExcel'),
  saveExcelDialog: (defaultName) => ipcRenderer.invoke('dialog:saveExcel', defaultName),
  parseExcel: (filePath) => ipcRenderer.invoke('excel:parse', filePath)
}

contextBridge.exposeInMainWorld('electronAPI', api)
