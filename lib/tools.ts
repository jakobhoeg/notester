import { useNoteContentStore } from '@/app/note/stores/note-content-store';
import { tool } from 'ai';
import { FileEditIcon, FilePlus2Icon, FileTextIcon, GlobeIcon, Trash2Icon } from 'lucide-react';
import { JSONContent } from 'novel';
import { z } from "zod";

export const availableTools = [
  { name: 'webSearch', icon: GlobeIcon, description: 'Search the web for current information' },
  { name: 'rewriteNote', icon: FileEditIcon, description: 'Completely rewrite the entire note' },
  { name: 'appendToNote', icon: FilePlus2Icon, description: 'Append text to the end of the note' },
  { name: 'replaceText', icon: FileTextIcon, description: 'Replace specific text in the note' },
  { name: 'deleteText', icon: Trash2Icon, description: 'Delete specific text from the note' },
];

// Create tools factory function that accepts callbacks for note updates
export const createTools = (onContentUpdate?: (content: JSONContent) => void) => ({
  webSearch: tool({
    description: "Search the web for information when you need up-to-date information or facts not in your knowledge base. Use this when the user asks about current events, recent developments, or specific factual information you're unsure about.",
    inputSchema: z.object({
      query: z.string().describe("The search query to find information on the web"),
    }),
    execute: async ({ query }) => {
      try {
        // Call the API route instead of Exa directly
        const response = await fetch('/api/web-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          return errorData.error || 'Failed to search the web';
        }

        const result = await response.json();
        return result;
      } catch (err) {
        return `Failed to search the web: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
    }
  }),
  rewriteNote: tool({
    description: "Completely rewrite the entire note with new content. This replaces all existing content with the new text you provide. Use this when the user wants to start fresh or completely transform their note.",
    inputSchema: z.object({
      text: z.string().describe("The new content for the note (supports markdown formatting)"),
    }),
    execute: async ({ text }) => {
      try {
        const { markdownToJSONContent } = await import('@/lib/utils');
        const updatedContent = markdownToJSONContent(text);

        // Update the note content via callback
        if (onContentUpdate) {
          onContentUpdate(updatedContent);
        }

        // Update the store
        const setCurrentNoteContent = useNoteContentStore.getState().setCurrentNoteContent;
        setCurrentNoteContent(updatedContent);

        return 'Note has been completely rewritten with new content.';
      } catch (err) {
        return `Failed to rewrite note: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
    }
  }),
  appendToNote: tool({
    description: "Append text to the end of the note. The new content will be added after the existing content with appropriate spacing. Use this when the user wants to add information to the end of their note.",
    inputSchema: z.object({
      text: z.string().describe("The text to append to the note (supports markdown formatting)"),
    }),
    execute: async ({ text }) => {
      try {

        const { appendTextToContent } = await import('@/lib/utils');
        const currentContent = useNoteContentStore.getState().currentNoteContent;

        const updatedContent = appendTextToContent(currentContent, text);

        // Update the note content via callback
        if (onContentUpdate) {
          onContentUpdate(updatedContent);
        }

        // Update the store
        const setCurrentNoteContent = useNoteContentStore.getState().setCurrentNoteContent;
        setCurrentNoteContent(updatedContent);

        return 'Text has been appended to the end of the note.';
      } catch (err) {
        return `Failed to append to note: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
    }
  }),
  replaceText: tool({
    description: "Replace specific text in the note. You can replace just the first occurrence or all occurrences of the text. Use this when the user wants to find and replace specific content.",
    inputSchema: z.object({
      oldText: z.string().describe("The text to find and replace"),
      newText: z.string().describe("The replacement text"),
      replaceAll: z.boolean().optional().describe("Whether to replace all occurrences (true) or just the first one (false). Defaults to false."),
    }),
    execute: async ({ oldText, newText, replaceAll = false }) => {
      try {

        const { replaceTextInContent } = await import('@/lib/utils');
        const currentContent = useNoteContentStore.getState().currentNoteContent;

        const updatedContent = replaceTextInContent(
          currentContent,
          oldText,
          newText,
          replaceAll
        );

        // Update the note content via callback
        if (onContentUpdate) {
          onContentUpdate(updatedContent);
        }

        // Update the store
        const setCurrentNoteContent = useNoteContentStore.getState().setCurrentNoteContent;
        setCurrentNoteContent(updatedContent);

        const message = replaceAll
          ? `All occurrences of "${oldText}" have been replaced with "${newText}".`
          : `First occurrence of "${oldText}" has been replaced with "${newText}".`;

        return message;
      } catch (err) {
        console.error('[replaceText] Error:', err);
        return `Failed to replace text: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
    }
  }),
  deleteText: tool({
    description: "Delete specific text from the note. You can delete just the first occurrence or all occurrences of the text. Use this when the user wants to remove specific content from their note.",
    inputSchema: z.object({
      text: z.string().describe("The text to delete from the note"),
      deleteAll: z.boolean().optional().describe("Whether to delete all occurrences (true) or just the first one (false). Defaults to false."),
    }),
    execute: async ({ text, deleteAll = false }) => {
      try {

        const { deleteTextFromContent } = await import('@/lib/utils');
        const currentContent = useNoteContentStore.getState().currentNoteContent;
        console.log('[deleteText] Current content:', currentContent);

        const updatedContent = deleteTextFromContent(
          currentContent,
          text,
          deleteAll
        );

        // Update the note content via callback
        if (onContentUpdate) {
          onContentUpdate(updatedContent);
        }

        // Update the store
        const setCurrentNoteContent = useNoteContentStore.getState().setCurrentNoteContent;
        setCurrentNoteContent(updatedContent);

        const message = deleteAll
          ? `All occurrences of "${text}" have been deleted.`
          : `First occurrence of "${text}" has been deleted.`;

        return message;
      } catch (err) {
        console.error('[deleteText] Error:', err);
        return `Failed to delete text: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }
    }
  }),
});
