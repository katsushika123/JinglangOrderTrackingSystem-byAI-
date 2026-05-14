import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { OrderRow, ColumnDef } from '../types'

interface DataTableProps {
  orders: OrderRow[]
  columns: ColumnDef[]
  visibleColumns: string[]
  selectedIds: Set<number>
  onSelectOne: (id: number, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onToggleCheck: (id: number, field: string) => void
  onEdit: (order: OrderRow) => void
  onShip: (order: OrderRow) => void
  onDelete: (id: number) => void
  onFiltersChange: (filters: Record<string, string>) => void
}

function getProgress(item: OrderRow): number {
  if (item.数量 <= 0) return 0
  return Math.min(Math.round(((item.shipments_total_qty || 0) / item.数量) * 1000) / 10, 100)
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return '#0f9d58'
  if (pct >= 60) return '#f9ab00'
  return '#1a73e8'
}

const DataTable: React.FC<DataTableProps> = ({
  orders,
  columns,
  visibleColumns,
  selectedIds,
  onSelectOne,
  onSelectAll,
  onToggleCheck,
  onEdit,
  onShip,
  onDelete,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFilterInput = useCallback(
    (key: string, value: string) => {
      const newFilters = { ...localFilters, [key]: value }
      setLocalFilters(newFilters)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onFiltersChange(newFilters)
      }, 300)
    },
    [localFilters, onFiltersChange]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id))

  const renderCell = (item: OrderRow, col: ColumnDef) => {
    if (col.key === 'weightInfo') {
      return `${item.weight_value || 0} ${item.weight_unit}`
    }
    if (col.key === '打标' || col.key === '贴标') {
      return (
        <input
          type="checkbox"
          checked={!!(item as any)[col.key]}
          onChange={() => onToggleCheck(item.id, col.key)}
        />
      )
    }
    return (item as any)[col.key] ?? ''
  }

  return (
    <div className="table-wrapper">
      <table className="excel-table">
        <thead>
          <tr>
            <th className="check-col">
              <input type="checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
            </th>
            <th className="row-num-header">#</th>
            {visibleColumns.map((key) => {
              const col = columns.find((c) => c.key === key)
              if (!col) return null
              return (
                <th key={col.key}>
                  <span className="th-content">{col.label}</span>
                  {col.filterable && (
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="筛选…"
                      value={localFilters[col.key] || ''}
                      onChange={(e) => handleFilterInput(col.key, e.target.value)}
                    />
                  )}
                </th>
              )
            })}
            <th><span className="th-content">进度</span></th>
            <th><span className="th-content">操作</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((item, index) => {
            const pct = getProgress(item)
            return (
              <tr key={item.id}>
                <td className="check-cell">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(e) => onSelectOne(item.id, e.target.checked)}
                  />
                </td>
                <td className="row-num">{index + 1}</td>
                {visibleColumns.map((key) => {
                  const col = columns.find((c) => c.key === key)
                  if (!col) return null
                  return <td key={col.key}>{renderCell(item, col)}</td>
                })}
                <td className="progress-cell">
                  <div className="progress-bar-wrap">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%`, background: getProgressColor(pct) }}
                    />
                  </div>
                  <div className="progress-text">
                    {item.shipments_total_qty || 0}/{item.数量} ({pct}%)
                  </div>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-sm" onClick={() => onEdit(item)}>&#x270F;&#xFE0F;</button>
                    <button className="btn btn-sm success" onClick={() => onShip(item)}>&#x1F4E6;</button>
                    <button className="btn btn-sm danger" onClick={() => onDelete(item.id)}>&#x1F5D1;</button>
                  </div>
                </td>
              </tr>
            )
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={visibleColumns.length + 4} className="empty-row">
                &#x1F4ED; 暂无数据，请添加或导入清单
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
