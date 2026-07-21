import React from 'react'

interface ConfirmModalProps {
  visible: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ visible, message, onConfirm, onCancel }) => {
  if (!visible) return null

  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <p style={{ whiteSpace: 'pre-wrap', marginBottom: 16, fontSize: '0.9rem' }}>{message}</p>
        <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
          <button className="btn" onClick={onCancel}>取消</button>
          <button className="btn primary" autoFocus onClick={onConfirm}>确定</button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal