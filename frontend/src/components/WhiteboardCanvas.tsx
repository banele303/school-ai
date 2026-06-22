import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { Stage, Layer, Rect, Line, Circle, Arrow, Text, Group, RegularPolygon } from "react-konva";
import {
  MousePointer,
  Pencil,
  Type,
  Square,
  Circle as CircleIcon,
  Triangle,
  MoveUpRight,
  TrendingUp,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Shape {
  id: string;
  type: "pen" | "rect" | "circle" | "triangle" | "line" | "arrow" | "axes" | "text";
  x: number;
  y: number;
  points?: number[];
  width?: number;
  height?: number;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  text?: string;
}

export interface WhiteboardCanvasRef {
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  deleteSelected: () => void;
  exportAsImage: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelected: boolean;
}

interface WhiteboardCanvasProps {
  content: string;
  onChange?: (content: string) => void;
  title?: string;
}

const WhiteboardCanvas = forwardRef<WhiteboardCanvasRef, WhiteboardCanvasProps>(
  ({ content, onChange, title = "Sandbox Board" }, ref) => {
    const stageRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Tools & Canvas State
    const [tool, setTool] = useState<Shape["type"] | "select">("pen");
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [history, setHistory] = useState<Shape[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Settings
    const [color, setColor] = useState("#2563eb");
    const [fillMode, setFillMode] = useState<"none" | "semi" | "solid">("none");
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [gridType, setGridType] = useState<"none" | "dot" | "square">("dot");

    // Interaction State
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Dark Mode Detector
    const [isDarkMode, setIsDarkMode] = useState(false);
    useEffect(() => {
      const checkDark = () => {
        setIsDarkMode(document.documentElement.classList.contains("dark"));
      };
      checkDark();
      const observer = new MutationObserver(checkDark);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }, []);

    const PALETTE = [
      { name: "Slate", hex: isDarkMode ? "#f8fafc" : "#0f172a" },
      { name: "Blue", hex: "#2563eb" },
      { name: "Emerald", hex: "#10b981" },
      { name: "Rose", hex: "#f43f5e" },
      { name: "Amber", hex: "#f59e0b" },
      { name: "Violet", hex: "#8b5cf6" },
      { name: "White", hex: isDarkMode ? "#0f172a" : "#ffffff" },
    ];

    // Map drawing slate/white colors for dark mode visibility
    const getRenderColor = (c: string) => {
      if (c === "#0f172a" && isDarkMode) return "#f8fafc";
      if (c === "#ffffff" && isDarkMode) return "#1e293b";
      return c;
    };

    // Resize listener
    useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          setDimensions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    // Parse board content
    useEffect(() => {
      if (!content) return;
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          setShapes(data);
          setHistory([data]);
          setHistoryIndex(0);
        }
      } catch (_) {
        // Ignore parser errors
      }
    }, [content]);

    // Push new state to history
    const updateShapes = (newShapes: Shape[]) => {
      setShapes(newShapes);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newShapes);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      if (onChange) {
        onChange(JSON.stringify(newShapes));
      }
    };

    const undo = () => {
      if (historyIndex > 0) {
        const prev = historyIndex - 1;
        setHistoryIndex(prev);
        setShapes(history[prev]);
        if (onChange) {
          onChange(JSON.stringify(history[prev]));
        }
      }
    };

    const redo = () => {
      if (historyIndex < history.length - 1) {
        const next = historyIndex + 1;
        setHistoryIndex(next);
        setShapes(history[next]);
        if (onChange) {
          onChange(JSON.stringify(history[next]));
        }
      }
    };

    const clearCanvas = () => {
      if (confirm("Are you sure you want to clear the entire whiteboard?")) {
        updateShapes([]);
        setSelectedId(null);
      }
    };

    const deleteSelected = () => {
      if (selectedId) {
        updateShapes(shapes.filter((s) => s.id !== selectedId));
        setSelectedId(null);
      }
    };

    const exportAsImage = () => {
      const uri = stageRef.current.toDataURL();
      const link = document.createElement("a");
      link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Expose actions to parent component via ref
    useImperativeHandle(ref, () => ({
      undo,
      redo,
      clearCanvas,
      deleteSelected,
      exportAsImage,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
      hasSelected: !!selectedId,
    }));

    // Zoom Helpers
    const handleZoom = (factor: number) => {
      setStageScale((prev) => Math.min(Math.max(prev * factor, 0.1), 10));
    };

    const resetZoom = () => {
      setStageScale(1);
      setStagePos({ x: 0, y: 0 });
    };

    const getTransformedPointer = () => {
      const stage = stageRef.current;
      if (!stage) return { x: 0, y: 0 };
      const pointer = stage.getPointerPosition();
      return {
        x: (pointer.x - stagePos.x) / stageScale,
        y: (pointer.y - stagePos.y) / stageScale,
      };
    };

    const handleMouseDown = (e: any) => {
      if (tool === "select") {
        const clickedOnEmpty = e.target === e.target.getStage();
        if (clickedOnEmpty) {
          setSelectedId(null);
        }
        return;
      }

      setIsDrawing(true);
      const pointer = getTransformedPointer();
      const id = `shape_${Date.now()}`;
      const fillHex = fillMode === "solid" ? color : fillMode === "semi" ? `${color}44` : undefined;

      let newShape: Shape = {
        id,
        type: tool,
        x: pointer.x,
        y: pointer.y,
        color,
        fillColor: fillHex,
        strokeWidth,
      };

      if (tool === "pen") {
        newShape.points = [pointer.x, pointer.y];
      } else if (tool === "rect" || tool === "circle" || tool === "triangle" || tool === "axes") {
        newShape.width = 0;
        newShape.height = 0;
      } else if (tool === "line" || tool === "arrow") {
        newShape.points = [pointer.x, pointer.y, pointer.x, pointer.y];
      } else if (tool === "text") {
        const textVal = prompt("Enter text:", "Math Note");
        if (!textVal) {
          setIsDrawing(false);
          return;
        }
        newShape.text = textVal;
        setIsDrawing(false);
      }

      updateShapes([...shapes, newShape]);
    };

    const handleMouseMove = () => {
      if (!isDrawing || tool === "select") return;
      const pointer = getTransformedPointer();
      const updated = [...shapes];
      const active = { ...updated[updated.length - 1] };

      if (!active) return;

      if (active.type === "pen" && active.points) {
        active.points = [...active.points, pointer.x, pointer.y];
      } else if (active.type === "rect" || active.type === "circle" || active.type === "triangle" || active.type === "axes") {
        active.width = pointer.x - active.x;
        active.height = pointer.y - active.y;
      } else if ((active.type === "line" || active.type === "arrow") && active.points) {
        active.points = [active.points[0], active.points[1], pointer.x, pointer.y];
      }

      updated[updated.length - 1] = active;
      setShapes(updated);
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        setIsDrawing(false);
        updateShapes(shapes);
      }
    };

    const handleDragEnd = (id: string, e: any) => {
      const updated = shapes.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            x: e.target.x(),
            y: e.target.y(),
          };
        }
        return s;
      });
      updateShapes(updated);
    };

    const gridLineColor = isDarkMode ? "#1e293b" : "#e2e8f0";
    const gridDotColor = isDarkMode ? "#334155" : "#cbd5e1";

    return (
      <div
        className="relative flex w-full h-full bg-slate-50 dark:bg-slate-950 select-none overflow-hidden"
        ref={containerRef}
      >
        {/* Immersive Floating Left Toolbar */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 animate-in fade-in slide-in-from-left-4 duration-300">
          <Button
            variant={tool === "select" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("select")}
            title="Select & Move"
          >
            <MousePointer className="h-5 w-5" />
          </Button>
          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />
          <Button
            variant={tool === "pen" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("pen")}
            title="Freehand Pen"
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <Button
            variant={tool === "text" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("text")}
            title="Add Text Label"
          >
            <Type className="h-5 w-5" />
          </Button>
          <div className="h-[1px] bg-slate-200 dark:bg-slate-800 my-1" />
          <Button
            variant={tool === "rect" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("rect")}
            title="Rectangle Shape"
          >
            <Square className="h-5 w-5" />
          </Button>
          <Button
            variant={tool === "circle" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <CircleIcon className="h-5 w-5" />
          </Button>
          <Button
            variant={tool === "triangle" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("triangle")}
            title="Triangle Geometry"
          >
            <Triangle className="h-5 w-5" />
          </Button>
          <Button
            variant={tool === "arrow" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("arrow")}
            title="Directional Arrow"
          >
            <MoveUpRight className="h-5 w-5" />
          </Button>
          <Button
            variant={tool === "axes" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("axes")}
            title="Math Coordinate Axes (X-Y)"
          >
            <TrendingUp className="h-5 w-5" />
          </Button>
        </div>

        {/* Floating Styling and Formatting Controls (Top) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-4 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-lg border border-slate-200/80 dark:border-slate-800/80 max-w-[90%] overflow-x-auto">
          {/* Colors */}
          <div className="flex gap-1.5 items-center pr-3 border-r border-slate-200 dark:border-slate-800">
            {PALETTE.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className={cn(
                  "h-6 w-6 rounded-full border border-slate-300 dark:border-slate-600 transition hover:scale-110",
                  color === c.hex && "ring-2 ring-indigo-500 ring-offset-2"
                )}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          {/* Thickness */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">Stroke</span>
            {[2, 4, 8].map((size) => (
              <button
                key={size}
                onClick={() => setStrokeWidth(size)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition",
                  strokeWidth === size
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    : "text-slate-500"
                )}
              >
                {size === 2 ? "Thin" : size === 4 ? "Med" : "Thick"}
              </button>
            ))}
          </div>

          {/* Fill Style */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-medium">Fill</span>
            {(["none", "semi", "solid"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFillMode(mode)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-semibold capitalize hover:bg-slate-100 dark:hover:bg-slate-800 transition",
                  fillMode === mode
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                    : "text-slate-500"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Grid Setting */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (gridType === "none") setGridType("dot");
                else if (gridType === "dot") setGridType("square");
                else setGridType("none");
              }}
              title="Toggle Grid Type"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation Controls (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-lg shadow border border-slate-200 dark:border-slate-800">
          <Button variant="ghost" size="icon" onClick={() => handleZoom(0.85)} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold w-12 text-center text-slate-700 dark:text-slate-300">
            {Math.round(stageScale * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={() => handleZoom(1.15)} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={resetZoom} title="Reset View">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Drawing Stage */}
        <div className="flex-1 w-full h-full">
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={tool === "select"}
            onDragEnd={(e) => {
              if (e.target === stageRef.current) {
                setStagePos(e.target.position());
              }
            }}
          >
            <Layer>
              {/* Grid layer background */}
              {gridType === "square" && (
                <Group>
                  {Array.from({ length: Math.ceil((dimensions.width * 3) / 40) }).map((_, i) => (
                    <Line
                      key={`v_${i}`}
                      points={[(i - 10) * 40, -1000, (i - 10) * 40, 3000]}
                      stroke={gridLineColor}
                      strokeWidth={0.5}
                      listening={false}
                    />
                  ))}
                  {Array.from({ length: Math.ceil((dimensions.height * 3) / 40) }).map((_, i) => (
                    <Line
                      key={`h_${i}`}
                      points={[-1000, (i - 10) * 40, 3000, (i - 10) * 40]}
                      stroke={gridLineColor}
                      strokeWidth={0.5}
                      listening={false}
                    />
                  ))}
                </Group>
              )}

              {gridType === "dot" && (
                <Group>
                  {Array.from({ length: Math.ceil((dimensions.width * 2) / 30) }).map((_, x) =>
                    Array.from({ length: Math.ceil((dimensions.height * 2) / 30) }).map((_, y) => (
                      <Circle
                        key={`d_${x}_${y}`}
                        x={(x - 5) * 30}
                        y={(y - 5) * 30}
                        radius={1}
                        fill={gridDotColor}
                        listening={false}
                      />
                    ))
                  )}
                </Group>
              )}

              {/* Render Saved/Drawn Shapes */}
              {shapes.map((shape) => {
                const isSelected = shape.id === selectedId;
                const shapeColor = getRenderColor(shape.color);

                // Render wrapper with properties
                return (
                  <Group
                    key={shape.id}
                    draggable={tool === "select"}
                    onClick={() => tool === "select" && setSelectedId(shape.id)}
                    onDragEnd={(e) => handleDragEnd(shape.id, e)}
                  >
                    {shape.type === "pen" && shape.points && (
                      <Line
                        points={shape.points}
                        stroke={shapeColor}
                        strokeWidth={shape.strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                      />
                    )}

                    {shape.type === "rect" && (
                      <Rect
                        x={shape.x}
                        y={shape.y}
                        width={shape.width || 0}
                        height={shape.height || 0}
                        stroke={shapeColor}
                        strokeWidth={shape.strokeWidth}
                        fill={shape.fillColor}
                      />
                    )}

                    {shape.type === "circle" && (
                      <Circle
                        x={shape.x}
                        y={shape.y}
                        radius={Math.sqrt(Math.pow(shape.width || 0, 2) + Math.pow(shape.height || 0, 2))}
                        stroke={shapeColor}
                        strokeWidth={shape.strokeWidth}
                        fill={shape.fillColor}
                      />
                    )}

                    {shape.type === "triangle" && (
                      <RegularPolygon
                        x={shape.x + (shape.width || 0) / 2}
                        y={shape.y + (shape.height || 0) / 2}
                        sides={3}
                        radius={Math.abs((shape.width || 0) / 2)}
                        stroke={shapeColor}
                        strokeWidth={shape.strokeWidth}
                        fill={shape.fillColor}
                      />
                    )}

                    {shape.type === "arrow" && shape.points && (
                      <Arrow
                        points={shape.points}
                        pointerLength={10}
                        pointerWidth={10}
                        fill={shapeColor}
                        stroke={shapeColor}
                        strokeWidth={shape.strokeWidth}
                      />
                    )}

                    {shape.type === "line" && shape.points && (
                      <Line points={shape.points} stroke={shapeColor} strokeWidth={shape.strokeWidth} />
                    )}

                    {shape.type === "text" && (
                      <Text
                        x={shape.x}
                        y={shape.y}
                        text={shape.text || ""}
                        fontSize={20}
                        fontFamily="Outfit, Inter, sans-serif"
                        fill={shapeColor}
                      />
                    )}

                    {/* Math Coordinate Axes Preset */}
                    {shape.type === "axes" && (
                      <Group x={shape.x} y={shape.y}>
                        {/* X axis */}
                        <Arrow
                          points={[-(shape.width || 100), 0, (shape.width || 100), 0]}
                          pointerLength={8}
                          pointerWidth={8}
                          fill={shapeColor}
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                        />
                        <Text
                          x={(shape.width || 100) - 15}
                          y={10}
                          text="x"
                          fontSize={14}
                          fontStyle="italic"
                          fill={shapeColor}
                        />

                        {/* Y axis */}
                        <Arrow
                          points={[0, shape.height || 100, 0, -(shape.height || 100)]}
                          pointerLength={8}
                          pointerWidth={8}
                          fill={shapeColor}
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                        />
                        <Text
                          x={10}
                          y={-(shape.height || 100) + 5}
                          text="y"
                          fontSize={14}
                          fontStyle="italic"
                          fill={shapeColor}
                        />

                        {/* Origin indicator */}
                        <Circle x={0} y={0} radius={3} fill={shapeColor} />
                      </Group>
                    )}

                    {/* Selection Outline */}
                    {isSelected && (
                      <Rect
                        x={shape.x - 5}
                        y={shape.y - 5}
                        width={(shape.width || 0) + 10}
                        height={(shape.height || 0) + 10}
                        stroke="#8b5cf6"
                        strokeWidth={1}
                        dash={[4, 4]}
                      />
                    )}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>
      </div>
    );
  }
);

export default WhiteboardCanvas;
