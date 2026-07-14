import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Modal = ({
  description,
  open,
  setOpen,
  title,
  children,
}: {
  title: string;
  description: string;
  setOpen: (open: boolean) => void;
  open: boolean;
  children: React.ReactNode;
}) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-2 min-h-0">
          {children}
        </div>
        <DialogFooter className="p-6 pt-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Modal;
