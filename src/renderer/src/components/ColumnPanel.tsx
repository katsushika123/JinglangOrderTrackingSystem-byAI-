import React from 'react'
import type { ColumnDef } from '../types'

interface ColumnPanelProps {
  columns: ColumnDef[]
  visibility: Record<string, boolean>
  onToggle: (key: string) => void
}

const ColumnPanel: React.FC<ColumnPanelProps> = React.memo(function ColumnPanel({ columns, visibility, onToggle }) {
  return (
    <div className="column-panel">
      {columns.map((col) => (
        <label key={col.key}>
          <input
            type="checkbox"
            checked={visibility[col.key] ?? true}
            onChange={() => onToggle(col.key)}
          />
          {col.label}
        </label>
      ))}
    </div>
  )
})

export default ColumnPanel
