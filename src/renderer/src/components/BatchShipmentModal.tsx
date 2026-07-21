import React, { useState, useEffect, useRef } from 'react'
import type { OrderRow } from '../types'

interface BatchShipmentModalProps {
  visible: boolean
  orders: OrderRow[]
  onConfirm: (data: { 出货日期: string; 出货单号: string; 出货数量: number }) => Promise<void>
  onClose: () => void
}

const BatchShipmentModal: React.FC<BatchShipmentModalProps> = ({ visible, orders, onConfirm, onClose }) => {
  const [form, setForm] = useState({ 出货日期: '', 出货单号: '', 出货数量: '' })
  const [saving, setSaving] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setForm({ 出货日期: new Date().toISOString().slice(0, 10), 出货单号: '', 出货数量: '' })
      setSaving(false)
      setTimeout(() => dateRef.current?.focus(), 50)
    }
  }, [visible])

  if (!visible) return null

  const getQty = () => parseFloat(form.出货数量) || 0

  const handleConfirm = async () => {
    const qty = getQty()
    if (!form.出货日期 || qty <= 0) {
      alert('请填写出货日期和有效数量')
      return
    }
    if (!confirm(`确定为选中的 ${orders.length} 条订单各出货 ${qty} 吗？`)) return
    setSaving(true)
    try {
      await onConfirm({ ...form, 出货数量: qty })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h2>&#x1F69A; 批量出货 — 已选 {orders.length} 条</h2>
        <div className="form-row">
          <div className="form-group">
            <label>出货日期</label>
            <input ref={dateRef} type="date" value={form.出货日期} onChange={(e) => setForm({ ...form, 出货日期: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>出货单号（可选）</label>
            <input value={form.出货单号} onChange={(e) => setForm({ ...form, 出货单号: e.target.value })} placeholder="留空则无单号" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>出货数量（每个订单统一）</label>
            <input type="number" min="0" step="any" value={form.出货数量} onChange={(e) => setForm({ ...form, 出货数量: e.target.value })} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={saving}>取消</button>
          <button className="btn primary" onClick={handleConfirm} disabled={saving}>
            {saving ? '处理中...' : '确认批量出货'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BatchShipmentModal