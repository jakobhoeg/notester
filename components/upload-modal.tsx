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
import { Upload } from "lucide-react";

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
          <>
            <div className="p-4 text-center">
              <h2 className="text-lg font-semibold">Upload a new recording</h2>
            </div>
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
              {({ getRootProps, getInputProps }) => (
                <div
                  {...getRootProps()}
                  className="flex flex-col justify-start items-start relative overflow-hidden cursor-pointer"
                >
                  <input {...getInputProps()} />
                  <div className="relativ p-5 w-full">
                    <div className="relative overflow-hidden rounded-xl border-2 border-dashed min-h-[86px] flex justify-center items-center flex-col gap-1">
                      <div className="flex justify-center items-center relative gap-2.5 px-3 py-2 rounded-lg ">
                        <Upload className="size-4 " />
                        <p className="text-base font-semibold text-left">
                          Upload a recording
                        </p>
                      </div>
                      <p className="text-xs text-center text-[#4a5565]">
                        Or drag‑and‑drop here
                      </p>
                      {isDragActive && (
                        <div className="absolute inset-0 bg-opacity-50 flex items-center justify-center z-10 pointer-events-none">
                          <span className="text-blue-300 font-semibold">
                            Drop audio file here
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Dropzone>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
