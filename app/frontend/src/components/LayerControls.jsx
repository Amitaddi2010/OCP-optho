import React from 'react';
import { Sliders, Eye, EyeOff } from 'lucide-react';

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
    <div className="seed-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Panel Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-muted)', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sliders size={16} color="var(--color-forest-depths)" />
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
            Specimen Layer Controls
          </h3>
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
          23 Categories
        </span>
      </div>

      {/* Visual Adjustments Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--color-warm-stone)', padding: '16px', borderRadius: '12px' }}>
        {/* Confidence Threshold */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-pewter)' }}>Confidence Cutoff</span>
            <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
              {(confidence * 100).toFixed(0)}%
            </span>
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

        {/* Mask Opacity */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
            <span style={{ color: 'var(--color-pewter)' }}>Segmentation Opacity</span>
            <span style={{ fontFamily: 'var(--font-seed-sans-mono)', fontWeight: 500, color: 'var(--color-forest-depths)' }}>
              {(opacity * 100).toFixed(0)}%
            </span>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-pewter)' }}>Brightness</span>
              <span style={{ fontFamily: 'var(--font-seed-sans-mono)' }}>{brightness}%</span>
            </div>
            <input 
              type="range" 
              min="60" 
              max="160" 
              value={brightness} 
              onChange={(e) => setBrightness(parseInt(e.target.value))}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--color-pewter)' }}>Contrast</span>
              <span style={{ fontFamily: 'var(--font-seed-sans-mono)' }}>{contrast}%</span>
            </div>
            <input 
              type="range" 
              min="60" 
              max="180" 
              value={contrast} 
              onChange={(e) => setContrast(parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Render Mode Pills */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className={`btn-seed ${showPolygons ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
          onClick={() => setShowPolygons(!showPolygons)}
          style={{ flex: 1, padding: '7px 10px', fontSize: '12px' }}
        >
          Polygons
        </button>
        <button
          className={`btn-seed ${showBBoxes ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
          onClick={() => setShowBBoxes(!showBBoxes)}
          style={{ flex: 1, padding: '7px 10px', fontSize: '12px' }}
        >
          Boxes
        </button>
        <button
          className={`btn-seed ${showLabels ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
          onClick={() => setShowLabels(!showLabels)}
          style={{ flex: 1, padding: '7px 10px', fontSize: '12px' }}
        >
          Labels
        </button>
      </div>

      {/* Categories Layer Toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
        
        {/* Pathology Group */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-forest-depths)' }}>
              OCP Pathology (13)
            </span>
            <button
              onClick={() => onToggleGroup('pathology', !allPathologyVisible)}
              style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--color-pewter)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {allPathologyVisible ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{allPathologyVisible ? 'Hide All' : 'Show All'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {pathologyClasses.map(cat => {
              const isVisible = visibleCategories[cat.id] !== false;
              const color = palette[cat.id]?.color || '#1c3a13';
              return (
                <div
                  key={cat.id}
                  onClick={() => onToggleCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isVisible ? 'var(--color-snow-white)' : 'var(--color-warm-stone)',
                    border: '1px solid',
                    borderColor: isVisible ? 'var(--border-muted)' : 'transparent',
                    opacity: isVisible ? 1 : 0.5,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                    <span style={{ fontSize: '12px', color: 'var(--color-forest-depths)' }}>{cat.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
                    #{cat.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Anatomy Group */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-forest-depths)' }}>
              Anatomy Landmarks (10)
            </span>
            <button
              onClick={() => onToggleGroup('anatomy', !allAnatomyVisible)}
              style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--color-pewter)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {allAnatomyVisible ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{allAnatomyVisible ? 'Hide All' : 'Show All'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {anatomyClasses.map(cat => {
              const isVisible = visibleCategories[cat.id] !== false;
              const color = palette[cat.id]?.color || '#757c5d';
              return (
                <div
                  key={cat.id}
                  onClick={() => onToggleCategory(cat.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isVisible ? 'var(--color-snow-white)' : 'var(--color-warm-stone)',
                    border: '1px solid',
                    borderColor: isVisible ? 'var(--border-muted)' : 'transparent',
                    opacity: isVisible ? 1 : 0.5,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
                    <span style={{ fontSize: '12px', color: 'var(--color-forest-depths)' }}>{cat.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
                    #{cat.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
