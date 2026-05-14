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
  onLabelQtyChange: (id: number, qty: number) => void
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
  onLabelQtyChange,
  onEdit,
  onShip,
  onDelete,
  onFiltersChange,
}) => {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({})
  const [labelEdits, setLabelEdits] = useState<Record<number, string>>({})
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

  const columnWidths: Record<string, string> = {
    '数量': '56px',
    '打标': '58px',
    '送货地址': 'auto',
  }

  const renderCell = (item: OrderRow, col: ColumnDef) => {
    if (col.key === 'weightInfo') {
      return `${item.weight_value || 0} ${item.weight_unit}`
    }
    if (col.key === '打标') {
      return (
        <input
          type="checkbox"
          checked={!!item.打标}
          onChange={() => onToggleCheck(item.id, col.key)}
        />
      )
    }
    if (col.key === '贴标') {
      const labelQty = item.贴标 || 0
      const labelPct = item.数量 > 0 ? Math.min(Math.round((labelQty / item.数量) * 1000) / 10, 100) : 0
      const editVal = labelEdits[item.id] ?? String(labelQty)
      const handleBlur = () => {
        const v = parseFloat(editVal)
        if (!isNaN(v) && v >= 0 && v <= item.数量) {
          onLabelQtyChange(item.id, v)
        }
        setLabelEdits(prev => {
          const next = { ...prev }
          delete next[item.id]
          return next
        })
      }
      return (
        <div style={{ minWidth: 90, padding: '2px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <input
              type="number"
              min="0"
              max={item.数量}
              step="any"
              value={editVal}
              onChange={(e) => setLabelEdits(prev => ({ ...prev, [item.id]: e.target.value }))}
              onBlur={handleBlur}
              style={{
                width: 50,
                fontSize: '0.68rem',
                padding: '1px 3px',
                border: '1px solid #c8c8c8',
                borderRadius: 2,
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '0.6rem', color: '#888', whiteSpace: 'nowrap' }}>
              / {item.数量}
            </span>
          </div>
          <div className="progress-bar-wrap" style={{ marginTop: 2, marginBottom: 0 }}>
            <div
              className="progress-fill"
              style={{
                width: `${labelPct}%`,
                background: labelPct >= 100 ? '#0f9d58' : labelPct >= 60 ? '#f9ab00' : '#7c4dff',
              }}
            />
          </div>
        </div>
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
                <th key={col.key} style={columnWidths[col.key] ? { width: columnWidths[col.key] } : undefined}>
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
            <th style={{ width: '100px' }}><span className="th-content">进度</span></th>
            <th style={{ width: '130px' }}><span className="th-content">操作</span></th>
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
                    <button className="btn btn-sm" onClick={() => onEdit(item)}>编辑</button>
                    <button className="btn btn-sm success" onClick={() => onShip(item)}>出货</button>
                    <button className="btn btn-sm danger" onClick={() => onDelete(item.id)}>删除</button>
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
