import { X } from 'lucide-react'

export default function ConfirmModal({ title, children, confirmText='Confirm', danger=false, onConfirm, onClose, secondText, onSecond }) {
  return (
    <div className="modal-backdrop">
      <section className="modal small-modal">
        <button className="modal-x" onClick={onClose}><X/></button>
        <h2>{title}</h2>
        <div className="modal-copy">{children}</div>
        <div className="modal-actions">
          {onSecond && <button className="secondary" onClick={onSecond}>{secondText}</button>}
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button className={danger?'danger-btn':'primary'} onClick={onConfirm}>{confirmText}</button>
        </div>
      </section>
    </div>
  )
}
