"use client"

import {
  AlertCircleIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  Send,
  Trash2Icon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  formatBytes,
  useFileUpload,
} from "@/hooks/use-file-upload"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
} from "@/components/ui/popover"
import { useNotes } from "@/app/hooks/useNotes"
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  type PromptInputMessage,
} from "./ai-elements/prompt-input"
import { Loader } from "./ai-elements/loader"

const getFileIcon = (file: { file: File | { type: string; name: string } }) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type
  const fileName = file.file instanceof File ? file.file.name : file.file.name

  const iconMap = {
    pdf: {
      icon: FileTextIcon,
      conditions: (type: string, name: string) =>
        type.includes("pdf") ||
        name.endsWith(".pdf") ||
        type.includes("word") ||
        name.endsWith(".doc") ||
        name.endsWith(".docx"),
    },
    archive: {
      icon: FileArchiveIcon,
      conditions: (type: string, name: string) =>
        type.includes("zip") ||
        type.includes("archive") ||
        name.endsWith(".zip") ||
        name.endsWith(".rar"),
    },
    excel: {
      icon: FileSpreadsheetIcon,
      conditions: (type: string, name: string) =>
        type.includes("excel") ||
        name.endsWith(".xls") ||
        name.endsWith(".xlsx"),
    },
    video: {
      icon: VideoIcon,
      conditions: (type: string) => type.includes("video/"),
    },
    audio: {
      icon: HeadphonesIcon,
      conditions: (type: string) => type.includes("audio/"),
    },
    image: {
      icon: ImageIcon,
      conditions: (type: string) => type.startsWith("image/"),
    },
  }

  for (const { icon: Icon, conditions } of Object.values(iconMap)) {
    if (conditions(fileType, fileName)) {
      return <Icon className="size-5 opacity-60" />
    }
  }

  return <FileIcon className="size-5 opacity-60" />
}

const getFilePreview = (file: {
  file: File | { type: string; name: string; url?: string }
}) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type
  const fileName = file.file instanceof File ? file.file.name : file.file.name

  const renderImage = (src: string) => (
    <img
      src={src}
      alt={fileName}
      className="size-full rounded-t-[inherit] object-cover"
    />
  )

  return (
    <div className="bg-accent flex h-20 items-center justify-center overflow-hidden rounded-t-[inherit]">
      {fileType.startsWith("image/") ? (
        file.file instanceof File ? (
          (() => {
            const previewUrl = URL.createObjectURL(file.file)
            return renderImage(previewUrl)
          })()
        ) : file.file.url ? (
          renderImage(file.file.url)
        ) : (
          <ImageIcon className="size-5 opacity-60" />
        )
      ) : (
        getFileIcon(file)
      )}
    </div>
  )
}

