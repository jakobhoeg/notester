"use client";

import { useState } from "react";
import { toast } from "sonner";
import { builtInAI, doesBrowserSupportBuiltInAI } from "@built-in-ai/core";
import { generateText } from "ai";
import { PDF_AUTO_PROMPT } from "@/app/constants/prompts";

interface PDFNoteGenerationOptions {
  pdfText: string;
  pdfMetadata?: {
    title?: string;
    author?: string;
    pageCount: number;
  };
  customPrompt?: string;
  onProgress?: (status: string) => void;
  generateTitle?: boolean;
  showToasts?: boolean;
}

interface PDFNoteGenerationResult {
  content: string;
  title?: string;
  usage?: any;
}

export function usePDFNoteGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateNoteFromPDF = async (
    options: PDFNoteGenerationOptions
  ): Promise<PDFNoteGenerationResult> => {
    const {
      pdfText,
      pdfMetadata,
      customPrompt,
      onProgress,
      generateTitle = true,
      showToasts = true,
    } = options;

    setIsGenerating(true);

    try {
      if (!doesBrowserSupportBuiltInAI()) {
        const errorMsg = "Your browser does not support built-in AI.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      const model = builtInAI();
      const availability = await model.availability();

      if (availability === "unavailable") {
        const errorMsg = "Built-in AI is not available on your device.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (availability === "downloadable") {
        const downloadMsg = "Downloading AI model...";
        onProgress?.(downloadMsg);
        if (showToasts) toast.info(downloadMsg);

        await model.createSessionWithProgress((progress) => {
          const progressMsg = `Downloading model... ${Math.round(progress * 100)}%`;
          onProgress?.(progressMsg);
          if (showToasts) toast.loading(progressMsg);
        });

        const successMsg = "Model downloaded successfully.";
        onProgress?.(successMsg);
        if (showToasts) toast.success(successMsg);
      }

      const generatingMsg = "Generating notes from PDF...";
      onProgress?.(generatingMsg);
      if (showToasts) toast.info(generatingMsg);

      // Truncate PDF text if too long (to fit context window)
      // Built-in AI typically has ~4000-8000 token limit
      // Rough estimate: 1 token ≈ 4 characters
      const maxChars = 20000; // ~5000 tokens, leaving room for prompt and response
      const truncatedText = pdfText.length > maxChars
        ? pdfText.slice(0, maxChars) + "\n\n[... document continues ...]"
        : pdfText;

      // Build the prompt
      let prompt = "";

      if (customPrompt) {
        // User provided custom instructions
        prompt = `I have a PDF document with the following content:\n\n${truncatedText}\n\nPlease ${customPrompt}`;
      } else {
        // Default comprehensive note generation
        prompt = `I have a PDF document with the following content:\n\n${truncatedText}\n\n${PDF_AUTO_PROMPT}`;
      }

      // Add metadata context if available
      if (pdfMetadata?.title) {
        prompt = `Document Title: "${pdfMetadata.title}"\n${pdfMetadata.author ? `Author: ${pdfMetadata.author}\n` : ''}Pages: ${pdfMetadata.pageCount}\n\n${prompt}`;
      }

      // Generate content based on PDF text
      const { text: content, usage } = await generateText({
        model: model,
        prompt: prompt,
      });

      let title: string | undefined;

      // Generate title if requested
      if (generateTitle && content.trim()) {
        const titleMsg = "Generating title...";
        onProgress?.(titleMsg);
        if (showToasts) toast.info(titleMsg);

        // Check if PDF metadata title is meaningful (not just a version number or reference code)
        const hasValidMetadataTitle = pdfMetadata?.title &&
          pdfMetadata.title.length <= 80 &&
          pdfMetadata.title.length >= 5 && // Must be at least 5 chars
          !/^[A-Z]?\d+(\.\d+){1,3}$/.test(pdfMetadata.title.trim()) && // Not a version number like "R.2.14.0" or "1.2.3"
          !/^[A-Z]{1,3}[\.\-]?\d+[\.\-]?\d*[\.\-]?\d*$/.test(pdfMetadata.title.trim()); // Not a reference code like "R.2.14" or "AB-123"

        if (hasValidMetadataTitle) {
          title = pdfMetadata.title;
        } else {
          // Generate a title from the content
          const { text: generatedTitle } = await generateText({
            model: model,
            prompt: `Generate a concise, descriptive title for notes based on this content. Maximum 10 words or 80 characters.
            
Content: ${content.slice(0, 1000)}

Only return the title, nothing else, no explanation, and no quotes.`,
          });

          title = generatedTitle.trim();
        }
      }

      if (!content.trim()) {
        const errorMsg = "Generated content is empty.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      return {
        content,
        title,
        usage,
      };
    } catch (error) {
      console.error("PDF note generation error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to generate notes from PDF. Please try again.";
      if (showToasts) toast.error(errorMsg);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateNoteFromPDF,
    isGenerating,
  };
}

