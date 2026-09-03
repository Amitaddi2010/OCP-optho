import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, 
  BarChart2, 
  FileText, 
  Upload, 
  Microscope,
  ChevronDown,
  Sliders
} from 'lucide-react';

export default function MenuBar({
  currentView = 'workspace',
  onSwitchView = () => {},
  samples = [],
  selectedSample = null,
  onSelectSample = () => {},
  onFileUpload = () => {},
  confidence = 0.20,
  setConfidence = () => {},
  onOpenMetrics = () => {},
  onExportReport = () => {}
}) {
  const [activeMenu, setActiveMenu] = useState(null); // 'specimen', 'aperture'
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (name) => {
    setActiveMenu(prev => prev === name ? null : name);
  };

  return (
    <nav ref={menuRef} className="seed-menubar-nav" style={{
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
      {/* 1. Brand & View Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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
            Workstation
          </span>
        </div>

        {/* View Switcher Segmented Control */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--color-warm-stone)', padding: '3px', borderRadius: '1000px' }}>
          <button
            onClick={() => onSwitchView('landing')}
            className={`btn-seed ${currentView === 'landing' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            style={{ padding: '4px 14px', fontSize: '12px', border: 'none' }}
          >
            Overview
          </button>
          <button
            onClick={() => onSwitchView('workspace')}
            className={`btn-seed ${currentView === 'workspace' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            style={{ padding: '4px 14px', fontSize: '12px', border: 'none' }}
          >
            Workstation
          </button>
        </div>
      </div>

      {/* 2. Central Specimen & Aperture Popovers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        
        {/* Specimen Case Selector */}
        <div style={{ position: 'relative' }}>
          <button
            className={`btn-seed ${activeMenu === 'specimen' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            onClick={() => toggleMenu('specimen')}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <Microscope size={14} />
            <span>Case: {selectedSample ? `#${selectedSample.id} (${selectedSample.eye_side})` : 'Select'}</span>
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
              background: 'var(--color-snow-white)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-forest-depths)' }}>
                  Benchmark Slit-Lamp Cohort
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
                      borderRadius: '8px',
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

        {/* Confidence Cutoff Aperture */}
        <div style={{ position: 'relative' }}>
          <button
            className={`btn-seed ${activeMenu === 'aperture' ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
            onClick={() => toggleMenu('aperture')}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <Sliders size={13} />
            <span>Cutoff: {(confidence * 100).toFixed(0)}%</span>
            <ChevronDown size={12} />
          </button>

          {activeMenu === 'aperture' && (
            <div className="seed-card" style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: '240px',
              padding: '16px',
              zIndex: 300,
              border: '1px solid var(--border-clinical)',
              background: 'var(--color-snow-white)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--color-pewter)' }}>Detection Confidence Threshold</span>
                <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 600 }}>{(confidence * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range" 
                min="0.05" 
                max="0.80" 
                step="0.05" 
                value={confidence} 
                onChange={(e) => setConfidence(parseFloat(e.target.value))} 
              />
            </div>
          )}
        </div>

      </div>

      {/* 3. Right Action Buttons */}
      <div className="seed-menubar-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className="btn-seed btn-seed-inverted micro-pill-interactive"
          onClick={onOpenMetrics}
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <BarChart2 size={13} />
          <span>Audit Data</span>
        </button>

        <button
          className="btn-seed btn-seed-primary micro-pill-interactive"
          onClick={onExportReport}
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <FileText size={13} />
          <span>Export Report</span>
        </button>
      </div>
    </nav>
  );
}
