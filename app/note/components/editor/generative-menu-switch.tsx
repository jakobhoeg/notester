import { EditorBubble, removeAIHighlight, useEditor } from "novel";
import { Fragment, type ReactNode, useEffect } from "react";
import { AISelector } from "./ai/ai-selector";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const GenerativeMenuSwitch = ({ children, open, onOpenChange }: GenerativeMenuSwitchProps) => {
  const { editor } = useEditor();

  useEffect(() => {
    if (!open) {
      // Clean up AI highlights when closing
      removeAIHighlight(editor!);
      // Also clean up any remaining highlights
      editor!.chain().unsetHighlight().run();
    }
  }, [open]);
  return (
    <EditorBubble
      tippyOptions={{
        placement: open ? "bottom-start" : "top",
        onHidden: () => {
          onOpenChange(false);
          // Double cleanup to ensure highlights are always removed
          removeAIHighlight(editor!);
          editor!.chain().unsetHighlight().run();
        },
      }}
      className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl"
    >
      {open && <AISelector open={open} onOpenChange={onOpenChange} />}
      {!open && (
        <Fragment>
          <Button
            className="gap-1 rounded-none text-primary"
            variant="ghost"
            onClick={() => onOpenChange(true)}
            size="sm"
          >
            <Sparkles className="h-5 w-5" />
            Ask AI
          </Button>
          {children}
        </Fragment>
      )}
    </EditorBubble>
  );
};

export default GenerativeMenuSwitch;
