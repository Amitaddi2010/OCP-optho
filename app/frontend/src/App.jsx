import React, { useState, useEffect } from 'react';
import MenuBar from './components/MenuBar';
import SegmentationCanvas from './components/SegmentationCanvas';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import PublicationMetricsModal from './components/PublicationMetricsModal';

export default function App() {
  const [modelInfo, setModelInfo] = useState(null);
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [currentImageSrc, setCurrentImageSrc] = useState(null);
  
  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Optical & Layer Controls (managed through MenuBar)
  const [visibleCategories, setVisibleCategories] = useState({});
  const [opacity, setOpacity] = useState(0.45);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(105);
  const [confidence, setConfidence] = useState(0.20);
  const [showPolygons, setShowPolygons] = useState(true);
  const [showBBoxes, setShowBBoxes] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [xaiMode, setXaiMode] = useState('segmentation'); // 'segmentation' or 'saliency'
  
  // Interactive Hover Probe & Feature Attributions
  const [hoveredDetId, setHoveredDetId] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  
  // Audit Modal
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);

  // Initialize Data
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
    setCurrentImageSrc(sample.thumbnail_url);
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-canvas)' }}>
      {/* Top Clinical Menu Bar */}
      <MenuBar 
        samples={samples}
        selectedSample={selectedSample}
        onSelectSample={handleSelectSample}
        onFileUpload={handleFileUpload}
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
        xaiMode={xaiMode}
        setXaiMode={setXaiMode}
        onOpenMetrics={() => setMetricsModalOpen(true)}
        onExportReport={handleExportReport}
        palette={modelInfo?.palette || {}}
      />

      {/* Main Clinical Dashboard — Exactly 2 Sections */}
      <main style={{
        flex: 1,
        padding: '24px 32px',
        maxWidth: '1720px',
        margin: '0 auto',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1.45fr 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* SECTION 1: Specimen Viewport & Diagnostic Canvas (Left) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
            xaiMode={xaiMode}
            hoveredFeature={hoveredFeature}
            hoveredDetId={hoveredDetId}
            onHoverDetection={setHoveredDetId}
          />

          {/* Section 1 Footer Status Bar */}
          <div className="seed-card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-forest-depths)' }} />
                <span style={{ fontWeight: 500, color: 'var(--color-forest-depths)' }}>OCP Pathology Striae</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-sage-moss)' }} />
                <span style={{ fontWeight: 500, color: 'var(--color-forest-depths)' }}>Anatomical Landmarks</span>
              </div>
            </div>

            <div style={{ fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-pewter)' }}>
              Active Delineations: <strong style={{ color: 'var(--color-forest-depths)' }}>{predictionResult?.total_detections || 0}</strong>
            </div>
          </div>
        </section>

        {/* SECTION 2: AI Explainability & Clinical Decision Support (Right) */}
        <section>
          <ExplainabilityPanel 
            predictionResult={predictionResult}
            loading={loading}
            onHoverFeature={setHoveredFeature}
            hoveredFeature={hoveredFeature}
            onExportReport={handleExportReport}
          />
        </section>
      </main>

      {/* Publication Metrics & Cryptographic Audit Modal */}
      <PublicationMetricsModal 
        isOpen={metricsModalOpen}
        onClose={() => setMetricsModalOpen(false)}
        metricsData={modelInfo}
      />
    </div>
  );
}