export default function ImageUpload({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  const maxSizeMB = 25
  const maxSize = maxSizeMB * 1024 * 1024 // 25MB default
  const maxFiles = 2

  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState("")

  const router = useRouter()
  const { addNote } = useNotes()

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: true,
    maxFiles,
    maxSize,
    accept: "image/*", // Only accept images
  })

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleCreateNote = async (message: PromptInputMessage) => {
    const imageFiles = files
      .map(file => file.file)
      .filter((file): file is File => file instanceof File && file.type.startsWith("image/"))

    if (imageFiles.length === 0) {
      toast.error("Please upload at least one image to create a note.")
      return
    }

    setIsProcessing(true)

    try {
      // Convert images to base64 for embedding in the note
      setProcessingStatus("Processing images...")
      const imageBase64Promises = imageFiles.map(async (file) => ({
        src: await convertImageToBase64(file),
        alt: file.name,
        title: file.name
      }))
      const imageData = await Promise.all(imageBase64Promises)

      // Create initial note content with just images and a placeholder for analysis
      const initialNoteContent = {
        type: "doc",
        content: [
          // Add images at the top
          ...imageData.map(image => ({
            type: "image",
            attrs: {
              src: image.src,
              alt: image.alt,
              title: image.title
            }
          })),
          // Add a separator paragraph
          {
            type: "paragraph",
            content: []
          },
          // Add a placeholder paragraph for the analysis
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

      // Create the note immediately with images and navigate
      setProcessingStatus("Creating note...")
      const newNote = await addNote({
        title: "Image Analysis", // Temporary title
        content: initialNoteContent
      })

      // Navigate to the note page immediately
      const analysisParams = new URLSearchParams({
        streamAnalysis: 'true',
        imageCount: imageFiles.length.toString()
      })

      // Only add custom prompt if user provided one
      if (message.text?.trim()) {
        analysisParams.set('customPrompt', message.text.trim())
      }

      router.push(`/note/${newNote.id}?${analysisParams.toString()}`)

      toast.success("Note created! Analysis will stream in shortly...")
    } catch (err) {
      console.error("Error creating note from images:", err)
      // Error handling is already done in the image analysis hook
    } finally {
      setIsProcessing(false)
      setProcessingStatus("")
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {children}
      <PopoverContent
        className="w-[400px] p-4 rounded-xl"
        align="center"
        sideOffset={8}
      >
        <div className="flex flex-col gap-2">
          {/* Drop area */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            data-dragging={isDragging || undefined}
            data-files={files.length > 0 || undefined}
            className="border-input data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex min-h-52 flex-col items-center overflow-hidden rounded-xl border border-dashed p-4 transition-colors not-data-[files]:justify-center has-[input:focus]:ring-[3px]"
          >
            <input
              {...getInputProps()}
              className="sr-only"
              aria-label="Upload image file"
              tabIndex={-1}
            />
            {files.length > 0 ? (
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium">
                    Files ({files.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openFileDialog}>
                      <UploadIcon
                        className="-ms-0.5 size-3.5 opacity-60"
                        aria-hidden="true"
                      />
                      Add files
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearFiles}>
                      <Trash2Icon
                        className="-ms-0.5 size-3.5 opacity-60"
                        aria-hidden="true"
                      />
                      Remove all
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="bg-background relative flex flex-col rounded-md border"
                    >
                      {getFilePreview(file)}
                      <Button
                        onClick={() => removeFile(file.id)}
                        size="icon"
                        className="border-background focus-visible:border-background absolute -top-2 -right-2 size-6 rounded-full border-2 shadow-none"
                        aria-label="Remove image"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                      <div className="flex min-w-0 flex-col gap-0.5 border-t p-3">
                        <p className="truncate text-[13px] font-medium">
                          {file.file.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {formatBytes(file.file.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                <div
                  className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
                  aria-hidden="true"
                >
                  <ImageIcon className="size-4 opacity-60" />
                </div>
                <p className="mb-1.5 text-sm font-medium">Drop your files here</p>
                <p className="text-muted-foreground text-xs">
                  Max {maxFiles} files ∙ Up to {maxSizeMB}MB
                </p>
                <Button variant="outline" className="mt-4" onClick={openFileDialog}>
                  <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
                  Select images
                </Button>
              </div>
            )}
          </div>

          {errors.length > 0 && (
            <div
              className="text-destructive flex items-center gap-1 text-xs"
              role="alert"
            >
              <AlertCircleIcon className="size-3 shrink-0" />
              <span>{errors[0]}</span>
            </div>
          )}

          {/* Processing status */}
          {isProcessing && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>{processingStatus || "Processing..."}</span>
            </div>
          )}

          {/* AI-powered prompt input for creating notes from images */}
          {files.length > 0 && (
            <PromptInput
              accept="image/*"
              multiple
              maxFiles={maxFiles}
              maxFileSize={maxSize}
              onSubmit={handleCreateNote}
              onError={(error) => {
                if ('message' in error) {
                  toast.error(error.message)
                }
              }}
            >
              <PromptInputBody>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
                <PromptInputTextarea
                  placeholder="Describe what you'd like me to focus on in these images, or leave blank for a general analysis..."
                  disabled={isProcessing}
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
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
