"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAudioRecording } from "@/app/hooks/useAudioRecording";
import { useNotes } from "@/app/hooks/useNotes";
import { useTranscription } from "@/app/hooks/useTranscription";
import { AudioWaveform } from "./ui/audio-wave";
import { Mic2, Pause, StopCircle, X } from "lucide-react";
import { Loader } from "./ai-elements/loader";

interface RecordingModalProps {
  onClose: () => void;
  title?: string;
}

export function RecordingModal({ onClose }: RecordingModalProps) {
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
  const { addNote } = useNotes();
  const { transcribeAudio } = useTranscription();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
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
      const result = await transcribeAudio(audioBlob, {
        onProgress: setProcessingStatus,
        generateTitle: true,
      });

      if (result && result.title && result.transcription) {
        console.log(result.usage);

        toast.promise(
          async () => {
            const newNote = await addNote({
              title: result.title!,
              content: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: result.transcription
                      }
                    ]
                  }
                ]
              }
            });
            router.push(`/note/${newNote.id}`);
          },
          {
            loading: "Saving note...",
            success: "Note saved!",
            error: "Failed to save note.",
          }
        );
      } else {
        toast.error("Title or transcription is empty. Cannot save note.");
      }
    } catch (err) {
      console.error(err);
      // Error handling is already done in the transcription hook
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  useEffect(() => {
    if (pendingSave && audioBlob) {
      setPendingSave(false);
      handleSaveRecording();
    }
  }, [pendingSave, audioBlob]);

  // Handle auto-save when recording stops and audioBlob becomes available
  useEffect(() => {
    if (shouldSaveOnStop && audioBlob && !recording) {
      setShouldSaveOnStop(false);
      handleSaveRecording();
    }
  }, [shouldSaveOnStop, audioBlob, recording]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-[392px] !p-0 rounded-tl-xl rounded-tr-xloverflow-hidden gap-0"
      >
        <DialogHeader className="p-0">
          <DialogTitle className="sr-only">Recording Modal</DialogTitle>
        </DialogHeader>

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
            <p className="text-gray-500 flex items-center">
              <Loader className="size-4 mr-1" />
              {processingStatus}
              <span className="animate-pulse">...</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {!recording ? (
              <div className="p-4">
                <h2 className="text-lg font-semibold">Start a new recording</h2>
              </div>
            ) : (
              <div className="flex flex-row gap-8 mt-8">
                <Button
                  variant='destructive'
                  className="size-10 rounded-xl"
                  onClick={resetRecording}
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
                    <Mic2 className="size-4" />
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
            )}

            <Button
              className={cn(
                "w-2/3 h-12 rounded-xl flex flex-row gap-3 items-center justify-center mb-5"
              )}
              onClick={() => {
                if (recording) {
                  stopRecording();
                  setShouldSaveOnStop(true);
                } else {
                  startRecording();
                }
              }}
              disabled={isProcessing}
            >
              {recording ? (
                <>
                  <StopCircle className="size-5" />
                  <p>Stop Recording</p>
                </>
              ) : (
                <Mic2 className="size-5" />
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
