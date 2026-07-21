import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'
import type { OrderRow, ShipmentRow } from '../types'
import * as ipc from '../ipc'

interface ShipmentModalProps {
  visible: boolean
  order: OrderRow | null
  onClose: () => void
  onDataChanged: () => void
}

const ShipmentModal: React.FC<ShipmentModalProps> = ({ visible, order, onClose, onDataChanged }) => {
  const [form, setForm] = useState({ 出货日期: '', 出货单号: '', 出货数量: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const shipmentNoRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (visible && order) {
      const shipped = order.shipments.reduce((sum, s) => sum + s.出货数量, 0)
      const labelQty = order.贴标 || 0
      const shippable = Math.max(0, labelQty - shipped)
      setForm({ 出货日期: new Date().toISOString().slice(0, 10), 出货单号: '', 出货数量: String(shippable || '') })
      setEditingId(null)
      setErrorMsg('')
      requestAnimationFrame(() => {
        setTimeout(() => shipmentNoRef.current?.focus(), 100)
      })
    }
  }, [visible, order?.id])

  if (!visible || !order) return null

  const shippedTotal = order.shipments.reduce((sum, s) => sum + s.出货数量, 0)
  const labelQty = order.贴标 || 0
  const remaining = order.数量 - shippedTotal
  const shippable = Math.max(0, labelQty - shippedTotal)

  const getQty = () => parseFloat(form.出货数量) || 0

  const resetForm = () => {
    setForm({ 出货日期: new Date().toISOString().slice(0, 10), 出货单号: '', 出货数量: '' })
    setEditingId(null)
    setErrorMsg('')
  }

  const showError = (msg: string) => {
    setErrorMsg(msg)
    requestAnimationFrame(() => {
      setTimeout(() => shipmentNoRef.current?.focus(), 100)
    })
  }

  const handleAddOrUpdate = async () => {
    setErrorMsg('')
    const qty = getQty()
    if (!form.出货日期 || qty <= 0) {
      showError('请填写出货日期和有效数量')
      return
    }

    const editQty = editingId
      ? (order.shipments.find((s) => s.id === editingId)?.出货数量 || 0)
      : 0
    if (shippedTotal + qty - editQty > order.数量) {
      showError('出货数量不能超过来料总数')
      return
    }
    if (shippedTotal + qty - editQty > labelQty) {
      showError(`出货数量不能超过贴标数量 (${labelQty})`)
      return
    }

    if (editingId) {
      await ipc.updateShipment(editingId, { ...form, 出货数量: qty })
    } else {
      await ipc.createShipment(order.id, { ...form, 出货数量: qty })
    }
    resetForm()
    onDataChanged()
  }

  const handleEdit = (ship: ShipmentRow) => {
    setEditingId(ship.id)
    setForm({
      出货日期: ship.出货日期,
      出货单号: ship.出货单号,
      出货数量: String(ship.出货数量 ?? '0'),
    })
    setErrorMsg('')
  }

  const handleDelete = async (shipId: number) => {
    if (!confirm('确定删除这条出货记录吗？此操作会同步减少贴标数量')) return
    const ship = order.shipments.find(s => s.id === shipId)
    const deletedQty = ship?.出货数量 || 0
    await ipc.deleteShipment(shipId)
    if (deletedQty > 0) {
      const remainingShipped = order.shipments
        .filter(s => s.id !== shipId)
        .reduce((sum, s) => sum + s.出货数量, 0)
      const newLabel = Math.max((order.贴标 || 0) - deletedQty, remainingShipped)
      await ipc.updateOrder(order.id, { 贴标: newLabel })
    }
    if (editingId === shipId) resetForm()
    onDataChanged()
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>&#x1F69A; 出货管理 — {order.物料名称 || ''}</h2>
        <p style={{ marginBottom: 8, color: '#5f6368', fontSize: '0.8rem' }}>
          &#x1F4E6; 来料：<strong>{order.数量}</strong> | &#x1F3F7; 已贴标：<strong>{labelQty}</strong> | &#x2705; 已出货：<strong>{shippedTotal}</strong> | 剩余可出：<strong>{shippable}</strong>
        </p>

        {errorMsg && (
          <div style={{ background: '#fef0f0', color: '#d93025', padding: '6px 10px', borderRadius: 4, marginBottom: 8, fontSize: '0.78rem', border: '1px solid #f5c6cb' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ background: '#f6ffed', padding: 10, borderRadius: 5, marginBottom: 8, border: '1px solid #d4e8c0' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 2, minWidth: 100 }}>
              <label>出货日期</label>
              <input type="date" value={form.出货日期} onChange={(e) => setForm({ ...form, 出货日期: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 2, minWidth: 100 }}>
              <label>出货单号</label>
              <input ref={shipmentNoRef} autoFocus value={form.出货单号} onChange={(e) => setForm({ ...form, 出货单号: e.target.value })} placeholder="单号" />
            </div>
            <div className="form-group" style={{ flex: 2, minWidth: 80 }}>
              <label>出货数量</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.出货数量}
                onChange={(e) => setForm({ ...form, 出货数量: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <button className="btn primary btn-sm" onClick={handleAddOrUpdate}>
                {editingId ? '更新' : '添加'}
              </button>
              {editingId && (
                <button className="btn btn-sm" onClick={resetForm}>取消</button>
              )}
            </div>
          </div>
        </div>

        <div className="shipment-list">
          {order.shipments.length === 0 && (
            <div style={{ color: '#999', padding: 8, textAlign: 'center' }}>暂无出货记录</div>
          )}
          {order.shipments.map((ship) => (
            <div key={ship.id} className="shipment-item" style={!ship.出货单号 ? { background: '#fff0f0', borderColor: '#f5c6cb' } : undefined}>
              <span>&#x1F4C5; {ship.出货日期}</span>
              <span style={!ship.出货单号 ? { color: '#d93025', fontWeight: 600 } : undefined}>
                {ship.出货单号 ? `#${ship.出货单号}` : <span style={{ fontStyle: 'italic' }}>无单号</span>}
              </span>
              <span style={{ fontWeight: 600, color: '#1a73e8' }}>{ship.出货数量}</span>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="btn btn-sm" onClick={() => handleEdit(ship)}>&#x270F;&#xFE0F;</button>
                <button className="btn btn-sm danger" onClick={() => handleDelete(ship.id)}>&#x1F5D1;</button>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

export default ShipmentModal