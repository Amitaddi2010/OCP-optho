import React from 'react';
import { Eye, BarChart2, FileText, CheckCircle2 } from 'lucide-react';

export default function Header({ onOpenMetrics, onExportReport, resultsAvailable }) {
  return (
    <header style={{
      background: 'var(--color-snow-white)',
      borderBottom: '1px solid var(--border-muted)',
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Editorial Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--color-forest-depths)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Eye size={18} color="var(--color-snow-white)" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '20px',
              fontWeight: 350,
              letterSpacing: '-0.3px',
              color: 'var(--color-forest-depths)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              OCP <span style={{ color: 'var(--color-sage-moss)' }}>·</span> Insight
            </span>
            <span className="badge-lime">
              Audited AI
            </span>
          </div>
          <p style={{
            fontSize: '12px',
            color: 'var(--color-pewter)',
            fontWeight: 400,
            marginTop: '1px'
          }}>
            Slit-Lamp Ocular Cicatricial Pemphigoid Pathology & Anterior Segment Landmark Segmentation
          </p>
        </div>
      </div>

      {/* Specimen Tags & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Model Specimen Pill */}
        <div className="specimen-pill">
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--color-forest-depths)'
          }} />
          <span>YOLO26-Seg [1280px Controlled]</span>
        </div>

        {/* Benchmarks & Audit Modal Trigger */}
        <button 
          className="btn-seed btn-seed-inverted"
          onClick={onOpenMetrics}
        >
          <BarChart2 size={15} />
          <span>Benchmark Data & Audit</span>
        </button>

        {/* Report Export Button */}
        {resultsAvailable && (
          <button 
            className="btn-seed btn-seed-primary"
            onClick={onExportReport}
          >
            <FileText size={15} />
            <span>Export Clinical Report</span>
          </button>
        )}
      </div>
    </header>
  );
}
