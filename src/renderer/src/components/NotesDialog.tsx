import React, { useState, useEffect } from 'react'

interface NotesDialogProps {
  visible: boolean
  order: { id: number; 物料名称: string; 备注?: string } | null
  onSave: (id: number, note: string) => Promise<void>
  onClose: () => void
}

const NotesDialog: React.FC<NotesDialogProps> = ({ visible, order, onSave, onClose }) => {
  const [note, setNote] = useState('')

  useEffect(() => {
    if (visible && order) {
      setNote(order.备注 || '')
    }
  }, [visible, order])

  if (!visible || !order) return null

  const handleSave = async () => {
    await onSave(order.id, note.trim())
    onClose()
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
        <h2>&#x1F4DD; 备注 — {order.物料名称}</h2>
        <div className="form-group">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="输入备注信息…"
            rows={4}
            style={{
              width: '100%',
              padding: '6px 9px',
              border: '1px solid #c8c8c8',
              borderRadius: 4,
              fontSize: '0.8rem',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" onClick={handleSave}>&#x1F4BE; 保存</button>
        </div>
      </div>
    </div>
  )
}

export default NotesDialog
