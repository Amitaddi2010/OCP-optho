import React from 'react';
import { Eye, Activity, BarChart2, ShieldCheck, FileText } from 'lucide-react';

export default function Header({ onOpenMetrics, onExportReport, resultsAvailable }) {
  return (
    <header style={{
      background: 'rgba(11, 15, 25, 0.95)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '16px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(37, 99, 235, 0.4)'
        }}>
          <Eye size={24} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.3px', color: '#FFFFFF' }}>
              OCP-Insight
            </h1>
            <span style={{
              background: 'rgba(37, 99, 235, 0.2)',
              color: '#60A5FA',
              border: '1px solid rgba(37, 99, 235, 0.4)',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '20px'
            }}>
              v1.0 CLINICAL AI
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Slit-Lamp Ocular Cicatricial Pemphigoid Pathology Detection & Anatomy Localization
          </p>
        </div>
      </div>

      {/* Model Badges & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-surface)',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border-light)'
        }}>
          <Activity size={15} color="#10B981" />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Dual-Backbone: <strong style={{ color: '#F8FAFC' }}>YOLO26-Seg & RF-DETR-Seg</strong>
          </span>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={onOpenMetrics}
          style={{ fontSize: '0.8rem', padding: '7px 14px' }}
        >
          <BarChart2 size={16} color="#60A5FA" />
          Journal Benchmarks & Metrics
        </button>

        {resultsAvailable && (
          <button 
            className="btn btn-primary"
            onClick={onExportReport}
            style={{ fontSize: '0.8rem', padding: '7px 14px' }}
          >
            <FileText size={16} />
            Export Clinical Report
          </button>
        )}
      </div>
    </header>
  );
}
