"use client";

import {
  Popover,
  PopoverContent,
} from "@/components/ui/popover";
import Dropzone from "react-dropzone";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useNotes } from "@/app/hooks/useNotes";
import { HeadphonesIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UploadModal({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { addNote } = useNotes();
  const [isDragActive, setIsDragActive] = useState(false);
  const router = useRouter();

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        toast.error("Please select an audio file.");
        return;
      }

      setIsProcessing(true);
      try {
        // Convert audio file to base64 for embedding
        const reader = new FileReader();
        const audioBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        // Create note with audio and placeholder
        const newNote = await addNote({
          title: "Audio Upload",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `[Audio: ${file.name}]`
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
          }
        });

        // Store audio in localStorage temporarily
        localStorage.setItem(`audio_${newNote.id}`, audioBase64);

        // Navigate immediately with transcription params
        const params = new URLSearchParams({
          streamTranscription: 'true'
        });

        router.push(`/note/${newNote.id}?${params.toString()}`);
        toast.success("Note created! Transcription will stream in shortly...");
        onOpenChange(false);
      } catch (err) {
        console.error(err);
        toast.error("Failed to create note.");
      } finally {
        setIsProcessing(false);
      }
    },
    [addNote, router, onOpenChange]
  );

  const maxSizeMB = 25;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {children}
      <PopoverContent
        className="w-[400px] p-4 rounded-xl"
        align="center"
        sideOffset={8}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center gap-4 min-h-52">
            <p className="text-muted-foreground flex items-center text-sm">
              <div className="size-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Creating note...
            </p>
          </div>
        ) : (
          <Dropzone
            multiple={false}
            accept={{
              // MP3 audio
              "audio/mpeg3": [".mp3"],
              "audio/x-mpeg-3": [".mp3"],
              // WAV audio
              "audio/wav": [".wav"],
              "audio/x-wav": [".wav"],
              "audio/wave": [".wav"],
              "audio/x-pn-wav": [".wav"],
              // iPhone voice notes (M4A)
              "audio/mp4": [".m4a"],
              "audio/m4a": [".m4a"],
              "audio/x-m4a": [".m4a"],
            }}
            onDrop={handleDrop}
            onDragEnter={() => setIsDragActive(true)}
            onDragLeave={() => setIsDragActive(false)}
            onDropAccepted={() => setIsDragActive(false)}
            onDropRejected={() => setIsDragActive(false)}
          >
            {({ getRootProps, getInputProps, open }) => (
              <div
                {...getRootProps()}
                data-dragging={isDragActive || undefined}
                className="border-input data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-4 transition-colors has-[input:focus]:ring-[3px]"
              >
                <input
                  {...getInputProps()}
                  className="sr-only"
                  aria-label="Upload audio file"
                  tabIndex={-1}
                />
                <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                  <div
                    className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
                    aria-hidden="true"
                  >
                    <HeadphonesIcon className="size-4 opacity-60" />
                  </div>
                  <p className="mb-1.5 text-sm font-medium">Drop your audio file here</p>
                  <p className="text-muted-foreground text-xs">
                    Up to {maxSizeMB}MB ∙ MP3, WAV, or M4A
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      open();
                    }}
                  >
                    <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
                    Select audio
                  </Button>
                </div>
              </div>
            )}
          </Dropzone>
        )}
      </PopoverContent>
    </Popover>
  );
}
