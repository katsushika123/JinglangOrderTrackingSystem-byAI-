import React, { useState, useCallback, useMemo } from 'react'
import Toolbar from './components/Toolbar'
import StatsBar from './components/StatsBar'
import DataTable from './components/DataTable'
import ColumnPanel from './components/ColumnPanel'
import OrderModal from './components/OrderModal'
import ShipmentModal from './components/ShipmentModal'
import BatchNameDialog from './components/BatchNameDialog'
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
    setFilters,
    addOrder,
    editOrder,
    removeOrder,
    removeOrders,
    toggleOrderCheck,
    importOrdersFromExcel,
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
  const [pendingImportOrders, setPendingImportOrders] = useState<Partial<OrderRow>[]>([])

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

  const handleEdit = useCallback((order: OrderRow) => {
    setEditingOrder(order)
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
      if (!confirm('确定删除该来料信息吗？')) return
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
    if (!confirm(`确定删除选中的 ${selectedIds.size} 条记录吗？`)) return
    await removeOrders(Array.from(selectedIds))
    setSelectedIds(new Set())
    refreshBatches()
  }, [selectedIds, removeOrders, refreshBatches])

  const handleShipment = useCallback((order: OrderRow) => {
    setShipmentOrder(order)
    setShowShipmentModal(true)
  }, [])

  const handleShipmentDataChanged = useCallback(async () => {
    await refreshBatches()
  }, [refreshBatches])

  const handleToggleCheck = useCallback(
    async (id: number, field: string) => {
      await toggleOrderCheck(id, field)
    },
    [toggleOrderCheck]
  )

  const handleResetFilters = useCallback(() => {
    setBatchId(null)
    setFilters({})
  }, [setBatchId, setFilters])

  const handleImport = useCallback(async () => {
    const filePath = await ipc.openExcelDialog()
    if (!filePath) return

    try {
      const parsed = await window.electronAPI.parseExcel(filePath)
      if (!parsed || parsed.length === 0) {
        alert('未解析到有效数据')
        return
      }
      const fileName = filePath.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '未命名'
      setBatchDefaultName(fileName)
      setPendingImportOrders(parsed)
      setShowBatchNameDialog(true)
    } catch (err: any) {
      alert('解析出错: ' + err.message)
      console.error(err)
    }
  }, [])

  const handleBatchNameConfirm = useCallback(
    async (name: string) => {
      try {
        const count = await importOrdersFromExcel(pendingImportOrders, name)
        setShowBatchNameDialog(false)
        setPendingImportOrders([])
        setBatchId(name)
        refreshBatches()
        alert(`成功导入 ${count} 条记录到清单【${name}】`)
      } catch (err: any) {
        alert('导入失败: ' + (err.message || '未知错误'))
        console.error(err)
      }
    },
    [pendingImportOrders, importOrdersFromExcel, setBatchId, refreshBatches]
  )

  const handleExport = useCallback(async () => {
    const result = await ipc.exportOrders(batchId)
    if (result) {
      alert(`导出成功！\n文件保存在：${result.filePath}`)
    } else {
      alert('没有数据可导出')
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
        batchCount={batches.length}
        selectedCount={selectedIds.size}
        currentBatch={batchId || '__ALL__'}
        batches={batchOptions}
        onAdd={handleAdd}
        onImport={handleImport}
        onExport={handleExport}
        onResetFilters={handleResetFilters}
        onToggleColumnPanel={() => setShowColPanel(!showColPanel)}
        onBatchChange={(name) => setBatchId(name === '__ALL__' ? null : name)}
        onBatchDelete={handleBatchDelete}
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

      <DataTable
        orders={orders}
        columns={ALL_COLUMNS}
        visibleColumns={visibleColumnKeys}
        selectedIds={selectedIds}
        onSelectOne={handleSelectOne}
        onSelectAll={handleSelectAll}
        onToggleCheck={handleToggleCheck}
        onEdit={handleEdit}
        onShip={handleShipment}
        onDelete={handleDeleteOrder}
        onFiltersChange={setFilters}
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
        onConfirm={handleBatchNameConfirm}
        onCancel={() => {
          setShowBatchNameDialog(false)
          setPendingImportOrders([])
        }}
      />
    </div>
  )
}

export default App
