"use client"

import { useNotes } from "@/app/hooks/useNotes"
import { BookPlus, FileText, ImagePlus, SendIcon, HeadphonesIcon, InfoIcon } from "lucide-react"
import { useState } from "react"
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"
import { PromptSuggestions, type SuggestionGroup } from "@/components/prompt-with-suggestions"
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionMenuItem,
  PromptInputActionCustom,
  PromptInputTools,
  type PromptInputMessage,
  usePromptInputAttachments,
  type PromptInputAttachmentProps,
} from "@/components/ai-elements/prompt-input"
import { Loader } from "@/components/ai-elements/loader"
import { toast } from "sonner"
import { usePDFProcessing } from "@/app/hooks/usePDFProcessing"
import { Button } from "@/components/ui/button"
import { XIcon, PaperclipIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { PDF_AUTO_PROMPT, IMAGE_AUTO_PROMPT, AUDIO_AUTO_PROMPT } from "@/app/constants/prompts"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import dynamic from 'next/dynamic'

// Lazy load the 3D text component to avoid blocking initial render
// with heavy Three.js dependencies
const Chrome3DText = dynamic(
  () => import("@/components/dithering-shader/3d-text"),
  {
    ssr: false, // Disable SSR for Three.js components
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        {/* Optional: Add a loading skeleton here */}
      </div>
    )
  }
)

type FileType = 'pdf' | 'image' | 'audio' | 'recording' | null

