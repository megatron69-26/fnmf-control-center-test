import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export function OperatorAuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [secretInput, setSecretInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!secretInput.trim()) {
      setErrorMsg('Vui lòng nhập khóa bí mật Người Vận Hành.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Get CSRF token first
      const csrfRes = await fetch('/api/auth/token');
      const csrfData = await csrfRes.json();
      const csrfToken = csrfData.token || csrfData.csrf_token;

      // 2. Perform operator login
      const res = await fetch('/api/auth/operator-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FNMF-Control-Token': csrfToken,
        },
        body: JSON.stringify({ operator_secret: secretInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Xác thực thất bại.');
      }

      onLoginSuccess(data.operator_token);
      setSecretInput('');
      onClose();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: '#f8fafc',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#0c1322',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60a5fa',
              }}
            >
              <Key size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Xác Thực Người Vận Hành</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Operator Authentication Required</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              fontSize: 12,
              lineHeight: 1.5,
              color: '#cbd5e1',
              marginBottom: 16,
            }}
          >
            <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={14} color="#38bdf8" />
              <span>Chính sách kiểm soát truy cập phân quyền:</span>
            </div>
            Chế độ quan sát (Observer) chỉ cho phép xem biểu đồ và telemetry. Để mở quyền điều khiển và gửi lệnh, vui lòng nhập khóa Operator bí mật từ tệp cấu hình bảo mật ngoài Git (<code>control-center.env</code>).
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                fontSize: 12,
                color: '#fca5a5',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
              Khóa Bí Mật Operator (OPERATOR_SECRET):
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="Nhập khóa Operator bí mật..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  borderRadius: 6,
                  border: '1px solid #334155',
                  backgroundColor: '#090d16',
                  color: '#f8fafc',
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #334155',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {loading ? 'Đang xác thực...' : 'Xác Thực Quyền Operator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
