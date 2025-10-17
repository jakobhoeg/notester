"use client"

import { RecordingModal } from "@/components/recording-modal"
import { UploadModal } from "@/components/upload-modal"
import { PopoverTrigger } from "@/components/ui/popover"
import { useNotes } from "@/app/hooks/useNotes"
import { BookPlus, Mic2, Upload, ImagePlus, Send, FileText } from "lucide-react"
import { useState } from "react"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"
import ImageUpload from "@/components/image-upload"
import PDFUploadModal from "@/components/pdf-upload-modal"
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Loader } from "@/components/ai-elements/loader"
import { toast } from "sonner"

export default function Home() {
  const { addNote } = useNotes()
  const [isRecordingPopoverOpen, setRecordingPopoverOpen] = useState(false)
  const [isUploadPopoverOpen, setUploadPopoverOpen] = useState(false)
  const [isImageUploadPopoverOpen, setImageUploadPopoverOpen] = useState(false)
  const [isPDFUploadPopoverOpen, setPDFUploadPopoverOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter();

  const handleCreateNewNote = async () => {
    const newNote = await addNote({
      title: "My new note",
    });
    router.push(`/note/${newNote.id}`);
  }

  const handleAIPromptSubmit = async (message: PromptInputMessage) => {
    const userPrompt = message.text?.trim();

    if (!userPrompt) {
      toast.error("Please enter a prompt to generate a note.")
      return
    }

    setIsProcessing(true)

    try {
      // Create initial note content with a placeholder
      const initialNoteContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Generating content..."
              }
            ]
          }
        ]
      }

      // Create the note immediately with placeholder
      const newNote = await addNote({
        title: "AI Generated Note",
        content: initialNoteContent
      })

      // Navigate to the note page with AI generation params
      const params = new URLSearchParams({
        streamAIGeneration: 'true',
        userPrompt: userPrompt
      })

      router.push(`/note/${newNote.id}?${params.toString()}`)
      toast.success("Note created! AI is generating content...")
    } catch (err) {
      console.error("Error creating AI note:", err)
      toast.error("Failed to create note.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <main className="px-4 overflow-y-auto w-full max-w-4xl mx-auto min-h-0 overflow-hidden flex flex-col items-center justify-center h-full">
        <div className="w-full max-w-4xl space-y-6">
          {/* AI Prompt Input */}
          <div className="w-full">
            <PromptInput
              onSubmit={handleAIPromptSubmit}
              onError={(error) => {
                if ('message' in error) {
                  toast.error(error.message)
                }
              }}
            >
              <PromptInputBody>
                <PromptInputTextarea
                  placeholder="Ask AI to write a note... (e.g., 'Write a summary about quantum computing' or 'Create a study guide for machine learning')"
                  disabled={isProcessing}
                  className="min-h-[60px]"
                />
                <PromptInputToolbar>
                  <div />
                  <PromptInputSubmit
                    disabled={isProcessing}
                    status={isProcessing ? "submitted" : "ready"}
                  >
                    {isProcessing ? <Loader /> : <Send />}
                  </PromptInputSubmit>
                </PromptInputToolbar>
              </PromptInputBody>
            </PromptInput>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1 lg:gap-4">
            {/* PDF Upload Card */}
            <PDFUploadModal open={isPDFUploadPopoverOpen} onOpenChange={setPDFUploadPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="cursor-pointer group relative flex flex-col items-start p-6 rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-md hover:scale-[1.02] text-left">
                  <div className="mb-3 p-3 rounded-lg bg-purple-500/10 text-purple-600 group-hover:bg-purple-500/20 transition-colors">
                    <FileText className="size-6" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">Upload PDF</h3>
                  <p className="text-xs text-muted-foreground">
                    Extract & analyze documents
                  </p>
                </button>
              </PopoverTrigger>
            </PDFUploadModal>

            {/* Image Upload Card */}
            <ImageUpload open={isImageUploadPopoverOpen} onOpenChange={setImageUploadPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="cursor-pointer group relative flex flex-col items-start p-6 rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-md hover:scale-[1.02] text-left">
                  <div className="mb-3 p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <ImagePlus className="size-6" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">Upload Images</h3>
                  <p className="text-xs text-muted-foreground">
                    Analyze photos with AI
                  </p>
                </button>
              </PopoverTrigger>
            </ImageUpload>

            {/* Recording Card */}
            <RecordingModal open={isRecordingPopoverOpen} onOpenChange={setRecordingPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="cursor-pointer group relative flex flex-col items-start p-6 rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-md hover:scale-[1.02] text-left">
                  <div className="mb-3 p-3 rounded-lg bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition-colors">
                    <Mic2 className="size-6" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">Record Audio</h3>
                  <p className="text-xs text-muted-foreground">
                    Capture voice notes
                  </p>
                </button>
              </PopoverTrigger>
            </RecordingModal>

            {/* Upload Audio Card */}
            <UploadModal open={isUploadPopoverOpen} onOpenChange={setUploadPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="cursor-pointer group relative flex flex-col items-start p-6 rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-md hover:scale-[1.02] text-left">
                  <div className="mb-3 p-3 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors">
                    <Upload className="size-6" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">Upload Audio</h3>
                  <p className="text-xs text-muted-foreground">
                    Import audio files
                  </p>
                </button>
              </PopoverTrigger>
            </UploadModal>

            {/* Write Note Card */}
            <button
              onClick={handleCreateNewNote}
              className="cursor-pointer group relative flex flex-col items-start p-6 rounded-xl border bg-card hover:bg-accent/50 transition-all hover:shadow-md hover:scale-[1.02] text-left"
            >
              <div className="mb-3 p-3 rounded-lg bg-green-500/10 text-green-600 group-hover:bg-green-500/20 transition-colors">
                <BookPlus className="size-6" />
              </div>
              <h3 className="font-semibold text-base mb-1">Write Note</h3>
              <p className="text-xs text-muted-foreground">
                Start from scratch
              </p>
            </button>
          </div>
        </div>
      </main>

      <div className="flex-shrink-0 pb-2 w-full flex flex-col gap-2 absolute bottom-0">
        <Footer />
      </div>
    </div>
  )
}
