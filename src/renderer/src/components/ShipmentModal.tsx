import React, { useState } from 'react'
import type { OrderRow, ShipmentRow } from '../types'
import * as ipc from '../ipc'

interface ShipmentModalProps {
  visible: boolean
  order: OrderRow | null
  onClose: () => void
  onDataChanged: () => void
}

const ShipmentModal: React.FC<ShipmentModalProps> = ({ visible, order, onClose, onDataChanged }) => {
  const [form, setForm] = useState({ 出货日期: '', 出货单号: '', 出货数量: 0 })
  const [editingId, setEditingId] = useState<number | null>(null)

  if (!visible || !order) return null

  const shippedTotal = order.shipments.reduce((sum, s) => sum + s.出货数量, 0)
  const labelQty = order.贴标 || 0
  const remaining = order.数量 - shippedTotal
  const shippable = Math.max(0, labelQty - shippedTotal)

  const resetForm = () => {
    setForm({ 出货日期: '', 出货单号: '', 出货数量: 0 })
    setEditingId(null)
  }

  const handleAddOrUpdate = async () => {
    if (!form.出货日期 || !form.出货单号 || form.出货数量 <= 0) {
      alert('请完整填写出货信息')
      return
    }

    const editQty = editingId
      ? (order.shipments.find((s) => s.id === editingId)?.出货数量 || 0)
      : 0
    if (shippedTotal + form.出货数量 - editQty > order.数量) {
      alert('出货数量不能超过来料总数')
      return
    }
    if (shippedTotal + form.出货数量 - editQty > labelQty) {
      alert(`出货数量不能超过贴标数量 (${labelQty})`)
      return
    }

    if (editingId) {
      await ipc.updateShipment(editingId, form)
    } else {
      await ipc.createShipment(order.id, form)
    }
    resetForm()
    onDataChanged()
  }

  const handleEdit = (ship: ShipmentRow) => {
    setEditingId(ship.id)
    setForm({
      出货日期: ship.出货日期,
      出货单号: ship.出货单号,
      出货数量: ship.出货数量,
    })
  }

  const handleDelete = async (shipId: number) => {
    if (!confirm('确定删除这条出货记录吗？')) return
    await ipc.deleteShipment(shipId)
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

        <div style={{ background: '#f6ffed', padding: 10, borderRadius: 5, marginBottom: 8, border: '1px solid #d4e8c0' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 2, minWidth: 100 }}>
              <label>出货日期</label>
              <input type="date" value={form.出货日期} onChange={(e) => setForm({ ...form, 出货日期: e.target.value })} />
            </div>
            <div className="form-group" style={{ flex: 2, minWidth: 100 }}>
              <label>出货单号</label>
              <input value={form.出货单号} onChange={(e) => setForm({ ...form, 出货单号: e.target.value })} placeholder="单号" />
            </div>
            <div className="form-group" style={{ flex: 2, minWidth: 80 }}>
              <label>出货数量</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.出货数量}
                onChange={(e) => setForm({ ...form, 出货数量: parseFloat(e.target.value) || 0 })}
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
            <div key={ship.id} className="shipment-item">
              <span>&#x1F4C5; {ship.出货日期}</span>
              <span>#{ship.出货单号}</span>
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
