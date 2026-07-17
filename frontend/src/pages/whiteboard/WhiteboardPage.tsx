import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import WhiteboardCanvas from "@/components/WhiteboardCanvas";
import type { WhiteboardCanvasRef } from "@/components/WhiteboardCanvas";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  CloudCheck,
  CloudUpload,
  Edit3,
  RotateCcw,
  RotateCw,
  Trash2,
  Eraser,
  Download,
  Grid,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PALETTE = [
  { name: "Black", hex: "#0f172a" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "White", hex: "#ffffff" },
];

const WhiteboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const boardId = id as Id<"whiteboards">;

  const board = useQuery(api.whiteboard.get, id ? { id: boardId } : "skip");
  const updateBoard = useMutation(api.whiteboard.update);

  const canvasRef = useRef<WhiteboardCanvasRef>(null);

  const [title, setTitle] = useState("Untitled Whiteboard");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [canvasContent, setCanvasContent] = useState<string>("");

  // Toolbar state — controlled from header
  const [color, setColor] = useState("#2563eb");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fillMode, setFillMode] = useState<"none" | "semi" | "solid">("none");
  const [gridType, setGridType] = useState<"none" | "dot" | "square">("dot");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (board) {
      setTitle(board.title || "Untitled Whiteboard");
      setCanvasContent(board.content || "");
    }
  }, [board]);

  const handleCanvasChange = (newContent: string) => {
    setCanvasContent(newContent);
    setSaveStatus("unsaved");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveChanges(newContent, title);
    }, 4000);
  };

  const saveChanges = async (contentToSave = canvasContent, titleToSave = title) => {
    if (!id) return;
    setSaveStatus("saving");
    try {
      await updateBoard({ id: boardId, title: titleToSave, content: contentToSave });
      setSaveStatus("saved");
    } catch (e) {
      console.error("Auto-save failed", e);
      setSaveStatus("unsaved");
    }
  };

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    void saveChanges(canvasContent, title);
  };

  const cycleGrid = () => {
    setGridType((g) => g === "none" ? "dot" : g === "dot" ? "square" : "none");
  };

  if (!board) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-slate-500">Loading whiteboard canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* ── Toolbar Header ─────────────────────────────────────────── */}
      <header className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-20 shadow-sm shrink-0 overflow-x-auto">

        {/* Back + Title */}
        <div className="flex items-center gap-1.5 mr-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/whiteboard")}
            title="Back to boards"
            className="h-8 w-8 text-zinc-700 dark:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
              className="h-8 w-44 font-semibold text-sm py-0 px-2"
              autoFocus
            />
          ) : (
            <div
              className="flex items-center gap-1 cursor-pointer group"
              onClick={() => setIsEditingTitle(true)}
            >
              <h1 className="font-semibold text-sm text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 transition max-w-[140px] truncate">
                {title}
              </h1>
              <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

        {/* Color Palette */}
        <div className="flex gap-1 items-center shrink-0">
          {PALETTE.map((c) => (
            <button
              key={c.hex}
              onClick={() => setColor(c.hex)}
              className={cn(
                "h-5 w-5 rounded-full border-2 transition hover:scale-110 shrink-0",
                color === c.hex
                  ? "border-indigo-500 ring-1 ring-indigo-400 ring-offset-1 ring-offset-white dark:ring-offset-zinc-950"
                  : "border-zinc-300 dark:border-zinc-600"
              )}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
          {/* Custom colour picker */}
          <label className="relative h-5 w-5 cursor-pointer shrink-0" title="Custom colour">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            />
            <div className="h-5 w-5 rounded-full border-2 border-dashed border-zinc-400 dark:border-zinc-500 flex items-center justify-center text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
              +
            </div>
          </label>
        </div>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

        {/* Stroke Width */}
        <div className="flex items-center gap-0.5 shrink-0">
          {([2, 4, 8] as const).map((size) => (
            <button
              key={size}
              onClick={() => setStrokeWidth(size)}
              className={cn(
                "px-2 py-0.5 rounded text-xs font-semibold transition",
                strokeWidth === size
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              {size === 2 ? "Thin" : size === 4 ? "Med" : "Thick"}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

        {/* Fill Mode */}
        <div className="flex items-center gap-0.5 shrink-0">
          {(["none", "semi", "solid"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFillMode(mode)}
              className={cn(
                "px-2 py-0.5 rounded text-xs font-semibold capitalize transition",
                fillMode === mode
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

        {/* Grid Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleGrid}
          title={`Grid: ${gridType} (click to cycle)`}
          className={cn(
            "h-7 w-7 shrink-0 text-zinc-700 dark:text-zinc-300",
            gridType !== "none" && "bg-zinc-200 dark:bg-zinc-700"
          )}
        >
          <Grid className="h-3.5 w-3.5" />
        </Button>

        <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

        {/* Undo / Redo / Delete Selected / Clear All / Export */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => canvasRef.current?.undo()}
            title="Undo (Ctrl+Z)"
            className="h-7 w-7 text-zinc-700 dark:text-zinc-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => canvasRef.current?.redo()}
            title="Redo (Ctrl+Y)"
            className="h-7 w-7 text-zinc-700 dark:text-zinc-300"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </Button>
          {/* Delete selected shape */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => canvasRef.current?.deleteSelected()}
            title="Delete Selected Shape (Del)"
            className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {/* Clear entire board */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => canvasRef.current?.clearCanvas()}
            title="Clear All (erase entire board)"
            className="h-7 w-7 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
          {/* Export */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => canvasRef.current?.exportAsImage()}
            title="Export as PNG"
            className="h-7 w-7 text-zinc-700 dark:text-zinc-300"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1" />

        {/* Save status + Save button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-xs font-medium">
            {saveStatus === "saved" && (
              <>
                <CloudCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline">Saved</span>
              </>
            )}
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                <span className="text-indigo-600 dark:text-indigo-400 hidden sm:inline">Saving…</span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <>
                <CloudUpload className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                <span className="text-amber-600 dark:text-amber-400 hidden sm:inline">Unsaved</span>
              </>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => void saveChanges()}
            className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow px-3 text-xs"
          >
            Save
          </Button>
        </div>
      </header>

      {/* ── Scrollable Canvas Area ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative w-full h-full">
        {/* Full width, vertically scrollable canvas */}
        <div className="w-full" style={{ height: "2000px" }}>
          <WhiteboardCanvas
            ref={canvasRef}
            content={board.content || ""}
            onChange={handleCanvasChange}
            title={title}
            color={color}
            strokeWidth={strokeWidth}
            fillMode={fillMode}
            gridType={gridType}
          />
        </div>
      </div>
    </div>
  );
};

export default WhiteboardPage;
