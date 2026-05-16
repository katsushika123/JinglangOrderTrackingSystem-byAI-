import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic, type Statement } from 'sql.js'
import { app } from 'electron'
import { join, dirname } from 'path'
import * as XLSX from 'xlsx'
import * as fs from 'fs'

let SQL: SqlJsStatic | null = null
let db: SqlJsDatabase | null = null
let dbPath: string = ''

function rowToObject(stmt: Statement): Record<string, unknown> {
  const cols = stmt.getColumnNames()
  const vals = stmt.get()
  const obj: Record<string, unknown> = {}
  for (let i = 0; i < cols.length; i++) {
    obj[cols[i]] = vals[i]
  }
  return obj
}

function dbAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(rowToObject(stmt))
  }
  stmt.free()
  return rows
}

function dbRun(sql: string, params: unknown[] = [], skipSave = false): number {
  if (!db) throw new Error('Database not initialized')
  db.run(sql, params)
  const result = dbAll('SELECT last_insert_rowid() AS id')
  if (!skipSave) saveDb()
  return (result[0]?.id as number) || 0
}

function dbExec(sql: string): void {
  if (!db) throw new Error('Database not initialized')
  db.exec(sql)
  saveDb()
}

function saveDb(): void {
  if (!db || !dbPath) return
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    const dir = dirname(dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('Failed to save database:', e)
  }
}

export async function initDatabase(): Promise<void> {
  dbPath = join(app.getPath('userData'), 'order_tracking.db')

  SQL = await initSqlJs()

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')

  dbExec(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER,
      项目号 TEXT DEFAULT '',
      钣金单据编码 TEXT DEFAULT '',
      物料长代码 TEXT DEFAULT '',
      物料名称 TEXT NOT NULL DEFAULT '',
      数量 REAL DEFAULT 0,
      色号 TEXT DEFAULT '',
      weight_value REAL DEFAULT 0,
      weight_unit TEXT DEFAULT 'kg',
      烤漆订单号 TEXT DEFAULT '',
      送货地址 TEXT DEFAULT '',
      来料日期 TEXT DEFAULT '',
      打标 INTEGER DEFAULT 0,
      贴标 INTEGER DEFAULT 0,
      备注 TEXT DEFAULT '',
      deleted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      出货日期 TEXT DEFAULT '',
      出货单号 TEXT DEFAULT '',
      出货数量 REAL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_orders_batch ON orders(batch_id);
    CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
  `)
  try { db.exec(`ALTER TABLE orders ADD COLUMN 备注 TEXT DEFAULT ''`) } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE orders ADD COLUMN deleted INTEGER DEFAULT 0`) } catch { /* already exists */ }
}

interface BatchRow {
  id: number
  name: string
  count: number
  created_at: string
}

interface OrderRow {
  id: number
  batch_id: number | null
  batch_name: string
  项目号: string
  钣金单据编码: string
  物料长代码: string
  物料名称: string
  数量: number
  色号: string
  weight_value: number
  weight_unit: string
  送货地址: string
  来料日期: string
  打标: boolean
  贴标: number
  备注: string
  shipments_total_qty: number
  shipments: ShipmentRow[]
  created_at: string
}

interface ShipmentRow {
  id: number
  order_id: number
  出货日期: string
  出货单号: string
  出货数量: number
}

interface StatsRow {
  total_count: number
  total_incoming: number
  total_shipped: number
}

export function getBatchList(): BatchRow[] {
  const rows = dbAll(`
    SELECT b.id, b.name, COUNT(o.id) AS count, b.created_at
    FROM batches b
    LEFT JOIN orders o ON o.batch_id = b.id AND o.deleted = 0
    GROUP BY b.id
    ORDER BY b.id DESC
  `)
  return rows as unknown as BatchRow[]
}

export function getBatches(): BatchRow[] {
  const rows = dbAll(`SELECT id, name, created_at FROM batches ORDER BY id DESC`)
  return rows as unknown as BatchRow[]
}

