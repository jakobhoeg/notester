"use client"

import { RecordingModal } from "@/components/recording-modal"
import { UploadModal } from "@/components/upload-modal"
import { PopoverTrigger } from "@/components/ui/popover"
import { useNotes } from "@/app/hooks/useNotes"
import { BookPlus, Mic2, Upload, ImagePlus, Send, FileText, Mic, SendIcon } from "lucide-react"
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
  const { addNote, addGenerationData } = useNotes()
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
        content: initialNoteContent,
        isGenerating: true
      })

      // Store AI prompt in PGlite
      await addGenerationData(newNote.id, 'ai', {
        userPrompt
      });

      router.push(`/note/${newNote.id}`)
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
              className=""
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
                  className="min-h-[92px]"
                />
                <PromptInputToolbar>
                  <div />
                  <PromptInputSubmit
                    disabled={isProcessing}
                    status={isProcessing ? "submitted" : "ready"}
                  >
                    {isProcessing ? <Loader /> : <SendIcon />}
                  </PromptInputSubmit>
                </PromptInputToolbar>
              </PromptInputBody>
            </PromptInput>
          </div>

          {/* Action Cards */}
          <div className="flex flex-wrap gap-2 justify-center">
            {/* PDF Upload Card */}
            <PDFUploadModal open={isPDFUploadPopoverOpen} onOpenChange={setPDFUploadPopoverOpen}>
              <PopoverTrigger asChild>
                <button className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-xl
                  border border-secondary bg-background
                  transition-all duration-200
                  hover:bg-secondary
                  text-sm font-medium
                  text-muted-foreground
                `}>
                  <FileText className="size-5" />
                  <span className="">Upload PDF</span>
                </button>
              </PopoverTrigger>
            </PDFUploadModal>

            {/* Image Upload Card */}
            <ImageUpload open={isImageUploadPopoverOpen} onOpenChange={setImageUploadPopoverOpen}>
              <PopoverTrigger asChild>
                <button className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-xl
                  border border-secondary bg-background
                  transition-all duration-200
                  hover:bg-secondary
                  text-sm font-medium
                  text-muted-foreground
                `}>
                  <ImagePlus className="size-5" />
                  <span className="">Upload Images</span>
                </button>
              </PopoverTrigger>
            </ImageUpload>

            {/* Recording Card */}
            <RecordingModal open={isRecordingPopoverOpen} onOpenChange={setRecordingPopoverOpen}>
              <PopoverTrigger asChild>
                <button className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-xl
                  border border-secondary bg-background
                  transition-all duration-200
                  hover:bg-secondary
                  text-sm font-medium
                  text-muted-foreground
                `}>
                  <Mic className="size-5" />
                  <span className="">Transcribe audio</span>
                </button>
              </PopoverTrigger>
            </RecordingModal>

            {/* Upload Audio Card */}
            <UploadModal open={isUploadPopoverOpen} onOpenChange={setUploadPopoverOpen}>
              <PopoverTrigger asChild>
                <button className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-xl
                  border border-secondary bg-background
                  transition-all duration-200
                  hover:bg-secondary
                  text-sm font-medium
                  text-muted-foreground
                `}>
                  <FileText className="size-5" />
                  <span className="">Upload Audio</span>
                </button>
              </PopoverTrigger>
            </UploadModal>

            {/* Write Note Card */}
            <button
              onClick={handleCreateNewNote}
              className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-xl
                  border border-secondary bg-background
                  transition-all duration-200
                  hover:bg-secondary
                  text-sm font-medium
                  text-muted-foreground
                `}>
              <BookPlus className="size-5" />
              <span className="">Empty note</span>
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
