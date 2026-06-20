import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import WhiteboardCanvas from "@/components/WhiteboardCanvas";
import WhiteboardToolbar from "@/components/WhiteboardToolbar";

const WhiteboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const board = useQuery(api.whiteboard.get, { id: id! });
  const updateBoard = useMutation(api.whiteboard.update);

  // Local state to hold canvas content as it changes
  const [canvasContent, setCanvasContent] = useState<string>(board?.content || "");

  // When the canvas reports changes, keep them in state
  const handleCanvasChange = (content: string) => {
    setCanvasContent(content);
  };

  const handleSave = () => {
    if (id) {
      void updateBoard({ id, content: canvasContent });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <WhiteboardToolbar onSave={handleSave} boardId={id!} />
      <div className="flex-1 overflow-hidden">
        <WhiteboardCanvas
          content={board?.content || ""}
          onChange={handleCanvasChange}
        />
      </div>
    </div>
  );
};

export default WhiteboardPage;
