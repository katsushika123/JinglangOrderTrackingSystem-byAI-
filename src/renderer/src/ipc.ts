import type { OrderRow, BatchRow, StatsRow, ShipmentRow } from './types'

const api = window.electronAPI

export async function getBatches(): Promise<BatchRow[]> {
  return api.getBatches()
}

export async function getOrders(batchId?: string | null, filters?: Record<string, string>, shipmentNo?: string, showDeleted?: boolean): Promise<OrderRow[]> {
  return api.getOrders(batchId ?? null, filters ?? {}, shipmentNo ?? '', showDeleted ?? false)
}

export async function createOrder(order: Partial<OrderRow> & { batch_name?: string }): Promise<OrderRow> {
  return api.createOrder(order)
}

export async function updateOrder(id: number, data: Partial<OrderRow>): Promise<void> {
  return api.updateOrder(id, data)
}

export async function deleteOrder(id: number): Promise<void> {
  return api.deleteOrder(id)
}

export async function deleteOrders(ids: number[]): Promise<void> {
  return api.deleteOrders(ids)
}

export async function restoreOrder(id: number): Promise<void> {
  return api.restoreOrder(id)
}

export async function restoreOrders(ids: number[]): Promise<void> {
  return api.restoreOrders(ids)
}

export async function permanentDeleteOrder(id: number): Promise<void> {
  return api.permanentDeleteOrder(id)
}

export async function permanentDeleteOrders(ids: number[]): Promise<void> {
  return api.permanentDeleteOrders(ids)
}

export async function createShipment(orderId: number, shipment: Partial<ShipmentRow>): Promise<ShipmentRow> {
  return api.createShipment(orderId, shipment)
}

export async function updateShipment(id: number, data: Partial<ShipmentRow>): Promise<void> {
  return api.updateShipment(id, data)
}

export async function deleteShipment(id: number): Promise<void> {
  return api.deleteShipment(id)
}

export async function importOrders(orders: Partial<OrderRow>[], batchName: string): Promise<number> {
  return api.importOrders(orders, batchName)
}

export async function exportOrders(batchId?: string | null, filePath?: string): Promise<void> {
  return api.exportOrders(batchId ?? null, filePath)
}

export async function getStats(batchId?: string | null): Promise<StatsRow> {
  return api.getStats(batchId ?? null)
}

export async function openExcelDialog(): Promise<string | null> {
  return api.openExcelDialog()
}

export async function openExcelBatchDialog(): Promise<string[]> {
  return api.openExcelBatchDialog()
}

export async function saveExcelDialog(defaultName: string): Promise<string | null> {
  return api.saveExcelDialog(defaultName)
}
