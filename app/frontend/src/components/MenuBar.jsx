import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, 
  Layers, 
  Sliders, 
  Sparkles, 
  BarChart2, 
  FileText, 
  Upload, 
  Microscope,
  ChevronDown,
  Check,
  EyeOff,
  Activity
} from 'lucide-react';

export default function MenuBar({
  currentView = 'workspace',
  onSwitchView = () => {},
  samples = [],
  selectedSample = null,
  onSelectSample = () => {},
  onFileUpload = () => {},
  categories = [],
  visibleCategories = {},
  onToggleCategory = () => {},
  onToggleGroup = () => {},
  opacity,
  setOpacity,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  confidence,
  setConfidence,
  xaiMode,
  setXaiMode,
  onOpenMetrics = () => {},
  onExportReport = () => {},
  palette = {}
}) {
  const [activeMenu, setActiveMenu] = useState(null); // 'specimen', 'layers', 'aperture', 'xai'
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pathologyClasses = categories.filter(c => c.supercategory === 'pathology');
  const anatomyClasses = categories.filter(c => c.supercategory === 'anatomy');
  const allPathologyVisible = pathologyClasses.every(c => visibleCategories[c.id] !== false);
  const allAnatomyVisible = anatomyClasses.every(c => visibleCategories[c.id] !== false);

  const toggleMenu = (name) => {
    setActiveMenu(prev => prev === name ? null : name);
  };

  return (
    <div ref={menuRef} style={{
      background: 'var(--color-snow-white)',
      borderBottom: '1px solid var(--border-muted)',
      padding: '12px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 200
    }}>
      {/* Brand & Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div 
          onClick={() => onSwitchView('landing')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
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
            color: 'var(--color-forest-depths)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            OCP <span style={{ color: 'var(--color-sage-moss)' }}>·</span> Insight
          </span>
          <span className="badge-lime" style={{ marginLeft: '4px' }}>
            Laboratory Glass
          </span>
        </div>

        {/* View Switcher Pill */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-warm-stone)', padding: '3px', borderRadius: '1000px' }}>
          <button
            onClick={() => onSwitchView('landing')}
            className={`btn-seed ${currentView === 'landing' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            style={{ padding: '4px 12px', fontSize: '12px', border: 'none' }}
          >
            Overview
          </button>
          <button
            onClick={() => onSwitchView('workspace')}
            className={`btn-seed ${currentView === 'workspace' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            style={{ padding: '4px 12px', fontSize: '12px', border: 'none' }}
          >
            Diagnostic Console
          </button>
        </div>

        {/* Clean Top Menu Items */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          
          {/* MENU 1: Specimen Tray */}
          <div style={{ position: 'relative' }}>
            <button
              className={`btn-seed ${activeMenu === 'specimen' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
              onClick={() => toggleMenu('specimen')}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              <Microscope size={14} />
              <span>Specimen: {selectedSample ? `Case #${selectedSample.id}` : 'Select'}</span>
              <ChevronDown size={12} />
            </button>

            {activeMenu === 'specimen' && (
              <div className="seed-card" style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '360px',
                padding: '16px',
                zIndex: 300,
                border: '1px solid var(--border-clinical)',
                background: 'var(--color-snow-white)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest-depths)' }}>
                    Slit-Lamp Benchmark Cases
                  </span>
                  <button
                    className="btn-seed btn-seed-inverted"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    <Upload size={12} />
                    <span>Upload Image</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onFileUpload(file);
                      setActiveMenu(null);
                    }}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {samples.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        onSelectSample(s);
                        setActiveMenu(null);
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '6px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: selectedSample?.id === s.id ? 'var(--color-warm-stone)' : 'transparent',
                        border: selectedSample?.id === s.id ? '1.5px solid var(--color-forest-depths)' : '1px solid var(--border-muted)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ width: '100%', height: '60px', borderRadius: '6px', overflow: 'hidden', background: '#1c3a13' }}>
                        <img src={s.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '0 2px' }}>
                        <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 500 }}>Case #{s.id}</span>
                        <span style={{ color: 'var(--color-pewter)' }}>{s.eye_side}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* MENU 2: Layers Popover */}
          <div style={{ position: 'relative' }}>
            <button
              className={`btn-seed ${activeMenu === 'layers' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
              onClick={() => toggleMenu('layers')}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              <Layers size={14} />
              <span>Layers ({Object.values(visibleCategories).filter(v => v !== false).length})</span>
              <ChevronDown size={12} />
            </button>

            {activeMenu === 'layers' && (
              <div className="seed-card" style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '320px',
                maxHeight: '420px',
                overflowY: 'auto',
                padding: '16px',
                zIndex: 300,
                border: '1px solid var(--border-clinical)',
                background: 'var(--color-snow-white)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                {/* Pathology toggle */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-forest-depths)' }}>
                      OCP Pathology (13)
                    </span>
                    <button
                      onClick={() => onToggleGroup('pathology', !allPathologyVisible)}
                      style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--color-pewter)', cursor: 'pointer' }}
                    >
                      {allPathologyVisible ? 'Hide All' : 'Show All'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {pathologyClasses.map(c => (
                      <div
                        key={c.id}
                        onClick={() => onToggleCategory(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: visibleCategories[c.id] !== false ? 'var(--color-warm-stone)' : 'transparent',
                          opacity: visibleCategories[c.id] !== false ? 1 : 0.45,
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette[c.id]?.color || '#1c3a13' }} />
                          <span>{c.name}</span>
                        </div>
                        {visibleCategories[c.id] !== false && <Check size={12} />}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anatomy toggle */}
                <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-forest-depths)' }}>
                      Anatomy Landmarks (10)
                    </span>
                    <button
                      onClick={() => onToggleGroup('anatomy', !allAnatomyVisible)}
                      style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--color-pewter)', cursor: 'pointer' }}
                    >
                      {allAnatomyVisible ? 'Hide All' : 'Show All'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {anatomyClasses.map(c => (
                      <div
                        key={c.id}
                        onClick={() => onToggleCategory(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: visibleCategories[c.id] !== false ? 'var(--color-warm-stone)' : 'transparent',
                          opacity: visibleCategories[c.id] !== false ? 1 : 0.45,
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: palette[c.id]?.color || '#757c5d' }} />
                          <span>{c.name}</span>
                        </div>
                        {visibleCategories[c.id] !== false && <Check size={12} />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MENU 3: Optical Aperture Controls */}
          <div style={{ position: 'relative' }}>
            <button
              className={`btn-seed ${activeMenu === 'aperture' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
              onClick={() => toggleMenu('aperture')}
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              <Sliders size={14} />
              <span>Optical Aperture</span>
              <ChevronDown size={12} />
            </button>

            {activeMenu === 'aperture' && (
              <div className="seed-card" style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                width: '280px',
                padding: '18px',
                zIndex: 300,
                border: '1px solid var(--border-clinical)',
                background: 'var(--color-snow-white)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-pewter)' }}>Confidence Cutoff</span>
                    <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 500 }}>{(confidence * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0.05" max="0.80" step="0.05" value={confidence} onChange={(e) => setConfidence(parseFloat(e.target.value))} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-pewter)' }}>Mask Opacity</span>
                    <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 500 }}>{(opacity * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0.1" max="1.0" step="0.05" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} />
                </div>

                {/* Grad-CAM Opacity Slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-pewter)' }}>Grad-CAM Heatmap Opacity</span>
                    <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 500 }}>{((gradcamOpacity || 0.75) * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0.1" max="1.0" step="0.05" value={gradcamOpacity || 0.75} onChange={(e) => setGradcamOpacity && setGradcamOpacity(parseFloat(e.target.value))} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-pewter)' }}>Brightness</span>
                      <span style={{ fontFamily: 'var(--font-seed-sans-mono)' }}>{brightness}%</span>
                    </div>
                    <input type="range" min="60" max="160" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--color-pewter)' }}>Contrast</span>
                      <span style={{ fontFamily: 'var(--font-seed-sans-mono)' }}>{contrast}%</span>
                    </div>
                    <input type="range" min="60" max="180" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MENU 4: AI Explainability Mode Selector */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--color-warm-stone)', padding: '3px', borderRadius: '1000px' }}>
            <button
              onClick={() => setXaiMode('segmentation')}
              className={`btn-seed ${xaiMode === 'segmentation' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
              style={{ padding: '4px 10px', fontSize: '11px', border: 'none' }}
            >
              Polygons
            </button>
            <button
              onClick={() => setXaiMode('gradcam')}
              className={`btn-seed ${xaiMode === 'gradcam' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
              style={{ padding: '4px 10px', fontSize: '11px', border: 'none' }}
            >
              <Sparkles size={11} />
              <span>Grad-CAM</span>
            </button>
            <button
              onClick={() => setXaiMode('composite')}
              className={`btn-seed ${xaiMode === 'composite' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
              style={{ padding: '4px 10px', fontSize: '11px', border: 'none' }}
            >
              <span>Composite</span>
            </button>
          </div>

        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="seed-menubar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className="btn-seed btn-seed-inverted micro-pill-interactive"
          onClick={onOpenMetrics}
          style={{ padding: '7px 16px', fontSize: '12px' }}
        >
          <BarChart2 size={14} />
          <span>Audit & Benchmarks</span>
        </button>

        <button
          className="btn-seed btn-seed-primary micro-pill-interactive"
          onClick={onExportReport}
          style={{ padding: '7px 16px', fontSize: '12px' }}
        >
          <FileText size={14} />
          <span>Export Clinical Report</span>
        </button>
      </div>
    </div>
  );
}
