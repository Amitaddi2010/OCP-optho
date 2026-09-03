import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Sparkles, Layers, Box, Tag } from 'lucide-react';

export default function SegmentationCanvas({
  imageSrc,
  detections = [],
  visibleCategories = {},
  opacity = 0.45,
  brightness = 100,
  contrast = 100,
  showPolygons = true,
  showBBoxes = true,
  showLabels = true,
  xaiMode = 'segmentation', // 'segmentation' or 'saliency'
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

  // Hover Probe Tooltip State
  const [probeData, setProbeData] = useState(null);

  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      renderScene(img);
    };
  }, [
    imageSrc, 
    detections, 
    visibleCategories, 
    opacity, 
    brightness, 
    contrast, 
    showPolygons, 
    showBBoxes, 
    showLabels, 
    xaiMode,
    hoveredFeature,
    hoveredDetId, 
    zoom, 
    pan
  ]);

  const renderScene = (img) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    canvas.width = width;
    canvas.height = height;

    // Apply brightness and contrast filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(img, 0, 0, width, height);
    ctx.filter = 'none';

    // Draw Segmentation or Saliency Overlays
    detections.forEach((det) => {
      if (visibleCategories[det.class_id] === false) return;

      const isHovered = hoveredDetId === det.id || (hoveredFeature && det.class_name.toLowerCase().includes(hoveredFeature.toLowerCase()));
      const poly = det.polygon;
      let color = det.color || '#1c3a13';

      if (xaiMode === 'saliency') {
        // In Saliency mode, pathology glows in high-attention amber/gold
        color = det.type.includes('OCP') || det.type.includes('Critical') ? '#f59e0b' : '#698e79';
      }

      // 1. Draw Polygon Fill
      if (showPolygons && poly && poly.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i][0], poly[i][1]);
        }
        ctx.closePath();

        let currentAlpha = isHovered ? Math.min(0.85, opacity + 0.3) : opacity;
        if (xaiMode === 'saliency' && (det.type.includes('OCP') || det.type.includes('Critical'))) {
          currentAlpha = Math.min(0.75, opacity + 0.2);
        }

        ctx.fillStyle = hexToRgba(color, currentAlpha);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 4 : 1.5;
        ctx.stroke();
      }

      // 2. Draw Bounding Box
      if (showBBoxes && det.bbox) {
        const [bx, by, bw, bh] = det.bbox;
        ctx.strokeStyle = hexToRgba(color, 0.8);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      }

      // 3. Draw Class Label Banner
      if (showLabels && det.bbox) {
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
  };

  const hexToRgba = (hex, alpha) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  };

  // Canvas Mouse Coordinates Probe
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
    <div 
      ref={containerRef}
      className="seed-card"
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
        minHeight: '680px',
        backgroundColor: 'var(--color-warm-stone)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'crosshair',
        padding: 0
      }}
    >
      {/* Floating Micro-Interactions Control Bar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'var(--color-snow-white)',
        padding: '5px 8px',
        borderRadius: 'var(--radius-buttons)',
        border: '1px solid var(--border-muted)',
        zIndex: 20
      }}>
        <button
          className="btn-seed btn-seed-ghost"
          onClick={() => setZoom(prev => Math.min(3.5, prev + 0.25))}
          title="Zoom In"
          style={{ padding: '6px', width: '32px', height: '32px' }}
        >
          <ZoomIn size={15} />
        </button>
        <button
          className="btn-seed btn-seed-ghost"
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
          title="Zoom Out"
          style={{ padding: '6px', width: '32px', height: '32px' }}
        >
          <ZoomOut size={15} />
        </button>
        <button
          className="btn-seed btn-seed-ghost"
          onClick={handleReset}
          title="Reset View"
          style={{ padding: '6px', width: '32px', height: '32px' }}
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Mode Indicator & Resolution Badge */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 20
      }}>
        <div style={{
          background: 'var(--color-snow-white)',
          padding: '5px 12px',
          borderRadius: 'var(--radius-badges)',
          border: '1px solid var(--border-muted)',
          fontSize: '11px',
          color: 'var(--color-pewter)',
          fontFamily: 'var(--font-seed-sans-mono)'
        }}>
          {naturalSize.width} × {naturalSize.height} px · Zoom: {(zoom * 100).toFixed(0)}%
        </div>

        {xaiMode === 'saliency' && (
          <div className="badge-lime">
            <Sparkles size={11} />
            <span>Saliency Attention Overlay Active</span>
          </div>
        )}
      </div>

      {/* Interactive Hover Probe Popover (Micro-Interaction) */}
      {probeData && (
        <div style={{
          position: 'fixed',
          top: probeData.y + 14,
          left: probeData.x + 14,
          background: 'var(--color-forest-depths)',
          color: 'var(--color-snow-white)',
          padding: '8px 12px',
          borderRadius: '10px',
          fontSize: '11px',
          pointerEvents: 'none',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          maxWidth: '240px',
          boxShadow: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontWeight: 600 }}>{probeData.detection.class_name}</span>
            <span style={{ fontFamily: 'var(--font-seed-sans-mono)', color: 'var(--color-lime-pulse)' }}>
              {(probeData.detection.confidence * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ color: 'var(--color-frosted-glass)', fontSize: '10px' }}>
            Category: {probeData.detection.type} · BBox: {probeData.detection.bbox[2]}×{probeData.detection.bbox[3]}px
          </div>
        </div>
      )}

      {/* Laboratory Glass Viewport Canvas */}
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
            maxHeight: '640px',
            objectFit: 'contain',
            borderRadius: '12px',
            boxShadow: 'none'
          }}
        />
      </div>
    </div>
  );
}
