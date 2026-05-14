import { useState, useEffect, useCallback, useRef } from 'react'
import type { OrderRow, StatsRow } from '../types'
import * as ipc from '../ipc'

export interface UseOrdersReturn {
  orders: OrderRow[]
  stats: StatsRow
  loading: boolean
  batchId: string | null
  filters: Record<string, string>
  shipmentNo: string
  setBatchId: (id: string | null) => void
  setFilters: (filters: Record<string, string>) => void
  setShipmentNo: (no: string) => void
  refresh: () => Promise<void>
  addOrder: (order: Partial<OrderRow> & { batch_name?: string }) => Promise<OrderRow>
  editOrder: (id: number, data: Partial<OrderRow>) => Promise<void>
  removeOrder: (id: number) => Promise<void>
  removeOrders: (ids: number[]) => Promise<void>
  toggleOrderCheck: (id: number, field: string) => Promise<void>
  setLabelQty: (id: number, qty: number) => Promise<void>
  importOrdersFromExcel: (orders: Partial<OrderRow>[], batchName: string) => Promise<number>
  exportOrdersToExcel: () => Promise<void>
}

export function useOrders(): UseOrdersReturn {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [stats, setStats] = useState<StatsRow>({ total_count: 0, total_incoming: 0, total_shipped: 0 })
  const [loading, setLoading] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [shipmentNo, setShipmentNo] = useState('')
  const mountedRef = useRef(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, s] = await Promise.all([
        ipc.getOrders(batchId, filters, shipmentNo),
        ipc.getStats(batchId)
      ])
      if (mountedRef.current) {
        setOrders(data)
        setStats(s)
      }
    } catch (err) {
      console.error('获取数据失败:', err)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [batchId, filters, shipmentNo])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const addOrder = useCallback(async (order: Partial<OrderRow> & { batch_name?: string }): Promise<OrderRow> => {
    const created = await ipc.createOrder(order)
    await fetchData()
    return created
  }, [fetchData])

  const editOrder = useCallback(async (id: number, data: Partial<OrderRow>) => {
    await ipc.updateOrder(id, data)
    await fetchData()
  }, [fetchData])

  const removeOrder = useCallback(async (id: number) => {
    await ipc.deleteOrder(id)
    await fetchData()
  }, [fetchData])

  const removeOrders = useCallback(async (ids: number[]) => {
    await ipc.deleteOrders(ids)
    await fetchData()
  }, [fetchData])

  const toggleOrderCheck = useCallback(async (id: number, field: string) => {
    await ipc.toggleCheck(id, field)
    await fetchData()
  }, [fetchData])

  const setLabelQty = useCallback(async (id: number, qty: number) => {
    await ipc.updateOrder(id, { 贴标: qty })
    await fetchData()
  }, [fetchData])

  const importOrdersFromExcel = useCallback(async (orders: Partial<OrderRow>[], batchName: string): Promise<number> => {
    const count = await ipc.importOrders(orders, batchName)
    await fetchData()
    return count
  }, [fetchData])

  const exportOrdersToExcel = useCallback(async () => {
    const result = await ipc.exportOrders(batchId)
    if (result) {
      alert(`导出成功！文件保存在：\n${result.filePath}`)
    } else {
      alert('没有数据可导出')
    }
  }, [batchId])

  return {
    orders,
    stats,
    loading,
    batchId,
    filters,
    shipmentNo,
    setBatchId,
    setFilters,
    setShipmentNo,
    refresh: fetchData,
    addOrder,
    editOrder,
    removeOrder,
    removeOrders,
    toggleOrderCheck,
    setLabelQty,
    importOrdersFromExcel,
    exportOrdersToExcel,
  }
}
