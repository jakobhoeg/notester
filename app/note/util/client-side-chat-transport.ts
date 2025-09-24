import {
  ChatTransport,
  UIMessageChunk,
  streamText,
  convertToModelMessages,
  ChatRequestOptions,
  createUIMessageStream,
} from "ai";
import { builtInAI, BuiltInAIUIMessage } from "@built-in-ai/core";
import { JSONContent } from "novel";
import { useNoteContentStore } from "../stores/note-content-store";

/**
 * Client-side chat transport AI SDK implementation that handles AI model communication
 * with in-browser AI capabilities.
 *
 * @implements {ChatTransport<BuiltInAIUIMessage>}
 */
export class ClientSideChatTransport
  implements ChatTransport<BuiltInAIUIMessage> {
  constructor() {
    // No need for constructor parameters anymore
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