export function createBatch(name: string): BatchRow {
  dbRun(`INSERT OR IGNORE INTO batches (name) VALUES (?)`, [name])
  const rows = dbAll(`SELECT id, name, created_at FROM batches WHERE name = ?`, [name])
  return rows[0] as unknown as BatchRow
}

export function getOrders(batchId: string | null, filters: Record<string, string>, shipmentNo = '', showDeleted = false): OrderRow[] {
  let sql = `
    SELECT o.*, b.name AS batch_name,
      COALESCE((SELECT SUM(出货数量) FROM shipments WHERE order_id = o.id), 0) AS shipments_total_qty
    FROM orders o
    LEFT JOIN batches b ON o.batch_id = b.id
    WHERE o.deleted = ${showDeleted ? 1 : 0}
  `
  const params: (string | number)[] = []

  if (batchId) {
    const batchRows = dbAll(`SELECT id FROM batches WHERE name = ?`, [batchId])
    if (batchRows.length > 0) {
      sql += ` AND o.batch_id = ?`
      params.push(batchRows[0].id as number)
    } else {
      return []
    }
  }

  const filterableFields = ['项目号', '钣金单据编码', '物料长代码', '物料名称', '色号', '送货地址', '来料日期']
  for (const field of filterableFields) {
    const keyword = filters[field]?.trim().toLowerCase()
    if (keyword) {
      sql += ` AND LOWER(o."${field}") LIKE ?`
      params.push(`%${keyword}%`)
    }
  }

  if (shipmentNo.trim()) {
    sql += ` AND EXISTS (SELECT 1 FROM shipments WHERE order_id = o.id AND 出货单号 LIKE ?)`
    params.push(`%${shipmentNo.trim()}%`)
  }

  sql += ` ORDER BY o.id DESC`

  const rows = dbAll(sql, params)

  const orderIds = rows.map(r => r.id as number)
  let shipmentMap = new Map<number, ShipmentRow[]>()
  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',')
    const allShipments = dbAll(
      `SELECT * FROM shipments WHERE order_id IN (${placeholders})`,
      orderIds
    ) as unknown as ShipmentRow[]
    for (const s of allShipments) {
      if (!shipmentMap.has(s.order_id)) shipmentMap.set(s.order_id, [])
      shipmentMap.get(s.order_id)!.push(s)
    }
  }

  const result: OrderRow[] = []
  for (const row of rows) {
    const shipments = shipmentMap.get(row.id as number) || []
    result.push({
      id: row.id as number,
      batch_id: row.batch_id as number | null,
      batch_name: (row.batch_name as string) || '',
      项目号: (row['项目号'] as string) || '',
      钣金单据编码: (row['钣金单据编码'] as string) || '',
      物料长代码: (row['物料长代码'] as string) || '',
      物料名称: (row['物料名称'] as string) || '',
      数量: (row['数量'] as number) || 0,
      色号: (row['色号'] as string) || '',
      weight_value: (row.weight_value as number) || 0,
       weight_unit: (row.weight_unit as string) || 'kg',
      送货地址: (row['送货地址'] as string) || '',
      来料日期: (row['来料日期'] as string) || '',
      打标: !!(row['打标'] as number),
      贴标: (row['贴标'] as number) || 0,
      备注: (row['备注'] as string) || '',
      shipments_total_qty: (row.shipments_total_qty as number) || 0,
      shipments,
      created_at: (row.created_at as string) || ''
    })
  }

  return result
}

