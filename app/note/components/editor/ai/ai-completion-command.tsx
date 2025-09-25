import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { useEditor, removeAIHighlight } from "novel";
import { Check, TextQuote, TrashIcon } from "lucide-react";

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

            editor!
              .chain()
              .focus()
              .insertContentAt(
                {
                  from: selection.from,
                  to: selection.to,
                },
                completion,
              )
              .run();

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
            const docSize = state.doc.content.size;

            const insertPos = Math.min(selection.to + 1, docSize);

            editor!
              .chain()
              .focus()
              .insertContentAt(insertPos, completion)
              .run();

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
