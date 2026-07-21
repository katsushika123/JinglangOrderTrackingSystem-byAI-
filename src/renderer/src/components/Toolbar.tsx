import React from 'react'

interface ToolbarProps {
  selectedCount: number
  currentBatch: string
  batches: Array<{ name: string; count: number }>
  shipmentNo: string
  editMode: boolean
  showDeleted: boolean
  dbReady: boolean
  onAdd: () => void
  onImport: () => void
  onBatchImport: () => void
  onExport: () => void
  onResetFilters: () => void
  onToggleColumnPanel: () => void
  onBatchChange: (name: string) => void
  onBatchDelete: () => void
  onBatchPermanentDelete?: () => void
  onShipmentNoChange: (no: string) => void
  onToggleEditMode: () => void
  onBatchShipment: () => void
  onToggleRecycleBin: () => void
  children?: React.ReactNode
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedCount,
  currentBatch,
  batches,
  onAdd,
  onImport,
  onBatchImport,
  onExport,
  onResetFilters,
  onToggleColumnPanel,
  onBatchChange,
  onBatchDelete,
  onBatchPermanentDelete,
  shipmentNo,
  onShipmentNoChange,
  editMode,
  onToggleEditMode,
  onBatchShipment,
  showDeleted,
  onToggleRecycleBin,
  dbReady,
  children,
}) => {
  return (
    <div className="toolbar">
      <span className="title">
        <span style={{ color: '#1a73e8' }}>&#x1F4CB;</span> 订单跟踪
        {showDeleted && <span style={{ color: '#d93025', fontSize: '0.75rem' }}> — 回收站</span>}
        {!dbReady && <span style={{ color: '#f9ab00', fontSize: '0.75rem', marginLeft: 6 }}>数据库初始化中...</span>}
      </span>
      {!showDeleted && <button className="btn primary" onClick={onAdd} disabled={!dbReady}>+ 新增</button>}
      {!showDeleted && <button className="btn success" onClick={onImport} disabled={!dbReady}>&#x1F4E4; 导入清单</button>}
      {!showDeleted && <button className="btn success" onClick={onBatchImport} disabled={!dbReady}>&#x1F4DA; 批量导入</button>}
      <button className="btn" onClick={onExport} disabled={!dbReady}>&#x1F4E5; 导出</button>
      <button className="btn" onClick={onResetFilters} disabled={!dbReady}>&#x1F504; 清除筛选</button>
      <button className="btn" onClick={onToggleColumnPanel}>&#x1F4CA; 列显示</button>
      {!showDeleted && <button className={`btn ${editMode ? 'primary' : ''}`} onClick={onToggleEditMode} disabled={!dbReady}>
        &#x270F;&#xFE0F; {editMode ? '退出编辑' : '编辑模式'}
      </button>}
      <button className={`btn ${showDeleted ? 'danger' : ''}`} onClick={onToggleRecycleBin}>
        &#x1F5D1; {showDeleted ? '退出回收站' : '回收站'}
      </button>
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
      {!showDeleted && selectedCount > 0 && (
        <button className="btn primary btn-sm" onClick={onBatchShipment}>
          &#x1F69A; 批量出货 ({selectedCount})
        </button>
      )}
      {!showDeleted && selectedCount > 0 && (
        <button className="btn btn-warning btn-sm" onClick={onBatchDelete}>
          &#x1F5D1; 批量删除 ({selectedCount})
        </button>
      )}
      {showDeleted && selectedCount > 0 && onBatchPermanentDelete && (
        <button className="btn btn-warning btn-sm" onClick={onBatchPermanentDelete}>
          &#x1F5D1; 批量永久删除 ({selectedCount})
        </button>
      )}
      <span className="hint-text">&#x1F4BE; 自动保存</span>
      {children}
    </div>
  )
}

export default Toolbar