function CustomAttachment({
  data,
  onRemove,
  className,
  ...props
}: PromptInputAttachmentProps & {
  onRemove: (id: string, attachments: any) => void
}) {
  const attachments = usePromptInputAttachments();

  return (
    <div
      className={cn("group relative size-12 rounded-md border", className)}
      key={data.id}
      {...props}
    >
      {data.mediaType?.startsWith("image/") && data.url ? (
        <img
          alt={data.filename || "attachment"}
          className="size-full rounded-md object-cover"
          height={48}
          src={data.url}
          width={48}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <FileText className="size-4" />
        </div>
      )}
      <Button
        aria-label="Remove attachment"
        className="-right-1.5 -top-1.5 absolute h-6 w-6 rounded-full opacity-0 group-hover:opacity-100"
        onClick={() => onRemove(data.id, attachments)}
        size="icon"
        type="button"
        variant="outline"
      >
        <XIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function HomeComponent() {
  const { addNote, addGenerationData } = useNotes()
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileType, setFileType] = useState<FileType>(null)
  const [processingStatus, setProcessingStatus] = useState("")
  const [pdfData, setPdfData] = useState<{ text: string; metadata: any } | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [activeCategory, setActiveCategory] = useState("")
  const [userInput, setUserInput] = useState("")
  const router = useRouter()
  const { extractTextFromPDF } = usePDFProcessing()

  const handleCreateNewNote = async () => {
    const newNote = await addNote({
      title: "My new note",
    });
    router.push(`/note/${newNote.id}`);
  }

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handlePDFSelected = async (files: File[], attachments?: any) => {
    const file = files[0]
    if (!file) return

    if (attachments?.clear) {
      attachments.clear()
    }
    resetState()

    setFileType('pdf')
    setIsProcessing(true)
    setPdfData(null)

    if (attachments?.add) {
      attachments.add([file])
    }

    try {
      setProcessingStatus("Extracting text from PDF...")
      const result = await extractTextFromPDF(file, {
        onProgress: (status) => setProcessingStatus(status),
        showToasts: false,
      })

      setPdfData({ text: result.text, metadata: result.metadata })
      setProcessingStatus("")
      toast.success("PDF processed! Add a prompt or submit to generate notes.")
    } catch (err) {
      console.error("Error extracting PDF text:", err)
      toast.error("Failed to process PDF.")
      setFileType(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleImagesSelected = async (files: File[], attachments?: any) => {
    const imageFilesList = files.filter(f => f.type.startsWith('image/'))
    if (imageFilesList.length === 0) {
      toast.error("Please select valid image files.")
      return
    }

    if (attachments?.clear) {
      attachments.clear()
    }
    resetState()

    if (attachments?.add) {
      attachments.add(imageFilesList)
    }

    setFileType('image')
    setImageFiles(imageFilesList)
    toast.success(`${imageFilesList.length} image(s) added! Add a prompt or submit to analyze.`)
  }

  const handleAudioSelected = async (files: File[], attachments?: any) => {
    const file = files[0]
    if (!file) return

    if (attachments?.clear) {
      attachments.clear()
    }
    resetState()

    if (attachments?.add) {
      attachments.add([file])
    }

    setFileType('audio')
    setAudioFile(file)
    toast.success("Audio file added! Add a prompt or submit to transcribe.")
  }

  const handleSubmit = async (message: PromptInputMessage, event: React.FormEvent<HTMLFormElement>) => {
    const userPrompt = message.text?.trim()

    // Clear user input state since we're submitting
    setUserInput('')

    if (fileType === 'pdf' && pdfData) {
      await handlePDFSubmit(userPrompt)
    } else if (fileType === 'image' && imageFiles.length > 0) {
      await handleImageSubmit(userPrompt)
    } else if (fileType === 'audio' && audioFile) {
      await handleAudioSubmit(userPrompt)
    } else if (userPrompt) {
      // Plain AI prompt
      await handleAIPromptSubmit(userPrompt)
    } else {
      toast.error("Please enter a prompt or upload a file.")
    }
  }

  const handleAIPromptSubmit = async (userPrompt: string) => {
    setIsProcessing(true)

    try {
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

      const newNote = await addNote({
        title: "AI Generated Note",
        content: initialNoteContent,
        isGenerating: true
      })

      await addGenerationData(newNote.id, 'ai', {
        userPrompt
      })

      router.push(`/note/${newNote.id}`)
      toast.success("Note created! AI is generating content...")
    } catch (err) {
      console.error("Error creating AI note:", err)
      toast.error("Failed to create note.")
    } finally {
      setIsProcessing(false)
      resetState()
    }
  }

  const handlePDFSubmit = async (userPrompt?: string) => {
    if (!pdfData) return

    setIsProcessing(true)

    try {
      setProcessingStatus("Creating note...")

      const initialNoteContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Analyzing PDF and generating notes...",
              },
            ],
          },
        ],
      }

      const newNote = await addNote({
        title: "Generating PDF Notes...",
        content: initialNoteContent,
        isGenerating: true
      })

      await addGenerationData(newNote.id, 'pdf', {
        pdfText: pdfData.text,
        pdfMetadata: pdfData.metadata,
        customPrompt: userPrompt || null
      })

      router.push(`/note/${newNote.id}`)
      toast.success("Note created! AI is generating content from your PDF...")
    } catch (err) {
      console.error("Error creating note from PDF:", err)
      toast.error("Failed to create note from PDF.")
    } finally {
      setIsProcessing(false)
      setProcessingStatus("")
      resetState()
    }
  }

  const handleImageSubmit = async (userPrompt?: string) => {
    if (imageFiles.length === 0) return

    setIsProcessing(true)

    try {
      setProcessingStatus("Processing images...")
      const imageBase64Promises = imageFiles.map(async (file) => ({
        src: await convertImageToBase64(file),
        alt: file.name,
        title: file.name
      }))
      const imageData = await Promise.all(imageBase64Promises)

      const initialNoteContent = {
        type: "doc",
        content: [
          ...imageData.map(image => ({
            type: "image",
            attrs: {
              src: image.src,
              alt: image.alt,
              title: image.title
            }
          })),
          {
            type: "paragraph",
            content: []
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Analyzing images..."
              }
            ]
          }
        ]
      }

      setProcessingStatus("Creating note...")
      const newNote = await addNote({
        title: "Image Analysis",
        content: initialNoteContent,
        isGenerating: true
      })

      await addGenerationData(newNote.id, 'image', {
        customPrompt: userPrompt || null,
        imageCount: imageFiles.length
      })

      router.push(`/note/${newNote.id}`)
      toast.success("Note created! Analysis will stream in shortly...")
    } catch (err) {
      console.error("Error creating note from images:", err)
      toast.error("Failed to create note from images.")
    } finally {
      setIsProcessing(false)
      setProcessingStatus("")
      resetState()
    }
  }

  const handleAudioSubmit = async (userPrompt?: string) => {
    if (!audioFile) return

    setIsProcessing(true)

    try {
      const reader = new FileReader()
      const audioBase64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(audioFile)
      })

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
                  text: `[Audio: ${audioFile.name}]`
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
      })

      await addGenerationData(newNote.id, 'audio', {
        audioBase64,
        fileName: audioFile.name,
        customPrompt: userPrompt || null
      })

      router.push(`/note/${newNote.id}`)
      toast.success("Note created! Transcription will stream in shortly...")
    } catch (err) {
      console.error(err)
      toast.error("Failed to create note.")
    } finally {
      setIsProcessing(false)
      resetState()
    }
  }

  const resetState = () => {
    setFileType(null)
    setPdfData(null)
    setImageFiles([])
    setAudioFile(null)
    setProcessingStatus("")
    setUserInput("")
  }

  const handleRemoveAttachment = (id: string, attachments: any) => {
    const attachmentToRemove = attachments.files.find((file: any) => file.id === id)

    attachments.remove(id)

    // Check if this was the last attachment
    const remainingFiles = attachments.files.filter((file: any) => file.id !== id)

    if (remainingFiles.length === 0) {
      // No more files, reset everything
      resetState()
    } else if (fileType === 'image' && attachmentToRemove) {
      // Update image files state
      setImageFiles(prev => {
        const updated = prev.filter(file => file.name !== attachmentToRemove.filename)
        return updated
      })
    }
  }

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    const textarea = document.querySelector('textarea[name="message"]') as HTMLTextAreaElement
    if (textarea) {
      textarea.value = suggestion
      const event = new Event('input', { bubbles: true })
      textarea.dispatchEvent(event)
      textarea.focus()
    }
    setActiveCategory("")
  }

  const getAutoPromptMessage = () => {
    if (fileType === 'pdf') return PDF_AUTO_PROMPT
    if (fileType === 'image') return IMAGE_AUTO_PROMPT
    if (fileType === 'audio') return AUDIO_AUTO_PROMPT
    return null
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <div className="flex flex-col h-full w-full items-center justify-center">
        <div className="w-full h-32 md:h-52 mb-2 md:mb-8 flex items-center justify-center overflow-hidden">
          <Chrome3DText
            text="Built-in AI"
          />
        </div>
        <main className="px-4 overflow-y-auto w-full max-w-4xl mx-auto min-h-0 overflow-hidden flex flex-col items-center justify-center ">
          <div className="w-full max-w-4xl space-y-2">
            {/* Show auto prompt info when file is attached and user hasn't typed anything */}
            {fileType && getAutoPromptMessage() && !userInput.trim() && (
              <TooltipProvider>
                <Tooltip delayDuration={400}>
                  <TooltipTrigger asChild>
                    <div className="rounded-lg border bg-muted/50 p-2 text-sm cursor-help transition-colors hover:bg-muted/70">
                      <div className="flex items-start gap-2">
                        <InfoIcon className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 space-y-1">
                          <p className="font-medium text-foreground">System prompt:</p>
                          <p className="text-muted-foreground line-clamp-2">
                            {getAutoPromptMessage()?.replace(/\n/g, ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-xs p-4 max-h-60 overflow-y-scroll"
                    sideOffset={5}
                  >
                    <div className="space-y-2">
                      <p className="font-semibold text-sm">Full Auto-prompt:</p>
                      <p className="text-sm whitespace-pre-line leading-relaxed">
                        {getAutoPromptMessage()}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Unified Prompt Input with File Upload Options */}
            <div className="w-full relative z-10">
              <PromptInput
                className=""
                onSubmit={handleSubmit}
                onError={(error) => {
                  if ('message' in error) {
                    toast.error(error.message)
                  }
                }}
              >
                <PromptInputBody>
                  <PromptInputAttachments>
                    {(attachment) => (
                      <CustomAttachment
                        data={attachment}
                        onRemove={handleRemoveAttachment}
                      />
                    )}
                  </PromptInputAttachments>
                  <PromptInputTextarea
                    placeholder={
                      fileType === 'pdf'
                        ? "Add custom instructions (optional)..."
                        : fileType === 'image'
                          ? "Add custom instructions or context (optional)..."
                          : fileType === 'audio'
                            ? "Add any context for the audio transcription (optional)..."
                            : "Ask AI to write a note, or use the + menu to upload files..."
                    }
                    disabled={isProcessing}
                    className="min-h-[92px]"
                    onChange={(e) => setUserInput(e.target.value)}
                  />
                  <PromptInputToolbar>
                    <PromptInputTools>
                      <PromptInputActionMenu>
                        <PromptInputActionMenuTrigger />
                        <PromptInputActionMenuContent>
                          <PromptInputActionCustom
                            label="Upload PDF"
                            icon={<FileText className="size-4" />}
                            accept="application/pdf"
                            multiple={false}
                            onFilesSelected={handlePDFSelected}
                          />
                          <PromptInputActionCustom
                            label="Upload Images"
                            icon={<ImagePlus className="size-4" />}
                            accept="image/*"
                            multiple={true}
                            onFilesSelected={handleImagesSelected}
                          />
                          <PromptInputActionCustom
                            label="Upload Audio"
                            icon={<HeadphonesIcon className="size-4" />}
                            accept="audio/mpeg,audio/wav,audio/mp4,audio/m4a"
                            multiple={false}
                            onFilesSelected={handleAudioSelected}
                          />
                          <PromptInputActionMenuItem
                            onSelect={(e) => {
                              e.preventDefault()
                              handleCreateNewNote()
                            }}
                          >
                            <BookPlus className="mr-2 size-4" />
                            Empty Note
                          </PromptInputActionMenuItem>
                        </PromptInputActionMenuContent>
                      </PromptInputActionMenu>
                    </PromptInputTools>
                    <PromptInputSubmit
                      disabled={isProcessing}
                      status={isProcessing ? "submitted" : "ready"}
                    >
                      {isProcessing ? <Loader /> : <SendIcon />}
                    </PromptInputSubmit>
                  </PromptInputToolbar>
                </PromptInputBody>
              </PromptInput>

              {/* Processing Status */}
              {isProcessing && processingStatus && (
                <div className="text-muted-foreground flex items-center gap-2 text-sm mt-2">
                  <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  <span>{processingStatus}</span>
                </div>
              )}

              {/* Prompt Suggestions */}
              {!isProcessing && (
                <PromptSuggestions
                  activeCategory={activeCategory}
                  onCategorySelect={handleCategorySelect}
                  onSuggestionSelect={handleSuggestionSelect}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <div className="flex-shrink-0 pb-2 w-full flex flex-col gap-2 absolute bottom-0">
        <Footer />
      </div>
    </div>
  )
}
