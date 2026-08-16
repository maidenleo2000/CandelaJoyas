import React from 'react';
import './ConfirmModal.css';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Aceptar", cancelText = "Cancelar" }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title || 'Confirmación'}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
