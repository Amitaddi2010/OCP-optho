import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Sliders, Layers } from 'lucide-react';

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

  // Load and render image on canvas
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
  }, [imageSrc, detections, visibleCategories, opacity, brightness, contrast, showPolygons, showBBoxes, showLabels, hoveredDetId, zoom, pan]);

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

    // Draw Segmentation Overlays
    detections.forEach((det) => {
      // Check visibility filter
      if (visibleCategories[det.class_id] === false) return;

      const isHovered = hoveredDetId === det.id;
      const poly = det.polygon;
      const color = det.color || '#3B82F6';

      // 1. Draw Polygon Fill
      if (showPolygons && poly && poly.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i][0], poly[i][1]);
        }
        ctx.closePath();

        // Fill with opacity
        ctx.fillStyle = hexToRgba(color, isHovered ? Math.min(0.85, opacity + 0.3) : opacity);
        ctx.fill();

        // Stroke outline
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 4 : 2;
        ctx.stroke();
      }

      // 2. Draw Bounding Box (optional)
      if (showBBoxes && det.bbox) {
        const [bx, by, bw, bh] = det.bbox;
        ctx.strokeStyle = hexToRgba(color, 0.6);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);
      }

      // 3. Draw Class Label Banner
      if (showLabels && det.bbox) {
        const [bx, by] = det.bbox;
        const labelText = `${det.class_name} ${(det.confidence * 100).toFixed(0)}%`;

        ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
        const textWidth = ctx.measureText(labelText).width;

        // Label tag background
        ctx.fillStyle = isHovered ? '#1E293B' : 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(bx, Math.max(0, by - 24), textWidth + 14, 24);

        // Class color strip
        ctx.fillStyle = color;
        ctx.fillRect(bx, Math.max(0, by - 24), 4, 24);

        // Text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(labelText, bx + 10, Math.max(16, by - 7));
      }
    });
  };

  const hexToRgba = (hex, alpha) => {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('');
      if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      }
      c = '0x' + c.join('');
      return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    }
    return `rgba(59, 130, 246, ${alpha})`;
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '620px',
        backgroundColor: '#070A12',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Zoom / Pan Controls Toolbar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        gap: '6px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        padding: '6px 10px',
        borderRadius: '10px',
        border: '1px solid var(--border-light)',
        zIndex: 10
      }}>
        <button
          className="btn btn-secondary"
          onClick={() => setZoom(prev => Math.min(3.5, prev + 0.25))}
          title="Zoom In"
          style={{ padding: '6px', minWidth: '32px' }}
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
          title="Zoom Out"
          style={{ padding: '6px', minWidth: '32px' }}
        >
          <ZoomOut size={16} />
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleReset}
          title="Reset View"
          style={{ padding: '6px', minWidth: '32px' }}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Resolution & Scale Badge */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-light)',
        fontSize: '0.75rem',
        color: 'var(--text-secondary)',
        fontFamily: 'JetBrains Mono',
        zIndex: 10
      }}>
        Resolution: {naturalSize.width} × {naturalSize.height} | Zoom: {(zoom * 100).toFixed(0)}%
      </div>

      {/* Canvas Viewport */}
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
            maxHeight: '580px',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.6)'
          }}
        />
      </div>
    </div>
  );
}
