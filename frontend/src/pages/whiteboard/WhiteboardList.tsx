import React from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const WhiteboardList: React.FC = () => {
  const whiteboards = useQuery(api.whiteboard.list);
  const createWhiteboard = useMutation(api.whiteboard.create);

  const handleCreate = async () => {
    const id = await createWhiteboard({ name: "Untitled Board", content: "" });
    // navigate to the new board
    window.location.href = `/whiteboard/${id}`;
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Whiteboards</h1>
      <button
        onClick={handleCreate}
        className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
      >
        + New Board
      </button>
      <ul className="space-y-2">
        {whiteboards?.map((wb) => (
          <li key={wb._id}>
            <Link
              to={`/whiteboard/${wb._id}`}
              className="text-blue-600 hover:underline"
            >
              {wb.name || "Untitled"}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WhiteboardList;
