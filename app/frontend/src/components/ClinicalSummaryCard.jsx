import React from 'react';
import { AlertCircle, CheckCircle, Activity, FileSpreadsheet, Stethoscope } from 'lucide-react';

export default function ClinicalSummaryCard({
  predictionResult = null,
  loading = false,
  onExportReport = () => {}
}) {
  if (loading) {
    return (
      <div className="seed-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '16px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--color-warm-stone)',
          borderTop: '3px solid var(--color-forest-depths)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontSize: '14px', color: 'var(--color-pewter)', fontWeight: 400 }}>
          Segmenting anterior segment tissue & computing clinical triage...
        </p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!predictionResult) {
    return (
      <div className="seed-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-pewter)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', gap: '12px' }}>
        <Stethoscope size={32} color="var(--color-sage-moss)" />
        <h4 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
          No Slit-Lamp Case Loaded
        </h4>
        <p style={{ fontSize: '13px', maxWidth: '320px', lineHeight: 1.5 }}>
          Select a benchmark specimen from the tray above or upload an anterior segment photograph to initialize instance segmentation.
        </p>
      </div>
    );
  }

  const { clinical_triage, pathology_summary, anatomy_summary, eye_side, total_detections } = predictionResult;
  const criticalAlerts = clinical_triage?.critical_alerts || [];
  const stage = clinical_triage?.estimated_foster_stage || "Stage I / Early";
  const severity = clinical_triage?.clinical_severity || "Mild";

  return (
    <div className="seed-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Stage Badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)', textTransform: 'uppercase' }}>
              Clinical Triage Assessment
            </span>
            <span className="badge-lime">
              {severity}
            </span>
          </div>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 350,
            letterSpacing: '-0.3px',
            color: 'var(--color-forest-depths)',
            lineHeight: 1.2
          }}>
            {stage}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>Eye Laterality</div>
          <div className="specimen-pill" style={{ marginTop: '4px' }}>{eye_side}</div>
        </div>
      </div>

      {/* Critical Clinical Alerts */}
      {criticalAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {criticalAlerts.map((alert, idx) => (
            <div 
              key={idx}
              style={{
                background: 'var(--color-warm-stone)',
                borderLeft: '3px solid var(--color-forest-depths)',
                padding: '12px 16px',
                borderRadius: '0 8px 8px 0',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              <AlertCircle size={16} color="var(--color-forest-depths)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
                  {alert.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-pewter)', marginTop: '2px', lineHeight: 1.4 }}>
                  {alert.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pathology Detections Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', color: 'var(--color-forest-depths)', letterSpacing: '0.02em' }}>
            Pathology Findings
          </span>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
            [{Object.values(pathology_summary || {}).reduce((a, b) => a + b, 0)} lesions detected]
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {Object.entries(pathology_summary || {}).map(([cname, count]) => (
            <div
              key={cname}
              style={{
                background: 'var(--color-warm-stone)',
                borderRadius: 'var(--radius-badges)',
                padding: '5px 12px',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-forest-depths)'
              }}
            >
              <span>{cname}</span>
              <span style={{
                fontFamily: 'var(--font-seed-sans-mono)',
                fontWeight: 500,
                fontSize: '11px',
                background: 'var(--color-snow-white)',
                padding: '1px 6px',
                borderRadius: '1000px',
                border: '1px solid var(--border-muted)'
              }}>
                {count}
              </span>
            </div>
          ))}
          {Object.keys(pathology_summary || {}).length === 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-pewter)', fontStyle: 'italic' }}>
              No focal OCP cicatrizing pathology detected above confidence cutoff.
            </span>
          )}
        </div>
      </div>

      {/* Clinical Staging Checklist & Recommendations */}
      <div style={{
        background: 'var(--color-warm-stone)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-forest-depths)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={14} />
          <span>Automated Foster Staging Criteria</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-pewter)', lineHeight: 1.5 }}>
          {clinical_triage?.clinical_rationale || "Early sub-conjunctival micro-fibrosis and meibomian gland ductal obstruction noted without advanced forniceal foreshortening."}
        </p>

        {clinical_triage?.recommended_actions && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', textTransform: 'uppercase', color: 'var(--color-forest-depths)' }}>
              Recommended Clinical Action:
            </span>
            <ul style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--color-pewter)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {clinical_triage.recommended_actions.map((act, i) => (
                <li key={i}>{act}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Export Clinical Report Button */}
      <button 
        className="btn-seed btn-seed-primary"
        onClick={onExportReport}
        style={{ width: '100%', padding: '12px' }}
      >
        <FileSpreadsheet size={15} />
        <span>Export Formal Clinical Pathology Report</span>
      </button>
    </div>
  );
}
