import React from 'react'
import type { StatsRow } from '../types'

interface StatsBarProps {
  stats: StatsRow
}

const StatsBar: React.FC<StatsBarProps> = React.memo(function StatsBar({ stats }) {
  return (
    <div className="stats-bar">
      <span className="stat-item">
        &#x1F4CC; 当前显示：<strong>{stats.total_count}</strong> 条
      </span>
      <span className="stat-item">
        &#x1F4E6; 来料总数：<strong>{stats.total_incoming}</strong>
      </span>
      <span className="stat-item">
        &#x2705; 已出货：<strong>{stats.total_shipped}</strong>
      </span>
    </div>
  )
})

export default StatsBar
