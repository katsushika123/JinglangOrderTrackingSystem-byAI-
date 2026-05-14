import React, { useState, useEffect } from 'react'

interface BatchNameDialogProps {
  visible: boolean
  defaultName: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

const BatchNameDialog: React.FC<BatchNameDialogProps> = ({ visible, defaultName, onConfirm, onCancel }) => {
  const [name, setName] = useState('')

  useEffect(() => {
    if (visible) setName(defaultName)
  }, [visible, defaultName])

  if (!visible) return null

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      alert('清单名称不能为空')
      return
    }
    onConfirm(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm()
  }

  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <h2>&#x1F4E6; 为新清单命名</h2>
        <div className="form-group">
          <label>清单名称（已自动填入文件名）</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="请输入清单名称"
            autoFocus
          />
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onCancel}>取消</button>
          <button className="btn primary" onClick={handleConfirm}>确认导入</button>
        </div>
      </div>
    </div>
  )
}

export default BatchNameDialog
