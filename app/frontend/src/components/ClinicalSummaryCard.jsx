import React from 'react';
import { AlertTriangle, AlertOctagon, CheckCircle, Info, Stethoscope, FileSpreadsheet, Eye, ChevronRight } from 'lucide-react';

export default function ClinicalSummaryCard({
  predictionResult = null,
  loading = false,
  onExportReport = () => {}
}) {
  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid #3B82F6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Processing multi-instance segmentation & clinical triage...
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!predictionResult) {
    return (
      <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', gap: '12px' }}>
        <Stethoscope size={36} color="#64748B" />
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          No Clinical Case Loaded
        </h4>
        <p style={{ fontSize: '0.8rem', maxWidth: '320px' }}>
          Select a sample case from the gallery or upload an anterior segment / slit-lamp photograph to run instance segmentation.
        </p>
      </div>
    );
  }

  const { clinical_triage, pathology_summary, anatomy_summary, eye_side, total_detections } = predictionResult;
  const criticalAlerts = clinical_triage?.critical_alerts || [];
  const stage = clinical_triage?.estimated_foster_stage || "Stage I / Early";
  const severity = clinical_triage?.clinical_severity || "Mild";

  const getSeverityBadge = () => {
    if (severity.includes("Critical") || severity.includes("End-stage")) {
      return <span className="badge-tag badge-emergency">CRITICAL</span>;
    }
    if (severity.includes("Severe")) {
      return <span className="badge-tag" style={{ background: 'rgba(234, 88, 12, 0.2)', color: '#FB923C', border: '1px solid rgba(234, 88, 12, 0.4)' }}>SEVERE</span>;
    }
    if (severity.includes("Moderate")) {
      return <span className="badge-tag" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>MODERATE</span>;
    }
    return <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>MILD / STABLE</span>;
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Header & Stage Badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              OCP Clinical Triage Assessment
            </span>
            {getSeverityBadge()}
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC' }}>
            {stage}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lateralization</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60A5FA' }}>{eye_side}</div>
        </div>
      </div>

      {/* Critical Emergency Alerts */}
      {criticalAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {criticalAlerts.map((alert, idx) => (
            <div 
              key={idx}
              style={{
                background: alert.level === 'EMERGENCY' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                borderLeft: `4px solid ${alert.level === 'EMERGENCY' ? '#DC2626' : '#F59E0B'}`,
                padding: '10px 14px',
                borderRadius: '0 8px 8px 0',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              {alert.level === 'EMERGENCY' ? (
                <AlertOctagon size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>
                <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: alert.level === 'EMERGENCY' ? '#F87171' : '#FCD34D' }}>
                  {alert.title}
                </h5>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.4 }}>
                  {alert.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pathology Breakdown Cards */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Detected OCP Pathology Findings ({Object.values(pathology_summary).reduce((a, b) => a + b, 0)})
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Total Instances: {total_detections}
          </span>
        </div>

        {Object.keys(pathology_summary).length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={15} /> No distinct cicatricial pathologies detected in current frame.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {Object.entries(pathology_summary).map(([pName, count]) => (
              <div 
                key={pName}
                style={{
                  background: 'var(--bg-surface)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '0.76rem', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }} title={pName}>
                  {pName}
                </span>
                <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', fontSize: '0.72rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>
                  ×{count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clinical Recommendations */}
      <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
        <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={14} color="#3B82F6" /> Recommended Clinical Action Plan:
        </h5>
        <ul style={{ paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {clinical_triage?.recommendations?.map((rec, i) => (
            <li key={i} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