export function createOrder(order: Partial<OrderRow> & { batch_name?: string }): OrderRow {
  let batchId: number | null = null
  let batchName = ''
  if (order.batch_name) {
    const batch = createBatch(order.batch_name)
    batchId = batch.id
    batchName = batch.name
  }

  dbRun(
    `INSERT INTO orders (batch_id, 项目号, 钣金单据编码, 物料长代码, 物料名称, 数量, 色号, weight_value, weight_unit, 送货地址, 来料日期, 打标, 贴标, 备注)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      batchId,
      order.项目号 || '',
      order.钣金单据编码 || '',
      order.物料长代码 || '',
      order.物料名称 || '',
      order.数量 || 0,
      order.色号 || '',
      order.weight_value || 0,
      order.weight_unit || 'kg',
      order.送货地址 || '',
      order.来料日期 || '',
      order.打标 ? 1 : 0,
      order.贴标 || 0,
      order.备注 || ''
    ]
  )

  const idRows = dbAll('SELECT last_insert_rowid() AS id')
  const newId = (idRows[0]?.id as number) || 0

  return {
    id: newId,
    batch_id: batchId,
    batch_name: batchName,
    项目号: order.项目号 || '',
    钣金单据编码: order.钣金单据编码 || '',
    物料长代码: order.物料长代码 || '',
    物料名称: order.物料名称 || '',
    数量: order.数量 || 0,
    色号: order.色号 || '',
    weight_value: order.weight_value || 0,
     weight_unit: order.weight_unit || 'kg',
     送货地址: order.送货地址 || '',
    来料日期: order.来料日期 || '',
    打标: order.打标 || false,
    贴标: order.贴标 || 0,
    备注: order.备注 || '',
    shipments_total_qty: 0,
    shipments: [],
    created_at: new Date().toISOString()
  }
}

export function updateOrder(id: number, data: Partial<OrderRow>): void {
  const fields: string[] = []
  const values: (string | number | null)[] = []

  const fieldMap: Record<string, string> = {
    '项目号': '项目号',
    '钣金单据编码': '钣金单据编码',
    '物料长代码': '物料长代码',
    '物料名称': '物料名称',
    '数量': '数量',
    '色号': '色号',
    'weight_value': 'weight_value',
    'weight_unit': 'weight_unit',
    '送货地址': '送货地址',
    '来料日期': '来料日期',
    '打标': '打标',
    '贴标': '贴标',
    '备注': '备注',
  }

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in data) {
      fields.push(`"${col}" = ?`)
      const val = (data as any)[key]
      if (key === '打标') {
        values.push(val ? 1 : 0)
      } else {
        values.push(val ?? '')
      }
    }
  }

  if (fields.length === 0) return

  values.push(id)
  dbRun(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteOrder(id: number): void {
  dbRun(`UPDATE orders SET deleted = 1 WHERE id = ?`, [id])
}

export function deleteOrders(ids: number[]): void {
  const placeholders = ids.map(() => '?').join(',')
  dbRun(`UPDATE orders SET deleted = 1 WHERE id IN (${placeholders})`, ids)
}

export function restoreOrder(id: number): void {
  dbRun(`UPDATE orders SET deleted = 0 WHERE id = ?`, [id])
}

export function restoreOrders(ids: number[]): void {
  const placeholders = ids.map(() => '?').join(',')
  dbRun(`UPDATE orders SET deleted = 0 WHERE id IN (${placeholders})`, ids)
}

export function permanentDeleteOrder(id: number): void {
  dbRun(`DELETE FROM orders WHERE id = ?`, [id])
}

export function permanentDeleteOrders(ids: number[]): void {
  const placeholders = ids.map(() => '?').join(',')
  dbRun(`DELETE FROM orders WHERE id IN (${placeholders})`, ids)
}

export function toggleOrderCheck(id: number, field: string): void {
  if (field !== '打标') return
  dbRun(`UPDATE orders SET "打标" = CASE WHEN "打标" = 1 THEN 0 ELSE 1 END WHERE id = ?`, [id])
}

export function createShipment(orderId: number, shipment: Partial<ShipmentRow>): ShipmentRow {
  dbRun(
    `INSERT INTO shipments (order_id, 出货日期, 出货单号, 出货数量) VALUES (?, ?, ?, ?)`,
    [orderId, shipment.出货日期 || '', shipment.出货单号 || '', shipment.出货数量 || 0]
  )

  const idRows = dbAll('SELECT last_insert_rowid() AS id')
  const newId = (idRows[0]?.id as number) || 0

  return {
    id: newId,
    order_id: orderId,
    出货日期: shipment.出货日期 || '',
    出货单号: shipment.出货单号 || '',
    出货数量: shipment.出货数量 || 0
  }
}

export function updateShipment(id: number, data: Partial<ShipmentRow>): void {
  const fields: string[] = []
  const values: (string | number)[] = []

  if ('出货日期' in data && data.出货日期 !== undefined) {
    fields.push(`"出货日期" = ?`)
    values.push(data.出货日期)
  }
  if ('出货单号' in data && data.出货单号 !== undefined) {
    fields.push(`"出货单号" = ?`)
    values.push(data.出货单号)
  }
  if ('出货数量' in data && data.出货数量 !== undefined) {
    fields.push(`"出货数量" = ?`)
    values.push(data.出货数量)
  }

  if (fields.length === 0) return

  values.push(id)
  dbRun(`UPDATE shipments SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteShipment(id: number): void {
  dbRun(`DELETE FROM shipments WHERE id = ?`, [id])
}

export function importOrdersToBatch(orders: Partial<OrderRow>[], batchName: string): number {
  if (!db) throw new Error('Database not initialized')

  db.run('BEGIN TRANSACTION')
  try {
    db.run(`INSERT OR IGNORE INTO batches (name) VALUES (?)`, [batchName])
    const batchRows = dbAll(`SELECT id FROM batches WHERE name = ?`, [batchName])
    const batchId = (batchRows[0]?.id as number) || 0

    for (let i = orders.length - 1; i >= 0; i--) {
      const item = orders[i]
      db.run(
        `INSERT INTO orders (batch_id, 项目号, 钣金单据编码, 物料长代码, 物料名称, 数量, 色号, weight_value, weight_unit, 送货地址, 来料日期, 打标, 贴标, 备注)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          batchId,
          item.项目号 || '',
          item.钣金单据编码 || '',
          item.物料长代码 || '',
          item.物料名称 || '',
          item.数量 || 0,
          item.色号 || '',
          item.weight_value || 0,
          item.weight_unit || 'kg',
          item.送货地址 || '',
          item.来料日期 || '',
          item.打标 ? 1 : 0,
          item.贴标 || 0,
          item.备注 || ''
        ]
      )
    }
    db.run('COMMIT')
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }

  saveDb()
  return orders.length
}

export function exportOrdersToExcel(batchId: string | null, filePath: string): void {
  const orders = getOrders(batchId, {})
  if (orders.length === 0) throw new Error('没有数据可导出')

  const headers = [
    '项目号', '钣金单据编码', '物料长代码', '物料名称', '数量',
    '色号', '重量/面积/体积', '送货地址', '来料日期',
    '是否打标', '贴标数量', '已出货数量', '清单', '备注'
  ]

  const rows = orders.map(o => [
    o.项目号,
    o.钣金单据编码,
    o.物料长代码,
    o.物料名称,
    o.数量,
    o.色号,
    o.weight_value ? `${o.weight_value} ${o.weight_unit}` : '',
    o.送货地址,
    o.来料日期,
    o.打标 ? '是' : '否',
    o.贴标 || 0,
    o.shipments_total_qty,
    o.batch_name,
    o.备注 || ''
  ])

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '订单数据')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const dir = dirname(filePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, buffer)
}

export function parseWeightAndUnit(raw: unknown): { weightValue: number; weightUnit: string } {
  if (!raw) return { weightValue: 0, weightUnit: 'kg' }
  const str = String(raw).trim()
  const match = str.match(/^([\d.,]+)\s*(kg|平方|立方|m[²²2³3]?)/i)
  if (match) {
    let val = parseFloat(match[1].replace(/,/g, ''))
    let unit = match[2].toLowerCase()
    if (unit.includes('kg')) unit = 'kg'
    else if (unit.includes('平方') || unit.includes('m²') || unit.includes('m2')) unit = 'm²'
    else if (unit.includes('立方') || unit.includes('m³') || unit.includes('m3')) unit = 'm³'
    return { weightValue: isNaN(val) ? 0 : val, weightUnit: unit }
  }
  const numMatch = str.match(/^[\d.,]+/)
  if (numMatch) return { weightValue: parseFloat(numMatch[0].replace(/,/g, '')), weightUnit: 'kg' }
  return { weightValue: 0, weightUnit: 'kg' }
}

export function parseExcelFile(filePath: string): Partial<OrderRow>[] {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

  if (jsonData.length < 2) return []

  const headers = (jsonData[1] as unknown[]).map(h => String(h || '').trim())
  const rows = jsonData.slice(2) as unknown[][]

  const fieldMapping: Record<string, string[]> = {
    '项目号': ['项目号'],
    '钣金单据编码': ['单据编码', '钣金单号'],
    '物料长代码': ['物料长代码', '长代码'],
    '物料名称': ['物料名称'],
    '数量': ['数量', 'qty'],
    '色号': ['色号'],
    '送货地址': ['送货地址'],
  }

  const colMap: Record<string, number> = {}
  headers.forEach((h, idx) => {
    const hn = h.normalize('NFC').replace(/[\s\uFEFF\u200B-\u200F\u202A-\u202E\u00A0]+/g, '')
    let bestLen = 0
    let bestField = ''
    for (const [field, aliases] of Object.entries(fieldMapping)) {
      for (const a of aliases) {
        const an = a.normalize('NFC').replace(/[\s\uFEFF\u200B-\u200F\u202A-\u202E\u00A0]+/g, '')
        const matchLen = hn === an ? 999 : (hn.includes(an) || an.includes(hn)) ? Math.max(hn.length, an.length) : 0
        if (matchLen > bestLen) {
          bestLen = matchLen
          bestField = field
        }
      }
    }
    if (bestField) colMap[bestField] = idx
  })

  let weightColIdx = -1
  headers.forEach((h, idx) => {
    if (/总重|重量|平方|立方/i.test(h)) weightColIdx = idx
  })

  const parsedItems: Partial<OrderRow>[] = []

  for (const row of rows) {
    if (!row || (row as unknown[]).every(c => !c)) continue
    const firstCell = String(row[0] || '').trim()
    if (firstCell === '' || firstCell === '收货方：' || firstCell.startsWith('制单')) continue

    const item: Partial<OrderRow> = {
      项目号: String(row[colMap['项目号']] || '').trim(),
      钣金单据编码: String(row[colMap['钣金单据编码']] || '').trim(),
      物料长代码: String(row[colMap['物料长代码']] || '').trim(),
      物料名称: String(row[colMap['物料名称']] || '').trim(),
      数量: parseFloat(String(row[colMap['数量']])) || 0,
       色号: String(row[colMap['色号']] || '').trim(),
       送货地址: String(row[colMap['送货地址']] || '').trim(),
      来料日期: new Date().toISOString().slice(0, 10),
      打标: false,
      贴标: 0,
    }

    if (weightColIdx >= 0) {
      const wi = parseWeightAndUnit(row[weightColIdx])
      item.weight_value = wi.weightValue
      item.weight_unit = wi.weightUnit
    } else {
      item.weight_value = 0
      item.weight_unit = 'kg'
    }

    if (!item.物料名称 && item.数量 === 0) continue
    parsedItems.push(item)
  }

  return parsedItems
}

export function getStats(batchId: string | null): StatsRow {
  let sql = `
    SELECT
      COUNT(o.id) AS total_count,
      COALESCE(SUM(o.数量), 0) AS total_incoming,
      COALESCE(SUM((SELECT SUM(出货数量) FROM shipments WHERE order_id = o.id)), 0) AS total_shipped
    FROM orders o
    WHERE o.deleted = 0
  `
  const params: (string | number)[] = []

  if (batchId) {
    const batchRows = dbAll(`SELECT id FROM batches WHERE name = ?`, [batchId])
    if (batchRows.length > 0) {
      sql += ` WHERE o.batch_id = ?`
      params.push(batchRows[0].id as number)
    }
  }

  const rows = dbAll(sql, params)
  return (rows[0] as unknown as StatsRow) || { total_count: 0, total_incoming: 0, total_shipped: 0 }
}
