import { Button } from "@/components/ui/button";
import {
  Columns3,
  Rows3,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const TableControls = () => {
  const { editor } = useEditor();
  if (!editor) return null;

  // Only show table controls when inside a table
  if (!editor.isActive("table")) return null;

  const rowActions = [
    { name: "Add row before", command: () => editor.chain().focus().addRowBefore().run() },
    { name: "Add row after", command: () => editor.chain().focus().addRowAfter().run() },
    { name: "Delete row", command: () => editor.chain().focus().deleteRow().run() },
  ];

  const columnActions = [
    { name: "Add column before", command: () => editor.chain().focus().addColumnBefore().run() },
    { name: "Add column after", command: () => editor.chain().focus().addColumnAfter().run() },
    { name: "Delete column", command: () => editor.chain().focus().deleteColumn().run() },
  ];

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-1 rounded-none">
            <Rows3 className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {rowActions.map((action) => (
            <EditorBubbleItem
              key={action.name}
              onSelect={() => action.command()}
              className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-primary/20"
            >
              {action.name}
            </EditorBubbleItem>
          ))}
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="gap-1 rounded-none">
            <Columns3 className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          {columnActions.map((action) => (
            <EditorBubbleItem
              key={action.name}
              onSelect={() => action.command()}
              className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-primary/20"
            >
              {action.name}
            </EditorBubbleItem>
          ))}
        </PopoverContent>
      </Popover>

      <EditorBubbleItem onSelect={() => editor.chain().focus().deleteTable().run()}>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-none"
          title="Delete table"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </EditorBubbleItem>
    </div>
  );
};

