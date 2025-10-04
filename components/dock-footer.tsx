"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { CalendarIcon, HomeIcon, MailIcon, PencilIcon, WandSparkles, Zap, ZapOff, Mic, StopCircle, Pause, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants, Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Dock, DockIcon } from "./ui/dock"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { RECORDING_TYPES } from "@/lib/utils"
import { Loader } from "./ai-elements/loader"
import { useAudioRecording } from "@/app/hooks/useAudioRecording"
import { useTranscription } from "@/app/hooks/useTranscription"
import { AudioWaveform } from "./ui/audio-wave"
import { toast } from "sonner"

export interface DockFooterProps {
  // Transform dropdown props
  onTransform?: (type: string) => void;
  isStreaming?: boolean;
  // AI autocomplete props
  isAutocompleteEnabled?: boolean;
  onToggleAutocomplete?: () => void;
  // Transcription props
  onTranscriptionComplete?: (transcription: string) => void;
  // Show/hide specific buttons
  showTransformDropdown?: boolean;
  showAutocompleteToggle?: boolean;
  showTranscriptionButton?: boolean;
}

export function DockFooter({
  onTransform,
  isStreaming = false,
  isAutocompleteEnabled = true,
  onToggleAutocomplete,
  onTranscriptionComplete,
  showTransformDropdown = false,
  showAutocompleteToggle = false,
  showTranscriptionButton = false,
}: DockFooterProps) {
  const {
    recording,
    paused,
    audioBlob,
    analyserNode,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  } = useAudioRecording();
  const { transcribeAudio } = useTranscription();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [shouldTranscribeOnStop, setShouldTranscribeOnStop] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTranscribe = async () => {
    if (!audioBlob || !onTranscriptionComplete) {
      toast.error("No audio to transcribe.");
      return;
    }

    setIsProcessing(true);
    try {
      const result = await transcribeAudio(audioBlob, {
        showToasts: true,
      });

      if (result && result.transcription.trim()) {
        onTranscriptionComplete(result.transcription);
        toast.success("Transcription added to note!");
        setIsPopoverOpen(false);
        resetRecording();
      }
    } catch (err) {
      console.error(err);
      // Error handling is already done in the transcription hook
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle auto-transcribe when recording stops and audioBlob becomes available
  useEffect(() => {
    if (shouldTranscribeOnStop && audioBlob && !recording) {
      setShouldTranscribeOnStop(false);
      handleTranscribe();
    }
  }, [shouldTranscribeOnStop, audioBlob, recording]);

  const handleRecordingAction = async () => {
    if (!recording) {
      setIsPopoverOpen(true);
      await startRecording();
    } else {
      stopRecording();
      setShouldTranscribeOnStop(true);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center">
      <TooltipProvider>
        <Dock direction="middle" className="rounded-full">
          {/* AI Autocomplete Toggle */}
          {showAutocompleteToggle && onToggleAutocomplete && (
            <>
              <DockIcon>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onToggleAutocomplete}
                      className={cn(
                        "size-12 rounded-full",
                        isAutocompleteEnabled
                          ? 'text-primary hover:text-primary/80'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {isAutocompleteEnabled ? (
                        <Zap fill="currentColor" className="size-4" />
                      ) : (
                        <ZapOff className="size-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isAutocompleteEnabled ? 'Disable' : 'Enable'} AI Autocomplete</p>
                    <p className="text-xs text-muted">
                      {isAutocompleteEnabled ? 'Tab/→ to accept, Esc to dismiss' : 'Click to enable suggestions'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </DockIcon>
            </>
          )}

          {/* Transform Dropdown */}
          {showTransformDropdown && onTransform && (
            <>
              <DockIcon>
                <Tooltip>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild disabled={isStreaming}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isStreaming}
                          className={cn(
                            "size-12 rounded-full",
                            isStreaming && "opacity-50"
                          )}
                        >
                          {isStreaming ? (
                            <Loader className="size-4" />
                          ) : (
                            <WandSparkles className="size-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="!p-0">
                      {RECORDING_TYPES.map((type) => (
                        <DropdownMenuItem
                          key={type.value}
                          onSelect={() => onTransform(type.value)}
                          className="flex items-center cursor-pointer h-10 border-b min-w-40 max-w-full"
                        >
                          <span>{type.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TooltipContent>
                    <p>{isStreaming ? "Transforming..." : "Quick transform note"}</p>
                  </TooltipContent>
                </Tooltip>
              </DockIcon>
            </>
          )}

          <Separator orientation="vertical" className="h-full" />

          {/* Transcription Button */}
          {showTranscriptionButton && onTranscriptionComplete && (
            <DockIcon>
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <Tooltip>
                  <PopoverTrigger asChild>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRecordingAction}
                        disabled={isProcessing}
                        className={cn(
                          "size-12 rounded-full",
                          recording && "text-red-500 animate-pulse",
                          isProcessing && "opacity-50"
                        )}
                      >
                        {isProcessing ? (
                          <Loader className="size-4" />
                        ) : recording ? (
                          <StopCircle className="size-4" />
                        ) : (
                          <Mic className="size-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                  </PopoverTrigger>
                  <TooltipContent>
                    <p>
                      {isProcessing
                        ? "Processing..."
                        : recording
                          ? "Stop & transcribe"
                          : "Start voice transcription"
                      }
                    </p>
                    <p className="text-xs text-muted">
                      {recording ? "Click to stop and add to note" : "Record audio and append to note"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-4" side="top">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          resetRecording();
                          setIsPopoverOpen(false);
                        }}
                        className="size-8 rounded-full p-0"
                      >
                        <X className="size-3" />
                      </Button>

                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium">
                          {formatTime(duration)}
                        </p>
                        <AudioWaveform analyserNode={analyserNode} isPaused={paused} />
                      </div>

                      {paused ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={resumeRecording}
                          className="size-8 rounded-full p-0"
                        >
                          <Mic className="size-3" />
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={pauseRecording}
                          className="size-8 rounded-full p-0"
                        >
                          <Pause className="size-3" />
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      Recording... Click the stop button in the dock to transcribe and add to your note.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </DockIcon>
          )}

        </Dock>
      </TooltipProvider>
    </div>
  )
}
