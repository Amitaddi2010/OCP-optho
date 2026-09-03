import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import MenuBar from './components/MenuBar';
import SegmentationCanvas from './components/SegmentationCanvas';
import ExplainabilityPanel from './components/ExplainabilityPanel';
import PublicationMetricsModal from './components/PublicationMetricsModal';

export default function App() {
  const [currentView, setCurrentView] = useState('landing'); // 'landing' or 'workspace'

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
  const [gradcamOpacity, setGradcamOpacity] = useState(0.75);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(105);
  const [confidence, setConfidence] = useState(0.20);
  const [showPolygons, setShowPolygons] = useState(true);
  const [showBBoxes, setShowBBoxes] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [xaiMode, setXaiMode] = useState('segmentation'); // 'segmentation', 'gradcam', 'composite'
  
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
          setSelectedSample(data.samples[0]);
          setCurrentImageSrc(data.samples[0].thumbnail_url);
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

  // Run initial inference when switching to workspace if not yet predicted
  useEffect(() => {
    if (currentView === 'workspace' && !predictionResult && selectedSample) {
      runInference({ sample_filename: selectedSample.filename });
    }
  }, [currentView]);

  useEffect(() => {
    if (selectedSample && currentView === 'workspace') {
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
      
      {/* If Landing View, render the 2-section Landing Page */}
      {currentView === 'landing' ? (
        <LandingPage 
          samples={samples}
          onLaunchWorkspace={() => setCurrentView('workspace')}
          onOpenMetrics={() => setMetricsModalOpen(true)}
        />
      ) : (
        /* If Diagnostic Workspace, render the clean 2-section Diagnostic Dashboard */
        <>
          {/* Top Clinical Menu Bar */}
          <MenuBar 
            currentView={currentView}
            onSwitchView={setCurrentView}
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
            gradcamOpacity={gradcamOpacity}
            setGradcamOpacity={setGradcamOpacity}
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

          {/* Main Clinical Dashboard — Exactly 2 Sections (Responsive Grid) */}
          <main className="responsive-dashboard-grid">
            {/* SECTION 1: Specimen Viewport & Diagnostic Canvas (Left / Top on Mobile) */}
            <section style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
              <SegmentationCanvas 
                imageSrc={currentImageSrc}
                detections={predictionResult?.detections || []}
                gradcamUrl={predictionResult?.gradcam_heatmap_url}
                visibleCategories={visibleCategories}
                opacity={opacity}
                setOpacity={setOpacity}
                gradcamOpacity={gradcamOpacity}
                setGradcamOpacity={setGradcamOpacity}
                brightness={brightness}
                contrast={contrast}
                xaiMode={xaiMode}
                setXaiMode={setXaiMode}
                hoveredFeature={hoveredFeature}
                hoveredDetId={hoveredDetId}
                onHoverDetection={setHoveredDetId}
              />
            </section>

            {/* SECTION 2: AI Explainability & Clinical Decision Support (Right / Bottom on Mobile) */}
            <section style={{ width: '100%' }}>
              <ExplainabilityPanel 
                predictionResult={predictionResult}
                loading={loading}
                xaiMode={xaiMode}
                gradcamOpacity={gradcamOpacity}
                setGradcamOpacity={setGradcamOpacity}
                categories={modelInfo?.categories || []}
                visibleCategories={visibleCategories}
                onToggleCategory={handleToggleCategory}
                palette={modelInfo?.palette || {}}
                onHoverFeature={setHoveredFeature}
                hoveredFeature={hoveredFeature}
                onExportReport={handleExportReport}
              />
            </section>
          </main>
        </>
      )}

      {/* Publication Metrics & Cryptographic Audit Modal */}
      <PublicationMetricsModal 
        isOpen={metricsModalOpen}
        onClose={() => setMetricsModalOpen(false)}
        metricsData={modelInfo}
      />
    </div>
  );
}
