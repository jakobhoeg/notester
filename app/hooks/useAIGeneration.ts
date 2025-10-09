"use client";

import { useState } from "react";
import { toast } from "sonner";
import { builtInAI, doesBrowserSupportBuiltInAI } from "@built-in-ai/core";
import { generateText } from "ai";

interface AIGenerationOptions {
  onProgress?: (status: string) => void;
  generateTitle?: boolean;
  showToasts?: boolean;
}

interface AIGenerationResult {
  content: string;
  title?: string;
  usage?: any;
}

export function useAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateContent = async (
    userPrompt: string,
    options: AIGenerationOptions = {}
  ): Promise<AIGenerationResult> => {
    const {
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

      const generatingMsg = "Generating content...";
      onProgress?.(generatingMsg);
      if (showToasts) toast.info(generatingMsg);

      // Generate content based on user's prompt
      const { text: content, usage } = await generateText({
        model: model,
        prompt: userPrompt,
      });

      let title: string | undefined;

      // Generate title if requested
      if (generateTitle && content.trim()) {
        const titleMsg = "Generating title...";
        onProgress?.(titleMsg);
        if (showToasts) toast.info(titleMsg);

        const { text: generatedTitle } = await generateText({
          model: model,
          prompt: `Generate a concise title for the following content with a max of 10 words or 80 characters: 
          ${content}
          
          Only return the title, nothing else, no explanation, and no quotes or follow-up.
          `,
        });

        title = generatedTitle.trim();
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
      console.error("AI generation error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to generate content. Please try again.";
      if (showToasts) toast.error(errorMsg);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateContent,
    isGenerating,
  };
}

