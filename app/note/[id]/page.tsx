"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useNotes } from "@/app/hooks/useNotes"
import { useImageAnalysis } from "@/app/hooks/useImageAnalysis"
import { useTranscription } from "@/app/hooks/useTranscription"
import { useAIGeneration } from "@/app/hooks/useAIGeneration"
import { usePDFNoteGeneration } from "@/app/hooks/usePDFNoteGeneration"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { TransformDropdown } from "../components/transformation-panel"
import { builtInAI, doesBrowserSupportBuiltInAI } from "@built-in-ai/core"
import { streamText } from "ai"
import { cn, generateTransformationPrompt, createContentFromText, appendTextToContent, markdownToJSONContent } from "@/lib/utils"
import { CustomMarkdown } from "@/components/ui/markdown"
import LoadingBars from "@/components/ui/loading-bars"
import Footer from "@/components/footer"
import { Trash2 } from "lucide-react"
import { useDbLoading } from "@/app/pglite-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import NoteSkeleton from "@/components/note-skeleton"
import { JSONContent, type EditorInstance } from "novel"
import TailwindAdvancedEditor from "../components/editor/tailwind-editor"
import { createEmptyContent } from "@/lib/utils"
import SidebarAiChat from "../components/sidebar-ai-chat"
import { DockFooter } from "@/components/dock-footer"

const DELAY_SAVE = 1000

// Helper function to extract text from JSONContent for transformations
const extractTextFromContent = (content: JSONContent): string => {
  if (!content.content || content.content.length === 0) return "";

  const extractText = (node: JSONContent): string => {
    if (node.text) return node.text;
    if (node.content) {
      return node.content.map(extractText).join("");
    }
    return "";
  };

  return content.content.map(extractText).join("\n");
};

