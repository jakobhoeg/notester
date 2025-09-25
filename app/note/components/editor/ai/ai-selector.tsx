"use client";

import { Command, CommandInput } from "@/components/ui/command";

import { ArrowUp, Sparkles, Languages } from "lucide-react";
import { useEditor } from "novel";
import { addAIHighlight, removeAIHighlight } from "novel";
import { useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import AICompletionCommands from "./ai-completion-command";
import AISelectorCommands from "./ai-selector-commands";
import { streamText } from "ai";
import { builtInAI, doesBrowserSupportBuiltInAI } from "@built-in-ai/core";
import { CONTINUE_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT, FIX_SYSTEM_PROMPT, IMPROVE_SYSTEM_PROMPT, LONGER_SYSTEM_PROMPT, SHORTER_SYSTEM_PROMPT, ZAP_SYSTEM_PROMPT } from "@/app/constants/prompts";
import { Loader } from "@/components/ai-elements/loader";
//TODO: I think it makes more sense to create a custom Tiptap extension for this functionality https://tiptap.dev/docs/editor/ai/introduction

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState("");
  const [completion, setCompletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  const hasCompletion = completion.length > 0;
  const hasTranslation = translatedText.length > 0;

  const handleComplete = async (prompt: string, option: string, command?: string) => {
    if (!doesBrowserSupportBuiltInAI()) {
      toast.error("Your browser does not support built-in AI.");
      return;
    }

    const model = builtInAI();
    const availability = await model.availability();

    if (availability === "unavailable") {
      toast.error("Built-in AI is not available on your device.");
      return;
    }

    if (availability === "downloadable") {
      toast.info("Downloading model...");
      await model.createSessionWithProgress((progress) => {
        toast.loading(`Downloading model... ${Math.round(progress * 100)}%`);
      });
      toast.success("Model downloaded.");
    }

    try {
      setIsLoading(true);
      setCompletion("");
      setTranslatedText(""); // Clear any existing translation

      let systemPrompt = "";
      let userPrompt = "";

      switch (option) {
        case "continue":
          systemPrompt = CONTINUE_SYSTEM_PROMPT;
          userPrompt = prompt;
          break;
        case "improve":
          systemPrompt = IMPROVE_SYSTEM_PROMPT;
          userPrompt = `The existing text is: ${prompt}`;
          break;
        case "shorter":
          systemPrompt = SHORTER_SYSTEM_PROMPT;
          userPrompt = `The existing text is: ${prompt}`;
          break;
        case "longer":
          systemPrompt = LONGER_SYSTEM_PROMPT;
          userPrompt = `The existing text is: ${prompt}`;
          break;
        case "fix":
          systemPrompt = FIX_SYSTEM_PROMPT;
          userPrompt = `The existing text is: ${prompt}`;
          break;
        case "zap":
          systemPrompt = ZAP_SYSTEM_PROMPT;
          userPrompt = `For this text: ${prompt}. You have to respect the command: ${command}`;
          break;
        default:
          systemPrompt = DEFAULT_SYSTEM_PROMPT;
          userPrompt = prompt;
      }

      const { textStream } = streamText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
      });

      let fullCompletion = "";
      for await (const chunk of textStream) {
        fullCompletion += chunk;
        setCompletion(fullCompletion);
      }

      // Clean up AI highlights after completion is generated
      removeAIHighlight(editor!);
    } catch (error) {
      console.error("Error generating completion:", error);
      toast.error("Failed to generate completion");
      // Clean up AI highlights on error too
      removeAIHighlight(editor!);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async (text: string, targetLanguage: string) => {
    if (Translator === undefined) {
      toast.error("Your browser does not support the Translation API.");
      return;
    }

    if (LanguageDetector === undefined) {
      toast.error("Your browser does not support the Language Detector API.");
      return;
    }

    try {
      setIsTranslating(true);
      setTranslatedText("");
      setCompletion(""); // Clear any existing completion

      // Detect source language
      const detector = await LanguageDetector.create();
      const detected = await detector.detect(text.trim());
      const sourceLanguage = detected[0]?.detectedLanguage;

      if (!sourceLanguage) {
        toast.error("Could not detect source language.");
        return;
      }

      const availability = await Translator.availability({
        sourceLanguage,
        targetLanguage
      });

      if (availability === 'unavailable') {
        const displaySourceLanguage = new Intl.DisplayNames(['en'], { type: 'language' }).of(sourceLanguage) || sourceLanguage;
        const displayTargetLanguage = new Intl.DisplayNames(['en'], { type: 'language' }).of(targetLanguage) || targetLanguage;
        toast.error(`${displaySourceLanguage} - ${displayTargetLanguage} translation pair is not supported.`);
        return;
      }

      const translator = await Translator.create({
        sourceLanguage,
        targetLanguage
      });

      const stream = translator.translateStreaming(text.trim());
      let fullTranslation = "";

      // translateStreaming returns a ReadableStream<string>
      const reader = stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          fullTranslation += value;
          setTranslatedText(fullTranslation);
        }
      } finally {
        reader.releaseLock();
      }

      // Clean up AI highlights after translation is complete
      removeAIHighlight(editor!);

    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Translation failed. Please try again.");
      // Clean up AI highlights on error too
      removeAIHighlight(editor!);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <Command className="w-[350px]">
      {hasCompletion && (
        <div className="flex max-h-[400px]">
          <ScrollArea>
            <div className="prose p-2 px-4 prose-sm">
              <Markdown>{completion}</Markdown>
            </div>
          </ScrollArea>
        </div>
      )}

      {hasTranslation && (
        <div className="flex max-h-[400px]">
          <ScrollArea>
            <div className="prose p-2 px-4 prose-sm">
              <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                Translation:
                {isTranslating && (
                  <span className="text-xs text-blue-500 flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    streaming...
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap">{translatedText}</div>
            </div>
          </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-muted-foreground">
          <Sparkles className="mr-2 h-4 w-4 shrink-0  " />
          AI is thinking
          <div className="ml-2 mt-1">
            <Loader className="size-4" />
          </div>
        </div>
      )}

      {isTranslating && !hasTranslation && (
        <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-muted-foreground">
          <Languages className="mr-2 h-4 w-4 shrink-0" />
          Starting translation...
          <div className="ml-2 mt-1">
            <Loader className="size-4" />
          </div>
        </div>
      )}

      {isTranslating && hasTranslation && (
        <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-muted-foreground">
          <Languages className="mr-2 h-4 w-4 shrink-0" />
          Streaming translation...
          <div className="ml-2 mt-1">
            <Loader className="size-4" />
          </div>
        </div>
      )}
      {!isLoading && !isTranslating && (
        <>
          <div className="relative">
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
              placeholder={hasCompletion ? "Tell AI what to do next" : "Ask AI to edit or generate..."}
              onFocus={() => addAIHighlight(editor!)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
                  e.preventDefault();
                  if (completion) {
                    handleComplete(completion, "zap", inputValue).then(() => setInputValue(""));
                  } else {
                    const { from, to } = editor!.state.selection;
                    const text = editor!.state.doc.textBetween(from, to);
                    handleComplete(text, "zap", inputValue).then(() => setInputValue(""));
                  }
                }
              }}
            />
            <Button
              size="icon"
              className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
              onClick={() => {
                if (completion) {
                  return handleComplete(completion, "zap", inputValue).then(() => setInputValue(""));
                }

                const { from, to } = editor!.state.selection;
                const text = editor!.state.doc.textBetween(from, to);

                handleComplete(text, "zap", inputValue).then(() => setInputValue(""));
              }}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          {hasCompletion ? (
            <AICompletionCommands
              onDiscard={() => {
                setCompletion("");
                removeAIHighlight(editor!);
                onOpenChange(false);
              }}
              completion={completion}
            />
          ) : hasTranslation ? (
            <AICompletionCommands
              onDiscard={() => {
                setTranslatedText("");
                removeAIHighlight(editor!);
                onOpenChange(false);
              }}
              completion={translatedText}
            />
          ) : (
            <AISelectorCommands
              onSelect={(value, option) => handleComplete(value, option)}
              onTranslate={handleTranslate}
            />
          )}
        </>
      )}
    </Command>
  );
}
