import React from 'react';
import { Layers, Sliders, CheckSquare, Square, Eye, EyeOff, ShieldAlert, Sparkles } from 'lucide-react';

export default function LayerControls({
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
  showPolygons,
  setShowPolygons,
  showBBoxes,
  setShowBBoxes,
  showLabels,
  setShowLabels,
  palette = {}
}) {
  const pathologyClasses = categories.filter(c => c.supercategory === 'pathology');
  const anatomyClasses = categories.filter(c => c.supercategory === 'anatomy');

  const allPathologyVisible = pathologyClasses.every(c => visibleCategories[c.id] !== false);
  const allAnatomyVisible = anatomyClasses.every(c => visibleCategories[c.id] !== false);

  return (
    <div className="glass-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={18} color="#3B82F6" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Visual & Layer Controls</h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>23 Classes</span>
      </div>

      {/* Visual Adjustments Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
        {/* Confidence Threshold */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Confidence Cutoff</span>
            <span style={{ fontWeight: 700, color: '#3B82F6' }}>{(confidence * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0.10" 
            max="0.90" 
            step="0.05"
            value={confidence} 
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
          />
        </div>

        {/* Mask Opacity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Segmentation Opacity</span>
            <span style={{ fontWeight: 700, color: '#10B981' }}>{(opacity * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.05"
            value={opacity} 
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
          />
        </div>

        {/* Contrast / Slit Beam Enhancer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Brightness</span>
              <span>{brightness}%</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="180" 
              value={brightness} 
              onChange={(e) => setBrightness(parseInt(e.target.value))}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Contrast</span>
              <span>{contrast}%</span>
            </div>
            <input 
              type="range" 
              min="50" 
              max="200" 
              value={contrast} 
              onChange={(e) => setContrast(parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Display Element Toggles */}
        <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
          <button 
            className={`btn ${showPolygons ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowPolygons(!showPolygons)}
            style={{ flex: 1, fontSize: '0.72rem', padding: '5px' }}
          >
            Polygons
          </button>
          <button 
            className={`btn ${showBBoxes ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowBBoxes(!showBBoxes)}
            style={{ flex: 1, fontSize: '0.72rem', padding: '5px' }}
          >
            BBoxes
          </button>
          <button 
            className={`btn ${showLabels ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowLabels(!showLabels)}
            style={{ flex: 1, fontSize: '0.72rem', padding: '5px' }}
          >
            Labels
          </button>
        </div>
      </div>

      {/* Category Layers List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
        {/* 1. OCP Pathology Layer Group */}
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            background: 'rgba(239, 68, 68, 0.1)', 
            padding: '8px 12px', 
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} color="#EF4444" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F87171' }}>
                OCP Pathology Layer (13)
              </span>
            </div>
            <button
              onClick={() => onToggleGroup('pathology', !allPathologyVisible)}
              style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {allPathologyVisible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {pathologyClasses.map(cat => {
              const isVisible = visibleCategories[cat.id] !== false;
              const col = palette[cat.id]?.color || '#EF4444';
              return (
                <div
                  key={cat.id}
                  onClick={() => onToggleCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: isVisible ? 'var(--bg-surface)' : 'transparent',
                    opacity: isVisible ? 1 : 0.45,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: col }} />
                    <span style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                  </div>
                  {isVisible ? <CheckSquare size={13} color="#EF4444" /> : <Square size={13} color="var(--text-muted)" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Eye Anatomy Layer Group */}
        <div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            background: 'rgba(16, 185, 129, 0.1)', 
            padding: '8px 12px', 
            borderRadius: '8px',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} color="#10B981" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#34D399' }}>
                Eye Anatomy Layer (10)
              </span>
            </div>
            <button
              onClick={() => onToggleGroup('anatomy', !allAnatomyVisible)}
              style={{ background: 'none', border: 'none', color: '#34D399', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {allAnatomyVisible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {anatomyClasses.map(cat => {
              const isVisible = visibleCategories[cat.id] !== false;
              const col = palette[cat.id]?.color || '#10B981';
              return (
                <div
                  key={cat.id}
                  onClick={() => onToggleCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    background: isVisible ? 'var(--bg-surface)' : 'transparent',
                    opacity: isVisible ? 1 : 0.45,
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: col }} />
                    <span style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                  </div>
                  {isVisible ? <CheckSquare size={13} color="#10B981" /> : <Square size={13} color="var(--text-muted)" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
