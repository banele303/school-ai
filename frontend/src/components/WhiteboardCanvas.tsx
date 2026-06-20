import React, { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";

/**
 * WhiteboardCanvas renders a drawing canvas using react-konva.
 * It supports simple click‑to‑add rectangle shapes and reports the
 * current canvas content (as JSON) via the optional onChange prop.
 */
const WhiteboardCanvas: React.FC<{ content: string; onChange?: (content: string) => void }> = ({ content, onChange }) => {
  const stageRef = useRef<any>(null);
  const [shapes, setShapes] = useState<Array<{ x: number; y: number; id: string }>>([]);

  // Load persisted content (JSON string of shape objects)
  useEffect(() => {
    if (!content) return;
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        setShapes(data);
      }
    } catch (_) {
      // ignore malformed JSON
    }
  }, [content]);

  // Report changes to parent when shapes update
  useEffect(() => {
    if (onChange) {
      onChange(JSON.stringify(shapes));
    }
  }, [shapes, onChange]);

  const handleStageClick = (e: any) => {
    // Add a small rectangle at click position
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    const newShape = { x: pointer.x, y: pointer.y, id: Date.now().toString() };
    setShapes((prev) => [...prev, newShape]);
  };

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight - 80}
      ref={stageRef}
      onMouseDown={handleStageClick}
    >
      <Layer>
        <Rect width={window.innerWidth} height={window.innerHeight - 80} fill="#fafafa" />
        {shapes.map((s) => (
          <Rect
            key={s.id}
            x={s.x}
            y={s.y}
            width={80}
            height={60}
            fill="#ffcc00"
            shadowBlur={5}
          />
        ))}
        <Text text="Whiteboard Canvas" x={20} y={20} fontSize={24} fill="#333" />
      </Layer>
    </Stage>
  );
};

export default WhiteboardCanvas;
