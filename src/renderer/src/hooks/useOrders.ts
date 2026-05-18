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
    showDeleted: boolean
    setBatchId: (id: string | null) => void
    setFilters: (filters: Record<string, string>) => void
    setShipmentNo: (no: string) => void
    setShowDeleted: (v: boolean) => void
  refresh: () => Promise<void>
  addOrder: (order: Partial<OrderRow> & { batch_name?: string }) => Promise<OrderRow>
  editOrder: (id: number, data: Partial<OrderRow>) => Promise<void>
  removeOrder: (id: number) => Promise<void>
  removeOrders: (ids: number[]) => Promise<void>
  restoreOrder: (id: number) => Promise<void>
  restoreOrders: (ids: number[]) => Promise<void>
  permanentDeleteOrder: (id: number) => Promise<void>
  permanentDeleteOrders: (ids: number[]) => Promise<void>
  toggleOrderCheck: (id: number) => Promise<void>
  setLabelQty: (id: number, qty: number) => Promise<void>
  importOrdersFromExcel: (orders: Partial<OrderRow>[], batchName: string) => Promise<number>
}

export function useOrders(): UseOrdersReturn {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [stats, setStats] = useState<StatsRow>({ total_count: 0, total_incoming: 0, total_shipped: 0 })
  const [loading, setLoading] = useState(true)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [shipmentNo, setShipmentNo] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [dbReady, setDbReady] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    window.electronAPI?.onDbReady(() => setDbReady(true))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, s] = await Promise.all([
        ipc.getOrders(batchId, filters, shipmentNo, showDeleted),
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
  }, [batchId, filters, shipmentNo, showDeleted])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (dbReady) fetchData()
  }, [fetchData, dbReady])

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

  const restoreOrderFn = useCallback(async (id: number) => {
    await ipc.restoreOrder(id)
    await fetchData()
  }, [fetchData])

  const restoreOrdersFn = useCallback(async (ids: number[]) => {
    await ipc.restoreOrders(ids)
    await fetchData()
  }, [fetchData])

  const permanentDeleteOrderFn = useCallback(async (id: number) => {
    await ipc.permanentDeleteOrder(id)
    await fetchData()
  }, [fetchData])

  const permanentDeleteOrdersFn = useCallback(async (ids: number[]) => {
    await ipc.permanentDeleteOrders(ids)
    await fetchData()
  }, [fetchData])

  const toggleOrderCheck = useCallback(async (id: number) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, 打标: !o.打标 } : o))
    await ipc.toggleCheck(id)
  }, [])

  const setLabelQty = useCallback(async (id: number, qty: number) => {
    await ipc.updateOrder(id, { 贴标: qty })
    await fetchData()
  }, [fetchData])

  const importOrdersFromExcel = useCallback(async (orders: Partial<OrderRow>[], batchName: string): Promise<number> => {
    const count = await ipc.importOrders(orders, batchName)
    await fetchData()
    return count
  }, [fetchData])

  return {
    orders,
    stats,
    loading,
    batchId,
    filters,
    shipmentNo,
    showDeleted,
    setBatchId,
    setFilters,
    setShipmentNo,
    setShowDeleted,
    refresh: fetchData,
    addOrder,
    editOrder,
    removeOrder,
    removeOrders,
    restoreOrder: restoreOrderFn,
    restoreOrders: restoreOrdersFn,
    permanentDeleteOrder: permanentDeleteOrderFn,
    permanentDeleteOrders: permanentDeleteOrdersFn,
    toggleOrderCheck,
    setLabelQty,
    importOrdersFromExcel,
  }
}
