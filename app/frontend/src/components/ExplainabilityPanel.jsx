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
  Layers,
  Sliders,
  Flame
} from 'lucide-react';

export default function ExplainabilityPanel({
  predictionResult = null,
  loading = false,
  xaiMode = 'segmentation',
  setXaiMode = () => {},
  gradcamOpacity = 0.75,
  setGradcamOpacity = () => {},
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
          Computing Grad-CAM gradient activations & Foster staging criteria...
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
          Select a slit-lamp case from the menu bar to generate automated Foster staging, Grad-CAM gradient activations, and emergency alerts.
        </p>
      </div>
    );
  }

  const { clinical_triage, pathology_summary, eye_side, total_detections, gradcam_heatmap_url } = predictionResult;
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
      backgroundColor: 'var(--color-snow-white)'
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
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 350, letterSpacing: '-0.4px', color: 'var(--color-forest-depths)', lineHeight: 1.2, margin: 0 }}>
            {stage}
          </h2>
          <span className="specimen-pill">{eye_side}</span>
        </div>
      </div>

      {/* Module 1: Grad-CAM Saliency Controls & How-To Guide */}
      <div style={{
        background: 'var(--color-warm-stone)',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={16} color="#d97706" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-forest-depths)' }}>
              Grad-CAM Activation Controls
            </span>
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
            YOLO26 Feature Saliency
          </span>
        </div>

        {/* Grad-CAM Mode Buttons (Micro-Interaction) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          <button
            onClick={() => setXaiMode('segmentation')}
            className={`btn-seed micro-pill-interactive ${xaiMode === 'segmentation' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            style={{ padding: '6px 0', fontSize: '11px', justifyContent: 'center' }}
          >
            Polygons
          </button>
          <button
            onClick={() => setXaiMode('gradcam')}
            className={`btn-seed micro-pill-interactive ${xaiMode === 'gradcam' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            style={{ padding: '6px 0', fontSize: '11px', justifyContent: 'center' }}
          >
            Grad-CAM
          </button>
          <button
            onClick={() => setXaiMode('composite')}
            className={`btn-seed micro-pill-interactive ${xaiMode === 'composite' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            style={{ padding: '6px 0', fontSize: '11px', justifyContent: 'center' }}
          >
            Composite
          </button>
        </div>

        {/* Grad-CAM Opacity Slider */}
        {xaiMode !== 'segmentation' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span style={{ color: 'var(--color-pewter)' }}>Thermal Heatmap Blend Intensity</span>
              <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 600 }}>{(gradcamOpacity * 100).toFixed(0)}%</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.05" 
              value={gradcamOpacity} 
              onChange={(e) => setGradcamOpacity(parseFloat(e.target.value))} 
            />
          </div>
        )}

        {/* How to Use Grad-CAM Instructional Tooltip */}
        <div style={{
          background: 'var(--color-snow-white)',
          padding: '10px 12px',
          borderRadius: '10px',
          fontSize: '11px',
          color: 'var(--color-pewter)',
          lineHeight: 1.45,
          border: '1px solid var(--border-muted)'
        }}>
          <strong style={{ color: 'var(--color-forest-depths)' }}>How to use Grad-CAM:</strong> Toggle <em>Grad-CAM</em> to view spatial gradient activations. Red/amber peaks indicate the exact stromal textures and ductal borders that drove the model's confidence.
        </div>
      </div>

      {/* Module 2: AI Decision Attribution & Explainability */}
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

                <div style={{ fontSize: '11px', color: 'var(--color-pewter)', lineHeight: 1.4 }}>
                  {attr.rationale}
                </div>
              </div>
            ))
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--color-pewter)', fontStyle: 'italic' }}>
              Baseline / non-cicatricial pattern: analyzing anterior segment landmarks.
            </span>
          )}
        </div>
      </div>

      {/* Module 3: Foster Staging Criteria Checklist */}
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
            [Clinical Protocol]
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {criteria.map((item, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '10px',
                background: item.met ? 'var(--color-snow-white)' : 'rgba(252, 252, 247, 0.4)',
                border: item.met ? '1.5px solid var(--color-forest-depths)' : '1px solid transparent',
                opacity: item.met ? 1 : 0.65,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {item.met ? (
                  <CheckCircle2 size={16} color="var(--color-forest-depths)" />
                ) : (
                  <Circle size={15} color="var(--color-pewter)" />
                )}
                <div style={{ fontSize: '12px' }}>
                  <strong style={{ color: 'var(--color-forest-depths)', marginRight: '6px' }}>{item.stage}:</strong>
                  <span style={{ color: 'var(--color-pewter)' }}>{item.criterion}</span>
                </div>
              </div>

              <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-seed-sans-mono)',
                padding: '2px 8px',
                borderRadius: '1000px',
                background: item.met ? 'var(--color-lime-pulse)' : 'transparent',
                color: 'var(--color-forest-depths)',
                fontWeight: 600
              }}>
                {item.met ? (item.stage === 'Stage 0' ? 'Intact / Normal' : 'Met / Present') : 'Negative'}
              </span>
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

      {/* Clinical Recommendations & Export Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
        <button
          className="btn-seed btn-seed-primary micro-pill-interactive"
          onClick={onExportReport}
          style={{ width: '100%', padding: '12px' }}
        >
          <span>Export Formal Pathology Report</span>
        </button>
      </div>
    </div>
  );
}
