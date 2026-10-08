import React from 'react';
import {
  Activity,
  Layers,
  Shield,
  Play,
  RotateCcw,
  ExternalLink,
  WifiOff,
  Wifi,
  Key,
  LogOut,
  Sparkles,
} from 'lucide-react';

export function ControlNavbar({
  telemetry,
  onOpenDeployModal,
  onTriggerHealth,
  isDropping,
  onToggleDrop,
  role = 'OBSERVER',
  onOpenOperatorModal,
  onOperatorLogout,
}) {
  const isHealthy = !telemetry.is_stale && telemetry.nodes?.android_device?.status === 'UP';
  const sbNode = telemetry.nodes?.spring_boot || {};
  const pgNode = telemetry.nodes?.postgresql || {};

  const isOperator = role === 'OPERATOR';

  return (
    <header
      style={{
        height: 60,
        backgroundColor: '#0c101a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 40,
        position: 'relative',
        color: '#f8fafc',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Left: Project Brand & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 14,
              color: '#ffffff',
            }}
          >
            F
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>
                FNMF Test Control Center
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: isHealthy ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: isHealthy ? '#34d399' : '#f87171',
                  border: isHealthy ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {isHealthy ? 'POLLING 5s (LIVE)' : 'MẤT ADB / DỮ LIỆU STALE'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Laptop Host (127.0.0.1:4100) ⇄ Samsung Galaxy Note 10+ (R3CM8105TPA)
            </div>
          </div>
        </div>

        {/* Vertical divider */}
        <div style={{ height: 24, width: 1, backgroundColor: '#1e293b' }} />

        {/* Quick Audited Status Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
            <span>Backend:</span>
            <span style={{ color: sbNode.status === 'UP' ? '#34d399' : '#f87171', fontWeight: 600 }}>
              {sbNode.status === 'UP' && sbNode.details?.pid ? `PID ${sbNode.details.pid}` : sbNode.status || 'DOWN'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}>
            <span>Flyway:</span>
            <span style={{ color: pgNode.status === 'UP' ? '#38bdf8' : '#f87171', fontWeight: 600 }}>
              {pgNode.status === 'UP' ? (pgNode.details?.flyway_version || 'V?') + (pgNode.details?.tables_count ? ` (${pgNode.details.tables_count} tbl)` : '') : 'UNKNOWN'}
            </span>
          </div>

          <div
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}
            title={`Backup: ${pgNode.details?.latest_backup || 'None'}\nSHA-256 (On-Disk): ${pgNode.details?.backup_sha256 || 'None'}\nMethod: ${pgNode.details?.backup_verification_method || 'Unverified'}`}
          >
            <span>Backup:</span>
            <span style={{ color: pgNode.status === 'UP' && pgNode.details?.backup_verified && pgNode.details?.backup_hash_matched ? '#34d399' : '#f87171', fontWeight: 600 }}>
              {pgNode.status !== 'UP'
                ? 'UNKNOWN / STALE'
                : pgNode.details?.backup_verified && pgNode.details?.backup_hash_matched
                ? 'VERIFIED (SHA-256 OK)'
                : 'UNVERIFIED'}
            </span>
          </div>

          {/* Real Pipeline State Chip */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8' }}
            title={`Chuỗi Git→Build→Note 10+: ${telemetry.pipelines?.backend?.status_reason || 'N/A'}`}
          >
            <span>Pipeline:</span>
            <span
              style={{
                color:
                  telemetry.pipelines?.backend?.status === 'DEPLOYED' ? '#34d399'
                  : telemetry.pipelines?.backend?.status === 'BUILT — NOT DEPLOYED' ? '#fbbf24'
                  : telemetry.pipelines?.backend?.status === 'NEW COMMIT' ? '#60a5fa'
                  : telemetry.pipelines?.backend?.status === 'BUILD FAILED' ? '#f87171'
                  : '#94a3b8',
                fontWeight: 700,
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              {telemetry.pipelines?.backend?.status || 'UNKNOWN'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions & Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Role & Operator Authentication Chip */}
        {isOperator ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            <Shield size={14} />
            <span>OPERATOR</span>
            <button
              onClick={onOperatorLogout}
              title="Đăng xuất khỏi quyền Operator"
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px 4px',
                borderRadius: 4,
                marginLeft: 2,
              }}
            >
              <LogOut size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenOperatorModal}
            title="Đăng nhập với khóa bí mật Operator để kích hoạt quyền thao tác"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid #3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#93c5fd',
            }}
          >
            <Key size={14} />
            <span>Đăng Nhập Operator</span>
          </button>
        )}

        {/* Drop Simulation Button (Audit Requirement) */}
        <button
          onClick={onToggleDrop}
          title="Mô phỏng mất nguồn đo ADB hoặc rớt mạng để kiểm tra chuyển trạng thái Unknown"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            border: isDropping ? '1px solid #ef4444' : '1px solid #334155',
            backgroundColor: isDropping ? 'rgba(239, 68, 68, 0.2)' : '#1e293b',
            color: isDropping ? '#fca5a5' : '#cbd5e1',
          }}
        >
          {isDropping ? <WifiOff size={14} /> : <Wifi size={14} />}
          <span>{isDropping ? 'Khôi Phục ADB' : 'Mô Phỏng Rút Cáp'}</span>
        </button>

        {/* Health Check Button (Disarmed for Audit) */}
        <button
          onClick={onTriggerHealth}
          title="Tạm vô hiệu hóa theo yêu cầu an toàn kiểm toán (Semaphore Template 1)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'not-allowed',
            border: '1px solid #334155',
            backgroundColor: '#161e2e',
            color: '#94a3b8',
            opacity: 0.85,
          }}
        >
          <span style={{ fontSize: 11 }}>🔒</span>
          <span>Health Test (Tạm Khóa)</span>
        </button>

        {/* Deploy Backend Button (Disarmed for Audit) */}
        <button
          onClick={onOpenDeployModal}
          title="Tạm vô hiệu hóa theo yêu cầu an toàn kiểm toán (Semaphore Template 8)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'not-allowed',
            border: '1px solid #475569',
            backgroundColor: '#1e293b',
            color: '#94a3b8',
            boxShadow: 'none',
            opacity: 0.85,
          }}
        >
          <span style={{ fontSize: 11 }}>🔒</span>
          <span>Deploy Backend (Tạm Khóa)</span>
        </button>

        {/* Vertical divider */}
        <div style={{ height: 20, width: 1, backgroundColor: '#1e293b' }} />

        {/* External Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href="http://127.0.0.1:3000"
            target="_blank"
            rel="noreferrer"
            title="Semaphore CI/CD (Port 3000)"
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              backgroundColor: '#131b2e',
              border: '1px solid #232f48',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            CI/CD :3000
          </a>
          <a
            href="http://127.0.0.1:3001"
            target="_blank"
            rel="noreferrer"
            title="Grafana Architecture Snapshot (Port 3001)"
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              backgroundColor: '#131b2e',
              border: '1px solid #232f48',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Grafana :3001
          </a>
          <a
            href="http://127.0.0.1:4000"
            target="_blank"
            rel="noreferrer"
            title="Dashy Fallback Portal (Port 4000)"
            style={{
              padding: '6px 8px',
              borderRadius: 6,
              backgroundColor: '#131b2e',
              border: '1px solid #232f48',
              color: '#94a3b8',
              textDecoration: 'none',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            Dashy :4000
          </a>
        </div>
      </div>
    </header>
  );
}
