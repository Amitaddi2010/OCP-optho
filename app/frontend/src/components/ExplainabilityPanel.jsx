import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  Activity, 
  Layers, 
  FileText, 
  Flame,
  Stethoscope,
  Info,
  Sliders,
  Check
} from 'lucide-react';

export default function ExplainabilityPanel({
  predictionResult = null,
  loading = false,
  xaiMode = 'segmentation',
  gradcamOpacity = 0.75,
  setGradcamOpacity = () => {},
  categories = [],
  visibleCategories = {},
  onToggleCategory = () => {},
  palette = {},
  onHoverFeature = () => {},
  hoveredFeature = null,
  onExportReport = () => {}
}) {
  const [activeTab, setActiveTab] = useState('staging'); // 'staging', 'xai', 'biomarkers'

  if (loading) {
    return (
      <div className="seed-card" style={{
        padding: '36px',
        minHeight: '640px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        backgroundColor: 'var(--color-snow-white)',
        border: '1px solid var(--border-muted)'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2.5px solid var(--color-warm-stone)',
          borderTop: '2.5px solid var(--color-forest-depths)',
          borderRadius: '50%',
          animation: 'spin 0.85s linear infinite'
        }} />
        <span style={{ fontSize: '13px', color: 'var(--color-pewter)' }}>
          Computing automated Foster staging & Grad-CAM activations...
        </span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!predictionResult) {
    return (
      <div className="seed-card" style={{
        padding: '36px',
        minHeight: '640px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '14px',
        textAlign: 'center',
        backgroundColor: 'var(--color-snow-white)',
        border: '1px solid var(--border-muted)'
      }}>
        <Stethoscope size={36} color="var(--color-sage-moss)" />
        <h4 style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-forest-depths)', margin: 0 }}>
          Clinical Intelligence Console
        </h4>
        <p style={{ fontSize: '13px', color: 'var(--color-pewter)', maxWidth: '300px', lineHeight: 1.5, margin: 0 }}>
          Select a case from the top bar to inspect automated Foster staging, Grad-CAM attention maps, and feature attributions.
        </p>
      </div>
    );
  }

  const { clinical_triage, pathology_summary, anatomy_summary, eye_side, total_detections } = predictionResult;
  const stage = clinical_triage?.estimated_foster_stage || "Stage 0 (Non-Cicatricial / Preserved Anatomy)";
  const severity = clinical_triage?.clinical_severity || "Low / Baseline";
  const criticalAlerts = clinical_triage?.critical_alerts || [];
  const xai = clinical_triage?.ai_explainability || {};
  const attributions = xai.feature_attributions || [];
  const criteria = xai.foster_criteria || [];

  return (
    <div className="seed-card" style={{
      padding: '0',
      minHeight: '640px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-snow-white)',
      border: '1px solid var(--border-muted)',
      overflow: 'hidden'
    }}>
      {/* 1. Header Card: Stage & Severity Banner */}
      <div style={{
        padding: '20px 24px',
        backgroundColor: 'var(--color-snow-white)',
        borderBottom: '1px solid var(--border-muted)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)', textTransform: 'uppercase' }}>
              Clinical Triage
            </span>
            <span className="badge-lime">
              {severity}
            </span>
          </div>
          <span className="specimen-pill">{eye_side}</span>
        </div>

        <h2 style={{
          fontSize: '20px',
          fontWeight: 350,
          letterSpacing: '-0.3px',
          color: 'var(--color-forest-depths)',
          lineHeight: 1.25,
          margin: 0
        }}>
          {stage}
        </h2>
      </div>

      {/* 2. Structured Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-muted)',
        backgroundColor: 'var(--color-warm-stone)',
        padding: '4px 16px',
        gap: '6px'
      }}>
        <button
          onClick={() => setActiveTab('staging')}
          className={`btn-seed ${activeTab === 'staging' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
          style={{ padding: '6px 14px', fontSize: '12px', flex: 1, border: 'none', justifyContent: 'center' }}
        >
          <Activity size={13} />
          <span>Staging</span>
        </button>

        <button
          onClick={() => setActiveTab('xai')}
          className={`btn-seed ${activeTab === 'xai' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
          style={{ padding: '6px 14px', fontSize: '12px', flex: 1, border: 'none', justifyContent: 'center' }}
        >
          <Sparkles size={13} />
          <span>Explainability</span>
        </button>

        <button
          onClick={() => setActiveTab('biomarkers')}
          className={`btn-seed ${activeTab === 'biomarkers' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
          style={{ padding: '6px 14px', fontSize: '12px', flex: 1, border: 'none', justifyContent: 'center' }}
        >
          <Layers size={13} />
          <span>Biomarkers</span>
        </button>
      </div>

      {/* 3. Tab Content Area */}
      <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* =========================================================
            TAB 1: FOSTER STAGING & TRIAGE DIRECTIVES
            ========================================================= */}
        {activeTab === 'staging' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Foster Staging Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest-depths)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Foster Staging Validation Criteria
                </span>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
                  Automated
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {criteria.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: item.met ? 'var(--color-warm-stone)' : 'transparent',
                      border: item.met ? '1.5px solid var(--color-forest-depths)' : '1px solid var(--border-muted)',
                      opacity: item.met ? 1 : 0.65
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.met ? (
                        <CheckCircle2 size={15} color="var(--color-forest-depths)" />
                      ) : (
                        <Circle size={14} color="var(--color-pewter)" />
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
                      background: item.met ? 'var(--color-lime-pulse)' : 'var(--color-warm-stone)',
                      color: 'var(--color-forest-depths)',
                      fontWeight: 600
                    }}>
                      {item.met ? (item.stage === 'Stage 0' ? 'Intact Normal' : 'Met / Present') : 'Negative'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Clinical Alerts */}
            {criticalAlerts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest-depths)', textTransform: 'uppercase' }}>
                  Critical Alerts
                </span>
                {criticalAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--color-warm-stone)',
                      borderLeft: '3px solid var(--color-forest-depths)',
                      borderRadius: '0 8px 8px 0',
                      padding: '10px 14px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <AlertCircle size={15} color="var(--color-forest-depths)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest-depths)' }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-pewter)', marginTop: '2px', lineHeight: 1.4 }}>
                        {alert.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Clinical Directives */}
            <div style={{
              background: 'var(--color-warm-stone)',
              borderRadius: '10px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', textTransform: 'uppercase', color: 'var(--color-forest-depths)' }}>
                Recommended Clinical Directives:
              </span>
              <ul style={{ paddingLeft: '16px', fontSize: '12px', color: 'var(--color-pewter)', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                {(clinical_triage?.recommendations || []).map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: AI EXPLAINABILITY & MORPHOLOGICAL ATTRIBUTIONS
            ========================================================= */}
        {activeTab === 'xai' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Calibration & Certainty Strip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'var(--color-warm-stone)',
              borderRadius: '10px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--color-pewter)', display: 'block' }}>Model Calibration Certainty</span>
                <span style={{ fontSize: '14px', fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 600, color: 'var(--color-forest-depths)' }}>
                  {(xai.calibration_confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-pewter)', display: 'block' }}>Engine</span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)' }}>Grad-CAM v2</span>
              </div>
            </div>

            {/* Grad-CAM Opacity Slider */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: 'var(--color-warm-stone)',
              padding: '12px 14px',
              borderRadius: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ fontWeight: 500 }}>Grad-CAM Thermal Blend Opacity</span>
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

            {/* Feature Attributions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest-depths)', textTransform: 'uppercase' }}>
                Active Morphological Drivers
              </span>

              {attributions.map((attr, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => onHoverFeature(attr.feature)}
                  onMouseLeave={() => onHoverFeature(null)}
                  style={{
                    background: hoveredFeature === attr.feature ? 'var(--color-snow-white)' : 'var(--color-warm-stone)',
                    border: hoveredFeature === attr.feature ? '1.5px solid var(--color-forest-depths)' : '1px solid transparent',
                    borderRadius: '10px',
                    padding: '10px 12px',
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
              ))}
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: DETECTED BIOMARKERS & LAYER VISIBILITY
            ========================================================= */}
        {activeTab === 'biomarkers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Pathology Lesions Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest-depths)', textTransform: 'uppercase' }}>
                  Pathology Lesions
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
                  [{Object.values(pathology_summary || {}).reduce((a, b) => a + b, 0)} detected]
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(pathology_summary || {}).map(([cname, count]) => (
                  <div
                    key={cname}
                    style={{
                      background: 'var(--color-warm-stone)',
                      borderRadius: '1000px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{cname}</span>
                    <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 600 }}>{count}</span>
                  </div>
                ))}
                {Object.keys(pathology_summary || {}).length === 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--color-pewter)', fontStyle: 'italic' }}>
                    Zero focal cicatrizing lesions identified.
                  </span>
                )}
              </div>
            </div>

            {/* Anatomical Landmarks Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-muted)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest-depths)', textTransform: 'uppercase' }}>
                  Anatomical Landmarks
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
                  [{Object.values(anatomy_summary || {}).reduce((a, b) => a + b, 0)} verified]
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(anatomy_summary || {}).map(([cname, count]) => (
                  <div
                    key={cname}
                    style={{
                      background: 'var(--color-warm-stone)',
                      borderRadius: '1000px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{cname}</span>
                    <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 600 }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 4. Bottom Clinical Report Export Action */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border-muted)',
        backgroundColor: 'var(--color-snow-white)'
      }}>
        <button
          className="btn-seed btn-seed-primary micro-pill-interactive"
          onClick={onExportReport}
          style={{ width: '100%', padding: '10px 16px', fontSize: '13px' }}
        >
          <FileText size={14} />
          <span>Export Formal Pathology Report</span>
        </button>
      </div>
    </div>
  );
}
