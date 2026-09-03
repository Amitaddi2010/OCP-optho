import React, { useRef } from 'react';
import { Upload, Microscope } from 'lucide-react';

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
    <div className="seed-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tray Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Microscope size={18} color="var(--color-forest-depths)" />
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '-0.1px',
            color: 'var(--color-forest-depths)'
          }}>
            Clinical Slit-Lamp Specimen Tray
          </span>
          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-seed-sans-mono)',
            color: 'var(--color-pewter)'
          }}>
            [N = {samples.length} Benchmark Cases]
          </span>
        </div>

        {/* Upload Custom Photograph */}
        <div>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }} 
          />
          <button 
            className="btn-seed btn-seed-inverted"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            <Upload size={13} />
            <span>Upload Slit-Lamp Photograph</span>
          </button>
        </div>
      </div>

      {/* Horizontal Carousel of Laboratory Specimens */}
      <div style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        paddingBottom: '6px'
      }}>
        {samples.map((sample) => {
          const isSelected = selectedSample?.filename === sample.filename;
          return (
            <div
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              style={{
                flexShrink: 0,
                width: '148px',
                background: isSelected ? 'var(--color-snow-white)' : 'var(--color-warm-stone)',
                border: isSelected ? '1.5px solid var(--color-forest-depths)' : '1px solid transparent',
                borderRadius: 'var(--radius-cards)',
                padding: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* Specimen Thumbnail under laboratory glass */}
              <div style={{
                width: '100%',
                height: '84px',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: 'var(--color-forest-depths)'
              }}>
                <img 
                  src={sample.thumbnail_url} 
                  alt={sample.filename} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>

              {/* Specimen Labels */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                <div>
                  <div style={{
                    fontSize: '12px',
                    fontFamily: 'var(--font-seed-sans-mono)',
                    fontWeight: 500,
                    color: 'var(--color-forest-depths)'
                  }}>
                    Case #{sample.id}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--color-pewter)'
                  }}>
                    {sample.eye_side}
                  </div>
                </div>
                {isSelected && (
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: 'var(--color-forest-depths)'
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
