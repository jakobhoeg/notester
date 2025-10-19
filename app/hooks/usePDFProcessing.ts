"use client";

import { useState } from "react";
import { toast } from "sonner";

// Dynamically import PDF.js to avoid SSR issues
let pdfjsLib: any = null;

const loadPDFJS = async () => {
  if (pdfjsLib) return pdfjsLib;

  if (typeof window !== "undefined") {
    pdfjsLib = await import("pdfjs-dist");

    // Use unpkg CDN which is more reliable for pdfjs-dist
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  return pdfjsLib;
};

interface PDFProcessingOptions {
  onProgress?: (status: string) => void;
  showToasts?: boolean;
  maxPages?: number;
}

interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  pageCount: number;
}

interface PDFProcessingResult {
  text: string;
  metadata: PDFMetadata;
}

export function usePDFProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);

  const extractTextFromPDF = async (
    file: File,
    options: PDFProcessingOptions = {}
  ): Promise<PDFProcessingResult> => {
    const {
      onProgress,
      showToasts = true,
      maxPages = 100,
    } = options;

    setIsProcessing(true);

    try {
      const pdfjs = await loadPDFJS();
      if (!pdfjs) {
        const errorMsg = "Failed to load PDF library.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
        const errorMsg = "Please upload a valid PDF file.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        const errorMsg = "PDF file is too large. Maximum size is 10MB.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      const loadingMsg = "Loading PDF...";
      onProgress?.(loadingMsg);
      if (showToasts) toast.info(loadingMsg);

      const arrayBuffer = await file.arrayBuffer();

      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const totalPages = Math.min(pdf.numPages, maxPages);
      const metadata: PDFMetadata = {
        pageCount: pdf.numPages,
      };

      try {
        const pdfMetadata = await pdf.getMetadata();
        if (pdfMetadata.info) {
          const info = pdfMetadata.info as any;
          metadata.title = info.Title || undefined;
          metadata.author = info.Author || undefined;
          metadata.subject = info.Subject || undefined;
          metadata.creator = info.Creator || undefined;
        }
      } catch (err) {
        console.warn("Could not extract PDF metadata:", err);
      }

      // Extract text from each page
      const textParts: string[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const progressMsg = `Extracting text... (Page ${pageNum}/${totalPages})`;
        onProgress?.(progressMsg);

        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          const pageText = textContent.items
            .map((item: any) => {
              if ("str" in item) {
                return item.str;
              }
              return "";
            })
            .join(" ");

          if (pageText.trim()) {
            textParts.push(`\n=== Page ${pageNum} ===\n${pageText.trim()}`);
          }
        } catch (err) {
          console.warn(`Error extracting text from page ${pageNum}:`, err);
        }
      }

      const text = textParts.join("\n\n");

      if (!text.trim()) {
        const errorMsg = "Could not extract text from PDF. It might be a scanned document or image-based PDF.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (pdf.numPages > maxPages) {
        const warningMsg = `Only processed first ${maxPages} pages of ${pdf.numPages} total pages.`;
        if (showToasts) toast.warning(warningMsg);
      }

      const successMsg = `Successfully extracted text from ${totalPages} page${totalPages > 1 ? "s" : ""}.`;
      onProgress?.(successMsg);
      if (showToasts) toast.success(successMsg);

      return {
        text,
        metadata,
      };
    } catch (error) {
      console.error("PDF processing error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to process PDF. Please try again.";
      if (showToasts) toast.error(errorMsg);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    extractTextFromPDF,
    isProcessing,
  };
}

