import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SegmentationCanvas from './components/SegmentationCanvas';
import LayerControls from './components/LayerControls';
import ClinicalSummaryCard from './components/ClinicalSummaryCard';
import SampleGallery from './components/SampleGallery';
import PublicationMetricsModal from './components/PublicationMetricsModal';

export default function App() {
  const [modelInfo, setModelInfo] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [currentImageSrc, setCurrentImageSrc] = useState(null);
  
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Layer & Canvas controls
  const [visibleCategories, setVisibleCategories] = useState({});
  const [opacity, setOpacity] = useState(0.45);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(105);
  const [confidence, setConfidence] = useState(0.20);
  const [showPolygons, setShowPolygons] = useState(true);
  const [showBBoxes, setShowBBoxes] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredDetId, setHoveredDetId] = useState(null);
  
  // Modals
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);

  // Initialize
  useEffect(() => {
    fetch('/api/info')
      .then(res => res.json())
      .then(data => {
        setModelInfo(data);
      })
      .catch(err => console.error("Error fetching model info:", err));

    fetch('/api/samples')
      .then(res => res.json())
      .then(data => {
        if (data.samples && data.samples.length > 0) {
          setSamples(data.samples);
          handleSelectSample(data.samples[0]);
        }
      })
      .catch(err => console.error("Error fetching samples:", err));
  }, []);

  const handleSelectSample = (sample) => {
    setSelectedSample(sample);
    const imgUrl = sample.thumbnail_url;
    setCurrentImageSrc(imgUrl);
    runInference({ sample_filename: sample.filename });
  };

  const handleFileUpload = (file) => {
    setSelectedSample(null);
    const objectUrl = URL.createObjectURL(file);
    setCurrentImageSrc(objectUrl);
    runInference({ file });
  };

  const runInference = async ({ sample_filename, file }) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    } else if (sample_filename) {
      formData.append('sample_filename', sample_filename);
    }
    formData.append('confidence', confidence.toString());
    formData.append('iou', '0.60');

    try {
      const res = await fetch('/api/segment/predict', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Inference failed with status ${res.status}`);
      }

      const data = await res.json();
      setPredictionResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger re-inference when confidence threshold changes significantly
  useEffect(() => {
    if (selectedSample) {
      runInference({ sample_filename: selectedSample.filename });
    }
  }, [confidence]);

  const handleToggleCategory = (catId) => {
    setVisibleCategories(prev => ({
      ...prev,
      [catId]: prev[catId] === false ? true : false
    }));
  };

  const handleToggleGroup = (groupType, isVisible) => {
    if (!modelInfo?.categories) return;
    const targetCats = modelInfo.categories.filter(c => c.supercategory === groupType);
    const newVis = { ...visibleCategories };
    targetCats.forEach(c => {
      newVis[c.id] = isVisible;
    });
    setVisibleCategories(newVis);
  };

  const handleExportReport = () => {
    window.print();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Top Navigation */}
      <Header 
        onOpenMetrics={() => setMetricsModalOpen(true)}
        onExportReport={handleExportReport}
        resultsAvailable={!!predictionResult}
      />

      {/* Main Workspace Layout */}
      <main style={{
        flex: 1,
        padding: '24px',
        maxWidth: '1720px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Sample Case Selector Carousel */}
        <SampleGallery 
          samples={samples}
          selectedSample={selectedSample}
          onSelectSample={handleSelectSample}
          onFileUpload={handleFileUpload}
        />

        {/* 3-Column Interactive Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '290px 1fr 360px',
          gap: '20px',
          alignItems: 'start'
        }}>
          {/* Left Column: Layer Controls */}
          <div style={{ height: '700px' }}>
            <LayerControls 
              categories={modelInfo?.categories || []}
              visibleCategories={visibleCategories}
              onToggleCategory={handleToggleCategory}
              onToggleGroup={handleToggleGroup}
              opacity={opacity}
              setOpacity={setOpacity}
              brightness={brightness}
              setBrightness={setBrightness}
              contrast={contrast}
              setContrast={setContrast}
              confidence={confidence}
              setConfidence={setConfidence}
              showPolygons={showPolygons}
              setShowPolygons={setShowPolygons}
              showBBoxes={showBBoxes}
              setShowBBoxes={setShowBBoxes}
              showLabels={showLabels}
              setShowLabels={setShowLabels}
              palette={modelInfo?.palette || {}}
            />
          </div>

          {/* Center Column: Interactive Canvas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SegmentationCanvas 
              imageSrc={currentImageSrc}
              detections={predictionResult?.detections || []}
              visibleCategories={visibleCategories}
              opacity={opacity}
              brightness={brightness}
              contrast={contrast}
              showPolygons={showPolygons}
              showBBoxes={showBBoxes}
              showLabels={showLabels}
              hoveredDetId={hoveredDetId}
              onHoverDetection={setHoveredDetId}
            />

            {/* Canvas Status & Legend Strip */}
            <div className="glass-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--pathology-color)' }} />
                  <span style={{ fontWeight: 600, color: '#F87171' }}>OCP Pathology Findings</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--anatomy-color)' }} />
                  <span style={{ fontWeight: 600, color: '#34D399' }}>Harmonized Eye Anatomy</span>
                </div>
              </div>

              <div style={{ color: 'var(--text-muted)' }}>
                Active Detections: <strong style={{ color: '#FFFFFF' }}>{predictionResult?.total_detections || 0}</strong>
              </div>
            </div>
          </div>

          {/* Right Column: Clinical Triage & Staging Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ClinicalSummaryCard 
              predictionResult={predictionResult}
              loading={loading}
              onExportReport={handleExportReport}
            />
          </div>
        </div>
      </main>

      {/* Publication Metrics Modal */}
      <PublicationMetricsModal 
        isOpen={metricsModalOpen}
        onClose={() => setMetricsModalOpen(false)}
        metricsData={modelInfo}
      />
    </div>
  );
}
