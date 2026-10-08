import React from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  Layers,
  Activity,
  HardDrive,
  FileCheck,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';

export function InspectorPanel({ node, onClose, onTriggerDeploy, onTriggerHealth }) {
  if (!node) return null;

  const telemetry = node.data?.telemetry || {};
  const details = telemetry.details || {};

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        right: 0,
        bottom: 0,
        width: 380,
        backgroundColor: '#0f1626',
        borderLeft: '1px solid #232f48',
        boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        color: '#e2e8f0',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#131b2e',
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Node Inspector
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
            {node.data?.title}
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
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Status Card */}
        <div
          style={{
            backgroundColor: '#162035',
            borderRadius: 10,
            padding: '14px',
            border: '1px solid #232f48',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Live Status</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: telemetry.status === 'UP' ? '#34d399' : telemetry.status === 'NOT_MEASURED' ? '#c084fc' : '#f87171',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {telemetry.status || 'UNKNOWN'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 8 }}>
            <span style={{ color: '#94a3b8' }}>Roundtrip Latency</span>
            <span style={{ color: '#f1f5f9', fontFamily: "'JetBrains Mono', monospace" }}>
              {telemetry.latency_ms !== null && telemetry.latency_ms !== undefined ? `${telemetry.latency_ms} ms` : 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
            <span style={{ color: '#94a3b8' }}>Last Probed</span>
            <span style={{ color: '#94a3b8', fontFamily: "'JetBrains Mono', monospace" }}>
              {telemetry.last_check ? new Date(telemetry.last_check).toLocaleTimeString() : 'Pending'}
            </span>
          </div>
        </div>

        {/* Measurement Source Box (Strict Audit Requirement) */}
        <div
          style={{
            backgroundColor: '#0a0f1d',
            borderRadius: 10,
            padding: '14px',
            border: '1px solid #1e293b',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#38bdf8', marginBottom: 6 }}>
            <ShieldCheck size={16} />
            <span>Nguồn Đo Kiểm Thực Tế</span>
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: '1.5', fontFamily: "'JetBrains Mono', monospace" }}>
            {telemetry.measurement_source || 'Đo trực tiếp từ hệ thống'}
          </div>
        </div>

        {/* Specific Node Details */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10 }}>
            Thông Số Kỹ Thuật
          </div>

          {node.id === 'spring_boot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Kiến trúc:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>Spring Boot Monolith (Không phải microservices)</span>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>PID & Cổng:</span>
                <span style={{ color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace" }}>
                  PID: {details.pid || 'Chưa nhận diện / Stale'} | Port 8083 (Loopback)
                </span>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>SHA-256 JAR Đang Chạy:</span>
                <span style={{ color: '#38bdf8', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>
                  {details.jar_sha256 || 'N/A (Chưa đo hoặc Stale)'}
                </span>
              </div>

              {/* Pipeline Chain: Git -> Build -> Artifact -> Running Device */}
              {details.pipeline && (
                <div style={{ backgroundColor: '#0c1322', borderRadius: 8, border: '1px solid #1e3a5f', padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                      Chuỗi Triển Khai Backend
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor:
                          details.pipeline.status === 'DEPLOYED' ? 'rgba(52, 211, 153, 0.15)' :
                          details.pipeline.status === 'NEW COMMIT' ? 'rgba(251, 191, 36, 0.15)' :
                          details.pipeline.status === 'BUILT — NOT DEPLOYED' ? 'rgba(96, 165, 250, 0.15)' :
                          details.pipeline.status === 'BUILD FAILED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color:
                          details.pipeline.status === 'DEPLOYED' ? '#34d399' :
                          details.pipeline.status === 'NEW COMMIT' ? '#fbbf24' :
                          details.pipeline.status === 'BUILT — NOT DEPLOYED' ? '#60a5fa' :
                          details.pipeline.status === 'BUILD FAILED' ? '#f87171' : '#94a3b8',
                        border: `1px solid ${
                          details.pipeline.status === 'DEPLOYED' ? '#059669' :
                          details.pipeline.status === 'NEW COMMIT' ? '#d97706' :
                          details.pipeline.status === 'BUILT — NOT DEPLOYED' ? '#2563eb' :
                          details.pipeline.status === 'BUILD FAILED' ? '#dc2626' : '#475569'
                        }`,
                      }}
                    >
                      {details.pipeline.status}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: '1.4', marginBottom: 10 }}>
                    {details.pipeline.status_reason}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <span style={{ color: '#94a3b8' }}>1. Git Commit: </span>
                      <span style={{ color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        {details.pipeline.git_commit?.short_hash || 'N/A'}
                      </span>
                      <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                        "{details.pipeline.git_commit?.subject || 'Chưa đọc commit'}"
                      </div>
                    </div>

                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8' }}>2. Semaphore Build: </span>
                        <span style={{ color: details.pipeline.build_task?.status === 'success' ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                          {details.pipeline.build_task ? `Task #${details.pipeline.build_task.id} (${details.pipeline.build_task.status})` : 'Chưa có task'}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <span style={{ color: '#94a3b8' }}>3. Artifact Build: </span>
                      <span style={{ color: '#38bdf8', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all', display: 'block', marginTop: 2 }}>
                        {details.pipeline.artifact?.file_name || 'N/A'}
                      </span>
                    </div>

                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8' }}>4. So Sánh SHA-256: </span>
                        <span style={{ color: details.pipeline.sha_comparison?.matches ? '#34d399' : '#f87171', fontWeight: 700 }}>
                          {details.pipeline.sha_comparison?.matches ? '✓ KHỚP 100%' : '✗ SAI LỆCH'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Navigation Links for User to Manually Operate */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    <a
                      href={details.pipeline.semaphore_nav?.template_url || 'http://127.0.0.1:3000/project/1/templates/6'}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        backgroundColor: '#1d4ed8',
                        borderRadius: 6,
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      Mở Template 6 (Build Backend) Trong Semaphore <ExternalLink size={12} />
                    </a>
                    {details.pipeline.semaphore_nav?.latest_task_url && (
                      <a
                        href={details.pipeline.semaphore_nav.latest_task_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '6px 10px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          color: '#93c5fd',
                          textDecoration: 'none',
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        Xem Lịch Sử Task #{details.pipeline.build_task?.id} ↗
                      </a>
                    )}
                  </div>
                </div>
              )}

              <a
                href="http://127.0.0.1:8083/actuator/health"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  backgroundColor: '#1e293b',
                  borderRadius: 6,
                  color: '#60a5fa',
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 6,
                }}
              >
                Mở Actuator Health <ExternalLink size={14} />
              </a>
            </div>
          )}

          {node.id === 'postgresql' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              {telemetry.status !== 'UP' && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 12px', color: '#fca5a5', fontSize: 11 }}>
                  ⚠️ NGUỒN ĐO ADB MẤT HOẶC QUÁ HẠN: Dữ liệu đã chuyển sang UNKNOWN/STALE. Không giữ số liệu cũ làm số live.
                </div>
              )}
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Cơ sở dữ liệu & Phiên bản Flyway:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>
                  fnmf_test (Port 5432) | Flyway: {telemetry.status === 'UP' ? (details.flyway_version || 'N/A') : 'UNKNOWN / STALE'}
                </span>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Số bảng / Người dùng / Ví:</span>
                <span style={{ color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace" }}>
                  {telemetry.status === 'UP' && details.tables_count !== null ? `${details.tables_count} Tables | ${details.users_count} Users | ${details.wallets_count} Wallets` : 'UNKNOWN / STALE (--)'}
                </span>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Bản sao lưu đối soát mới nhất:</span>
                <span style={{ color: '#f8fafc', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", display: 'block', marginBottom: 4 }}>
                  {telemetry.status === 'UP' ? (details.latest_backup || 'Chưa tìm thấy') : 'UNKNOWN / STALE'}
                </span>
                <div style={{ color: telemetry.status === 'UP' && details.backup_verified && details.backup_hash_matched ? '#34d399' : '#f87171', fontWeight: 600, fontSize: 11, marginBottom: 4 }}>
                  {telemetry.status === 'UP' && details.backup_verified && details.backup_hash_matched
                    ? '✓ ĐÃ TÍNH TOÁN SHA-256 KHỚP 100% VỚI MANIFEST'
                    : '✗ CHƯA KIỂM CHỨNG HASH HOẶC SAI LỆCH / STALE'}
                </div>
                {telemetry.status === 'UP' && details.backup_sha256 && (
                  <div style={{ color: '#94a3b8', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all', marginTop: 4 }}>
                    SHA-256 Tệp Đĩa: {details.backup_sha256}
                  </div>
                )}
                {telemetry.status === 'UP' && details.backup_verification_method && (
                  <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                    Phương pháp: {details.backup_verification_method}
                  </div>
                )}
              </div>
            </div>
          )}

          {node.id === 'binance_rest' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}>Giá REST thời gian thực (5 Tài sản):</div>
              {details.prices && Object.keys(details.prices).length > 0 ? (
                Object.entries(details.prices).map(([sym, price]) => (
                  <div
                    key={sym}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      backgroundColor: '#131b2e',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid #1e293b',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    <span style={{ color: '#93c5fd', fontWeight: 600 }}>{sym}</span>
                    <span style={{ color: '#fbbf24', fontWeight: 700 }}>${price}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b' }}>Đang nạp giá...</div>
              )}
            </div>
          )}

          {node.id === 'binance_ws' && (
            <div style={{ backgroundColor: '#131b2e', padding: 12, borderRadius: 8, border: '1px solid #1e293b', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c084fc', fontWeight: 600, marginBottom: 6 }}>
                <AlertCircle size={16} />
                <span>Quy Tắc Đo Lường Trung Thực</span>
              </div>
              <p style={{ color: '#cbd5e1', lineHeight: '1.5', fontSize: 11, marginBottom: 8 }}>
                {details.audit_note}
              </p>
              <div style={{ color: '#64748b', fontSize: 10 }}>
                Hệ thống từ chối dùng `pidof` để giả lập trạng thái WebSocket khi chưa có socket tracing thực tế.
              </div>
            </div>
          )}

          {node.id === 'gemini_ai' && (
            <div style={{ backgroundColor: '#131b2e', padding: 12, borderRadius: 8, border: '1px solid #1e293b', fontSize: 12 }}>
              <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 6 }}>
                Mô hình: {details.model || 'gemini-2.5-flash'}
              </div>
              <p style={{ color: '#cbd5e1', fontSize: 11, lineHeight: '1.5', marginBottom: 8 }}>
                Chiến lược: <strong>{details.shard_strategy}</strong>. Để tiết kiệm chi phí và quota, hệ thống ưu tiên đọc đệm 24h và KHÔNG gọi API định kỳ mỗi 5s.
              </p>
              <div style={{ color: '#94a3b8', fontSize: 11 }}>
                Hiện trạng: <span style={{ color: '#f87171' }}>{details.reason}</span>
              </div>
            </div>
          )}

          {node.id === 'semaphore_cicd' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Tác vụ gần nhất:</span>
                <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                  Task #{details.latest_task_id || '--'} ({details.latest_task_status || 'N/A'}) - {details.latest_task_template}
                </span>
              </div>
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8, padding: '10px 12px' }}>
                <span style={{ color: '#fca5a5', fontWeight: 600, display: 'block', marginBottom: 2 }}>🔒 Trạng Thái An Toàn: Đã Tạm Khóa</span>
                <span style={{ color: '#cbd5e1', fontSize: 11, lineHeight: '1.4' }}>
                  Hai nút thao tác tự động bị tạm vô hiệu hóa theo yêu cầu kiểm toán an toàn (Template 8 &amp; Template 1). Các đường dẫn bên dưới giúp người dùng tự thao tác thủ công trên Semaphore UI.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    backgroundColor: '#161e2e',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'not-allowed',
                  }}
                >
                  🔒 Template 1 (Health)
                </button>
                <button
                  disabled
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'not-allowed',
                  }}
                >
                  🔒 Template 8 (Deploy)
                </button>
              </div>

              {/* Direct Semaphore Navigation Links (Manual Operation) */}
              <div style={{ backgroundColor: '#0c1322', borderRadius: 8, border: '1px solid #1e3a5f', padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 8 }}>
                  Điều Hướng Tác Vụ Build (Thủ Công)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <a
                    href="http://127.0.0.1:3000/project/1/templates/6"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: '#131b2e',
                      border: '1px solid #232f48',
                      borderRadius: 6,
                      color: '#60a5fa',
                      textDecoration: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <span>Template 6: Build Backend Test</span>
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href="http://127.0.0.1:3000/project/1/templates/7"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: '#131b2e',
                      border: '1px solid #232f48',
                      borderRadius: 6,
                      color: '#a78bfa',
                      textDecoration: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <span>Template 7: Build App Test</span>
                    <ExternalLink size={12} />
                  </a>
                  <a
                    href="http://127.0.0.1:3000"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      backgroundColor: '#1e293b',
                      borderRadius: 6,
                      color: '#cbd5e1',
                      textDecoration: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                      marginTop: 4,
                    }}
                  >
                    Mở Semaphore Dashboard Chính <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          )}

          {node.id === 'android_device' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Thiết bị mục tiêu:</span>
                <span style={{ color: '#f8fafc', fontWeight: 600 }}>Samsung Galaxy Note 10+ 5G (SM-N976B)</span>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Kết nối vật lý:</span>
                <span style={{ color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace" }}>
                  {telemetry.status === 'UP' ? 'Cáp USB Direct (Serial: R3CM8105TPA)' : 'MẤT KẾT NỐI (DISCONNECTED)'}
                </span>
              </div>
              <div style={{ backgroundColor: '#131b2e', padding: 10, borderRadius: 8, border: '1px solid #1e293b' }}>
                <span style={{ color: '#94a3b8', display: 'block', marginBottom: 2 }}>Cổng Forward ADB:</span>
                <span style={{ color: telemetry.status === 'UP' ? '#34d399' : '#f87171', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                  {telemetry.status === 'UP' ? 'tcp:8083 -> tcp:8083 (Active)' : 'INACTIVE'}
                </span>
              </div>

              {/* App Pipeline Chain */}
              {details.pipeline && (
                <div style={{ backgroundColor: '#0c1322', borderRadius: 8, border: '1px solid #1e3a5f', padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' }}>
                      Chuỗi Triển Khai Android App
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor:
                          details.pipeline.status === 'DEPLOYED' ? 'rgba(52, 211, 153, 0.15)' :
                          details.pipeline.status === 'INSTALLED — ARTIFACT NOT VERIFIED' ? 'rgba(245, 158, 11, 0.15)' :
                          details.pipeline.status === 'NEW COMMIT' ? 'rgba(251, 191, 36, 0.15)' :
                          details.pipeline.status === 'BUILT — NOT DEPLOYED' ? 'rgba(96, 165, 250, 0.15)' :
                          details.pipeline.status === 'BUILD FAILED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color:
                          details.pipeline.status === 'DEPLOYED' ? '#34d399' :
                          details.pipeline.status === 'INSTALLED — ARTIFACT NOT VERIFIED' ? '#fbbf24' :
                          details.pipeline.status === 'NEW COMMIT' ? '#fbbf24' :
                          details.pipeline.status === 'BUILT — NOT DEPLOYED' ? '#60a5fa' :
                          details.pipeline.status === 'BUILD FAILED' ? '#f87171' : '#94a3b8',
                        border: `1px solid ${
                          details.pipeline.status === 'DEPLOYED' ? '#059669' :
                          details.pipeline.status === 'INSTALLED — ARTIFACT NOT VERIFIED' ? '#d97706' :
                          details.pipeline.status === 'NEW COMMIT' ? '#d97706' :
                          details.pipeline.status === 'BUILT — NOT DEPLOYED' ? '#2563eb' :
                          details.pipeline.status === 'BUILD FAILED' ? '#dc2626' : '#475569'
                        }`,
                      }}
                    >
                      {details.pipeline.status}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, color: '#cbd5e1', lineHeight: '1.4', marginBottom: 10 }}>
                    {details.pipeline.status_reason}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <span style={{ color: '#94a3b8' }}>1. Git Commit: </span>
                      <span style={{ color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                        {details.pipeline.git_commit?.short_hash || 'N/A'}
                      </span>
                      <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                        "{details.pipeline.git_commit?.subject || 'Chưa đọc commit'}"
                      </div>
                    </div>

                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8' }}>2. Semaphore Build: </span>
                        <span style={{ color: details.pipeline.build_task?.status === 'success' ? '#34d399' : '#fbbf24', fontWeight: 600 }}>
                          {details.pipeline.build_task ? `Task #${details.pipeline.build_task.id} (${details.pipeline.build_task.status})` : 'Chưa có task'}
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <span style={{ color: '#94a3b8' }}>3. Artifact APK: </span>
                      <span style={{ color: '#a78bfa', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all', display: 'block', marginTop: 2 }}>
                        {details.pipeline.artifact?.file_name || 'N/A'}
                      </span>
                    </div>

                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <span style={{ color: '#94a3b8' }}>4. Ứng Dụng Trên Máy: </span>
                      <span style={{ color: '#f8fafc', fontFamily: "'JetBrains Mono', monospace" }}>
                        {details.pipeline.running_on_device?.version_name ? `v${details.pipeline.running_on_device.version_name} (code ${details.pipeline.running_on_device.version_code})` : 'Chưa cài đặt'}
                      </span>
                    </div>

                    <div style={{ padding: '6px 8px', backgroundColor: '#131b2e', borderRadius: 6, border: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#94a3b8' }}>5. Kiểm Chứng Bản Build: </span>
                        <span style={{ color: details.pipeline.sha_comparison?.matches ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                          {details.pipeline.sha_comparison?.matches ? '✓ KHỚP 100%' : '✗ ARTIFACT NOT VERIFIED'}
                        </span>
                      </div>
                      {details.pipeline.running_on_device?.apk_sha256 && (
                        <div style={{ color: '#94a3b8', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all', marginTop: 2 }}>
                          SHA Trên Máy: {details.pipeline.running_on_device.apk_sha256.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                    <a
                      href={details.pipeline.semaphore_nav?.template_url || 'http://127.0.0.1:3000/project/1/templates/7'}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        backgroundColor: '#7c3aed',
                        borderRadius: 6,
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      Mở Template 7 (Build App) Trong Semaphore <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
