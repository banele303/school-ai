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
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";

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

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync title when board loads
  useEffect(() => {
    if (board) {
      setTitle(board.title || "Untitled Whiteboard");
      setCanvasContent(board.content || "");
    }
  }, [board]);

  const handleCanvasChange = (newContent: string) => {
    setCanvasContent(newContent);
    setSaveStatus("unsaved");

    // Debounced Auto-Save (auto saves after 4.0 seconds of inactivity)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveChanges(newContent, title);
    }, 4000);
  };

  const saveChanges = async (contentToSave = canvasContent, titleToSave = title) => {
    if (!id) return;
    setSaveStatus("saving");
    try {
      await updateBoard({
        id: boardId,
        title: titleToSave,
        content: contentToSave,
      });
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

  if (!board) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-slate-500">Loading whiteboard canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      {/* Immersive Whiteboard Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/whiteboard")}
            title="Back to board list"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Inline title editing */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleTitleSubmit()}
                className="h-8 w-60 font-semibold text-lg py-0 px-2 text-slate-800 dark:text-slate-200"
                autoFocus
              />
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setIsEditingTitle(true)}
              >
                <h1 className="font-semibold text-lg text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {title}
                </h1>
                <Edit3 className="h-4 w-4 opacity-0 group-hover:opacity-100 text-slate-400 dark:text-slate-500 transition-opacity" />
              </div>
            )}
          </div>
        </div>

        {/* Action Controls & Save Status Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 border-r border-zinc-200 dark:border-zinc-800 pr-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => canvasRef.current?.undo()}
              title="Undo"
              className="h-8 w-8"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => canvasRef.current?.redo()}
              title="Redo"
              className="h-8 w-8"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => canvasRef.current?.deleteSelected()}
              title="Delete Selected Shape"
              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => canvasRef.current?.clearCanvas()}
              title="Clear Whiteboard"
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => canvasRef.current?.exportAsImage()}
              title="Export as PNG"
              className="h-8 w-8"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={() => void saveChanges()}
              className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow px-3 ml-1"
            >
              Save
            </Button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 min-w-[125px]">
            {saveStatus === "saved" && (
              <>
                <CloudCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">All changes saved</span>
              </>
            )}
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                <span className="text-indigo-600 dark:text-indigo-400">Saving...</span>
              </>
            )}
            {saveStatus === "unsaved" && (
              <>
                <CloudUpload className="h-4 w-4 text-amber-500 animate-pulse" />
                <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Canvas Component */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <WhiteboardCanvas
          ref={canvasRef}
          content={board.content || ""}
          onChange={handleCanvasChange}
          title={title}
        />
      </div>
    </div>
  );
};

export default WhiteboardPage;
