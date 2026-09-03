import React, { useRef, useEffect, useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sparkles, 
  Eye, 
  Layers, 
  Sliders, 
  Maximize2 
} from 'lucide-react';

export default function SegmentationCanvas({
  imageSrc,
  detections = [],
  gradcamUrl = null,
  visibleCategories = {},
  opacity = 0.5,
  setOpacity = () => {},
  gradcamOpacity = 0.75,
  setGradcamOpacity = () => {},
  brightness = 100,
  contrast = 100,
  xaiMode = 'segmentation', // 'raw', 'segmentation', 'gradcam', 'composite'
  setXaiMode = () => {},
  hoveredFeature = null,
  hoveredDetId = null,
  onHoverDetection = () => {}
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 1600, height: 1200 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Preloaded Grad-CAM Image element
  const [gradcamImg, setGradcamImg] = useState(null);

  // Hover Probe Tooltip State
  const [probeData, setProbeData] = useState(null);

  // Preload Grad-CAM image when URL changes
  useEffect(() => {
    if (!gradcamUrl) {
      setGradcamImg(null);
      return;
    }
    const gImg = new Image();
    gImg.crossOrigin = "anonymous";
    gImg.src = gradcamUrl;
    gImg.onload = () => {
      setGradcamImg(gImg);
    };
  }, [gradcamUrl]);

  // Load base image and render
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      renderScene(img, gradcamImg);
    };
  }, [
    imageSrc, 
    gradcamImg,
    detections, 
    visibleCategories, 
    opacity, 
    gradcamOpacity,
    brightness, 
    contrast, 
    xaiMode,
    hoveredFeature,
    hoveredDetId, 
    zoom, 
    pan
  ]);

  const renderScene = (img, gImg) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    canvas.width = width;
    canvas.height = height;

    // 1. Draw Base Slit-Lamp Image with contrast & brightness
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.filter = 'none';

    // If 'raw' mode, skip overlays completely
    if (xaiMode === 'raw') return;

    // 2. Draw Grad-CAM Thermal Heatmap Overlay
    if ((xaiMode === 'gradcam' || xaiMode === 'composite') && gImg) {
      ctx.save();
      ctx.globalAlpha = gradcamOpacity;
      ctx.drawImage(gImg, 0, 0, width, height);
      ctx.restore();
    }

    // 3. Draw Segmentation Polygons & Outlines
    if (xaiMode === 'segmentation' || xaiMode === 'composite') {
      detections.forEach((det) => {
        if (visibleCategories[det.class_id] === false) return;

        const isHovered = hoveredDetId === det.id || (hoveredFeature && det.class_name.toLowerCase().includes(hoveredFeature.toLowerCase()));
        const poly = det.polygon;
        const color = det.color || '#1c3a13';

        // Polygon Fill
        if (poly && poly.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(poly[0][0], poly[0][1]);
          for (let i = 1; i < poly.length; i++) {
            ctx.lineTo(poly[i][0], poly[i][1]);
          }
          ctx.closePath();

          const currentAlpha = isHovered ? Math.min(0.85, opacity + 0.3) : opacity;
          ctx.fillStyle = hexToRgba(color, currentAlpha);
          ctx.fill();

          ctx.strokeStyle = color;
          ctx.lineWidth = isHovered ? 3.5 : 1.5;
          ctx.stroke();
        }

        // Bounding Box (subtle dashed border)
        if (det.bbox) {
          const [bx, by, bw, bh] = det.bbox;
          ctx.strokeStyle = hexToRgba(color, isHovered ? 0.9 : 0.45);
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(bx, by, bw, bh);
          ctx.setLineDash([]);
        }

        // Class Label Banner
        if (det.bbox && isHovered) {
          const [bx, by] = det.bbox;
          const labelText = `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`;

          ctx.font = '500 13px "Inter", sans-serif';
          const textWidth = ctx.measureText(labelText).width;

          ctx.fillStyle = '#1c3a13';
          ctx.fillRect(bx, Math.max(0, by - 22), textWidth + 14, 20);

          ctx.fillStyle = '#fcfcf7';
          ctx.fillText(labelText, bx + 7, Math.max(14, by - 7));
        }
      });
    }
  };

  const hexToRgba = (hex, alpha) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  };

  // Hover Probe Coordinates Hit-Testing
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Check hit test against detections
    let found = null;
    for (let i = detections.length - 1; i >= 0; i--) {
      const d = detections[i];
      if (visibleCategories[d.class_id] === false) continue;
      const [bx, by, bw, bh] = d.bbox;
      if (mouseX >= bx && mouseX <= bx + bw && mouseY >= by && mouseY <= by + bh) {
        found = d;
        break;
      }
    }

    if (found) {
      setProbeData({
        x: e.clientX,
        y: e.clientY,
        detection: found
      });
      onHoverDetection(found.id);
    } else {
      setProbeData(null);
      onHoverDetection(null);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="seed-card" style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      overflow: 'hidden',
      backgroundColor: 'var(--color-snow-white)',
      border: '1px solid var(--border-muted)',
      width: '100%'
    }}>
      {/* 1. Unified Slim Clinical Viewer Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        borderBottom: '1px solid var(--border-muted)',
        backgroundColor: 'var(--color-warm-stone)',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Mode Selector Segmented Pill */}
        <div style={{
          display: 'flex',
          background: 'var(--color-snow-white)',
          padding: '3px',
          borderRadius: '1000px',
          border: '1px solid var(--border-muted)'
        }}>
          {[
            { id: 'raw', label: 'Raw Optical' },
            { id: 'segmentation', label: 'Segmentation' },
            { id: 'gradcam', label: 'Grad-CAM' },
            { id: 'composite', label: 'Composite' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setXaiMode(mode.id)}
              className={`btn-seed ${xaiMode === mode.id ? 'btn-seed-primary' : 'btn-seed-ghost'}`}
              style={{ padding: '5px 12px', fontSize: '11px', border: 'none' }}
            >
              {mode.id === 'gradcam' && <Sparkles size={11} style={{ marginRight: '4px' }} />}
              <span>{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Zoom & Reset Micro-Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-seed btn-seed-ghost"
            onClick={() => setZoom(prev => Math.min(3.5, prev + 0.25))}
            title="Zoom In"
            style={{ padding: '5px 8px', height: '28px', minWidth: '28px' }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            className="btn-seed btn-seed-ghost"
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
            title="Zoom Out"
            style={{ padding: '5px 8px', height: '28px', minWidth: '28px' }}
          >
            <ZoomOut size={14} />
          </button>
          <button
            className="btn-seed btn-seed-ghost"
            onClick={handleReset}
            title="Reset View (100%)"
            style={{ padding: '5px 8px', height: '28px', minWidth: '28px' }}
          >
            <RotateCcw size={14} />
          </button>

          <span style={{
            fontSize: '11px',
            fontFamily: 'var(--font-seed-sans-mono)',
            color: 'var(--color-pewter)',
            padding: '2px 8px',
            background: 'var(--color-snow-white)',
            borderRadius: '6px',
            border: '1px solid var(--border-muted)'
          }}>
            {(zoom * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 2. Laboratory Glass Viewport Stage */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setProbeData(null);
        }}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 'clamp(380px, 60vh, 640px)',
          backgroundColor: '#1c3a13',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'crosshair'
        }}
      >
        {/* Grad-CAM Thermal Legend (Visible in Grad-CAM or Composite mode) */}
        {(xaiMode === 'gradcam' || xaiMode === 'composite') && (
          <div style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            background: 'rgba(28, 58, 19, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 20,
            maxWidth: '220px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600, color: 'var(--color-snow-white)' }}>
              <span>Activation Saliency</span>
              <span style={{ color: 'var(--color-lime-pulse)', fontFamily: 'var(--font-seed-sans-mono)' }}>JET</span>
            </div>
            <div style={{
              width: '100%',
              height: '5px',
              borderRadius: '3px',
              background: 'linear-gradient(to right, #000080, #00ffff, #00ff00, #ffff00, #ff0000)'
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--color-frosted-glass)', fontFamily: 'var(--font-seed-sans-mono)' }}>
              <span>0.0 Intact</span>
              <span style={{ color: '#fca5a5' }}>1.0 Cicatrix Focus</span>
            </div>
          </div>
        )}

        {/* Live Hover Probe Chip */}
        {probeData && (
          <div style={{
            position: 'fixed',
            top: probeData.y + 14,
            left: probeData.x + 14,
            background: 'var(--color-snow-white)',
            color: 'var(--color-forest-depths)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            pointerEvents: 'none',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            maxWidth: '220px',
            border: '1px solid var(--color-forest-depths)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>{probeData.detection.class_name}</span>
              <span style={{ fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-forest-depths)', fontWeight: 600 }}>
                {(probeData.detection.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ color: 'var(--color-pewter)', fontSize: '10px' }}>
              {probeData.detection.type} · Area: {probeData.detection.bbox[2]}×{probeData.detection.bbox[3]}px
            </div>
          </div>
        )}

        {/* Canvas Element with Pan & Zoom */}
        <div style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          maxHeight: '100%',
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              maxHeight: 'clamp(360px, 58vh, 620px)',
              objectFit: 'contain',
              boxShadow: 'none'
            }}
          />
        </div>
      </div>

      {/* 3. Bottom Status Strip */}
      <div style={{
        padding: '8px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        fontFamily: 'var(--font-seed-sans-mono)',
        color: 'var(--color-pewter)',
        backgroundColor: 'var(--color-snow-white)',
        borderTop: '1px solid var(--border-muted)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>APERTURE: {naturalSize.width} × {naturalSize.height} PX</span>
          <span>·</span>
          <span>ACTIVE MODE: {xaiMode.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-forest-depths)' }} />
          <span>{detections.length} DELINEATED STRUCTURES</span>
        </div>
      </div>
    </div>
  );
}
