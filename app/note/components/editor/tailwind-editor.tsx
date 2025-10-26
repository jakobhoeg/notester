"use client";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
} from "novel";
import { useState, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./extensions";
import { Separator } from "@/components/ui/separator";
import { slashCommand, suggestionItems } from "./slash-command";
import GenerativeMenuSwitch from "./generative-menu-switch";
import { NodeSelector } from "./node-selector";
import { TableControls } from "./table-controls";

const extensions = [...defaultExtensions, slashCommand];

interface TailwindAdvancedEditorProps {
  content: JSONContent;
  onUpdate: (content: JSONContent) => void;
  onEditorCreate?: (editor: EditorInstance) => void;
}

const TailwindAdvancedEditor = ({ content, onUpdate, onEditorCreate }: TailwindAdvancedEditorProps) => {
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState<number>(0);
  const [openNode, setOpenNode] = useState(false);
  const [openAI, setOpenAI] = useState(false);
  const editorRef = useRef<EditorInstance | null>(null);

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    onUpdate(json);
    setCharsCount(editor.storage.characterCount?.words() || 0);
    setSaveStatus("Saved");
  }, 1000);

  // Effect to update editor content when content prop changes (only for initial load)
  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = editorRef.current.getJSON();
      // Only update if the content is actually different and editor is empty or significantly different
      const isEditorEmpty = !currentContent.content || currentContent.content.length === 0;
      const isContentDifferent = JSON.stringify(currentContent) !== JSON.stringify(content);

      if (isContentDifferent && (isEditorEmpty || content.content?.length !== currentContent.content?.length)) {
        // Validate content before setting it
        if (content.type === 'doc' && Array.isArray(content.content)) {
          editorRef.current.commands.setContent(content);
        }
      }
    }
  }, [content]);

  return (
    <div className="relative w-full overflow-visible">
      <div className="flex absolute right-0 top-0 z-10 mb-5 gap-2">
        <div className="rounded-lg bg-secondary/20 px-2 py-1 text-sm text-muted-foreground">{saveStatus}</div>
        {charsCount > 0 && (
          <div className="rounded-lg bg-secondary/20 px-2 py-1 text-sm text-muted-foreground">
            {charsCount} Words
          </div>
        )}
      </div>
      <EditorRoot>
        <EditorContent
          immediatelyRender={false}
          initialContent={content}
          extensions={extensions}
          className="w-full pt-8 pb-2 overflow-visible"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full overflow-visible",
            },
          }}
          onCreate={({ editor }) => {
            // Set content when editor is created
            try {
              if (content && JSON.stringify(content) !== JSON.stringify(editor.getJSON())) {
                // Validate content before setting it
                if (content.type === 'doc' && Array.isArray(content.content)) {
                  editor.commands.setContent(content);
                } else {
                  console.warn('Invalid content structure, using empty content');
                  editor.commands.setContent({ type: 'doc', content: [] });
                }
              }
            } catch (error) {
              console.error('Error setting editor content:', error);
              editor.commands.setContent({ type: 'doc', content: [] });
            }

            // Store editor reference
            editorRef.current = editor;

            // Call the onEditorCreate callback if provided
            onEditorCreate?.(editor);
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            setSaveStatus("Unsaved");
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex w-full items-center cursor-pointer space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-primary/20 aria-selected:bg-primary/20"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <TableControls />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>
    </div>
  );
};

export default TailwindAdvancedEditor;