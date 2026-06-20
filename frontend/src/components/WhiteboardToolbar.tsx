import React from "react";

/**
 * Simple toolbar for the whiteboard page.
 * Provides a "Save" button that triggers the provided onSave callback
 * with the current canvas content (as a JSON string placeholder).
 */
const WhiteboardToolbar: React.FC<{ onSave: (content: string) => void; boardId: string }> = ({ onSave, boardId }) => {
  const handleSave = () => {
    // In a full implementation, gather canvas data from the canvas component.
    // Here we send a simple placeholder JSON.
    const placeholderContent = JSON.stringify({ boardId, shapes: [] });
    onSave(placeholderContent);
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
      <h2 className="text-lg font-medium">Whiteboard</h2>
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Save
      </button>
    </div>
  );
};

export default WhiteboardToolbar;
