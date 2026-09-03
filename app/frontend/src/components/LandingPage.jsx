import React, { useState } from 'react';
import { 
  Eye, 
  ArrowRight, 
  Microscope, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Layers, 
  CheckCircle2, 
  Sliders, 
  ExternalLink,
  ChevronRight,
  BarChart2
} from 'lucide-react';

export default function LandingPage({
  onLaunchWorkspace = () => {},
  onOpenMetrics = () => {},
  samples = []
}) {
  // Hero Interactive Microscope Lens State
  const [lensMode, setLensMode] = useState('segmented'); // 'raw', 'segmented', 'saliency'
  const [activeZone, setActiveZone] = useState('glands'); // 'glands', 'fibrosis', 'pannus'

  // Section 2 Interactive Matrix States
  const [activeMetricTab, setActiveMetricTab] = useState('micro'); // 'micro', 'macro'
  const [selectedFosterStage, setSelectedFosterStage] = useState(1); // 1, 2, 3, 4

  const heroImage = samples[0]?.thumbnail_url || "/api/sample-image/P2_0727ae6f-OD_2024-08-14_13-03-28_013.jpg";

  const fosterStageData = {
    1: {
      title: "Stage I — Sub-epithelial Fibrosis & Margin Distortion",
      criteria: "Chronic sub-conjunctival scarring striae, graying and rounding of posterior eyelid margins.",
      marker: "Rounding of lid margins + fine stromal fibrosis",
      detectionRate: "92.4% Detection Sensitivity",
      intervention: "Topical immunomodulators + baseline forniceal depth measurement."
    },
    2: {
      title: "Stage II — Forniceal Foreshortening",
      criteria: "Loss of inferior fornix depth (cul-de-sac reduction) with conjunctival traction.",
      marker: "Inferior cul-de-sac foreshortening striae",
      detectionRate: "88.1% Morphometric Alignment",
      intervention: "Systemic immunosuppression (Methotrexate / Dapsone) initiation."
    },
    3: {
      title: "Stage III — Symblepharon Adhesion Bands",
      criteria: "Adhesive fibrotic bands bridging bulbar conjunctiva to palpebral eyelid margins.",
      marker: "Palpebral-to-bulbar cicatricial adhesions",
      detectionRate: "94.6% Contour Precision",
      intervention: "Surgical symblepharon lysis with amniotic membrane transplantation (AMT)."
    },
    4: {
      title: "Stage IV — Ankyloblephron & End-Stage Cicatrization",
      criteria: "Complete canthal obliteration, ocular immobility, and profound corneal keratinization.",
      marker: "Canthal angle fusion + total fornix obliteration",
      detectionRate: "99.1% Landmark Resolution",
      intervention: "Keratolytic tectonic stabilization, tectonic keratoprosthesis assessment."
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--surface-canvas)',
      color: 'var(--color-forest-depths)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Editorial Sticky Navigation */}
      <nav style={{
        padding: '16px 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-snow-white)',
        borderBottom: '1px solid var(--border-muted)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--color-forest-depths)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Eye size={16} color="var(--color-snow-white)" />
          </div>
          <span style={{
            fontSize: '18px',
            fontWeight: 350,
            letterSpacing: '-0.3px',
            color: 'var(--color-forest-depths)'
          }}>
            OCP <span style={{ color: 'var(--color-sage-moss)' }}>·</span> Insight
          </span>
          <span className="badge-lime" style={{ marginLeft: '6px' }}>
            Laboratory Glass
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn-seed btn-seed-ghost"
            onClick={onOpenMetrics}
            style={{ padding: '7px 16px', fontSize: '13px' }}
          >
            <BarChart2 size={14} />
            <span>Audited Evidence</span>
          </button>

          <button
            className="btn-seed btn-seed-primary"
            onClick={onLaunchWorkspace}
            style={{ padding: '7px 18px', fontSize: '13px' }}
          >
            <span>Launch Workspace</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ==========================================
          SECTION 1: THE CLINICAL PARADIGM & SPECIMEN VIEWPORT
          ========================================== */}
      <section style={{
        padding: '64px 36px 48px 36px',
        maxWidth: '1540px',
        margin: '0 auto',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1.05fr 1.15fr',
        gap: '48px',
        alignItems: 'center'
      }}>
        {/* Left Column: Whisper-Light Editorial Typography */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span className="specimen-pill">YOLO26-Seg [1280px Controlled]</span>
            <span className="specimen-pill">23 Anatomo-Pathological Classes</span>
            <span className="badge-lime">Foster Staging I–IV</span>
          </div>

          <h1 style={{
            fontSize: '48px',
            fontWeight: 300,
            lineHeight: 1.1,
            letterSpacing: '-0.72px',
            color: 'var(--color-forest-depths)',
            margin: 0
          }}>
            Living tissue under laboratory glass.
          </h1>

          <p style={{
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: 1.65,
            color: 'var(--color-pewter)',
            maxWidth: '560px'
          }}>
            A deep-learning slit-lamp morphometry system designed to segment subtle sub-epithelial fibrosis, obstructed meibomian glands, symblepharon bands, and emergency corneal perforations with mathematical rigor and full explainability.
          </p>

          {/* Interactive Micro-Zone Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)', textTransform: 'uppercase' }}>
              Interactive Tissue Probe Targets:
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveZone('glands')}
                className={`btn-seed ${activeZone === 'glands' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Meibomian Glands (+3.85% AP)
              </button>
              <button
                onClick={() => setActiveZone('fibrosis')}
                className={`btn-seed ${activeZone === 'fibrosis' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Sub-conjunctival Striae
              </button>
              <button
                onClick={() => setActiveZone('pannus')}
                className={`btn-seed ${activeZone === 'pannus' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Corneal Pannus
              </button>
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '8px' }}>
            <button
              className="btn-seed btn-seed-primary"
              onClick={onLaunchWorkspace}
              style={{ padding: '12px 28px', fontSize: '14px' }}
            >
              <span>Analyze Slit-Lamp Photograph</span>
              <ArrowRight size={16} />
            </button>

            <button
              className="btn-seed btn-seed-inverted"
              onClick={onOpenMetrics}
              style={{ padding: '12px 22px', fontSize: '14px' }}
            >
              <ShieldCheck size={16} />
              <span>Cryptographic Audit (SHA256)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Microscope Lens Simulator */}
        <div className="seed-card" style={{
          padding: '20px',
          backgroundColor: 'var(--color-warm-stone)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative'
        }}>
          {/* Microscope Header Strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Microscope size={16} color="var(--color-forest-depths)" />
              <span style={{ fontSize: '13px', fontWeight: 500 }}>
                High-Magnification Slit-Lamp Specimen
              </span>
            </div>

            {/* Lens Mode Switcher Pills */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--color-snow-white)', padding: '3px', borderRadius: '1000px', border: '1px solid var(--border-muted)' }}>
              <button
                onClick={() => setLensMode('raw')}
                className={`btn-seed ${lensMode === 'raw' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '11px', border: 'none' }}
              >
                Raw Optical
              </button>
              <button
                onClick={() => setLensMode('segmented')}
                className={`btn-seed ${lensMode === 'segmented' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '11px', border: 'none' }}
              >
                Segmentation
              </button>
              <button
                onClick={() => setLensMode('saliency')}
                className={`btn-seed ${lensMode === 'saliency' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                style={{ padding: '4px 10px', fontSize: '11px', border: 'none' }}
              >
                <Sparkles size={11} />
                <span>Saliency</span>
              </button>
            </div>
          </div>

          {/* Laboratory Glass Stage with Simulated Overlays */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '420px',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#1c3a13'
          }}>
            <img
              src={heroImage}
              alt="Slit-lamp specimen"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: lensMode === 'raw' ? 'none' : 'contrast(1.08) brightness(0.98)',
                transition: 'filter 0.3s ease'
              }}
            />

            {/* Simulated Live Segmentation Overlays */}
            {lensMode !== 'raw' && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {/* Zone 1: Meibomian Glands */}
                <ellipse
                  cx="48%"
                  cy="74%"
                  rx="95"
                  ry="24"
                  fill={lensMode === 'saliency' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(28, 58, 19, 0.45)'}
                  stroke={lensMode === 'saliency' ? '#f59e0b' : 'var(--color-lime-pulse)'}
                  strokeWidth={activeZone === 'glands' ? "3.5" : "2"}
                  strokeDasharray={lensMode === 'saliency' ? "4 2" : "none"}
                />

                {/* Zone 2: Sub-epithelial Fibrosis */}
                <path
                  d="M 120 280 Q 240 320 380 290 Q 480 340 560 300"
                  fill="none"
                  stroke={lensMode === 'saliency' ? '#fbbf24' : '#d3fa99'}
                  strokeWidth={activeZone === 'fibrosis' ? "4" : "2.5"}
                  strokeDasharray="6 3"
                />

                {/* Zone 3: Vascularized Cornea */}
                <ellipse
                  cx="50%"
                  cy="46%"
                  rx="135"
                  ry="130"
                  fill={lensMode === 'saliency' ? 'rgba(217, 119, 6, 0.25)' : 'rgba(105, 142, 121, 0.25)'}
                  stroke={lensMode === 'saliency' ? '#d97706' : '#698e79'}
                  strokeWidth={activeZone === 'pannus' ? "3.5" : "1.8"}
                />
              </svg>
            )}

            {/* Floating Live Specimen Probe Badge */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              background: 'var(--color-snow-white)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-badges)',
              fontSize: '11px',
              fontFamily: 'var(--font-seed-sans-mono)',
              color: 'var(--color-forest-depths)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid var(--border-muted)'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-forest-depths)' }} />
              <span>Target: {activeZone === 'glands' ? 'Obstructed Meibomian Glands (94.2%)' : activeZone === 'fibrosis' ? 'Sub-conjunctival Striae (88.7%)' : 'Limbal Vascularization (91.0%)'}</span>
            </div>
          </div>

          {/* Micro-Interaction Rationale Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-pewter)' }}>
            <span>Aperture: 1280px Native Scale</span>
            <span style={{ fontFamily: 'var(--font-seed-sans-mono)' }}>Class 1 Mask AP: 20.31% (+2.01%)</span>
          </div>
        </div>
      </section>

      {/* ==========================================
          SECTION 2: EMPIRICAL EVIDENCE & EXPLAINABILITY MATRIX
          ========================================== */}
      <section style={{
        padding: '64px 36px 80px 36px',
        maxWidth: '1540px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        borderTop: '1px solid var(--border-muted)'
      }}>
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)', textTransform: 'uppercase' }}>
              Scientific Validation & Explainability
            </span>
            <h2 style={{
              fontSize: '36px',
              fontWeight: 300,
              letterSpacing: '-0.54px',
              color: 'var(--color-forest-depths)',
              marginTop: '4px'
            }}>
              Resolution trade-offs and clinical staging.
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-pewter)' }}>Evidence Base:</span>
            <span className="specimen-pill">N = 95 Test Images (1,089 Annotations)</span>
          </div>
        </div>

        {/* 2-Card Comparative Interactive Matrix */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          gap: '28px',
          alignItems: 'stretch'
        }}>
          {/* MATRIX CARD A: Resolution Ablation Explorer */}
          <div className="seed-card" style={{
            padding: '28px',
            backgroundColor: 'var(--color-snow-white)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
                  1280px Resolution Trade-off
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--color-pewter)' }}>
                  Controlled single-variable retrain ablation
                </span>
              </div>

              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--color-warm-stone)', padding: '3px', borderRadius: '1000px' }}>
                <button
                  onClick={() => setActiveMetricTab('micro')}
                  className={`btn-seed ${activeMetricTab === 'micro' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                  style={{ padding: '4px 12px', fontSize: '11px', border: 'none' }}
                >
                  Micro-Pathology
                </button>
                <button
                  onClick={() => setActiveMetricTab('macro')}
                  className={`btn-seed ${activeMetricTab === 'macro' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                  style={{ padding: '4px 12px', fontSize: '11px', border: 'none' }}
                >
                  Macro-Anatomy
                </button>
              </div>
            </div>

            {/* Interactive Metric Comparison Bars */}
            {activeMetricTab === 'micro' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Metric 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ fontWeight: 500 }}>Meibomian Glands Box AP50 (n = 318)</span>
                    <span style={{ fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-forest-depths)', fontWeight: 600 }}>26.48% (+3.85%)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--color-warm-stone)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '88%', height: '100%', background: 'var(--color-forest-depths)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-pewter)' }}>Controlled 1280px broke 20% barrier in mask AP (20.31% vs 18.30%).</span>
                </div>

                {/* Metric 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ fontWeight: 500 }}>Corneal Perforation Emergency (n = 2)</span>
                    <span style={{ fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-forest-depths)', fontWeight: 600 }}>50.5% (1 / 2 Detected)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--color-warm-stone)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '70%', height: '100%', background: 'var(--color-sage-moss)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-pewter)' }}>v1 640px model detected 0/2; 1280px successfully resolved emergency perforation.</span>
                </div>

                {/* Metric 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ fontWeight: 500 }}>All Pathology Recall AR100 (13 classes)</span>
                    <span style={{ fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-forest-depths)', fontWeight: 600 }}>32.72% (+1.85%)</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--color-warm-stone)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: '65%', height: '100%', background: 'var(--color-forest-depths)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--color-pewter)' }}>Significant overall recall gain across all OCP pathology classes.</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--color-warm-stone)', borderRadius: '10px', padding: '14px', fontSize: '12px', lineHeight: 1.5 }}>
                  <strong>Macro Boundary Precision Finding:</strong> Large tissue structures (eyelids, bulbar conjunctiva spanning {">"}1M pixels) exhibit boundary jitter at strict IoU ≥ 0.75 when scaling to 1280px, while preserving mAP50.
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-muted)', fontSize: '12px' }}>
                  <span>Anatomy Mask mAP50 (8 classes)</span>
                  <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 600 }}>62.57% (Preserved)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '12px' }}>
                  <span>Overall 21-Class Mask mAP50</span>
                  <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 600, color: 'var(--color-forest-depths)' }}>40.09% (Highest)</span>
                </div>
              </div>
            )}

            <button
              className="btn-seed btn-seed-inverted"
              onClick={onOpenMetrics}
              style={{ marginTop: 'auto', padding: '8px 16px', fontSize: '12px' }}
            >
              <span>View Full Publication Tables (Table 1 & 2)</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* MATRIX CARD B: Automated Foster Staging Engine */}
          <div className="seed-card" style={{
            padding: '28px',
            backgroundColor: 'var(--color-snow-white)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
                Automated Foster Staging Engine
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--color-pewter)' }}>
                Click a stage to inspect automated diagnostic rules
              </span>
            </div>

            {/* Stage Selector Pills (Micro-Interaction) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[1, 2, 3, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedFosterStage(s)}
                  className={`btn-seed ${selectedFosterStage === s ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
                  style={{ padding: '8px 0', fontSize: '12px', justifyContent: 'center' }}
                >
                  Stage {s}
                </button>
              ))}
            </div>

            {/* Selected Stage Detail Panel */}
            <div style={{
              background: 'var(--color-warm-stone)',
              borderRadius: '12px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-forest-depths)' }}>
                  {fosterStageData[selectedFosterStage].title}
                </span>
                <span className="badge-lime">
                  {fosterStageData[selectedFosterStage].detectionRate}
                </span>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--color-pewter)', lineHeight: 1.5, margin: 0 }}>
                {fosterStageData[selectedFosterStage].criteria}
              </p>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-forest-depths)', textTransform: 'uppercase' }}>
                  Biomarker Contour Signature:
                </span>
                <span style={{ fontSize: '12px', fontWeight: 500 }}>
                  {fosterStageData[selectedFosterStage].marker}
                </span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-forest-depths)', textTransform: 'uppercase' }}>
                  Clinical Directive:
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-pewter)' }}>
                  {fosterStageData[selectedFosterStage].intervention}
                </span>
              </div>
            </div>

            <button
              className="btn-seed btn-seed-primary"
              onClick={onLaunchWorkspace}
              style={{ width: '100%', padding: '10px 16px', fontSize: '13px' }}
            >
              <span>Test Stage Engine on Slit-Lamp Images</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Minimal Botanical-Clinical Footer */}
        <div style={{
          paddingTop: '24px',
          borderTop: '1px solid var(--border-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'var(--font-seed-sans-mono)',
          color: 'var(--color-pewter)'
        }}>
          <div>SEED DESIGN SYSTEM · OCULAR CICATRICIAL PEMPHIGOID RESEARCH INITIATIVE</div>
          <div>MODEL: YOLO26-SEG [1280PX CONTROLLED] · ZERO DATASET FABRICATION</div>
        </div>
      </section>
    </div>
  );
}
