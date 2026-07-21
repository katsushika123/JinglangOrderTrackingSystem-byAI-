import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Toolbar from './components/Toolbar'
import StatsBar from './components/StatsBar'
import DataTable from './components/DataTable'
import ColumnPanel from './components/ColumnPanel'
import OrderModal from './components/OrderModal'
import ShipmentModal from './components/ShipmentModal'
import BatchNameDialog from './components/BatchNameDialog'
import NotesDialog from './components/NotesDialog'
import { useOrders } from './hooks/useOrders'
import { useBatches } from './hooks/useBatches'
import { ALL_COLUMNS, DEFAULT_COL_VISIBILITY, COL_VIS_KEY } from './types'
import type { OrderRow } from './types'
import * as ipc from './ipc'

const STORAGE_KEY_VIS = COL_VIS_KEY

function loadColVisibility(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VIS)
    if (saved) {
      const parsed = JSON.parse(saved)
      const result: Record<string, boolean> = {}
      for (const col of ALL_COLUMNS) {
        result[col.key] = parsed[col.key] ?? DEFAULT_COL_VISIBILITY[col.key] ?? true
      }
      return result
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_COL_VISIBILITY }
}

function saveColVisibility(vis: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY_VIS, JSON.stringify(vis))
}

const App: React.FC = () => {
  const {
    orders,
    stats,
    batchId,
    setBatchId,
    filters,
    setFilters,
    shipmentNo,
    setShipmentNo,
    showDeleted,
    setShowDeleted,
    loading,
    dbReady,
    addOrder,
    editOrder,
    removeOrder,
    removeOrders,
    restoreOrder,
    restoreOrders,
    permanentDeleteOrder,
    permanentDeleteOrders,
    setLabelQty,
    importOrdersFromExcel,
    refresh,
  } = useOrders()

  const { batches, refreshBatches } = useBatches()

  const [showColPanel, setShowColPanel] = useState(false)
  const [colVisibility, setColVisibility] = useState<Record<string, boolean>>(loadColVisibility)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null)
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [shipmentOrder, setShipmentOrder] = useState<OrderRow | null>(null)
  const [showBatchNameDialog, setShowBatchNameDialog] = useState(false)
  const [batchDefaultName, setBatchDefaultName] = useState('')
  const [batchDefaultDate, setBatchDefaultDate] = useState('')
  const [pendingImportOrders, setPendingImportOrders] = useState<Partial<OrderRow>[]>([])
  const [editMode, setEditMode] = useState(false)
  const [filterResetCounter, setFilterResetCounter] = useState(0)
  const [showNotesDialog, setShowNotesDialog] = useState(false)
  const [notesOrder, setNotesOrder] = useState<OrderRow | null>(null)
  const [tableKey, setTableKey] = useState(0)
  const [batchStatus, setBatchStatus] = useState('')

  const shipmentIdRef = React.useRef<number | null>(null)
  useEffect(() => {
    shipmentIdRef.current = shipmentOrder?.id ?? null
  }, [shipmentOrder])

  useEffect(() => {
    if (shipmentIdRef.current && showShipmentModal) {
      const updated = orders.find((o) => o.id === shipmentIdRef.current)
      if (updated) setShipmentOrder(updated)
    }
  }, [orders, showShipmentModal])

  const visibleColumnKeys = useMemo(
    () => ALL_COLUMNS.filter((col) => colVisibility[col.key] !== false).map((col) => col.key),
    [colVisibility]
  )

  const handleToggleColumn = useCallback((key: string) => {
    setColVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      saveColVisibility(next)
      return next
    })
  }, [])

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(orders.map((o) => o.id)))
      } else {
        setSelectedIds(new Set())
      }
    },
    [orders]
  )

  const handleAdd = useCallback(() => {
    setEditingOrder(null)
    setShowOrderModal(true)
  }, [])

  const handleSaveOrder = useCallback(
    async (data: Partial<OrderRow> & { batch_name?: string }) => {
      if (editingOrder) {
        await editOrder(editingOrder.id, data)
      } else {
        await addOrder(data)
      }
      setShowOrderModal(false)
      setEditingOrder(null)
      refreshBatches()
    },
    [editingOrder, editOrder, addOrder, refreshBatches]
  )

  const handleDeleteOrder = useCallback(
    async (id: number) => {
      if (!confirm('确定将该条目移入回收站吗？')) return
      await removeOrder(id)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      refreshBatches()
    },
    [removeOrder, refreshBatches]
  )

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定将选中的 ${selectedIds.size} 条移入回收站吗？`)) return
    await removeOrders(Array.from(selectedIds))
    setSelectedIds(new Set())
    refreshBatches()
  }, [selectedIds, removeOrders, refreshBatches])

  const handleRestore = useCallback(async (id: number) => {
    await restoreOrder(id)
    refreshBatches()
  }, [restoreOrder, refreshBatches])

  const handlePermanentDelete = useCallback(async (id: number) => {
    if (!confirm('确定永久删除该条目吗？此操作不可撤销！')) return
    await permanentDeleteOrder(id)
    refreshBatches()
  }, [permanentDeleteOrder, refreshBatches])

  const handleBatchPermanentDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确定永久删除选中的 ${selectedIds.size} 条吗？此操作不可撤销！`)) return
    await permanentDeleteOrders(Array.from(selectedIds))
    setSelectedIds(new Set())
    refreshBatches()
  }, [selectedIds, permanentDeleteOrders, refreshBatches])

  const handleShipment = useCallback((order: OrderRow) => {
    setShipmentOrder(order)
    setShowShipmentModal(true)
  }, [])

  const handleShipmentDataChanged = useCallback(async () => {
    await refresh()
    await refreshBatches()
  }, [refresh, refreshBatches])

  const handleResetFilters = useCallback(() => {
    if (batchId || Object.values(filters).some(v => v) || shipmentNo) {
      if (!confirm('确定清除当前所有筛选条件？')) return
    }
    setBatchId(null)
    setFilters({})
    setShipmentNo('')
    setFilterResetCounter(prev => prev + 1)
  }, [setBatchId, setFilters, setShipmentNo, batchId, filters, shipmentNo])

  const handleBatchChange = (name: string) => {
    setBatchId(name === '__ALL__' ? null : name)
    setFilterResetCounter(prev => prev + 1)
    setEditMode(false)
  }

  const extractDateFromName = (name: string): { cleanedName: string; dateStr: string } => {
    const today = new Date()
    let m = name.match(/(\d{4})[.\-_]?(\d{1,2})[.\-_]?(\d{1,2})/)
    if (m) {
      const mo = Math.min(12, Math.max(1, parseInt(m[2]))).toString().padStart(2, '0')
      const d = Math.min(31, Math.max(1, parseInt(m[3]))).toString().padStart(2, '0')
      return { cleanedName: name, dateStr: `${m[1]}-${mo}-${d}` }
    }
    m = name.match(/(\d{1,2})[.\-_](\d{1,2})/)
    if (m) {
      const mon = parseInt(m[1]), day = parseInt(m[2])
      if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
        const mo = mon.toString().padStart(2, '0'), d = day.toString().padStart(2, '0')
        return { cleanedName: name, dateStr: `${today.getFullYear()}-${mo}-${d}` }
      }
    }
    return { cleanedName: name, dateStr: today.toISOString().slice(0, 10) }
  }

  const processImportData = (items: Partial<OrderRow>[]): Partial<OrderRow>[] => {
    return items.map(item => ({
      ...item,
      物料长代码: (item.物料长代码 || '').replace(/\.01/g, '.02'),
    }))
  }

  const handleImport = useCallback(async () => {
    const filePath = await ipc.openExcelDialog()
    if (!filePath) return

    try {
      const parsed = await window.electronAPI.parseExcel(filePath)
      if (!parsed || parsed.length === 0) {
        alert('未解析到有效数据')
        return
      }
      const rawName = filePath.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '未命名'
      const { cleanedName, dateStr } = extractDateFromName(rawName)
      const processed = processImportData(parsed)
      setBatchDefaultName(cleanedName)
      setBatchDefaultDate(dateStr)
      setPendingImportOrders(processed)
      setShowBatchNameDialog(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('解析出错: ' + msg)
      console.error(err)
    }
  }, [])

  const handleBatchImport = useCallback(async () => {
    const filePaths = await ipc.openExcelBatchDialog()
    if (!filePaths || filePaths.length === 0) return

    let totalImported = 0
    const errors: string[] = []

    for (const filePath of filePaths) {
      try {
        const parsed = await window.electronAPI.parseExcel(filePath)
        if (!parsed || parsed.length === 0) {
          errors.push(`${filePath.split(/[\\/]/).pop()}: 未解析到有效数据`)
          continue
        }
        const rawName = filePath.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '未命名'
        const { cleanedName, dateStr } = extractDateFromName(rawName)
        const uniqueName = getUniqueBatchName(cleanedName)
        const processed = processImportData(parsed)
        const items = processed.map(item => ({ ...item, 来料日期: dateStr }))
        const count = await importOrdersFromExcel(items, uniqueName)
        totalImported += count
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${filePath.split(/[\\/]/).pop()}: ${msg}`)
      }
    }

    refreshBatches()
    if (errors.length > 0) {
      alert(`批量导入完成！成功导入 ${totalImported} 条记录\n\n以下文件导入失败:\n${errors.join('\n')}`)
    } else {
      alert(`批量导入完成！成功导入 ${totalImported} 条记录`)
    }
  }, [importOrdersFromExcel, refreshBatches, batches])

  const ordersRef = useRef(orders)
  ordersRef.current = orders

  const handleAutoBatchShipment = useCallback(async () => {
    const currentOrders = ordersRef.current
    const labeled = currentOrders.filter(o => {
      const shipped = o.shipments.reduce((sum, s) => sum + s.出货数量, 0)
      const labelQty = o.贴标 || 0
      return labelQty > 0 && shipped < labelQty
    })
    if (labeled.length === 0) {
      setBatchStatus('当前没有可出货的项目（需先填写贴标数量）')
      return
    }
    setBatchStatus(`正在出货...`)
    const today = new Date().toISOString().slice(0, 10)
    let done = 0
    let skipped = 0
    for (const o of labeled) {
      const shipped = o.shipments.reduce((sum, s) => sum + s.出货数量, 0)
      const labelQty = o.贴标 || 0
      const shippable = Math.min(o.数量 - shipped, labelQty - shipped)
      if (shippable <= 0) { skipped++; continue }
      await ipc.createShipment(o.id, { 出货日期: today, 出货单号: '', 出货数量: shippable })
      done++
    }
    await refresh()
    await refreshBatches()
    setBatchStatus(skipped > 0 ? `已出货 ${done} 条，${skipped} 条已无剩余` : `已出货 ${done} 条`)
    setTimeout(() => setBatchStatus(''), 3000)
  }, [refresh, refreshBatches])

  const getUniqueBatchName = (desired: string): string => {
    const existing = new Set(batches.filter(b => b.count > 0).map(b => b.name))
    if (!existing.has(desired)) return desired
    let i = 2
    while (existing.has(`${desired} (${i})`)) i++
    return `${desired} (${i})`
  }

  const handleBatchNameConfirm = useCallback(
    async (name: string, date: string) => {
      try {
        const uniqueName = getUniqueBatchName(name)
        const items = pendingImportOrders.map(item => ({ ...item, 来料日期: date }))
        const count = await importOrdersFromExcel(items, uniqueName)
        setShowBatchNameDialog(false)
        setPendingImportOrders([])
        setBatchId(uniqueName)
        refreshBatches()
        setEditMode(false)
        const suffix = uniqueName !== name ? `（原名【${name}】已存在，自动重命名为【${uniqueName}】）` : ''
        alert(`成功导入 ${count} 条记录到清单【${uniqueName}】，来料日期：${date}${suffix ? '\n' + suffix : ''}`)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        alert('导入失败: ' + (msg || '未知错误'))
        console.error(err)
      }
    },
    [pendingImportOrders, importOrdersFromExcel, setBatchId, refreshBatches, batches]
  )

  const handleToggleEditMode = useCallback(() => {
    if (!editMode) {
      if (!confirm('开启编辑模式后可直接在单元格中修改数据\n1. 数据不能为空值\n2. 修改后按回车键保存\n\n确定开启？')) return
    }
    setEditMode(prev => !prev)
  }, [editMode])

  const handleCellChange = useCallback(async (id: number, field: string, value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const numFields = ['数量', 'weight_value']
    const val: string | number = numFields.includes(field) ? (parseFloat(trimmed) || 0) : trimmed
    if (field === '数量' && (val as number) <= 0) return
    await editOrder(id, { [field]: val })
  }, [editOrder])

  const handleNoteSave = useCallback(async (id: number, note: string) => {
    await editOrder(id, { 备注: note })
  }, [editOrder])

  const handleExport = useCallback(async () => {
    try {
      const defaultName = batchId ? `${batchId}_导出.xlsx` : '全部订单_导出.xlsx'
      const filePath = await ipc.saveExcelDialog(defaultName)
      if (!filePath) return
      await ipc.exportOrders(batchId, filePath)
      alert(`导出成功！\n${filePath}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('导出失败: ' + (msg || '未知错误'))
    }
  }, [batchId])

  const batchOptions = useMemo(
    () =>
      batches
        .filter((b) => b.count > 0)
        .map((b) => ({
          name: b.name,
          count: b.count,
        })),
    [batches]
  )

  return (
    <div className="container">
      <Toolbar
        selectedCount={selectedIds.size}
        currentBatch={batchId || '__ALL__'}
        batches={batchOptions}
        shipmentNo={shipmentNo}
        onAdd={handleAdd}
        onImport={handleImport}
        onBatchImport={handleBatchImport}
        onExport={handleExport}
        onResetFilters={handleResetFilters}
        onToggleColumnPanel={() => setShowColPanel(!showColPanel)}
        onBatchChange={handleBatchChange}
        onBatchDelete={handleBatchDelete}
        onBatchPermanentDelete={handleBatchPermanentDelete}
        onShipmentNoChange={setShipmentNo}
        editMode={editMode}
        onToggleEditMode={handleToggleEditMode}
        onBatchShipment={handleAutoBatchShipment}
        hasLabeledOrders={orders.some(o => (o.贴标 || 0) > 0)}
        showDeleted={showDeleted}
        onToggleRecycleBin={() => { setShowDeleted(!showDeleted); setEditMode(false) }}
        dbReady={dbReady}
      >
        {showColPanel && (
          <ColumnPanel
            columns={ALL_COLUMNS}
            visibility={colVisibility}
            onToggle={handleToggleColumn}
          />
        )}
      </Toolbar>

      <StatsBar stats={stats} />
      {batchStatus && (
        <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '6px 12px', fontSize: '0.8rem', textAlign: 'center', borderBottom: '1px solid #c8e6c9' }}>
          {batchStatus}
        </div>
      )}

      <DataTable
        key={tableKey}
        orders={orders}
        columns={ALL_COLUMNS}
        visibleColumns={visibleColumnKeys}
        selectedIds={selectedIds}
        onSelectOne={handleSelectOne}
        onSelectAll={handleSelectAll}
        onLabelQtyChange={setLabelQty}
        onShip={handleShipment}
        onDelete={handleDeleteOrder}
        onNote={(order) => { setNotesOrder(order); setShowNotesDialog(true) }}
        showDeleted={showDeleted}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onFiltersChange={setFilters}
        editMode={editMode}
        onCellChange={handleCellChange}
        loading={loading || !dbReady}
        filterResetCounter={filterResetCounter}
      />

      <OrderModal
        visible={showOrderModal}
        order={editingOrder}
        currentBatch={batchId || '__ALL__'}
        onSave={handleSaveOrder}
        onClose={() => {
          setShowOrderModal(false)
          setEditingOrder(null)
        }}
      />

      <ShipmentModal
        visible={showShipmentModal}
        order={shipmentOrder}
        onClose={() => {
          setShowShipmentModal(false)
          setShipmentOrder(null)
        }}
        onDataChanged={handleShipmentDataChanged}
      />

      <BatchNameDialog
        visible={showBatchNameDialog}
        defaultName={batchDefaultName}
        defaultDate={batchDefaultDate}
        onConfirm={handleBatchNameConfirm}
        onCancel={() => {
          setShowBatchNameDialog(false)
          setPendingImportOrders([])
        }}
      />
      <NotesDialog
        visible={showNotesDialog}
        order={notesOrder}
        onSave={handleNoteSave}
        onClose={() => { setShowNotesDialog(false); setNotesOrder(null) }}
      />
    </div>
  )
}

export default App
