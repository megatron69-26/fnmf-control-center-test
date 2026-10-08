import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function QuickToast({ toast, onDismiss }) {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        backgroundColor: '#111726',
        border: isError ? '1px solid #ef4444' : isInfo ? '1px solid #3b82f6' : '1px solid #10b981',
        borderRadius: 8,
        padding: '12px 16px',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 100,
        color: '#f8fafc',
        fontSize: 13,
        maxWidth: 420,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {isError ? (
        <AlertCircle size={18} color="#f87171" />
      ) : isInfo ? (
        <Info size={18} color="#60a5fa" />
      ) : (
        <CheckCircle2 size={18} color="#34d399" />
      )}
      <div style={{ flex: 1, lineHeight: '1.4' }}>{toast.message}</div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: 2,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
