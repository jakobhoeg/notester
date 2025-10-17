import {
  ChatTransport,
  UIMessageChunk,
  streamText,
  convertToModelMessages,
  ChatRequestOptions,
  createUIMessageStream,
  tool,
} from "ai";
import { builtInAI, BuiltInAIUIMessage } from "@built-in-ai/core";
import { JSONContent } from "novel";
import { useNoteContentStore } from "../stores/note-content-store";
import { z } from "zod";
import { FileEditIcon, FilePlusIcon, FileTextIcon, GlobeIcon, Trash2Icon } from "lucide-react";

export const availableTools = [
  { name: 'webSearch', icon: GlobeIcon, description: 'Search the web for current information' },
  { name: 'rewriteNote', icon: FileEditIcon, description: 'Completely rewrite the entire note' },
  { name: 'appendToNote', icon: FilePlusIcon, description: 'Append text to the end of the note' },
  { name: 'replaceText', icon: FileTextIcon, description: 'Replace specific text in the note' },
  { name: 'deleteText', icon: Trash2Icon, description: 'Delete specific text from the note' },
];

/**
 * Client-side chat transport AI SDK implementation that handles AI model communication
 * with in-browser AI capabilities.
 *
 * @implements {ChatTransport<BuiltInAIUIMessage>}
 */
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
        console.log('[rewriteNote] Tool called with input:', { text });

        const { markdownToJSONContent } = await import('@/lib/utils');
        const updatedContent = markdownToJSONContent(text);

        console.log('[rewriteNote] Generated updated content:', updatedContent);

        // Update the note content via callback
        if (onContentUpdate) {
          console.log('[rewriteNote] Calling onContentUpdate callback');
          onContentUpdate(updatedContent);
        }

        // Update the store
        const setCurrentNoteContent = useNoteContentStore.getState().setCurrentNoteContent;
        setCurrentNoteContent(updatedContent);
        console.log('[rewriteNote] Store updated successfully');

        return 'Note has been completely rewritten with new content.';
      } catch (err) {
        console.error('[rewriteNote] Error:', err);
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
        console.log('[appendToNote] Tool called with input:', { text });

        const { appendTextToContent } = await import('@/lib/utils');
        const currentContent = useNoteContentStore.getState().currentNoteContent;
        console.log('[appendToNote] Current content:', currentContent);

        const updatedContent = appendTextToContent(currentContent, text);
        console.log('[appendToNote] Generated updated content:', updatedContent);

        // Update the note content via callback
        if (onContentUpdate) {
          console.log('[appendToNote] Calling onContentUpdate callback');
          onContentUpdate(updatedContent);
        }

        // Update the store
        const setCurrentNoteContent = useNoteContentStore.getState().setCurrentNoteContent;
        setCurrentNoteContent(updatedContent);
        console.log('[appendToNote] Store updated successfully');

        return 'Text has been appended to the end of the note.';
      } catch (err) {
        console.error('[appendToNote] Error:', err);
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
        console.log('[replaceText] Tool called with input:', { oldText, newText, replaceAll });

        const { replaceTextInContent } = await import('@/lib/utils');
        const currentContent = useNoteContentStore.getState().currentNoteContent;
        console.log('[replaceText] Current content:', currentContent);

        const updatedContent = replaceTextInContent(
          currentContent,
          oldText,
          newText,
          replaceAll
        );
        console.log('[replaceText] Generated updated content:', updatedContent);

        // Update the note content via callback
        if (onContentUpdate) {
          console.log('[replaceText] Calling onContentUpdate callback');
          onContentUpdate(updatedContent);
        }

        // Update the store
        const setCurrentNoteContent = useNoteContentStore.getState().setCurrentNoteContent;
        setCurrentNoteContent(updatedContent);
        console.log('[replaceText] Store updated successfully');

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
        console.log('[deleteText] Tool called with input:', { text, deleteAll });

        const { deleteTextFromContent } = await import('@/lib/utils');
        const currentContent = useNoteContentStore.getState().currentNoteContent;
        console.log('[deleteText] Current content:', currentContent);

        const updatedContent = deleteTextFromContent(
          currentContent,
          text,
          deleteAll
        );
        console.log('[deleteText] Generated updated content:', updatedContent);

        // Update the note content via callback
        if (onContentUpdate) {
          console.log('[deleteText] Calling onContentUpdate callback');
          onContentUpdate(updatedContent);
        }

        // Update the store
        const setCurrentNoteContent = useNoteContentStore.getState().setCurrentNoteContent;
        setCurrentNoteContent(updatedContent);
        console.log('[deleteText] Store updated successfully');

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

export class ClientSideChatTransport
  implements ChatTransport<BuiltInAIUIMessage> {
  private tools: ReturnType<typeof createTools>;

  constructor(onContentUpdate?: (content: JSONContent) => void) {
    // Create tools with the content update callback
    this.tools = createTools(onContentUpdate);
  }

  // Helper function to extract text from JSONContent
  private extractTextFromContent(content: JSONContent): string {
    if (!content.content || content.content.length === 0) return "";

    const extractText = (node: JSONContent): string => {
      if (node.text) return node.text;
      if (node.content) {
        return node.content.map(extractText).join("");
      }
      return "";
    };

    return content.content.map(extractText).join("\n");
  }

  // Create system prompt with note content
  private createSystemPrompt(): string {
    const currentNoteContent = useNoteContentStore.getState().currentNoteContent;
    const noteText = this.extractTextFromContent(currentNoteContent);
    return `You are an AI assistant helping the user with their note. Here is the current content of their note:

${noteText}

Please assist the user with questions about this note, help them understand the content, suggest improvements, or help with any related tasks. You can reference specific parts of the note in your responses.`;
  }
  async sendMessages(
    options: {
      chatId: string;
      messages: BuiltInAIUIMessage[];
      abortSignal: AbortSignal | undefined;
    } & {
      trigger: "submit-message" | "submit-tool-result" | "regenerate-message";
      messageId: string | undefined;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const { chatId, messages, abortSignal, trigger, messageId, ...rest } =
      options;

    const prompt = convertToModelMessages(messages);
    const systemPrompt = this.createSystemPrompt();
    const model = builtInAI();

    // Check if model is already available to skip progress tracking
    const availability = await model.availability();
    if (availability === "available") {
      const result = streamText({
        model,
        messages: prompt,
        system: systemPrompt,
        abortSignal: abortSignal,
        tools: this.tools,
      });
      return result.toUIMessageStream();
    }

    // Handle model download with progress tracking
    return createUIMessageStream<BuiltInAIUIMessage>({
      execute: async ({ writer }) => {
        try {
          let downloadProgressId: string | undefined;

          // Download/prepare model with progress monitoring
          await model.createSessionWithProgress((progress: number) => {
            const percent = Math.round(progress * 100);

            if (progress >= 1) {
              // Download complete
              if (downloadProgressId) {
                writer.write({
                  type: "data-modelDownloadProgress",
                  id: downloadProgressId,
                  data: {
                    status: "complete",
                    progress: 100,
                    message:
                      "Model finished downloading! Getting ready for inference...",
                  },
                });
              }
              return;
            }

            // First progress update
            if (!downloadProgressId) {
              downloadProgressId = `download-${Date.now()}`;
              writer.write({
                type: "data-modelDownloadProgress",
                id: downloadProgressId,
                data: {
                  status: "downloading",
                  progress: percent,
                  message: "Downloading browser AI model...",
                },
                transient: true,
              });
              return;
            }

            // Ongoing progress updates
            writer.write({
              type: "data-modelDownloadProgress",
              id: downloadProgressId,
              data: {
                status: "downloading",
                progress: percent,
                message: `Downloading browser AI model... ${percent}%`,
              },
            });
          });

          // Stream the actual text response
          const result = streamText({
            model,
            messages: prompt,
            system: systemPrompt,
            abortSignal: abortSignal,
            tools: this.tools,
            onChunk(event) {
              // Clear progress message on first text chunk
              if (event.chunk.type === "text-delta" && downloadProgressId) {
                writer.write({
                  type: "data-modelDownloadProgress",
                  id: downloadProgressId,
                  data: { status: "complete", progress: 100, message: "" },
                });
                downloadProgressId = undefined;
              }
            },
          });

          writer.merge(result.toUIMessageStream({ sendStart: false }));
        } catch (error) {
          writer.write({
            type: "data-notification",
            data: {
              message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              level: "error",
            },
            transient: true,
          });
          throw error;
        }
      },
    });
  }

  async reconnectToStream(
    options: {
      chatId: string;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk> | null> {
    // Client-side AI doesn't support stream reconnection
    return null;
  }
}