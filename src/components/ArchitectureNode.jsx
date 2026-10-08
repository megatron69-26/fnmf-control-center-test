import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Laptop,
  Smartphone,
  Server,
  Database,
  TrendingUp,
  Zap,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Radio,
} from 'lucide-react';

const iconMap = {
  Laptop,
  Smartphone,
  Server,
  Database,
  TrendingUp,
  Zap,
  Sparkles,
  Sliders,
};

function getStatusBadge(status) {
  switch (status) {
    case 'UP':
      return {
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        color: '#34d399',
        label: 'ONLINE',
        icon: CheckCircle2,
      };
    case 'NOT_MEASURED':
      return {
        bg: 'rgba(168, 85, 247, 0.12)',
        border: 'rgba(168, 85, 247, 0.3)',
        color: '#c084fc',
        label: 'NOT MEASURED',
        icon: Radio,
      };
    case 'UNAVAILABLE':
      return {
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        color: '#fbbf24',
        label: 'UNAVAILABLE (TEST)',
        icon: AlertTriangle,
      };
    case 'UNKNOWN_STALE':
    case 'DISCONNECTED':
    case 'DOWN':
      return {
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(239, 68, 68, 0.35)',
        color: '#f87171',
        label: status === 'DISCONNECTED' ? 'DISCONNECTED' : 'UNKNOWN / STALE',
        icon: XCircle,
      };
    default:
      return {
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.3)',
        color: '#94a3b8',
        label: status || 'CHECKING...',
        icon: HelpCircle,
      };
  }
}

function formatProbeTimeAndAge(lastCheckIso) {
  if (!lastCheckIso) return { time: '--', age: '--' };
  try {
    const d = new Date(lastCheckIso);
    const time = d.toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ageSec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
    return { time, age: `${ageSec}s trước` };
  } catch {
    return { time: '--', age: '--' };
  }
}

