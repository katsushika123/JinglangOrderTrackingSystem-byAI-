import React from 'react'

interface ToolbarProps {
  batchCount: number
  selectedCount: number
  currentBatch: string
  batches: Array<{ name: string; count: number }>
  shipmentNo: string
  onAdd: () => void
  onImport: () => void
  onExport: () => void
  onResetFilters: () => void
  onToggleColumnPanel: () => void
  onBatchChange: (name: string) => void
  onBatchDelete: () => void
  onShipmentNoChange: (no: string) => void
  children?: React.ReactNode
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedCount,
  currentBatch,
  batches,
  onAdd,
  onImport,
  onExport,
  onResetFilters,
  onToggleColumnPanel,
  onBatchChange,
  onBatchDelete,
  shipmentNo,
  onShipmentNoChange,
  children,
}) => {
  return (
    <div className="toolbar">
      <span className="title">
        <span style={{ color: '#1a73e8' }}>&#x1F4CB;</span> 订单跟踪
      </span>
      <button className="btn primary" onClick={onAdd}>+ 新增</button>
      <button className="btn success" onClick={onImport}>&#x1F4E4; 导入清单</button>
      <button className="btn" onClick={onExport}>&#x1F4E5; 导出</button>
      <button className="btn" onClick={onResetFilters}>&#x1F504; 清除筛选</button>
      <button className="btn" onClick={onToggleColumnPanel}>&#x1F4CA; 列显示</button>
      <span className="spacer" />
      <span style={{ fontSize: '0.75rem', color: '#555' }}>出货单号：</span>
      <input
        type="text"
        className="filter-input"
        style={{ width: 140, marginTop: 0, marginBottom: 0 }}
        placeholder="搜索出货单号…"
        value={shipmentNo}
        onChange={(e) => onShipmentNoChange(e.target.value)}
      />
      <span style={{ fontSize: '0.75rem', color: '#555' }}>清单：</span>
      <select
        className="batch-select"
        value={currentBatch}
        onChange={(e) => onBatchChange(e.target.value)}
      >
        <option value="__ALL__">&#x1F4C1; 全部清单</option>
        {batches.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name} ({b.count}条)
          </option>
        ))}
      </select>
      {selectedCount > 0 && (
        <button className="btn btn-warning btn-sm" onClick={onBatchDelete}>
          &#x1F5D1; 批量删除 ({selectedCount})
        </button>
      )}
      <span className="hint-text">&#x1F4BE; 自动保存</span>
      {children}
    </div>
  )
}

export default Toolbar