export default function NotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { updateNote, deleteNote, useNoteQuery } = useNotes()
  const { analyzeImages } = useImageAnalysis()
  const { transcribeAudio } = useTranscription()
  const { generateContent } = useAIGeneration()
  const { generateNoteFromPDF } = usePDFNoteGeneration()
  const params = useParams<{ id: string }>();
  const id = params.id as string;
  const { data: note, isLoading } = useNoteQuery(id)
  const { isDbReady } = useDbLoading()

  const [editableTitle, setEditableTitle] = useState("")
  const [editableContent, setEditableContent] = useState<JSONContent>(createEmptyContent())
  const [isStreaming, setIsStreaming] = useState(false)
  const [preTransformationContent, setPreTransformationContent] = useState<JSONContent>(createEmptyContent())
  const [isTransformationPendingConfirmation, setIsTransformationPendingConfirmation] = useState(false)
  const [transformedText, setTransformedText] = useState("")
  const [isAutocompleteEnabled, setIsAutocompleteEnabled] = useState(true)
  const [isAnalyzingImages, setIsAnalyzingImages] = useState(false)
  const [analysisText, setAnalysisText] = useState("")
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const titleDebounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const contentDebounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const editorRef = useRef<EditorInstance | null>(null)
  const hasStartedTranscription = useRef(false)
  const hasStartedAIGeneration = useRef(false)
  const hasStartedPDFGeneration = useRef(false)

  useEffect(() => {
    if (note) {
      setEditableTitle(note.title)
      // Validate content before setting it
      try {
        if (note.content && note.content.type === 'doc' && Array.isArray(note.content.content)) {
          setEditableContent(note.content)
        } else {
          console.warn('Invalid content structure, using empty content')
          setEditableContent(createEmptyContent())
        }
      } catch (error) {
        console.error('Error setting note content:', error)
        setEditableContent(createEmptyContent())
      }
    }
  }, [note, id])

  // Handle streaming analysis from URL parameters
  useEffect(() => {
    const shouldStreamAnalysis = searchParams.get('streamAnalysis') === 'true'
    const customPrompt = searchParams.get('customPrompt') || undefined
    const imageCount = searchParams.get('imageCount')

    if (shouldStreamAnalysis && note && !isAnalyzingImages) {
      startImageAnalysis(customPrompt, parseInt(imageCount || '0'))
    }
  }, [note, searchParams, isAnalyzingImages])

  const startImageAnalysis = async (customPrompt: string | undefined, imageCount: number) => {
    if (!note) return

    setIsAnalyzingImages(true)
    setAnalysisText("")

    try {
      // Extract images from the note content
      const imageNodes = note.content.content?.filter(node => node.type === 'image') || []

      if (imageNodes.length === 0) {
        toast.error("No images found in the note to analyze")
        return
      }

      // Convert base64 images back to File objects for analysis
      const imageFiles: File[] = []
      for (const imageNode of imageNodes) {
        if (imageNode.attrs?.src) {
          try {
            const response = await fetch(imageNode.attrs.src)
            const blob = await response.blob()
            const file = new File([blob], imageNode.attrs.alt || 'image.png', { type: blob.type })
            imageFiles.push(file)
          } catch (error) {
            console.error('Error converting image for analysis:', error)
          }
        }
      }

      if (imageFiles.length === 0) {
        toast.error("Could not process images for analysis")
        return
      }

      // Start streaming analysis
      // Only pass customPrompt if user provided one, otherwise use default from hook
      const result = await analyzeImages(imageFiles, {
        generateTitle: true,
        ...(customPrompt && { customPrompt }),
        showToasts: false,
        onProgress: (status) => {
          // Progress is now shown via LoadingBars component
          console.log(`Analysis progress: ${status}`)
        }
      })

      if (result && result.analysis) {
        // Parse the markdown analysis into proper JSONContent
        const analysisContent = markdownToJSONContent(result.analysis)

        // Update the note content with the analysis
        const updatedContent = { ...note.content }
        const placeholderIndex = updatedContent.content?.findIndex(
          node => node.type === 'paragraph' &&
            node.content?.[0]?.type === 'text' &&
            node.content[0].text?.includes('Analyzing images')
        )

        if (placeholderIndex !== undefined && placeholderIndex >= 0 && updatedContent.content) {
          // Replace the placeholder with the parsed analysis content
          // Remove the placeholder and insert all parsed content nodes
          updatedContent.content.splice(
            placeholderIndex,
            1,
            ...(analysisContent.content || [])
          )

          setEditableContent(updatedContent)

          // Update the note in the database
          await updateNote({
            id: note.id,
            updates: {
              content: updatedContent,
              title: result.title || note.title
            }
          })

          // Update the title if we got a new one
          if (result.title) {
            setEditableTitle(result.title)
          }

          toast.success("Image analysis completed!")
        }
      }
    } catch (error) {
      console.error('Error during image analysis:', error)
      updateAnalysisPlaceholder("Failed to analyze images")
      toast.error("Failed to analyze images")
    } finally {
      setIsAnalyzingImages(false)
      // Clean up URL parameters
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('streamAnalysis')
      newUrl.searchParams.delete('customPrompt')
      newUrl.searchParams.delete('imageCount')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }

  const updateAnalysisPlaceholder = (newText: string) => {
    setEditableContent(prevContent => {
      const updatedContent = { ...prevContent }
      const placeholderIndex = updatedContent.content?.findIndex(
        node => node.type === 'paragraph' &&
          node.content?.[0]?.type === 'text' &&
          node.content[0].text?.includes('Analyzing images')
      )

      if (placeholderIndex !== undefined && placeholderIndex >= 0 && updatedContent.content) {
        updatedContent.content[placeholderIndex] = {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: newText
            }
          ]
        }
      }

      return updatedContent
    })
  }

  // Handle streaming transcription from URL parameters
  useEffect(() => {
    const shouldStreamTranscription = searchParams.get('streamTranscription') === 'true'

    if (shouldStreamTranscription && note && !hasStartedTranscription.current) {
      hasStartedTranscription.current = true
      startAudioTranscription()
    }
  }, [note, searchParams])

  // Handle streaming AI generation from URL parameters
  useEffect(() => {
    const shouldStreamAIGeneration = searchParams.get('streamAIGeneration') === 'true'
    const userPrompt = searchParams.get('userPrompt')

    if (shouldStreamAIGeneration && userPrompt && note && !hasStartedAIGeneration.current) {
      hasStartedAIGeneration.current = true
      startAIGeneration(userPrompt)
    }
  }, [note, searchParams])

  // Handle streaming PDF note generation from URL parameters
  useEffect(() => {
    const shouldStreamPDFAnalysis = searchParams.get('streamPDFAnalysis') === 'true'

    if (shouldStreamPDFAnalysis && note && !hasStartedPDFGeneration.current) {
      hasStartedPDFGeneration.current = true
      startPDFNoteGeneration()
    }
  }, [note, searchParams])

  const startAudioTranscription = async () => {
    if (!note) return

    setIsTranscribing(true)

    try {
      // Retrieve audio from localStorage
      const audioBase64 = localStorage.getItem(`audio_${note.id}`)

      if (!audioBase64) {
        toast.error("No audio found to transcribe")
        return
      }

      // Convert base64 back to Blob
      const response = await fetch(audioBase64)
      const audioBlob = await response.blob()

      // Transcribe the audio
      const result = await transcribeAudio(audioBlob, {
        generateTitle: true,
        showToasts: false,
        onProgress: (status) => {
          console.log(`Transcription progress: ${status}`)
        }
      })

      if (result && result.transcription) {
        // Parse the transcription into proper JSONContent (in case it has markdown)
        const transcriptionContent = markdownToJSONContent(result.transcription)

        // Update the note content with transcription
        const updatedContent = { ...note.content }
        const placeholderIndex = updatedContent.content?.findIndex(
          node => node.type === 'paragraph' &&
            node.content?.[0]?.type === 'text' &&
            node.content[0].text?.includes('Transcribing audio')
        )

        if (placeholderIndex !== undefined && placeholderIndex >= 0 && updatedContent.content) {
          // Replace placeholder with parsed transcription content
          // Remove the placeholder and insert all parsed content nodes
          updatedContent.content.splice(
            placeholderIndex,
            1,
            ...(transcriptionContent.content || [])
          )

          setEditableContent(updatedContent)

          // Update the note in database
          await updateNote({
            id: note.id,
            updates: {
              content: updatedContent,
              title: result.title || note.title
            }
          })

          if (result.title) {
            setEditableTitle(result.title)
          }

          toast.success("Transcription completed!")
        }
      }

      // Clean up localStorage and URL params
      localStorage.removeItem(`audio_${note.id}`)
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('streamTranscription')
      window.history.replaceState({}, '', newUrl.toString())
      hasStartedTranscription.current = false
    } catch (error) {
      console.error('Error during transcription:', error)
      toast.error("Failed to transcribe audio")
      hasStartedTranscription.current = false
    } finally {
      setIsTranscribing(false)
    }
  }

  const startAIGeneration = async (userPrompt: string) => {
    if (!note) return

    setIsGeneratingAI(true)

    try {
      // Generate content using the user's prompt
      const result = await generateContent(userPrompt, {
        generateTitle: true,
        showToasts: false,
        onProgress: (status) => {
          console.log(`AI generation progress: ${status}`)
        }
      })

      if (result && result.content) {
        // Parse the markdown content into proper JSONContent
        const generatedContent = markdownToJSONContent(result.content)

        // Update the note content with the generated content
        const updatedContent = { ...note.content }
        const placeholderIndex = updatedContent.content?.findIndex(
          node => node.type === 'paragraph' &&
            node.content?.[0]?.type === 'text' &&
            node.content[0].text?.includes('Generating content')
        )

        if (placeholderIndex !== undefined && placeholderIndex >= 0 && updatedContent.content) {
          // Replace the placeholder with the parsed generated content
          // Remove the placeholder and insert all parsed content nodes
          updatedContent.content.splice(
            placeholderIndex,
            1,
            ...(generatedContent.content || [])
          )

          setEditableContent(updatedContent)

          // Update the note in the database
          await updateNote({
            id: note.id,
            updates: {
              content: updatedContent,
              title: result.title || note.title
            }
          })

          // Update the title if we got a new one
          if (result.title) {
            setEditableTitle(result.title)
          }

          toast.success("AI content generation completed!")
        }
      }
    } catch (error) {
      console.error('Error during AI generation:', error)
      toast.error("Failed to generate AI content")
    } finally {
      setIsGeneratingAI(false)
      // Clean up URL parameters
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('streamAIGeneration')
      newUrl.searchParams.delete('userPrompt')
      window.history.replaceState({}, '', newUrl.toString())
      hasStartedAIGeneration.current = false
    }
  }

  const startPDFNoteGeneration = async () => {
    if (!note) return

    setIsGeneratingPDF(true)

    try {
      // Retrieve PDF text and metadata from sessionStorage
      const pdfText = sessionStorage.getItem(`pdf_text_${note.id}`)
      const pdfMetadataStr = sessionStorage.getItem(`pdf_metadata_${note.id}`)
      const customPrompt = sessionStorage.getItem(`pdf_prompt_${note.id}`) || undefined

      if (!pdfText) {
        toast.error("No PDF text found to process")
        return
      }

      const pdfMetadata = pdfMetadataStr ? JSON.parse(pdfMetadataStr) : undefined

      // Generate notes from PDF text
      const result = await generateNoteFromPDF({
        pdfText,
        pdfMetadata,
        customPrompt,
        generateTitle: true,
        showToasts: false,
        onProgress: (status) => {
          console.log(`PDF note generation progress: ${status}`)
        }
      })

      if (result && result.content) {
        // Parse the markdown content into proper JSONContent
        const generatedContent = markdownToJSONContent(result.content)

        // Update the note content with the generated content
        const updatedContent = { ...note.content }
        const placeholderIndex = updatedContent.content?.findIndex(
          node => node.type === 'paragraph' &&
            node.content?.[0]?.type === 'text' &&
            (node.content[0].text?.includes('Analyzing PDF') ||
              node.content[0].text?.includes('generating notes'))
        )

        if (placeholderIndex !== undefined && placeholderIndex >= 0 && updatedContent.content) {
          // Replace the placeholder with the parsed generated content
          // Remove the placeholder and insert all parsed content nodes
          updatedContent.content.splice(
            placeholderIndex,
            1,
            ...(generatedContent.content || [])
          )

          setEditableContent(updatedContent)

          // Update the note in the database
          await updateNote({
            id: note.id,
            updates: {
              content: updatedContent,
              title: result.title || note.title
            }
          })

          // Update the title if we got a new one
          if (result.title) {
            setEditableTitle(result.title)
          }

          toast.success("PDF notes generated successfully!")
        }
      }

      // Clean up sessionStorage
      sessionStorage.removeItem(`pdf_text_${note.id}`)
      sessionStorage.removeItem(`pdf_metadata_${note.id}`)
      sessionStorage.removeItem(`pdf_prompt_${note.id}`)
    } catch (error) {
      console.error('Error during PDF note generation:', error)
      toast.error("Failed to generate notes from PDF")
    } finally {
      setIsGeneratingPDF(false)
      // Clean up URL parameters
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('streamPDFAnalysis')
      window.history.replaceState({}, '', newUrl.toString())
      hasStartedPDFGeneration.current = false
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setEditableTitle(newTitle)

    if (titleDebounceTimeout.current) {
      clearTimeout(titleDebounceTimeout.current)
    }

    titleDebounceTimeout.current = setTimeout(async () => {
      if (note && newTitle !== note.title) {
        await updateNote({ id: note.id, updates: { title: newTitle } })
        toast.success("Title updated!")
      }
    }, DELAY_SAVE)
  }

  const handleContentChange = (newContent: JSONContent) => {
    setEditableContent(newContent)

    if (isTransformationPendingConfirmation) {
      setIsTransformationPendingConfirmation(false)
    }

    if (contentDebounceTimeout.current) {
      clearTimeout(contentDebounceTimeout.current)
    }

    contentDebounceTimeout.current = setTimeout(async () => {
      if (note && JSON.stringify(newContent) !== JSON.stringify(note.content)) {
        await updateNote({
          id: note.id,
          updates: { content: newContent },
        })
      }
    }, DELAY_SAVE)
  }

  const handleDelete = async () => {
    if (note) {
      try {
        await deleteNote(note.id)
        toast.success("Note deleted successfully.")
        router.push("/")
      } catch (error) {
        console.error("Error deleting note:", error)
        toast.error("Failed to delete note.")
      }
    }
  }

  const handleSaveTransformation = async () => {
    setIsTransformationPendingConfirmation(false)
    const newContent = createContentFromText(transformedText)
    setEditableContent(newContent)

    if (contentDebounceTimeout.current) {
      clearTimeout(contentDebounceTimeout.current)
    }

    if (note) {
      await updateNote({
        id: note.id,
        updates: { content: newContent },
      })
    }
  }

  const handleRejectTransformation = () => {
    setEditableContent(preTransformationContent)
    setIsTransformationPendingConfirmation(false)
    setTransformedText("")
  }

  const handleAIContentUpdate = async (newContent: JSONContent) => {
    console.log('[handleAIContentUpdate] AI requested content update:', newContent);
    setEditableContent(newContent)

    if (contentDebounceTimeout.current) {
      clearTimeout(contentDebounceTimeout.current)
    }

    if (note) {
      console.log('[handleAIContentUpdate] Updating note in database, id:', note.id);
      await updateNote({
        id: note.id,
        updates: { content: newContent },
      })
      console.log('[handleAIContentUpdate] Note updated successfully');
    }
  }

  const handleEditorCreate = (editor: EditorInstance) => {
    editorRef.current = editor

    // Get initial autocomplete state from the extension
    const extension = editor.extensionManager.extensions.find(ext => ext.name === 'aiAutocomplete');
    if (extension) {
      setIsAutocompleteEnabled(extension.options.enabled);
    }
  }

  const handleToggleAutocomplete = () => {
    if (editorRef.current) {
      editorRef.current.commands.toggleAutocomplete();

      // Update local state by getting the new value from the extension
      const extension = editorRef.current.extensionManager.extensions.find(ext => ext.name === 'aiAutocomplete');
      if (extension) {
        setIsAutocompleteEnabled(extension.options.enabled);
      }

      // Clear any existing suggestion when disabling
      if (isAutocompleteEnabled) {
        editorRef.current.commands.clearAutocompleteSuggestion();
      }
    }
  }

  const handleTransform = async (typeName: string) => {
    if (!doesBrowserSupportBuiltInAI()) {
      toast.error("Your browser does not support built-in AI.")
      return
    }

    const model = builtInAI()
    const availability = await model.availability()

    if (availability === "unavailable") {
      toast.error("Built-in AI is not available on your device.")
      return
    }

    if (availability === "downloadable") {
      toast.info("Downloading model...")
      await model.createSessionWithProgress((progress) => {
        toast.loading(`Downloading model... ${Math.round(progress * 100)}%`)
      })
      toast.success("Model downloaded.")
    }

    const textContent = extractTextFromContent(editableContent)
    const prompt = generateTransformationPrompt(typeName, textContent)

    try {
      setPreTransformationContent(editableContent)
      const { textStream } = streamText({
        model,
        prompt,
      })

      setIsStreaming(true)
      setTransformedText("")

      for await (const chunk of textStream) {
        setTransformedText((prev) => prev + chunk)
      }
    } catch (error) {
      console.error("Error transforming text:", error)
      toast.error("Failed to transform text.")
    } finally {
      setIsStreaming(false)
      setIsTransformationPendingConfirmation(true)
    }
  }

  const handleTranscriptionComplete = async (transcription: string) => {
    if (!note) return;

    // Update the editor directly by appending content
    if (editorRef.current) {
      // Move cursor to the end
      editorRef.current.commands.focus('end');

      // Add some spacing if there's existing content
      const currentContent = editorRef.current.getJSON();
      if (currentContent.content && currentContent.content.length > 0) {
        editorRef.current.commands.createParagraphNear();
      }

      // Insert the transcribed text
      editorRef.current.commands.insertContent({
        type: 'paragraph',
        content: [{ type: 'text', text: transcription }]
      });

      // Get the updated content from the editor
      const updatedContent = editorRef.current.getJSON();
      setEditableContent(updatedContent);

      // Clear any existing timeout and save immediately
      if (contentDebounceTimeout.current) {
        clearTimeout(contentDebounceTimeout.current);
      }

      await updateNote({
        id: note.id,
        updates: { content: updatedContent },
      });
    } else {
      // Fallback to the original method if no editor reference
      const updatedContent = appendTextToContent(editableContent, transcription);
      setEditableContent(updatedContent);

      if (contentDebounceTimeout.current) {
        clearTimeout(contentDebounceTimeout.current);
      }

      await updateNote({
        id: note.id,
        updates: { content: updatedContent },
      });
    }
  };

  if (isDbReady && !isLoading && !note) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Note not found</h1>
          <Link href="/" className="text-blue-200 hover:text-blue-300 underline">
            Back to notes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full bg-background max-h-[calc(100vh-0px)] overflow-hidden">
      <div className="relative flex flex-1 flex-col min-h-0">
        {/* Main Content Container */}
        <div className="flex flex-col h-full w-full min-h-0">
          {/* Title Section - Fixed height */}
          <div className="flex-shrink-0 p-4 flex items-center w-full max-w-4xl mx-auto">
            {isLoading || !isDbReady ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <input
                className="text-2xl font-bold bg-transparent border-none outline-none w-full"
                value={editableTitle}
                onChange={handleTitleChange}
                aria-label="Edit title"
                spellCheck={true}
              />
            )}
          </div>

          {/* Main Content - Scrollable area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <main className="h-full overflow-y-auto p-4 w-full max-w-4xl mx-auto">
              {!isDbReady || isLoading ? (
                <NoteSkeleton />
              ) : (
                <div className="min-h-full relative">
                  {isStreaming || isTransformationPendingConfirmation || isAnalyzingImages || isTranscribing || isGeneratingAI || isGeneratingPDF ? (
                    <div
                      className={cn(
                        "whitespace-pre-line rounded p-2",
                        isStreaming && "animate-pulse disabled:opacity-100",
                        isTransformationPendingConfirmation &&
                        "border-2 border-primary-foreground bg-muted/10 animate-pulse",
                      )}
                    >
                      {isAnalyzingImages || isTranscribing || isGeneratingAI || isGeneratingPDF ? (
                        <div className="space-y-4">
                          <TailwindAdvancedEditor
                            key={id}
                            content={editableContent}
                            onUpdate={handleContentChange}
                            onEditorCreate={handleEditorCreate}
                          />
                          <LoadingBars
                            lines={4}
                          />
                        </div>
                      ) : (
                        <CustomMarkdown>{transformedText}</CustomMarkdown>
                      )}
                    </div>
                  ) : (
                    <TailwindAdvancedEditor
                      key={id}
                      content={editableContent}
                      onUpdate={handleContentChange}
                      onEditorCreate={handleEditorCreate}
                    />
                  )}
                  {isTransformationPendingConfirmation && (
                    <div className="absolute top-0 right-0 p-2">
                      <div className="border bg-white/10 dark:bg-accent backdrop-blur-md rounded-lg p-3 flex gap-3 items-center">
                        <Button size="sm" onClick={handleSaveTransformation}>
                          Accept
                        </Button>
                        <Button size="sm" variant="secondary" onClick={handleRejectTransformation}>
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>

          {/* Footer Section - Fixed at bottom */}
          <div className="flex-shrink-0 pt-6 pb-2 w-full flex flex-col gap-2">
            <DockFooter
              onTransform={handleTransform}
              isStreaming={isStreaming}
              isAutocompleteEnabled={isAutocompleteEnabled}
              onToggleAutocomplete={handleToggleAutocomplete}
              onTranscriptionComplete={handleTranscriptionComplete}
              showTransformDropdown={true}
              showAutocompleteToggle={true}
              showTranscriptionButton={true}
            />
            <Footer />
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="group/sidebar-wrapper has-[data-side=right]:ml-0 h-full">
        <SidebarAiChat
          key={note?.id}
          noteContent={editableContent}
          onContentUpdate={handleAIContentUpdate}
        />
      </div>
    </div>
  )
}
