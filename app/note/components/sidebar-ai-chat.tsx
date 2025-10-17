import React, { useState, useEffect } from 'react'
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarMenuButton, SidebarProvider, SidebarTrigger } from '@/components/providers/sidebar'
import { Copy, EraserIcon, PanelRight, PlusIcon, RefreshCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChat } from "@ai-sdk/react";
import { BuiltInAIUIMessage } from '@built-in-ai/core';
import { availableTools, ClientSideChatTransport } from '../util/client-side-chat-transport';
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
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Badge } from '@/components/ui/badge';

interface SidebarAIChatProps {
  noteContent: JSONContent,
  onContentUpdate?: (content: JSONContent) => void,
}

export default function SidebarAiChat({ noteContent, onContentUpdate }: SidebarAIChatProps) {
  const [input, setInput] = useState("");
  const setCurrentNoteContent = useNoteContentStore((state) => state.setCurrentNoteContent);

  // Update the store whenever noteContent prop changes
  useEffect(() => {
    setCurrentNoteContent(noteContent);
  }, [noteContent, setCurrentNoteContent]);

  const { error, status, sendMessage, messages, regenerate, stop, setMessages } =
    useChat<BuiltInAIUIMessage>({
      transport: new ClientSideChatTransport(onContentUpdate),
      onError(error) {
        toast.error(error.message);
      },
      experimental_throttle: 50,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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
    <SidebarProvider
      className="h-full max-h-[calc(100vh)] overflow-hidden"
      style={{
        "--sidebar-width": "24rem",
      } as React.CSSProperties}
    >
      <Sidebar
        collapsible="icon"
        side="right"
        className="relative h-full max-h-[calc(100vh)] border-border border-l bg-background text-foreground transition-all duration-300 ease-in-out overflow-hidden"
        variant="sidebar"
      >
        <SidebarHeader className="flex flex-column justify-between border-b bg-background px-4 group-data-[collapsible=icon]:px-2">
          <div className='flex items-center justify-between'>
            <p className='text-sm font-semibold group-data-[collapsible=icon]:hidden'>Notes AI assistant</p>
            <SidebarMenuButton
              tooltip="Toggle AI Assistant"
              className="-mr-2 size-8"
              asChild
            >
              <SidebarTrigger>
                <PanelRight className="size-4" />
              </SidebarTrigger>
            </SidebarMenuButton>
          </div>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setMessages([])
            }}
            className='text-xs group-data-[collapsible=icon]:hidden'
          >
            Clear chat
          </Button>
        </SidebarHeader>
        <SidebarContent className="group-data-[collapsible=icon]:p-0 flex flex-col h-full">
          <SidebarGroup
            className={cn(
              "flex-1 p-2 overflow-hidden",
              "group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:p-1",
            )}
          >
            <Conversation className="flex-1 group-data-[collapsible=icon]:hidden">
              {messages.length === 0 && (
                <div className='h-full w-2/3 mx-auto text-center flex justify-center items-center'>
                  Ask questions about your note
                </div>
              )}
              <ConversationContent>
                {messages.length > 0 && messages.map((m, index) => (
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

                      {/* Handle tool parts */}
                      {m.parts
                        .filter((part) => part.type.startsWith("tool-"))
                        .map((part, partIndex) => {
                          // Type guard to ensure part is a ToolUIPart
                          if (!('state' in part)) return null;

                          // Map state values to the expected type
                          const toolState = (part.state === 'streaming' || part.state === 'done')
                            ? 'output-available'
                            : part.state || 'input-streaming';

                          return (
                            <Tool key={partIndex}>
                              <ToolHeader type={part.type as any} state={toolState as any} />
                              <ToolContent>
                                {'input' in part && part.input !== undefined && (
                                  <ToolInput input={part.input} />
                                )}
                                {('output' in part || 'errorText' in part) && (
                                  <ToolOutput
                                    output={'output' in part ? part.output : undefined}
                                    errorText={'errorText' in part ? part.errorText : undefined}
                                  />
                                )}
                              </ToolContent>
                            </Tool>
                          );
                        })}

                      {/* Handle text parts */}
                      {m.parts
                        .filter((part) => part.type === "text")
                        .map((part, partIndex) => (
                          <Response key={partIndex}>{part.text}</Response>
                        ))}

                      {/* Show loading indicator if this is the last assistant message and it's streaming with no text yet */}
                      {(m.role === "assistant" || m.role === "system") &&
                        index === messages.length - 1 &&
                        (status === "streaming" || status === "submitted") &&
                        m.parts.filter((part) => part.type === "text").length === 0 && (
                          <div className="flex gap-1 items-center text-muted-foreground mt-2">
                            <Loader className="size-4" />
                            <Shimmer duration={1}>Thinking...</Shimmer>
                          </div>
                        )}

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

                {/* Loading state - only show as separate message if there's no assistant message to attach to */}
                {status === "submitted" && (
                  messages.length === 0 ||
                  (messages[messages.length - 1].role !== "assistant" &&
                    messages[messages.length - 1].role !== "system")
                ) && (
                    <Message from="assistant">
                      <MessageContent>
                        <div className="flex gap-1 items-center text-muted-foreground">
                          <Loader className="size-4" />
                          <span className="text-sm">Thinking...</span>
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
                <PromptInputTools>
                  <HoverCard openDelay={0}>
                    <HoverCardTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <GlobeIcon size={16} />
                        <span>webSearch <Badge variant="outline">+{availableTools.length - 1} tools</Badge></span>
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent align="start" className="w-72">
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold mb-1">Available Tools</h4>
                          <p className="text-xs text-muted-foreground">
                            List of tools available for the AI model
                          </p>
                        </div>
                        <div className="space-y-2">
                          {availableTools.map((tool) => {
                            const Icon = tool.icon;
                            return (
                              <div key={tool.name} className="flex items-start gap-2 text-sm">
                                <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                                <div>
                                  <div className="font-medium">{tool.name}</div>
                                  <div className="text-xs text-muted-foreground">{tool.description}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </PromptInputTools>
                <div className="flex items-center gap-2">
                  <PromptInputSubmit
                    size="icon"
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
