"use client";

import { useState } from "react";
import { toast } from "sonner";
import { builtInAI, doesBrowserSupportBuiltInAI } from "@built-in-ai/core";
import { generateText } from "ai";

interface TranscriptionOptions {
  onProgress?: (status: string) => void;
  generateTitle?: boolean;
  showToasts?: boolean;
}

interface TranscriptionResult {
  transcription: string;
  title?: string;
  usage?: any;
}

export function useTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);

  const transcribeAudio = async (
    audioBlob: Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult | null> => {
    const {
      onProgress,
      generateTitle = false,
      showToasts = false,
    } = options;

    if (!audioBlob) {
      const errorMsg = "No audio to transcribe.";
      if (showToasts) toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    setIsTranscribing(true);

    try {
      // Check browser support
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

      // Handle model download if needed
      if (availability === "downloadable") {
        const downloadMsg = "Downloading model...";
        onProgress?.(downloadMsg);
        if (showToasts) toast.info(downloadMsg);

        await model.createSessionWithProgress((progress) => {
          const progressMsg = `Downloading model... ${Math.round(progress * 100)}%`;
          onProgress?.(progressMsg);
          if (showToasts) toast.loading(progressMsg);
        });
      }

      // Transcribe audio
      const transcribeMsg = "Transcribing audio...";
      onProgress?.(transcribeMsg);
      if (showToasts) toast.info(transcribeMsg);

      const audioData = new Uint8Array(await audioBlob.arrayBuffer());

      const { text: transcription, usage } = await generateText({
        model: model,
        system: 'Transcribe the following audio. Include EVERYTHING. If no audio is presented, just return an empty string.',
        messages: [
          {
            role: "user",
            content: [
              { type: "file", mediaType: "audio/webm", data: audioData },
            ],
          },
        ],
      });

      let title: string | undefined;

      // Generate title if requested
      if (generateTitle && transcription.trim()) {
        const titleMsg = "Generating title...";
        onProgress?.(titleMsg);
        if (showToasts) toast.info(titleMsg);

        const { text: generatedTitle } = await generateText({
          model: model,
          prompt: `Generate a title for the following transcription with a max of 10 words or 80 characters: 
          ${transcription}
          
          Only return the title, nothing else, no explanation, and no quotes or follow-up.
          `,
        });

        title = generatedTitle;
      }

      if (!transcription.trim()) {
        const errorMsg = "Transcription is empty.";
        if (showToasts) toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      return {
        transcription,
        title,
        usage,
      };
    } catch (error) {
      console.error("Transcription error:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to transcribe audio. Please try again.";
      if (showToasts) toast.error(errorMsg);
      throw error;
    } finally {
      setIsTranscribing(false);
    }
  };

  return {
    transcribeAudio,
    isTranscribing,
  };
}
