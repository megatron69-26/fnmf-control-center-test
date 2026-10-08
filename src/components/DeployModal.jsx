import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  ShieldCheck,
  CheckCircle,
  FileArchive,
  RotateCcw,
  Layers,
  Lock,
} from 'lucide-react';

export function DeployModal({ isOpen, onClose, onConfirm, pgDetails, immutableArtifact }) {
  if (!isOpen) return null;

  const [confirmed, setConfirmed] = useState(false);
  const defaultArtifact = immutableArtifact || 'fnmf-backend-test-20c79b7_20261003_115647.jar';
  const [artifactName, setArtifactName] = useState(defaultArtifact);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (immutableArtifact) {
      setArtifactName(immutableArtifact);
    }
  }, [immutableArtifact]);

  const isBackupOk = pgDetails?.backup_verified === true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('Nút Deploy hiện đang tạm vô hiệu hóa theo yêu cầu kiểm toán an toàn (Disarmed). Không có lệnh deploy thật nào được gửi đến Note 10+.');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 540,
          backgroundColor: '#111726',
          borderRadius: 14,
          border: '1px solid #232f48',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#141c2e',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={18} color="#60a5fa" />
            <span style={{ fontSize: 16, fontWeight: 700 }}>Xác Nhận Deploy Backend Test</span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
              }}
            >
              🔒 TẠM KHÓA
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Disarm Safety Warning */}
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12,
              color: '#fca5a5',
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            <strong>CẢNH BÁO AN TOÀN KIỂM TOÁN:</strong> Nút thao tác đang được <strong>tạm vô hiệu hóa</strong> trên cả giao diện và backend cục bộ. Không gửi lệnh hoán đổi JAR thật sang Note 10+ trong phiên này. Mọi thử nghiệm đều chạy qua chế độ mock.
          </div>

          {/* Form Fields: Immutable Artifact */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
              Tệp Build Bất Biến (Immutable Build Artifact — Có gắn Commit &amp; Timestamp)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                value={artifactName}
                readOnly
                style={{
                  flex: 1,
                  backgroundColor: '#0a0f1d',
                  border: '1px solid #1e293b',
                  borderRadius: 6,
                  padding: '8px 12px',
                  fontSize: 11,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#38bdf8',
                  outline: 'none',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '6px 8px',
                  backgroundColor: '#1e293b',
                  borderRadius: 4,
                  color: '#34d399',
                  border: '1px solid #334155',
                }}
              >
                ✓ Bất Biến
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              * Quy tắc bất biến: Tệp JAR trong repo artifacts có định dạng `fnmf-backend-test-&lt;commit&gt;_&lt;timestamp&gt;.jar`, không dùng `latest.jar` hay tên tệp đích `llm-gateway-1.1.17.jar`.
            </div>
          </div>

          {/* Preflight Checks */}
          <div
            style={{
              backgroundColor: '#0a0f1d',
              borderRadius: 8,
              padding: '12px',
              border: '1px solid #1e293b',
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
              Điều Kiện Tiên Quyết (Preflight Audit)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#cbd5e1' }}>1. Bản sao lưu DB &amp; Manifest đối soát:</span>
              <span style={{ color: isBackupOk ? '#34d399' : '#f87171', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                {isBackupOk ? '✓ HỢP LỆ (.verified.json)' : '✗ THIẾU MANIFEST'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#cbd5e1' }}>2. Cơ chế Rollback tự động:</span>
              <span style={{ color: '#34d399', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                ✓ SẴN SÀNG (Single Rollback Lock)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#cbd5e1' }}>3. Semaphore Template (Thực tế):</span>
              <span style={{ color: '#60a5fa', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                Template #8 (Deploy Backend Test)
              </span>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                fontSize: 12,
                color: '#e2e8f0',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span>
                Tôi xác nhận đã đối chiếu Semaphore Template 8 và artifact bất biến.
              </span>
            </label>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled
              style={{
                padding: '8px 18px',
                borderRadius: 6,
                backgroundColor: '#334155',
                border: 'none',
                color: '#64748b',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🔒 Đã Tạm Khóa (Disarmed)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
