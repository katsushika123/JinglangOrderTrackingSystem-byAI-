export interface OrderRow {
  id: number
  batch_id: number | null
  batch_name: string
  项目号: string
  钣金单据编码: string
  物料长代码: string
  物料名称: string
  数量: number
  色号: string
  烤漆订单号: string
  weight_value: number
  weight_unit: string
  送货地址: string
  是否外发: string
  来料日期: string
  贴标: number
  备注: string
  shipments_total_qty: number
  shipments: ShipmentRow[]
  created_at: string
}

export interface ShipmentRow {
  id: number
  order_id: number
  出货日期: string
  出货单号: string
  出货数量: number
}

export interface BatchRow {
  id: number
  name: string
  count: number
  created_at: string
}

export interface StatsRow {
  total_count: number
  total_incoming: number
  total_shipped: number
}

export type ColumnDef = {
  key: string
  label: string
  filterable: boolean
}

export const ALL_COLUMNS: ColumnDef[] = [
  { key: '项目号', label: '项目号', filterable: true },
  { key: '钣金单据编码', label: '单据编码', filterable: true },
  { key: '物料长代码', label: '物料长代码', filterable: true },
  { key: '物料名称', label: '物料名称', filterable: true },
  { key: '数量', label: '数量', filterable: false },
  { key: '色号', label: '色号', filterable: true },
  { key: '烤漆订单号', label: '烤漆订单号', filterable: true },
  { key: 'weightInfo', label: '重量/面积/体积', filterable: false },
  { key: '送货地址', label: '送货地址', filterable: true },
  { key: '是否外发', label: '生产厂商', filterable: true },
  { key: '来料日期', label: '来料日期', filterable: true },
  { key: '贴标', label: '贴标进度', filterable: false },
]

export const DEFAULT_COL_VISIBILITY: Record<string, boolean> = {
  '项目号': true,
  '钣金单据编码': true,
  '物料长代码': true,
  '物料名称': true,
  '数量': true,
  '色号': false,
  '烤漆订单号': true,
  'weightInfo': false,
  '送货地址': true,
  '是否外发': false,
  '来料日期': false,
  '贴标': true,
}

export const COL_VIS_KEY = 'column_visibility'
