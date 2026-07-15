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
  PieChart,
  ChevronRight,
  Hexagon,
  FlaskConical,
  Zap,
  Battery,
  Dna,
  Atom,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Shape {
  id: string;
  type: "pen" | "rect" | "circle" | "triangle" | "line" | "arrow" | "axes" | "text" | "rightTriangle" | "parabola" | "circleRadius" | "pieSlice" | "benzene" | "beaker" | "resistor" | "battery" | "dna";
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

    // Math tools panel toggle
    const [showMathPanel, setShowMathPanel] = useState(false);

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
      { name: "White", hex: isDarkMode ? "#1e293b" : "#ffffff" },
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

    // Push new state to history & notify parent ONLY when flag is true (improves latency)
    const commitShapes = (newShapes: Shape[], notifyParent = true) => {
      setShapes(newShapes);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newShapes);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      if (notifyParent && onChange) {
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
        commitShapes([], true);
        setSelectedId(null);
      }
    };

    const deleteSelected = () => {
      if (selectedId) {
        const nextShapes = shapes.filter((s) => s.id !== selectedId);
        commitShapes(nextShapes, true);
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

    // Keyboard Shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore shortcut keys if focused on text input/textarea
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea") return;

        // Ctrl + Z (Undo)
        if ((e.ctrlKey || e.metaKey) && e.key === "z") {
          e.preventDefault();
          undo();
        }
        // Ctrl + Y (Redo)
        if ((e.ctrlKey || e.metaKey) && e.key === "y") {
          e.preventDefault();
          redo();
        }
        // Delete / Backspace (Delete selected shape)
        if (e.key === "Delete" || e.key === "Backspace") {
          if (selectedId) {
            e.preventDefault();
            deleteSelected();
          }
        }
        // Mode switch keys
        if (e.key === "v") setTool("select");
        if (e.key === "p") setTool("pen");
        if (e.key === "t") setTool("text");
        if (e.key === "r") setTool("rect");
        if (e.key === "c") setTool("circle");
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [historyIndex, history, selectedId, shapes]);

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
      } else if (
        tool === "rect" ||
        tool === "circle" ||
        tool === "triangle" ||
        tool === "axes" ||
        tool === "rightTriangle" ||
        tool === "parabola" ||
        tool === "circleRadius" ||
        tool === "pieSlice" ||
        tool === "benzene" ||
        tool === "beaker" ||
        tool === "resistor" ||
        tool === "battery" ||
        tool === "dna"
      ) {
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
        const updatedShapes = [...shapes, newShape];
        setShapes(updatedShapes);
        commitShapes(updatedShapes, true);
        setIsDrawing(false);
        return;
      }

      // Do NOT notify parent on initial click (will notify on mouseUp)
      setShapes([...shapes, newShape]);
    };

    const handleMouseMove = () => {
      if (!isDrawing || tool === "select") return;
      const pointer = getTransformedPointer();
      const updated = [...shapes];
      const active = { ...updated[updated.length - 1] };

      if (!active) return;

      if (active.type === "pen" && active.points) {
        active.points = [...active.points, pointer.x, pointer.y];
      } else if (
        active.type === "rect" ||
        active.type === "circle" ||
        active.type === "triangle" ||
        active.type === "axes" ||
        active.type === "rightTriangle" ||
        active.type === "parabola" ||
        active.type === "circleRadius" ||
        active.type === "pieSlice" ||
        active.type === "benzene" ||
        active.type === "beaker" ||
        active.type === "resistor" ||
        active.type === "battery" ||
        active.type === "dna"
      ) {
        active.width = pointer.x - active.x;
        active.height = pointer.y - active.y;
      } else if ((active.type === "line" || active.type === "arrow") && active.points) {
        active.points = [active.points[0], active.points[1], pointer.x, pointer.y];
      }

      updated[updated.length - 1] = active;
      setShapes(updated); // Smooth local-only rendering update
    };

    const handleMouseUp = () => {
      if (isDrawing) {
        setIsDrawing(false);
        commitShapes(shapes, true); // Push history & notify parent exactly once
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
      commitShapes(updated, true); // Save state on drag finish
    };

    const gridLineColor = isDarkMode ? "#1e293b" : "#e2e8f0";
    const gridDotColor = isDarkMode ? "#334155" : "#cbd5e1";

    // Set cursor dynamically based on active tool
    const getStageCursor = () => {
      if (tool === "select") return "default";
      if (tool === "text") return "text";
      return "crosshair";
    };

    return (
      <div
        className="relative flex w-full h-full bg-zinc-50 dark:bg-zinc-950 select-none overflow-hidden"
        ref={containerRef}
      >
        {/* Immersive Floating Left Toolbar */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 p-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-800/80 animate-in fade-in slide-in-from-left-4 duration-300">
          <Button
            variant={tool === "select" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("select")}
            title="Select & Move (v)"
          >
            <MousePointer className="h-5 w-5" />
          </Button>
          <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800 my-1" />
          <Button
            variant={tool === "pen" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("pen")}
            title="Freehand Pen (p)"
          >
            <Pencil className="h-5 w-5" />
          </Button>
          <Button
            variant={tool === "text" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("text")}
            title="Add Text Label (t)"
          >
            <Type className="h-5 w-5" />
          </Button>
          <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800 my-1" />
          <Button
            variant={tool === "rect" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("rect")}
            title="Rectangle Shape (r)"
          >
            <Square className="h-5 w-5" />
          </Button>
          <Button
            variant={tool === "circle" ? "default" : "ghost"}
            size="icon"
            onClick={() => setTool("circle")}
            title="Circle (c)"
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

          {/* Math Tools Expandable Panel */}
          <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800 my-1" />
          <Button
            variant={showMathPanel ? "default" : "ghost"}
            size="icon"
            onClick={() => setShowMathPanel(!showMathPanel)}
            title="STEM Presets & Tools"
            className="relative"
          >
            <Atom className="h-5 w-5" />
            <ChevronRight
              className={cn(
                "h-2.5 w-2.5 absolute right-0.5 bottom-0.5 transition-transform",
                showMathPanel && "rotate-90"
              )}
            />
          </Button>
        </div>

        {/* Floating STEM Tools Panel */}
        {showMathPanel && (
          <div className="absolute left-20 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-3 p-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-left-2 duration-200 w-44 max-h-[80vh] overflow-y-auto">
            <div>
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Math Tools
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <Button
                  variant={tool === "axes" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("axes")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <TrendingUp className="h-4 w-4 text-indigo-500" /> Cartesian Axes
                </Button>
                <Button
                  variant={tool === "rightTriangle" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("rightTriangle")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <Triangle className="h-4 w-4 rotate-90 text-indigo-500" /> Right Triangle
                </Button>
                <Button
                  variant={tool === "circleRadius" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("circleRadius")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <CircleIcon className="h-4 w-4 text-indigo-500" /> Circle & Radius
                </Button>
                <Button
                  variant={tool === "pieSlice" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("pieSlice")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <PieChart className="h-4 w-4 text-indigo-500" /> Pie Fraction
                </Button>
                <Button
                  variant={tool === "parabola" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("parabola")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <TrendingUp className="h-4 w-4 -rotate-45 text-indigo-500" /> Parabola Curve
                </Button>
              </div>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2.5">
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Science Tools
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <Button
                  variant={tool === "benzene" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("benzene")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <Hexagon className="h-4 w-4 text-emerald-500" /> Benzene Ring
                </Button>
                <Button
                  variant={tool === "beaker" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("beaker")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <FlaskConical className="h-4 w-4 text-sky-500" /> Beaker Flask
                </Button>
                <Button
                  variant={tool === "dna" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("dna")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <Dna className="h-4 w-4 text-purple-500" /> DNA Helix
                </Button>
                <Button
                  variant={tool === "resistor" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("resistor")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <Zap className="h-4 w-4 text-amber-500" /> Resistor
                </Button>
                <Button
                  variant={tool === "battery" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setTool("battery")}
                  className="justify-start gap-2 h-9 rounded-xl text-xs px-2.5 font-medium"
                >
                  <Battery className="h-4 w-4 text-red-500" /> Circuit Cell
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Styling and Formatting Controls (Top) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 px-4 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full shadow-lg border border-zinc-200/80 dark:border-zinc-800/80 max-w-[90%] overflow-x-auto">
          {/* Colors */}
          <div className="flex gap-1.5 items-center pr-3 border-r border-zinc-200 dark:border-zinc-800">
            {PALETTE.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className={cn(
                  "h-6 w-6 rounded-full border border-zinc-300 dark:border-zinc-700 transition hover:scale-110",
                  color === c.hex && "ring-2 ring-indigo-500 ring-offset-2"
                )}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>

          {/* Thickness */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-zinc-200 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 font-medium">Stroke</span>
            {[2, 4, 8].map((size) => (
              <button
                key={size}
                onClick={() => setStrokeWidth(size)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition",
                  strokeWidth === size
                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500"
                )}
              >
                {size === 2 ? "Thin" : size === 4 ? "Med" : "Thick"}
              </button>
            ))}
          </div>

          {/* Fill Style */}
          <div className="flex items-center gap-1.5 pr-3 border-r border-zinc-200 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 font-medium">Fill</span>
            {(["none", "semi", "solid"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFillMode(mode)}
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-semibold capitalize hover:bg-zinc-100 dark:hover:bg-zinc-800 transition",
                  fillMode === mode
                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500"
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
        <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 p-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur rounded-lg shadow border border-zinc-200 dark:border-zinc-800">
          <Button variant="ghost" size="icon" onClick={() => handleZoom(0.85)} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold w-12 text-center text-zinc-700 dark:text-zinc-300">
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
        <div className="flex-1 w-full h-full cursor-default">
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
            style={{ cursor: getStageCursor() }}
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

                    {/* Math Cartesian Axes Preset */}
                    {shape.type === "axes" && (
                      <Group x={shape.x} y={shape.y}>
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
                        <Circle x={0} y={0} radius={3} fill={shapeColor} />
                      </Group>
                    )}

                    {/* Math Right Triangle Preset */}
                    {shape.type === "rightTriangle" && (
                      <Group x={shape.x} y={shape.y}>
                        <Line
                          points={[
                            0,
                            0,
                            0,
                            shape.height || 80,
                            shape.width || 120,
                            shape.height || 80,
                            0,
                            0,
                          ]}
                          closed
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                          fill={shape.fillColor}
                        />
                        {/* Right angle indicator box */}
                        <Line
                          points={[
                            0,
                            (shape.height || 80) - 10,
                            10,
                            (shape.height || 80) - 10,
                            10,
                            shape.height || 80,
                          ]}
                          stroke={shapeColor}
                          strokeWidth={1}
                        />
                      </Group>
                    )}

                    {/* Math Circle with Radius Preset */}
                    {shape.type === "circleRadius" && (
                      <Group x={shape.x} y={shape.y}>
                        <Circle
                          x={0}
                          y={0}
                          radius={Math.max(Math.abs(shape.width || 50), 10)}
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                          fill={shape.fillColor}
                        />
                        <Line
                          points={[0, 0, Math.max(Math.abs(shape.width || 50), 10), 0]}
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                        />
                        <Text
                          x={Math.max(Math.abs(shape.width || 50), 10) / 2 - 5}
                          y={-15}
                          text="r"
                          fontSize={12}
                          fontStyle="italic"
                          fill={shapeColor}
                        />
                        <Circle x={0} y={0} radius={3} fill={shapeColor} />
                      </Group>
                    )}

                    {/* Math Parabola algebra preset */}
                    {shape.type === "parabola" && (
                      <Group x={shape.x} y={shape.y}>
                        <Line
                          points={(() => {
                            const pts = [];
                            const w = shape.width || 100;
                            const h = shape.height || 80;
                            for (let dx = -w; dx <= w; dx += 5) {
                              const dy = (dx * dx) / w; // standard parabola dy = x^2
                              pts.push(dx, dy * (h / w));
                            }
                            return pts;
                          })()}
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                          tension={0.5}
                        />
                        <Text
                          x={0}
                          y={(shape.height || 80) + 5}
                          text="y = ax²"
                          fontSize={12}
                          fontStyle="italic"
                          fill={shapeColor}
                        />
                      </Group>
                    )}

                    {/* Math Pie Fraction Preset */}
                    {shape.type === "pieSlice" && (
                      <Group x={shape.x} y={shape.y}>
                        <Circle
                          x={0}
                          y={0}
                          radius={Math.max(Math.abs(shape.width || 50), 10)}
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                          fill={shape.fillColor}
                        />
                        {/* Cut lines for a standard quarter slice fraction */}
                        <Line
                          points={[0, 0, 0, -Math.max(Math.abs(shape.width || 50), 10)]}
                          stroke={shapeColor}
                          strokeWidth={Math.max(shape.strokeWidth - 1, 1)}
                        />
                        <Line
                          points={[0, 0, Math.max(Math.abs(shape.width || 50), 10), 0]}
                          stroke={shapeColor}
                          strokeWidth={Math.max(shape.strokeWidth - 1, 1)}
                        />
                        <Text
                          x={12}
                          y={-20}
                          text="1/4"
                          fontSize={12}
                          fontWeight="bold"
                          fill={shapeColor}
                        />
                      </Group>
                    )}

                    {/* STEM Benzene Ring Preset */}
                    {shape.type === "benzene" && (
                      <Group x={shape.x} y={shape.y}>
                        <Line
                          points={(() => {
                            const R = Math.max(Math.abs(shape.width || 40), 10);
                            const pts = [];
                            for (let i = 0; i < 6; i++) {
                              const angle = (i * Math.PI) / 3;
                              pts.push(R * Math.cos(angle), R * Math.sin(angle));
                            }
                            return pts;
                          })()}
                          closed
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                          fill={shape.fillColor}
                        />
                        <Circle
                          x={0}
                          y={0}
                          radius={Math.max(Math.abs(shape.width || 40), 10) * 0.65}
                          stroke={shapeColor}
                          strokeWidth={shape.strokeWidth}
                        />
                      </Group>
                    )}

                    {/* STEM Chemistry Beaker Preset */}
                    {shape.type === "beaker" && (
                      <Group x={shape.x} y={shape.y}>
                        {(() => {
                          const w = Math.max(Math.abs(shape.width || 50), 15);
                          const h = Math.max(Math.abs(shape.height || 60), 15);
                          return (
                            <>
                              {/* Beaker fluid fill */}
                              {shape.fillColor && (
                                <Line
                                  points={[-w/2, h/4, -w/2, h/2, w/2, h/2, w/2, h/4]}
                                  closed
                                  fill={shape.fillColor}
                                  stroke="transparent"
                                />
                              )}
                              {/* Outer outline with top lips */}
                              <Line
                                points={[-w/2 - 4, -h/2, -w/2, -h/2, -w/2, h/2, w/2, h/2, w/2, -h/2, w/2 + 4, -h/2]}
                                stroke={shapeColor}
                                strokeWidth={shape.strokeWidth}
                              />
                              {/* Graduations/measurements */}
                              <Line points={[w/2 - w/4, -h/4, w/2, -h/4]} stroke={shapeColor} strokeWidth={1} />
                              <Line points={[w/2 - w/4, 0, w/2, 0]} stroke={shapeColor} strokeWidth={1} />
                              <Line points={[w/2 - w/4, h/4, w/2, h/4]} stroke={shapeColor} strokeWidth={1} />
                            </>
                          );
                        })()}
                      </Group>
                    )}

                    {/* STEM Electrical Resistor Preset */}
                    {shape.type === "resistor" && (
                      <Group x={shape.x} y={shape.y}>
                        {(() => {
                          const w = shape.width || 80;
                          const h = shape.height || 20;
                          const points = [
                            -w/2, 0,
                            -w/3, 0,
                            -w/4, -h/2,
                            -w/8, h/2,
                            0, -h/2,
                            w/8, h/2,
                            w/4, -h/2,
                            w/3, 0,
                            w/2, 0
                          ];
                          return (
                            <Line
                              points={points}
                              stroke={shapeColor}
                              strokeWidth={shape.strokeWidth}
                            />
                          );
                        })()}
                      </Group>
                    )}

                    {/* STEM Circuit Battery Preset */}
                    {shape.type === "battery" && (
                      <Group x={shape.x} y={shape.y}>
                        {(() => {
                          const w = Math.max(Math.abs(shape.width || 50), 15);
                          const h = Math.max(Math.abs(shape.height || 30), 10);
                          return (
                            <>
                              {/* Left wire */}
                              <Line points={[-w/2, 0, -w/6, 0]} stroke={shapeColor} strokeWidth={shape.strokeWidth} />
                              {/* First plate (positive - longer) */}
                              <Line points={[-w/6, -h/2, -w/6, h/2]} stroke={shapeColor} strokeWidth={shape.strokeWidth} />
                              {/* Second plate (negative - shorter & thicker) */}
                              <Line points={[-w/12, -h/3, -w/12, h/3]} stroke={shapeColor} strokeWidth={shape.strokeWidth * 2.2} />
                              {/* Third plate (positive) */}
                              <Line points={[w/12, -h/2, w/12, h/2]} stroke={shapeColor} strokeWidth={shape.strokeWidth} />
                              {/* Fourth plate (negative) */}
                              <Line points={[w/6, -h/3, w/6, h/3]} stroke={shapeColor} strokeWidth={shape.strokeWidth * 2.2} />
                              {/* Right wire */}
                              <Line points={[w/6, 0, w/2, 0]} stroke={shapeColor} strokeWidth={shape.strokeWidth} />
                              
                              <Text x={-w/3} y={-h/2 - 12} text="+" fontSize={12} fill={shapeColor} />
                              <Text x={w/4} y={-h/2 - 12} text="-" fontSize={12} fill={shapeColor} />
                            </>
                          );
                        })()}
                      </Group>
                    )}

                    {/* STEM DNA Double Helix Preset */}
                    {shape.type === "dna" && (
                      <Group x={shape.x} y={shape.y}>
                        {(() => {
                          const w = Math.max(Math.abs(shape.width || 100), 20);
                          const h = Math.max(Math.abs(shape.height || 40), 10);
                          const strand1 = [];
                          const strand2 = [];
                          const rungs = [];
                          const steps = 10;
                          for (let i = 0; i <= steps; i++) {
                            const pct = i / steps;
                            const dx = -w/2 + pct * w;
                            const angle = pct * Math.PI * 3; // 1.5 full helix turns
                            const dy1 = Math.sin(angle) * (h/2);
                            const dy2 = Math.sin(angle + Math.PI) * (h/2);
                            strand1.push(dx, dy1);
                            strand2.push(dx, dy2);
                            if (i > 0 && i < steps) {
                              rungs.push({ x1: dx, y1: dy1, x2: dx, y2: dy2 });
                            }
                          }
                          return (
                            <>
                              {rungs.map((r, idx) => (
                                <Line
                                  key={idx}
                                  points={[r.x1, r.y1, r.x2, r.y2]}
                                  stroke={shapeColor}
                                  strokeWidth={Math.max(shape.strokeWidth - 1, 1)}
                                  opacity={0.65}
                                />
                              ))}
                              <Line
                                points={strand1}
                                stroke={shapeColor}
                                strokeWidth={shape.strokeWidth}
                                tension={0.5}
                              />
                              <Line
                                points={strand2}
                                stroke={shapeColor}
                                strokeWidth={shape.strokeWidth}
                                tension={0.5}
                              />
                            </>
                          );
                        })()}
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
