import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';

import { initialNodes } from './flow/initialNodes';
import { initialEdges } from './flow/initialEdges';
import { ArchitectureNode } from './components/ArchitectureNode';
import { ControlNavbar } from './components/ControlNavbar';
import { InspectorPanel } from './components/InspectorPanel';
import { DeployModal } from './components/DeployModal';
import { OperatorAuthModal } from './components/OperatorAuthModal';
import { QuickToast } from './components/QuickToast';

const nodeTypes = {
  architectureNode: ArchitectureNode,
};

export default function App() {
  const queryParams = new URLSearchParams(window.location.search);
  const initialInspectId = queryParams.get('inspector');
  const initialModalOpen = queryParams.get('modal') === 'deploy';

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(
    initialInspectId ? initialNodes.find((n) => n.id === initialInspectId) || null : null
  );
  const [telemetry, setTelemetry] = useState({ nodes: {}, is_stale: true, simulate_drop: false, operations: { disarmed: true } });
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(initialModalOpen);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(queryParams.get('modal') === 'operator');
  const [toast, setToast] = useState(null);
  const [isDropping, setIsDropping] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');
  const [operatorToken, setOperatorToken] = useState(() => sessionStorage.getItem('fnmf_operator_token') || '');
  const [role, setRole] = useState('OBSERVER');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  // Obtain CSRF token & check operator session
  useEffect(() => {
    const headers = {};
    if (operatorToken) {
      headers['X-FNMF-Operator-Token'] = operatorToken;
    }
    fetch('/api/auth/token', { headers })
      .then((r) => r.json())
      .then((d) => {
        if (d.csrf_token || d.token) setCsrfToken(d.csrf_token || d.token);
        if (d.role) setRole(d.role);
      })
      .catch((e) => console.error('Failed to obtain session token:', e));
  }, [operatorToken]);

  // Telemetry Poller (every 5 seconds)
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/telemetry');
      if (!res.ok) throw new Error('Telemetry endpoint returned ' + res.status);
      const data = await res.json();
      setTelemetry(data);
      setIsDropping(Boolean(data.simulate_drop));

      // Update node data with latest telemetry
      setNodes((nds) =>
        nds.map((node) => {
          const liveNodeData = data.nodes ? data.nodes[node.id] : null;
          return {
            ...node,
            data: {
              ...node.data,
              telemetry: liveNodeData || {},
            },
          };
        })
      );

      // Keep selectedNode synchronized
      setSelectedNode((curr) => {
        if (!curr) return null;
        const liveData = data.nodes ? data.nodes[curr.id] : null;
        return {
          ...curr,
          data: {
            ...curr.data,
            telemetry: liveData || {},
          },
        };
      });
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    }
  }, [setNodes]);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Node Click: Open Inspector Panel
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle Operator Login Success
  const handleOperatorLoginSuccess = (newToken) => {
    sessionStorage.setItem('fnmf_operator_token', newToken);
    setOperatorToken(newToken);
    setRole('OPERATOR');
    showToast('Đã xác thực quyền Người Vận Hành (Operator) thành công!', 'success');
  };

  // Handle Operator Logout
  const handleOperatorLogout = async () => {
    try {
      await fetch('/api/auth/operator-logout', {
        method: 'POST',
        headers: {
          'X-FNMF-Operator-Token': operatorToken,
        },
      });
    } catch {}
    sessionStorage.removeItem('fnmf_operator_token');
    setOperatorToken('');
    setRole('OBSERVER');
    showToast('Đã đăng xuất phiên Người Vận Hành. Chuyển về chế độ quan sát.', 'info');
  };

  // Common mutation headers helper
  const getMutationHeaders = () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-FNMF-Control-Token': csrfToken,
    };
    if (operatorToken) {
      headers['X-FNMF-Operator-Token'] = operatorToken;
    }
    return headers;
  };

  // Trigger Simulated Drop
  const handleToggleDrop = async () => {
    if (role !== 'OPERATOR') {
      showToast('🔒 Thao tác yêu cầu quyền Người Vận Hành. Vui lòng đăng nhập Operator.', 'warning');
      setIsOperatorModalOpen(true);
      return;
    }

    const nextDrop = !isDropping;
    try {
      const res = await fetch('/api/simulate-disconnect', {
        method: 'POST',
        headers: getMutationHeaders(),
        body: JSON.stringify({ drop: nextDrop }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'OPERATOR_AUTH_REQUIRED') {
          showToast('🔒 ' + data.message, 'warning');
          setIsOperatorModalOpen(true);
          return;
        }
        throw new Error(data.message || data.error);
      }
      setIsDropping(nextDrop);
      fetchTelemetry();
      if (nextDrop) {
        showToast('Mô phỏng ngắt kết nối ADB: Node Note 10+ chuyển sang UNKNOWN/STALE', 'error');
      } else {
        showToast('Đã khôi phục kết nối ADB: Đo lường trở lại bình thường', 'success');
      }
    } catch (e) {
      showToast('Lỗi khi chuyển trạng thái mô phỏng: ' + e.message, 'error');
    }
  };

  // Trigger Health Check Task (Template 1)
  const handleTriggerHealth = async () => {
    if (role !== 'OPERATOR') {
      showToast('🔒 Thao tác yêu cầu quyền Người Vận Hành. Vui lòng đăng nhập Operator.', 'warning');
      setIsOperatorModalOpen(true);
      return;
    }

    try {
      showToast('Đang gửi lệnh chạy Health Check (Template 1) tới Semaphore...', 'info');
      const res = await fetch('/api/ops/trigger-health', {
        method: 'POST',
        headers: getMutationHeaders(),
      });
      const data = await res.json();
      if (data.locked) {
        showToast(`🔒 Nút thao tác tạm khóa: ${data.message}`, 'warning');
      } else if (data.success) {
        showToast(`Đã kích hoạt Task #${data.result?.data?.id || 'mới'}: Template 1 (Health Check)`, 'success');
        fetchTelemetry();
      } else {
        showToast('Thất bại: ' + (data.error || 'Lỗi không xác định'), 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối tới local backend: ' + e.message, 'error');
    }
  };

  // Trigger Deploy Backend Task (Template 8)
  const handleConfirmDeploy = async (confirmationPayload) => {
    if (role !== 'OPERATOR') {
      showToast('🔒 Thao tác yêu cầu quyền Người Vận Hành. Vui lòng đăng nhập Operator.', 'warning');
      setIsOperatorModalOpen(true);
      return;
    }

    try {
      showToast('Đang gửi kiểm tra xác thực Deploy (Template 8)...', 'info');
      const res = await fetch('/api/ops/trigger-deploy', {
        method: 'POST',
        headers: getMutationHeaders(),
        body: JSON.stringify(confirmationPayload),
      });
      const data = await res.json();
      if (data.locked) {
        showToast(`🔒 Nút deploy tạm khóa: ${data.message}`, 'warning');
        return;
      }
      if (data.success) {
        showToast(`Đã kích hoạt Task #${data.result?.data?.id || 'mới'}: Template 8 (Deploy Backend Test)`, 'success');
        fetchTelemetry();
      } else {
        throw new Error(data.message || data.error || 'Lỗi kiểm tra preflight');
      }
    } catch (e) {
      throw e;
    }
  };

  const isAdbOffline = telemetry.nodes?.android_device?.status === 'DISCONNECTED' || telemetry.is_stale;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0d14' }}>
      {/* Top Navbar */}
      <ControlNavbar
        telemetry={telemetry}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        onTriggerHealth={handleTriggerHealth}
        isDropping={isDropping}
        onToggleDrop={handleToggleDrop}
        role={role}
        onOpenOperatorModal={() => setIsOperatorModalOpen(true)}
        onOperatorLogout={handleOperatorLogout}
      />

      {/* Staleness / Disconnect Warning Banner */}
      {isAdbOffline && (
        <div
          style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '6px 20px',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
            zIndex: 35,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span>⚠ CẢNH BÁO: MẤT NGUỒN ĐO ADB HOẶC DỮ LIỆU STALE (&gt;15s) — CÁC NODE PHỤ THUỘC NOTE 10+ ĐÃ CHUYỂN UNKNOWN</span>
        </div>
      )}

      {/* Main Flow Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.4}
          maxZoom={1.6}
          defaultEdgeOptions={{
            type: 'smoothstep',
          }}
        >
          <Background color="#1e293b" gap={20} size={1} variant={BackgroundVariant.Dots} />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            nodeColor={(n) => {
              if (n.data?.telemetry?.status === 'UP') return '#10b981';
              if (n.data?.telemetry?.status === 'NOT_MEASURED') return '#8b5cf6';
              return '#ef4444';
            }}
            maskColor="rgba(10, 13, 20, 0.7)"
          />
        </ReactFlow>

        {/* Slide-out Inspector Panel */}
        <InspectorPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onTriggerDeploy={() => setIsDeployModalOpen(true)}
          onTriggerHealth={handleTriggerHealth}
        />
      </div>

      {/* Safe Deploy Confirmation Modal */}
      <DeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onConfirm={handleConfirmDeploy}
        pgDetails={telemetry.nodes?.postgresql?.details}
        immutableArtifact={telemetry.nodes?.spring_boot?.details?.latest_immutable_artifact?.file_name}
      />

      {/* Operator Authentication Modal */}
      <OperatorAuthModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
        onLoginSuccess={handleOperatorLoginSuccess}
      />

      {/* Toast Notifications */}
      <QuickToast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
