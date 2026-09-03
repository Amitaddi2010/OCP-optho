import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';

export default function SampleGallery({
  samples = [],
  selectedSample = null,
  onSelectSample = () => {},
  onFileUpload = () => {}
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ImageIcon size={18} color="#3B82F6" />
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700 }}>Clinical Slit-Lamp Case Selector</h3>
        </div>

        {/* Upload Button */}
        <div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }} 
          />
          <button 
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
          >
            <Upload size={14} /> Upload Custom Photo
          </button>
        </div>
      </div>

      {/* Horizontal Carousel of Samples */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {samples.map((sample) => {
          const isSelected = selectedSample?.filename === sample.filename;
          return (
            <div
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              style={{
                flexShrink: 0,
                width: '140px',
                background: isSelected ? 'rgba(37, 99, 235, 0.2)' : 'var(--bg-surface)',
                border: isSelected ? '2px solid #3B82F6' : '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ width: '100%', height: '80px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#000' }}>
                <img 
                  src={sample.thumbnail_url} 
                  alt={sample.filename} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? '#60A5FA' : 'var(--text-primary)' }}>
                  Case #{sample.id}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {sample.eye_side}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
