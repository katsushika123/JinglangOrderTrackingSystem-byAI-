import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { OrderRow, ColumnDef } from '../types'

const COL_WIDTHS_KEY = 'column_widths'

function loadColumnWidths(): Record<string, number> {
  try {
    const saved = localStorage.getItem(COL_WIDTHS_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch { return {} }
}

function saveColumnWidths(w: Record<string, number>) {
  localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(w))
}

interface DataTableProps {
  orders: OrderRow[]
  columns: ColumnDef[]
  visibleColumns: string[]
  selectedIds: Set<number>
  loading?: boolean
  onSelectOne: (id: number, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onLabelQtyChange: (id: number, qty: number) => void
  onShip: (order: OrderRow) => void
  onDelete: (id: number) => void
  onNote?: (order: OrderRow) => void
  showDeleted?: boolean
  onRestore?: (id: number) => void
  onPermanentDelete?: (id: number) => void
  filterResetCounter?: number
  onFiltersChange: (filters: Record<string, string>) => void
  editMode?: boolean
  onCellChange?: (id: number, field: string, value: string) => void
}

type OrderFieldKey = keyof Pick<OrderRow, '项目号' | '钣金单据编码' | '物料长代码' | '物料名称' | '色号' | '烤漆订单号' | '数量' | 'weight_value' | 'weight_unit' | '送货地址' | '来料日期' | '贴标' | '备注'>

function getOrderField(item: OrderRow, key: string): string {
  const fieldKeys = new Set<string>(['项目号', '钣金单据编码', '物料长代码', '物料名称', '色号', '烤漆订单号', '送货地址', '来料日期', '备注'])
  if (fieldKeys.has(key)) return ((item as unknown) as Record<string, unknown>)[key] as string ?? ''
  if (key === '数量') return String(item.数量 || '')
  if (key === 'weight_value') return String(item.weight_value || '')
  if (key === 'weightInfo') return `${item.weight_value || 0} ${item.weight_unit}`
  if (key === '贴标') return `${item.贴标 || 0} / ${item.数量}`
  return ''
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
  onLabelQtyChange,
  onShip,
  onDelete,
  onNote,
  showDeleted,
  onRestore,
  onPermanentDelete,
  onFiltersChange,
  editMode,
  onCellChange,
  loading,
  filterResetCounter,
}) => {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({})
  const [labelEdits, setLabelEdits] = useState<Record<number, string>>({})
  const [cellEdits, setCellEdits] = useState<Record<string, string>>({})
  const [resizedWidths, setResizedWidths] = useState<Record<string, number>>(loadColumnWidths)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resizeRef = useRef<{ key: string; startX: number; startW: number } | null>(null)

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

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizeRef.current) return
    const { key, startX, startW } = resizeRef.current
    const newWidth = Math.max(40, startW + (e.clientX - startX))
    setResizedWidths(prev => ({ ...prev, [key]: newWidth }))
  }, [])

  const handleResizeMoveRef = useRef(handleResizeMove)
  handleResizeMoveRef.current = handleResizeMove

  const handleResizeEnd = useCallback(() => {
    resizeRef.current = null
    document.removeEventListener('mousemove', handleResizeMoveRef.current)
    document.removeEventListener('mouseup', handleResizeEnd)
    setResizedWidths(prev => {
      saveColumnWidths(prev)
      return prev
    })
  }, [])

  const handleResizeStart = useCallback((colKey: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const th = (e.currentTarget as HTMLElement).parentElement
    const startW = th?.offsetWidth ?? 100
    resizeRef.current = { key: colKey, startX: e.clientX, startW }
    document.addEventListener('mousemove', handleResizeMoveRef.current)
    document.addEventListener('mouseup', handleResizeEnd)
  }, [handleResizeEnd])

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMoveRef.current)
      document.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [handleResizeEnd])

  const columnWidths: Record<string, string> = {
    '数量': '56px',
    '来料日期': '80px',
    '送货地址': 'auto',
  }

  const getColWidth = (key: string): string | undefined => {
    if (resizedWidths[key]) return `${resizedWidths[key]}px`
    return columnWidths[key] || undefined
  }

  useEffect(() => {
    if (filterResetCounter) setLocalFilters({})
  }, [filterResetCounter])

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id))

  const EDITABLE_COLUMNS: Record<string, 'text' | 'number' | 'date'> = {
    '项目号': 'text',
    '钣金单据编码': 'text',
    '物料长代码': 'text',
    '物料名称': 'text',
    '数量': 'number',
    '色号': 'text',
    '烤漆订单号': 'text',
    '送货地址': 'text',
    '来料日期': 'date',
  }

  const getCellEditKey = (id: number, colKey: string) => `${id}_${colKey}`

  const handleCellEditStart = (id: number, colKey: string, currentVal: string) => {
    const key = getCellEditKey(id, colKey)
    setCellEdits(prev => {
      if (prev[key] !== undefined) return prev
      return { ...prev, [key]: currentVal }
    })
  }

  const handleCellEditSave = (id: number, colKey: string) => {
    const key = getCellEditKey(id, colKey)
    const val = cellEdits[key]
    if (val !== undefined && onCellChange) {
      onCellChange(id, colKey, val)
    }
    setCellEdits(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const getCellValue = (item: OrderRow, colKey: string): string => {
    if (colKey === '数量') return String(item.数量 || '')
    return getOrderField(item, colKey)
  }

  const getCellText = (item: OrderRow, col: ColumnDef): string => {
    if (col.key === 'weightInfo') return `${item.weight_value || 0} ${item.weight_unit}`
    if (col.key === '贴标') return `${item.贴标 || 0} / ${item.数量}`
    return getOrderField(item, col.key)
  }

  const EDIT_INPUT_STYLE: React.CSSProperties = {
    fontSize: '0.68rem',
    padding: '1px 4px',
    border: '2px solid #1a73e8',
    borderRadius: 2,
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
    background: '#fffde7',
  }

  const renderCell = (item: OrderRow, col: ColumnDef) => {
    if (col.key === 'weightInfo') {
      return `${item.weight_value || 0} ${item.weight_unit}`
    }
    if (col.key === '贴标') {
      const labelQty = item.贴标 || 0
      const labelPct = item.数量 > 0 ? Math.min(Math.round((labelQty / item.数量) * 1000) / 10, 100) : 0
      if (showDeleted) {
        return <span style={{ fontSize: '0.65rem', color: '#888' }}>{labelQty} / {item.数量}</span>
      }
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
    if (editMode && EDITABLE_COLUMNS[col.key]) {
      const editType = EDITABLE_COLUMNS[col.key]
      const editKey = getCellEditKey(item.id, col.key)
      const cellVal = cellEdits[editKey] ?? getCellValue(item, col.key)
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCellEditSave(item.id, col.key)
        if (e.key === 'Escape') {
          setCellEdits(prev => {
            const next = { ...prev }
            delete next[editKey]
            return next
          })
        }
      }
      if (editType === 'date') {
        return (
          <input
            type="date"
            value={cellVal}
            onChange={(e) => setCellEdits(prev => ({ ...prev, [editKey]: e.target.value }))}
            onFocus={() => handleCellEditStart(item.id, col.key, getCellValue(item, col.key))}
            onBlur={() => handleCellEditSave(item.id, col.key)}
            onKeyDown={handleKeyDown}
            style={{ ...EDIT_INPUT_STYLE, width: '100%' }}
            className="edit-cell-input"
          />
        )
      }
      return (
        <input
          type={editType}
          value={cellVal}
          onChange={(e) => setCellEdits(prev => ({ ...prev, [editKey]: e.target.value }))}
          onFocus={() => handleCellEditStart(item.id, col.key, getCellValue(item, col.key))}
          onBlur={() => handleCellEditSave(item.id, col.key)}
          onKeyDown={handleKeyDown}
          style={EDIT_INPUT_STYLE}
          className="edit-cell-input"
        />
      )
    }
    return getOrderField(item, col.key)
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
                <th key={col.key} style={getColWidth(col.key) ? { width: getColWidth(col.key), position: 'relative' } : { position: 'relative' }}>
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
                  <div
                    className="col-resize-handle"
                    onMouseDown={(e) => handleResizeStart(col.key, e)}
                  />
                </th>
              )
            })}
            <th style={{ width: '100px' }}><span className="th-content">出货进度</span></th>
            <th style={{ width: '130px' }}><span className="th-content">操作</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((item, index) => {
            const pct = getProgress(item)
            const completed = pct >= 100
            return (
              <tr key={item.id} className={completed ? 'row-completed' : undefined}>
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
                   return <td key={col.key} title={getCellText(item, col)}>{renderCell(item, col)}</td>
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
                      {showDeleted ? (
                        <>
                          <button className="btn btn-sm success" onClick={() => onRestore?.(item.id)}>恢复</button>
                          <button className="btn btn-sm danger" onClick={() => onPermanentDelete?.(item.id)}>永久删除</button>
                        </>
                      ) : (
                        <>
                          {onNote && <button className="btn btn-sm" onClick={() => onNote(item)}>备注</button>}
                          <button className="btn btn-sm success" onClick={() => onShip(item)}>出货</button>
                          <button className="btn btn-sm danger" onClick={() => onDelete(item.id)}>删除</button>
                        </>
                      )}
                    </div>
                  </td>
              </tr>
            )
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={visibleColumns.length + 4} className="empty-row">
                {Object.values(localFilters).some(v => v) || loading
                  ? <>没有匹配的结果，请尝试调整筛选条件</>
                  : showDeleted
                    ? <>回收站为空</>
                    : <>暂无数据，请添加或导入清单</>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