export const ArchitectureNode = memo(({ data, selected }) => {
  const IconComponent = iconMap[data.iconName] || Server;
  const telemetry = data.telemetry || {};
  const statusInfo = getStatusBadge(telemetry.status);
  const StatusIcon = statusInfo.icon;
  const timeInfo = formatProbeTimeAndAge(telemetry.last_check);

  return (
    <div
      style={{
        width: 320,
        backgroundColor: '#111726',
        borderRadius: 12,
        border: selected ? '2px solid #60a5fa' : '1px solid #232f48',
        boxShadow: selected
          ? '0 0 0 4px rgba(96, 165, 250, 0.15), 0 12px 28px rgba(0, 0, 0, 0.6)'
          : '0 4px 16px rgba(0, 0, 0, 0.4)',
        padding: '16px',
        color: '#f1f5f9',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 10,
          height: 10,
          backgroundColor: '#60a5fa',
          border: '2px solid #0f172a',
          left: -6,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          backgroundColor: '#60a5fa',
          border: '2px solid #0f172a',
          right: -6,
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          backgroundColor: '#64748b',
          border: '2px solid #0f172a',
          top: -6,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          backgroundColor: '#64748b',
          border: '2px solid #0f172a',
          bottom: -6,
        }}
      />

      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#93c5fd',
              border: '1px solid #334155',
            }}
          >
            <IconComponent size={20} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: '#64748b' }}>
              {data.category}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
              {data.title}
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 999,
            backgroundColor: statusInfo.bg,
            border: `1px solid ${statusInfo.border}`,
            fontSize: 10,
            fontWeight: 700,
            color: statusInfo.color,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <StatusIcon size={12} />
          <span>{statusInfo.label}</span>
        </div>
      </div>

      {/* Key Metric Highlights */}
      <div
        style={{
          backgroundColor: '#0a0f1d',
          borderRadius: 8,
          padding: '8px 12px',
          border: '1px solid #1e293b',
          marginBottom: 10,
          fontSize: 12,
        }}
      >
        {data.nodeId === 'android_device' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: '#94a3b8' }}>Model / Serial:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Note 10+ | R3CM8105TPA</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: '#64748b' }}>App Test:</span>
              <span
                style={{
                  color:
                    telemetry.details?.pipeline?.status === 'DEPLOYED' ? '#34d399'
                    : telemetry.details?.pipeline?.status === 'INSTALLED — ARTIFACT NOT VERIFIED' ? '#fbbf24'
                    : telemetry.details?.pipeline?.status === 'BUILT — NOT DEPLOYED' ? '#60a5fa'
                    : '#f87171',
                  fontWeight: 600,
                }}
              >
                {telemetry.status === 'UP' && telemetry.details?.pipeline?.running_on_device?.version_name
                  ? `v${telemetry.details.pipeline.running_on_device.version_name} [${telemetry.details.pipeline.status}]`
                  : telemetry.status === 'UP' ? (telemetry.details?.pipeline?.status || 'UNKNOWN') : 'UNKNOWN / STALE'}
              </span>
            </div>
          </div>
        )}

        {data.nodeId === 'spring_boot' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: '#94a3b8' }}>PID / Health:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                {telemetry.status === 'UP' && telemetry.details?.pid ? `PID ${telemetry.details.pid}` : 'No PID'} | {telemetry.status === 'UP' ? telemetry.details?.actuator_health || 'DOWN' : 'UNKNOWN / STALE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: '#64748b' }}>Pipeline:</span>
              <span
                style={{
                  color:
                    telemetry.details?.pipeline?.status === 'DEPLOYED' ? '#34d399'
                    : telemetry.details?.pipeline?.status === 'BUILT — NOT DEPLOYED' ? '#fbbf24'
                    : telemetry.details?.pipeline?.status === 'NEW COMMIT' ? '#60a5fa'
                    : telemetry.details?.pipeline?.status === 'BUILD FAILED' ? '#f87171'
                    : '#94a3b8',
                  fontWeight: 600,
                }}
              >
                {telemetry.details?.pipeline?.status || (telemetry.status === 'UP' ? 'DEPLOYED' : 'UNKNOWN')}
              </span>
            </div>
          </div>
        )}

        {data.nodeId === 'postgresql' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: '#94a3b8' }}>Schema / Tables:</span>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
                {telemetry.status === 'UP'
                  ? `${telemetry.details?.flyway_version || 'V?'}, ${telemetry.details?.tables_count ?? '?'} tbl`
                  : 'UNKNOWN / STALE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              <span style={{ color: '#64748b' }}>Backup Proof:</span>
              <span
                style={{
                  color:
                    telemetry.status === 'UP' && telemetry.details?.backup_verified && telemetry.details?.backup_hash_matched
                      ? '#34d399'
                      : '#f87171',
                  fontWeight: 600,
                }}
              >
                {telemetry.status !== 'UP'
                  ? 'UNKNOWN / STALE'
                  : telemetry.details?.backup_verified && telemetry.details?.backup_hash_matched
                  ? 'VERIFIED (SHA-256 OK)'
                  : 'UNVERIFIED'}
              </span>
            </div>
          </div>
        )}

        {data.nodeId === 'binance_rest' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: '#94a3b8' }}>BNB / SOL:</span>
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>
              ${telemetry.details?.prices?.BNBUSDT || '---'} | ${telemetry.details?.prices?.SOLUSDT || '---'}
            </span>
          </div>
        )}

        {data.nodeId === 'binance_ws' && (
          <div style={{ color: '#c084fc', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
            {telemetry.details?.audit_note || 'Chưa đo được socket thật (thiếu socket tracing)'}
          </div>
        )}

        {data.nodeId === 'gemini_ai' && (
          <div style={{ color: '#fbbf24', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
            Model: {telemetry.details?.model || 'gemini-2.5-flash'} (API key chưa nạp - Sandbox)
          </div>
        )}

        {data.nodeId === 'semaphore_cicd' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: '#94a3b8' }}>Latest Task:</span>
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>
              {telemetry.details?.latest_task_id ? `Task #${telemetry.details.latest_task_id} (${telemetry.details.latest_task_status})` : 'Polling...'}
            </span>
          </div>
        )}

        {data.nodeId === 'host_bridge' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: '#94a3b8' }}>Control Ports:</span>
            <span style={{ color: '#e2e8f0', fontWeight: 600 }}>4100, 4000, 3001, 3000</span>
          </div>
        )}
      </div>

      {/* Footer: Measurement Source, Exact Timestamp & Data Age */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          fontSize: 10,
          color: '#64748b',
          fontFamily: "'JetBrains Mono', monospace",
          borderTop: '1px solid #1a2234',
          paddingTop: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span title={telemetry.measurement_source || data.subtitle}>
            Nguồn: {telemetry.measurement_source ? telemetry.measurement_source.split('(')[0].trim() : 'System'}
          </span>
          <span>
            {telemetry.latency_ms !== null && telemetry.latency_ms !== undefined
              ? `${telemetry.latency_ms}ms`
              : '--'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
          <span>Đo: {timeInfo.time}</span>
          <span>Tuổi: {timeInfo.age} (Polling 5s)</span>
        </div>
      </div>
    </div>
  );
});
