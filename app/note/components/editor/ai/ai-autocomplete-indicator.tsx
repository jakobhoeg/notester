"use client";

import { useEffect, useState } from "react";
import { useEditor } from "novel";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Sparkles, SparklesIcon, Zap, ZapOff } from "lucide-react";
import { AutocompletePluginKey } from "./ai-autocomplete-extension";

interface AutocompleteIndicatorProps {
  className?: string;
}

export function AutocompleteIndicator({ className }: AutocompleteIndicatorProps) {
  const { editor } = useEditor();
  const [isEnabled, setIsEnabled] = useState(true);
  const [hasSuggestion, setHasSuggestion] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      const pluginState = AutocompletePluginKey.getState(editor.state);
      if (pluginState) {
        setHasSuggestion(!!pluginState.suggestion);
        setIsStreaming(!!pluginState.suggestion?.isStreaming);
      }

      // Get the extension to check if it's enabled
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'aiAutocomplete');
      if (extension) {
        setIsEnabled(extension.options.enabled);
      }
    };

    // Initial state
    updateState();

    // Listen to editor updates
    const handleUpdate = () => {
      updateState();
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', updateState);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', updateState);
    };
  }, [editor]);

  const toggleAutocomplete = () => {
    if (editor) {
      editor.commands.toggleAutocomplete();

      // Update local state by getting the new value from the extension
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'aiAutocomplete');
      if (extension) {
        setIsEnabled(extension.options.enabled);
      }

      // Clear any existing suggestion when disabling
      if (isEnabled) {
        editor.commands.clearAutocompleteSuggestion();
      }
    }
  };

  const clearSuggestion = () => {
    if (editor) {
      editor.commands.clearAutocompleteSuggestion();
    }
  };

  if (!editor) return null;

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Autocomplete Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAutocomplete}
              className={`h-8 w-8 p-0 ${isEnabled
                ? 'text-primary hover:text-primary/80'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              {isEnabled ? (
                <Zap className="h-4 w-4" />
              ) : (
                <ZapOff className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isEnabled ? 'Disable' : 'Enable'} AI Autocomplete</p>
            <p className="text-xs text-muted-foreground">
              {isEnabled ? 'Tab/→ to accept, Esc to dismiss' : 'Click to enable suggestions'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Status Indicator */}
        {isEnabled && (
          <>
            {isStreaming && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                <Sparkles className="h-3 w-3 mr-1" />
                Generating...
              </Badge>
            )}

            {hasSuggestion && !isStreaming && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="default"
                    className="text-xs cursor-pointer hover:bg-primary/80"
                    onClick={clearSuggestion}
                  >
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    Suggestion
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>AI suggestion available</p>
                  <p className="text-xs text-muted-foreground">
                    Tab/→ to accept, Esc to dismiss, click to clear
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

export default AutocompleteIndicator;
