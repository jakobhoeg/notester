"use client";

import {
  AlertCircleIcon,
  FileTextIcon,
  Send,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  formatBytes,
  useFileUpload,
} from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
} from "@/components/ui/popover";
import { useNotes } from "@/app/hooks/useNotes";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  type PromptInputMessage,
} from "./ai-elements/prompt-input";
import { Loader } from "./ai-elements/loader";
import { usePDFProcessing } from "@/app/hooks/usePDFProcessing";

const getFileIcon = () => {
  return <FileTextIcon className="size-5 opacity-60" />;
};

const getFilePreview = (file: { file: File | { type: string; name: string } }) => {
  return (
    <div className="bg-accent flex h-20 items-center justify-center overflow-hidden rounded-t-[inherit]">
      {getFileIcon()}
    </div>
  );
};

export default function PDFUploadModal({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const maxSizeMB = 50;
  const maxSize = maxSizeMB * 1024 * 1024;
  const maxFiles = 1;

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [pdfMetadata, setPdfMetadata] = useState<any>(null);

  const router = useRouter();
  const { addNote, addGenerationData } = useNotes();
  const { extractTextFromPDF } = usePDFProcessing();

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
    multiple: false,
    maxFiles,
    maxSize,
    accept: "application/pdf,.pdf",
    onFilesAdded: async (newFiles) => {
      const pdfFile = newFiles[0].file;
      if (pdfFile instanceof File) {
        await handleExtractText(pdfFile);
      }
    },
  });

  const handleExtractText = async (file: File) => {
    setIsProcessing(true);
    setExtractedText(null);
    setPdfMetadata(null);

    try {
      setProcessingStatus("Extracting text from PDF...");
      const result = await extractTextFromPDF(file, {
        onProgress: (status) => setProcessingStatus(status),
        showToasts: false,
      });

      setExtractedText(result.text);
      setPdfMetadata(result.metadata);
      setProcessingStatus("");
    } catch (err) {
      console.error("Error extracting PDF text:", err);
      // Error handling is already done in the hook
      clearFiles();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNote = async (message: PromptInputMessage) => {
    if (!extractedText) {
      toast.error("Please wait for PDF text extraction to complete.");
      return;
    }

    setIsProcessing(true);

    try {
      setProcessingStatus("Creating note...");

      // Create initial note content with a placeholder
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
      };

      // Create the note immediately with placeholder
      // Use a temporary title - the AI will generate a proper one
      const newNote = await addNote({
        title: "Generating PDF Notes...",
        content: initialNoteContent,
        isGenerating: true
      });

      // Store PDF data in PGlite
      await addGenerationData(newNote.id, 'pdf', {
        pdfText: extractedText,
        pdfMetadata,
        customPrompt: message.text?.trim() || null
      });

      router.push(`/note/${newNote.id}`);
      toast.success("Note created! AI is generating content from your PDF...");
      onOpenChange(false);

      // Reset state
      clearFiles();
      setExtractedText(null);
      setPdfMetadata(null);
    } catch (err) {
      console.error("Error creating note from PDF:", err);
      toast.error("Failed to create note from PDF.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleRemoveFile = () => {
    removeFile(files[0].id);
    setExtractedText(null);
    setPdfMetadata(null);
    setProcessingStatus("");
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {children}
      <PopoverContent className="w-[400px] p-4 rounded-xl" align="center" sideOffset={8}>
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
              aria-label="Upload PDF file"
              tabIndex={-1}
            />
            {files.length > 0 ? (
              <div className="flex w-full flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-medium">PDF Document</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="bg-background relative flex flex-col rounded-md border"
                    >
                      {getFilePreview(file)}
                      <Button
                        onClick={handleRemoveFile}
                        size="icon"
                        className="border-background focus-visible:border-background absolute -top-2 -right-2 size-6 rounded-full border-2 shadow-none"
                        aria-label="Remove PDF"
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                      <div className="flex min-w-0 flex-col gap-0.5 border-t p-3">
                        <p className="truncate text-[13px] font-medium">
                          {file.file.name}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {formatBytes(file.file.size)}
                          {pdfMetadata && ` • ${pdfMetadata.pageCount} pages`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Text preview */}
                {extractedText && !isProcessing && (
                  <div className="bg-muted/50 rounded-md p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">
                      Preview:
                    </p>
                    <p className="text-xs line-clamp-4">
                      {extractedText.slice(0, 300)}
                      {extractedText.length > 300 && "..."}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                <div
                  className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
                  aria-hidden="true"
                >
                  <FileTextIcon className="size-4 opacity-60" />
                </div>
                <p className="mb-1.5 text-sm font-medium">Drop your PDF here</p>
                <p className="text-muted-foreground text-xs">
                  Up to {maxSizeMB}MB • Text-based PDFs only
                </p>
                <Button variant="outline" className="mt-4" onClick={openFileDialog}>
                  <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
                  Select PDF
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
          {isProcessing && processingStatus && (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span>{processingStatus}</span>
            </div>
          )}

          {/* AI-powered prompt input for creating notes from PDF */}
          {files.length > 0 && extractedText && !isProcessing && (
            <PromptInput
              accept="application/pdf"
              multiple={false}
              maxFiles={1}
              maxFileSize={maxSize}
              onSubmit={handleCreateNote}
              onError={(error) => {
                if ("message" in error) {
                  toast.error(error.message);
                }
              }}
            >
              <PromptInputBody>
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
                <PromptInputTextarea
                  placeholder="Describe how you'd like the AI to process this PDF (e.g., 'Summarize key points', 'Extract action items', 'Create study notes'), or leave blank for comprehensive notes..."
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
  );
}

