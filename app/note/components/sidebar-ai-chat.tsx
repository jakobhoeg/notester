import React, { useState, useEffect } from 'react'
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/providers/sidebar'
import { Copy, PanelRight, PlusIcon, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChat } from "@ai-sdk/react";
import { BuiltInAIUIMessage } from '@built-in-ai/core';
import { ClientSideChatTransport } from '../util/client-side-chat-transport';
import { useNoteContentStore } from '../stores/note-content-store';
import { toast } from 'sonner';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageAvatar, MessageContent } from '@/components/ai-elements/message';
import { Loader } from '@/components/ai-elements/loader';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { Response } from '@/components/ai-elements/response';
import { Button } from '@/components/ui/button';
import { PromptInput, PromptInputButton, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, PromptInputTools } from '@/components/ai-elements/prompt-input';
import { Kbd, KbdKey } from '@/components/ui/shadcn-io/kbd';
import { JSONContent } from 'novel';

interface SidebarAIChatProps {
  noteContent: JSONContent,
}

export default function SidebarAiChat({ noteContent }: SidebarAIChatProps) {
  const [input, setInput] = useState("");
  const setCurrentNoteContent = useNoteContentStore((state) => state.setCurrentNoteContent);

  // Update the store whenever noteContent prop changes
  useEffect(() => {
    setCurrentNoteContent(noteContent);
  }, [noteContent, setCurrentNoteContent]);

  const { error, status, sendMessage, messages, regenerate, stop } =
    useChat<BuiltInAIUIMessage>({
      transport: new ClientSideChatTransport(),
      onError(error) {
        toast.error(error.message);
      },
      experimental_throttle: 50,
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim()) && status === "ready") {
      sendMessage({
        text: input,
      });
      setInput("");
    }
  };

  const copyMessageToClipboard = (message: any) => {
    const textContent = message.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join("\n");

    navigator.clipboard.writeText(textContent);
  };

  return (
    <SidebarProvider className="h-full max-h-[calc(100vh)] overflow-hidden">
      <Sidebar
        collapsible="icon"
        side="right"
        className="relative h-full max-h-[calc(100vh)] border-border border-l bg-background text-foreground transition-all duration-300 ease-in-out overflow-hidden"
        variant="sidebar"
      >
        <SidebarHeader className="flex flex-row items-center justify-between border-b bg-background px-4 group-data-[collapsible=icon]:px-2">
          <SidebarMenuButton
            tooltip="Toggle AI Assistant"
            className="-mr-2 h-8 w-8"
            asChild
          >
            <SidebarTrigger>
              <PanelRight className="h-4 w-4" />
            </SidebarTrigger>
          </SidebarMenuButton>
        </SidebarHeader>
        <SidebarContent className="group-data-[collapsible=icon]:p-0 flex flex-col h-full">
          <SidebarGroup
            className={cn(
              "flex-1 p-2 overflow-hidden",
              "group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:p-1",
            )}
          >
            <Conversation className="flex-1">
              <ConversationContent>
                {messages.map((m, index) => (
                  <Message
                    from={m.role === "system" ? "assistant" : m.role}
                    key={m.id}
                  >
                    <MessageContent>
                      {/* Handle download progress parts first */}
                      {m.parts
                        .filter((part) => part.type === "data-modelDownloadProgress")
                        .map((part, partIndex) => {
                          // Only show if message is not empty (hiding completed/cleared progress)
                          if (!part.data.message) return null;

                          // Don't show the entire div when actively streaming
                          if (status === "ready") return null;

                          return (
                            <div key={partIndex}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="flex items-center gap-1">
                                  <Loader className="size-4 " />
                                  {part.data.message}
                                </span>
                              </div>
                              {part.data.status === "downloading" &&
                                part.data.progress !== undefined && (
                                  <Progress value={part.data.progress} />
                                )}
                            </div>
                          );
                        })}

                      {/* Handle file parts */}
                      {m.parts
                        .filter((part) => part.type === "file")
                        .map((part, partIndex) => {
                          if (part.mediaType?.startsWith("image/")) {
                            return (
                              <div key={partIndex} className="mt-2">
                                <Image
                                  src={part.url}
                                  width={300}
                                  height={300}
                                  alt={part.filename || "Uploaded image"}
                                  className="object-contain max-w-sm rounded-lg border"
                                />
                              </div>
                            );
                          }

                          // TODO: Handle other file types
                          return null;
                        })}

                      {/* Handle text parts */}
                      {m.parts
                        .filter((part) => part.type === "text")
                        .map((part, partIndex) => (
                          <Response key={partIndex}>{part.text}</Response>
                        ))}

                      {/* Action buttons for assistant messages */}
                      {(m.role === "assistant" || m.role === "system") &&
                        index === messages.length - 1 &&
                        status === "ready" && (
                          <div className="flex gap-1 mt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => copyMessageToClipboard(m)}
                              className="text-muted-foreground hover:text-foreground h-4 w-4 [&_svg]:size-3.5"
                            >
                              <Copy />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => regenerate()}
                              className="text-muted-foreground hover:text-foreground h-4 w-4 [&_svg]:size-3.5"
                            >
                              <RefreshCcw />
                            </Button>
                          </div>
                        )}
                    </MessageContent>
                  </Message>
                ))}

                {/* Loading state */}
                {status === "submitted" && (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="flex gap-1 items-center text-gray-500">
                        <Loader className="size-4" />
                        Thinking...
                      </div>
                    </MessageContent>
                  </Message>
                )}

                {/* Error state */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-red-800 mb-2">An error occurred.</div>
                    <Button
                      type="button"
                      variant="outline"
                      size='sm'
                      onClick={() => regenerate()}
                      disabled={status === "streaming" || status === "submitted"}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </ConversationContent>
              <ConversationScrollButton className='group-data-[collapsible=icon]:hidden' />
            </Conversation>
          </SidebarGroup>

          <SidebarGroup className="border-t bg-background p-2 group-data-[collapsible=icon]:hidden flex-shrink-0">
            <PromptInput
              onSubmit={(message, event) => handleSubmit(event)}
              className="dark:bg-card rounded-lg"
            >
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Interact with your note..."
                // minHeight={48}
                // maxHeight={164}
                className=" dark:bg-card min-h-12"
              />
              <PromptInputToolbar>
                {/* <PromptInputTools>
                </PromptInputTools> */}
                <div className="flex items-center gap-2 w-full justify-end">
                  <PromptInputSubmit
                    disabled={
                      status === "ready" &&
                      !input.trim()
                    }
                    status={status}
                    onClick={
                      status === "submitted" || status === "streaming"
                        ? stop
                        : undefined
                    }
                    type={
                      status === "submitted" || status === "streaming"
                        ? "button"
                        : "submit"
                    }
                  />
                </div>
              </PromptInputToolbar>
            </PromptInput>
          </SidebarGroup>
        </SidebarContent>

      </Sidebar>
    </SidebarProvider>
  )
}
