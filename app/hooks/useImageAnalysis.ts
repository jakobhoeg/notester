"use client";

import { useState } from "react";
import { toast } from "sonner";
import { builtInAI, doesBrowserSupportBuiltInAI } from "@built-in-ai/core";
import { generateText } from "ai";
import { IMAGE_AUTO_PROMPT } from "@/app/constants/prompts";

interface ImageAnalysisOptions {
  onProgress?: (status: string) => void;
  generateTitle?: boolean;
  showToasts?: boolean;
  customPrompt?: string;
}

interface ImageAnalysisResult {
  analysis: string;
  title?: string;
  usage?: any;
}

export function useImageAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeImages = async (
    images: File[],
    options: ImageAnalysisOptions = {}
  ): Promise<ImageAnalysisResult> => {
    const {
      onProgress,
      generateTitle = true,
      showToasts = true,
      customPrompt = IMAGE_AUTO_PROMPT
    } = options;

    setIsAnalyzing(true);

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

      const analysisMsg = "Analyzing images...";
      onProgress?.(analysisMsg);
      if (showToasts) toast.info(analysisMsg);

      // Convert images to the format expected by generateText
      const imageContent = await Promise.all(
        images.map(async (image) => {
          const imageData = new Uint8Array(await image.arrayBuffer());
          return {
            type: "file" as const,
            mediaType: image.type,
            data: imageData,
          };
        })
      );

      const { text: analysis, usage } = await generateText({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: customPrompt },
              ...imageContent,
            ],
          },
        ],
      });

      let title: string | undefined;

      // Generate title if requested
      if (generateTitle && analysis.trim()) {
        const titleMsg = "Generating title...";
        onProgress?.(titleMsg);
        if (showToasts) toast.info(titleMsg);

        const { text: generatedTitle } = await generateText({
          model: model,
          prompt: `Generate a concise title for the following image analysis with a max of 10 words or 80 characters: 
          ${analysis}
          
          Only return the title, nothing else, no explanation, and no quotes or follow-up.
          `,
        });

        title = generatedTitle.trim();
      }

      if (!analysis.trim()) {
        const errorMsg = "Image analysis is empty.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      return {
        analysis,
        title,
        usage,
      };
    } catch (error) {
      console.error("Image analysis error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to analyze images. Please try again.";
      if (showToasts) toast.error(errorMsg);
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return {
    analyzeImages,
    isAnalyzing,
  };
}
