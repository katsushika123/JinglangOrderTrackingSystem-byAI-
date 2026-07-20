import React, { useState, useEffect } from 'react'
import type { OrderRow } from '../types'

interface OrderModalProps {
  visible: boolean
  order: OrderRow | null
  currentBatch: string
  onSave: (data: Partial<OrderRow> & { batch_name?: string }) => Promise<void>
  onClose: () => void
}

const emptyForm = {
  项目号: '',
  钣金单据编码: '',
  物料长代码: '',
  物料名称: '',
  数量: 0,
  色号: '',
  烤漆订单号: '',
  weight_value: 0,
  weight_unit: 'kg' as string,
  送货地址: '',
  来料日期: '',
  贴标: 0,
}

const OrderModal: React.FC<OrderModalProps> = ({ visible, order, currentBatch, onSave, onClose }) => {
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    if (order) {
      setForm({
        项目号: order.项目号,
        钣金单据编码: order.钣金单据编码,
        物料长代码: order.物料长代码,
        物料名称: order.物料名称,
        数量: order.数量,
        色号: order.色号,
        烤漆订单号: order.烤漆订单号 || '',
        weight_value: order.weight_value,
        weight_unit: order.weight_unit,
        送货地址: order.送货地址,
        来料日期: order.来料日期,
        贴标: order.贴标 || 0,
      })
    } else {
      setForm({ ...emptyForm })
    }
  }, [order, visible])

  if (!visible) return null

  const handleSave = async () => {
    if (!form.物料名称 || form.数量 <= 0) {
      alert('请填写物料名称和有效数量')
      return
    }
    if (form.贴标 > form.数量) {
      alert(`贴标数量 (${form.贴标}) 不能超过总数 (${form.数量})`)
      return
    }
    const orderData: Partial<OrderRow> & { batch_name?: string } = { ...form }
    if (!order && currentBatch !== '__ALL__') {
      orderData.batch_name = currentBatch
    }
    await onSave(orderData)
    onClose()
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{order ? '✏️ 编辑来料' : '➕ 新增来料'}</h2>
        <div className="form-row">
          <div className="form-group">
            <label>项目号</label>
            <input value={form.项目号} onChange={(e) => setForm({ ...form, 项目号: e.target.value })} />
          </div>
          <div className="form-group">
            <label>钣金单据编码</label>
            <input value={form.钣金单据编码} onChange={(e) => setForm({ ...form, 钣金单据编码: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>物料长代码</label>
            <input value={form.物料长代码} onChange={(e) => setForm({ ...form, 物料长代码: e.target.value })} />
          </div>
          <div className="form-group">
            <label>物料名称</label>
            <input value={form.物料名称} onChange={(e) => setForm({ ...form, 物料名称: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>数量</label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.数量}
              onChange={(e) => setForm({ ...form, 数量: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label>色号</label>
            <input value={form.色号} onChange={(e) => setForm({ ...form, 色号: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>烤漆订单号</label>
            <input value={form.烤漆订单号} onChange={(e) => setForm({ ...form, 烤漆订单号: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>总重/平方/立方 数值</label>
            <input
              type="number"
              step="any"
              value={form.weight_value}
              onChange={(e) => setForm({ ...form, weight_value: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label>单位</label>
            <select
              value={form.weight_unit}
              onChange={(e) => setForm({ ...form, weight_unit: e.target.value })}
            >
              <option value="kg">总重 (kg)</option>
              <option value="m²">总平方 (m²)</option>
              <option value="m³">总立方 (m³)</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>送货地址</label>
            <input value={form.送货地址} onChange={(e) => setForm({ ...form, 送货地址: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>来料日期</label>
          <input
            type="date"
            value={form.来料日期}
            onChange={(e) => setForm({ ...form, 来料日期: e.target.value })}
          />
        </div>
        <div className="checkbox-group">
          <label>
            <span style={{ marginRight: 4 }}>贴标数量：</span>
            <input
              type="number"
              min="0"
              max={form.数量}
              step="any"
              value={form.贴标}
              onChange={(e) => setForm({ ...form, 贴标: parseFloat(e.target.value) || 0 })}
              style={{ width: 80 }}
            />
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={handleSave}>&#x1F4BE; 保存</button>
        </div>
      </div>
    </div>
  )
}

export default OrderModal
