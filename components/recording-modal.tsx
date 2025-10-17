"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAudioRecording } from "@/app/hooks/useAudioRecording";
import { useNotes } from "@/app/hooks/useNotes";
import { AudioWaveform } from "./ui/audio-wave";
import { Mic2, Pause, Play, StopCircle, X } from "lucide-react";

interface RecordingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}

export function RecordingModal({ open, onOpenChange, children }: RecordingModalProps) {
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
  const { addNote, addGenerationData } = useNotes();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [shouldSaveOnStop, setShouldSaveOnStop] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSaveRecording = async () => {
    if (!audioBlob) {
      toast.error("No audio to save. Please record something first.");
      return;
    }

    setIsProcessing(true);
    try {
      // Convert audio blob to base64 for embedding in note
      const reader = new FileReader();
      const audioBase64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });

      // Create note with audio and placeholder text
      const newNote = await addNote({
        title: "Voice Recording",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `[Audio: ${audioBlob.type}]`
                }
              ]
            },
            {
              type: "paragraph",
              content: []
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Transcribing audio..."
                }
              ]
            }
          ]
        },
        isGenerating: true
      });

      // Store audio data in PGlite
      await addGenerationData(newNote.id, 'audio', {
        audioBase64,
        fileName: `recording.${audioBlob.type.split('/')[1]}`
      });

      // Navigate immediately without URL params
      router.push(`/note/${newNote.id}`);
      toast.success("Note created! Transcription will stream in shortly...");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create note.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-start recording when modal opens
  useEffect(() => {
    if (open && !recording && !audioBlob) {
      startRecording();
    }
  }, [open]);

  // Stop recording when modal closes
  useEffect(() => {
    if (!open && recording) {
      stopRecording();
    }
  }, [open, recording]);

  // Handle auto-save when recording stops and audioBlob becomes available
  useEffect(() => {
    if (shouldSaveOnStop && audioBlob && !recording) {
      setShouldSaveOnStop(false);
      handleSaveRecording();
    }
  }, [shouldSaveOnStop, audioBlob, recording]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {children}
      <PopoverContent
        className="w-[392px] p-0 rounded-xl overflow-hidden"
        align="center"
        sideOffset={8}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-4 min-h-[200px]">
            <p className="text-muted-foreground flex items-center text-sm">
              <div className="size-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating note...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-row gap-8 mt-8">
              <Button
                variant='destructive'
                className="size-10 rounded-xl"
                onClick={() => {
                  resetRecording();
                  startRecording();
                }}
                type="button"
                aria-label="Reset recording"
              >
                <X className="size-4" />
              </Button>

              <div className="flex flex-col gap-1">
                <p className="text-base text-center">
                  {formatTime(duration)}
                </p>
                <AudioWaveform analyserNode={analyserNode} isPaused={paused} />
              </div>

              {paused ? (
                <Button
                  className="size-10 p-2.5 rounded-xl cursor-pointer"
                  onClick={resumeRecording}
                  variant="secondary"
                  type="button"
                  aria-label="Resume recording"
                >
                  <Play className="size-4" />
                </Button>
              ) : (
                <Button
                  className="size-10 p-2.5 rounded-xl cursor-pointer"
                  variant="secondary"
                  onClick={pauseRecording}
                  type="button"
                  aria-label="Pause recording"
                >
                  <Pause className="size-4" />
                </Button>
              )}
            </div>

            <Button
              className={cn(
                "w-1/2 h-12 rounded-xl flex flex-row gap-3 items-center justify-center mb-5 mt-4"
              )}
              onClick={() => {
                stopRecording();
                setShouldSaveOnStop(true);
              }}
              disabled={isProcessing}
            >
              <StopCircle className="size-5" />
              <p>Create note</p>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
