import React from "react";
import { Link, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Presentation, Calendar } from "lucide-react";
import { toast } from "sonner";

const WhiteboardList: React.FC = () => {
  const navigate = useNavigate();
  const whiteboards = useQuery(api.whiteboard.list);
  const createWhiteboard = useMutation(api.whiteboard.create);
  const deleteWhiteboard = useMutation(api.whiteboard.remove);

  const handleCreate = async () => {
    try {
      const id = await createWhiteboard({ title: "Untitled Board", content: "" });
      toast.success("Whiteboard created!");
      navigate(`/whiteboard/${id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create whiteboard");
    }
  };

  const handleDelete = async (id: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this whiteboard?")) return;
    try {
      await deleteWhiteboard({ id });
      toast.success("Whiteboard deleted successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete whiteboard");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Interactive Whiteboards</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Draw, explain, and write math equations dynamically.
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-[#dc2626] text-black hover:bg-[#b91c1c]">
          <Plus className="mr-2 h-4 w-4" /> New Board
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {whiteboards === undefined ? (
          <p className="text-muted-foreground text-sm">Loading boards...</p>
        ) : whiteboards.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-muted/20 border-2 border-dashed border-border rounded-xl">
            <Presentation className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg text-foreground">No whiteboards yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create a whiteboard to get started drawing or writing formulas.</p>
            <Button onClick={handleCreate} variant="outline">Create your first board</Button>
          </div>
        ) : (
          whiteboards.map((wb) => (
            <Link key={wb._id} to={`/whiteboard/${wb._id}`} className="block group">
              <Card className="h-full border border-border group-hover:border-primary/30 transition-all hover:shadow-lg relative overflow-hidden flex flex-col justify-between">
                <CardHeader className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Presentation className="h-5 w-5" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(wb._id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-lg mt-4 group-hover:text-primary transition-colors truncate">
                    {wb.title || "Untitled Board"}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs mt-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Updated {wb.updatedAt ? new Date(wb.updatedAt).toLocaleDateString() : "recently"}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default WhiteboardList;
