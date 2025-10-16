import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { useEditor, removeAIHighlight } from "novel";
import { Check, TextQuote, TrashIcon } from "lucide-react";
import { markdownToJSONContent } from "@/lib/utils";

const AICompletionCommands = ({
  completion,
  onDiscard,
}: {
  completion: string;
  onDiscard: () => void;
}) => {
  const { editor } = useEditor();

  return (
    <>
      <CommandGroup>
        <CommandItem
          className="gap-2 px-4"
          value="replace"
          onSelect={() => {
            const selection = editor!.view.state.selection;

            // Convert markdown to JSONContent
            const jsonContent = markdownToJSONContent(completion);
            console.log("JSON Content:", jsonContent);
            console.log("Completion text:", completion);

            // Delete the current selection first, then insert new content
            editor!.chain().focus().deleteRange({ from: selection.from, to: selection.to }).run();

            // Insert the parsed content
            if (jsonContent.content && jsonContent.content.length > 0) {
              editor!.chain().focus().insertContent(jsonContent.content).run();
            }

            // Clean up AI highlights after the operation
            removeAIHighlight(editor!);
          }}
        >
          <Check className="h-4 w-4 text-muted-foreground" />
          Replace selection
        </CommandItem>
        <CommandItem
          className="gap-2 px-4"
          value="insert"
          onSelect={() => {
            const state = editor!.state;
            const selection = state.selection;

            // Convert markdown to JSONContent
            const jsonContent = markdownToJSONContent(completion);

            // Move cursor to end of selection and insert content
            if (jsonContent.content && jsonContent.content.length > 0) {
              editor!.chain().focus().setTextSelection(selection.to).insertContent(jsonContent.content).run();
            }

            // Clean up AI highlights after the operation
            removeAIHighlight(editor!);
          }}
        >
          <TextQuote className="h-4 w-4 text-muted-foreground" />
          Insert below
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />

      <CommandGroup>
        <CommandItem
          onSelect={() => {
            // Clean up AI highlights when discarding
            removeAIHighlight(editor!);
            onDiscard();
          }}
          value="thrash"
          className="gap-2 px-4"
        >
          <TrashIcon className="h-4 w-4 text-muted-foreground" />
          Discard
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AICompletionCommands;
