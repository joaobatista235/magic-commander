import { useEffect, useState } from 'react';
import { useBattlefieldStore } from '@/stores/battlefieldStore';

export default function ArrowOverlay() {
  const { arrows, drawingArrowFrom, clearArrows } = useBattlefieldStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [arrowCoords, setArrowCoords] = useState<Record<string, { x1: number; y1: number; x2: number; y2: number }>>({});

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (drawingArrowFrom) {
        setMousePos({ x: e.clientX, y: e.clientY });
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearArrows();
        useBattlefieldStore.getState().setDrawingArrowFrom(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawingArrowFrom, clearArrows]);

  useEffect(() => {
    let animationFrameId: number;
    
    const updateCoords = () => {
      const coords: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {};
      
      arrows.forEach(arrow => {
        const fromEl = document.getElementById(`card-${arrow.fromInstanceId}`);
        const toEl = arrow.toInstanceId ? document.getElementById(`card-${arrow.toInstanceId}`) : null;
        
        if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();
          coords[arrow.id] = {
            x1: fromRect.left + fromRect.width / 2,
            y1: fromRect.top + fromRect.height / 2,
            x2: toRect.left + toRect.width / 2,
            y2: toRect.top + toRect.height / 2,
          };
        }
      });
      
      setArrowCoords(coords);
      animationFrameId = requestAnimationFrame(updateCoords);
    };
    
    updateCoords();
    return () => cancelAnimationFrame(animationFrameId);
  }, [arrows]);

  const drawBezierCurve = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Control points for a nice curve
    const ctrl1X = x1 + distance * 0.2;
    const ctrl1Y = y1 - distance * 0.2;
    const ctrl2X = x2 - distance * 0.2;
    const ctrl2Y = y2 - distance * 0.2;
    return `M ${x1} ${y1} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${x2} ${y2}`;
  };

  return (
    <svg className="fixed inset-0 pointer-events-none z-[100]" style={{ width: '100%', height: '100%' }}>
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
        </marker>
        <marker id="arrowhead-drawing" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" opacity="0.6" />
        </marker>
      </defs>

      {/* Renderizar as setas existentes */}
      {arrows.map(arrow => {
        const coords = arrowCoords[arrow.id];
        if (!coords) return null;
        
        return (
          <path
            key={arrow.id}
            d={drawBezierCurve(coords.x1, coords.y1, coords.x2, coords.y2)}
            fill="none"
            stroke={arrow.color}
            strokeWidth="4"
            strokeLinecap="round"
            markerEnd="url(#arrowhead)"
            className="drop-shadow-lg opacity-80"
          />
        );
      })}

      {/* Renderizar a seta sendo desenhada ativamente */}
      {drawingArrowFrom && (() => {
        const fromEl = document.getElementById(`card-${drawingArrowFrom}`);
        if (!fromEl) return null;
        const fromRect = fromEl.getBoundingClientRect();
        const x1 = fromRect.left + fromRect.width / 2;
        const y1 = fromRect.top + fromRect.height / 2;
        
        return (
          <path
            d={drawBezierCurve(x1, y1, mousePos.x, mousePos.y)}
            fill="none"
            stroke="#f87171"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="8 8"
            markerEnd="url(#arrowhead-drawing)"
            className="drop-shadow-lg opacity-60"
          />
        );
      })()}
    </svg>
  );
}
