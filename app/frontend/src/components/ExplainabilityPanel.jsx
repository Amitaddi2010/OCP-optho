import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  HelpCircle, 
  ChevronRight,
  Stethoscope,
  Activity,
  Layers
} from 'lucide-react';

export default function ExplainabilityPanel({
  predictionResult = null,
  loading = false,
  onHoverFeature = () => {},
  hoveredFeature = null,
  onExportReport = () => {}
}) {
  if (loading) {
    return (
      <div className="seed-card" style={{ padding: '36px 28px', minHeight: '680px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2.5px solid var(--color-warm-stone)',
          borderTop: '2.5px solid var(--color-forest-depths)',
          borderRadius: '50%',
          animation: 'spin 0.9s linear infinite'
        }} />
        <span style={{ fontSize: '13px', color: 'var(--color-pewter)' }}>
          Synthesizing AI feature attributions & Foster staging criteria...
        </span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!predictionResult) {
    return (
      <div className="seed-card" style={{ padding: '36px 28px', minHeight: '680px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', textAlign: 'center' }}>
        <Stethoscope size={36} color="var(--color-sage-moss)" />
        <h4 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
          Clinical Intelligence & Explainability
        </h4>
        <p style={{ fontSize: '13px', color: 'var(--color-pewter)', maxWidth: '320px', lineHeight: 1.5 }}>
          Select a slit-lamp case from the menu bar to generate automated Foster staging, morphological feature attributions, and emergency alerts.
        </p>
      </div>
    );
  }

  const { clinical_triage, pathology_summary, eye_side, total_detections } = predictionResult;
  const stage = clinical_triage?.estimated_foster_stage || "Stage I / Early";
  const severity = clinical_triage?.clinical_severity || "Mild";
  const criticalAlerts = clinical_triage?.critical_alerts || [];
  const xai = clinical_triage?.ai_explainability || {};
  const attributions = xai.feature_attributions || [];
  const criteria = xai.foster_criteria || [];

  return (
    <div className="seed-card" style={{
      padding: '24px',
      minHeight: '680px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      background: 'var(--color-snow-white)'
    }}>
      {/* Header: Stage and Severity */}
      <div style={{ borderBottom: '1px solid var(--border-muted)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)', textTransform: 'uppercase' }}>
            Decision Support & Staging
          </span>
          <span className="badge-lime">
            {severity}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 350, letterSpacing: '-0.4px', color: 'var(--color-forest-depths)', lineHeight: 1.2 }}>
            {stage}
          </h2>
          <span className="specimen-pill">{eye_side}</span>
        </div>
      </div>

      {/* Module 1: AI Decision Attribution & Explainability */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} color="var(--color-forest-depths)" />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
              Morphological Feature Attribution (XAI)
            </span>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
            Certainty: {(xai.calibration_confidence * 100).toFixed(1)}%
          </span>
        </div>

        {/* Feature Attribution Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {attributions.length > 0 ? (
            attributions.map((attr, idx) => (
              <div
                key={idx}
                onMouseEnter={() => onHoverFeature(attr.feature)}
                onMouseLeave={() => onHoverFeature(null)}
                style={{
                  background: hoveredFeature === attr.feature ? 'var(--color-snow-white)' : 'var(--color-warm-stone)',
                  border: hoveredFeature === attr.feature ? '1.5px solid var(--color-forest-depths)' : '1px solid transparent',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
                    {attr.feature}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--color-pewter)', textTransform: 'uppercase' }}>
                      {attr.category}
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 600, color: 'var(--color-forest-depths)' }}>
                      {attr.weight}%
                    </span>
                  </div>
                </div>

                {/* Attribution Weight Bar */}
                <div style={{ width: '100%', height: '4px', background: 'var(--color-frosted-glass)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${attr.weight}%`,
                    height: '100%',
                    background: attr.weight > 80 ? 'var(--color-forest-depths)' : 'var(--color-sage-moss)',
                    borderRadius: '2px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                <div style={{ fontSize: '11px', color: 'var(--color-pewter)', lineHeight: 1.4, marginTop: '2px' }}>
                  {attr.rationale}
                </div>
              </div>
            ))
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-pewter)', fontStyle: 'italic' }}>
              Baseline / non-cicatricial pattern: no dominant pathology striae identified.
            </span>
          )}
        </div>
      </div>

      {/* Module 2: Foster Staging Criteria Checklist */}
      <div style={{
        background: 'var(--color-warm-stone)',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-forest-depths)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            Foster Staging Validation
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
            [Clinical Staging Protocol]
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {criteria.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 10px',
                borderRadius: '8px',
                background: item.met ? 'var(--color-snow-white)' : 'transparent',
                opacity: item.met ? 1 : 0.6
              }}
            >
              {item.met ? (
                <CheckCircle2 size={15} color="var(--color-forest-depths)" />
              ) : (
                <Circle size={15} color="var(--color-pewter)" />
              )}
              <div style={{ flex: 1, fontSize: '12px' }}>
                <strong style={{ color: 'var(--color-forest-depths)', marginRight: '6px' }}>{item.stage}:</strong>
                <span style={{ color: 'var(--color-pewter)' }}>{item.criterion}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Alerts (if any) */}
      {criticalAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {criticalAlerts.map((alert, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--color-snow-white)',
                border: '1.5px solid var(--color-forest-depths)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}
            >
              <AlertCircle size={16} color="var(--color-forest-depths)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-forest-depths)' }}>
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

      {/* Clinical Recommendations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto' }}>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', textTransform: 'uppercase', color: 'var(--color-forest-depths)' }}>
          Clinical Action Directives:
        </span>
        <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--color-pewter)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {(clinical_triage?.recommendations || []).map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
