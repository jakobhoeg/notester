<div align="center">
<img src="hero.gif">
</div>

# Private AI-powered note-taking

This is my submission to the [Google Chrome Built-in AI Challenge 2025](https://developer.chrome.com/blog/ai-challenge-2025).

Notester is a fully private, client-side note-taking web application that leverages Chrome's Built-in AI APIs to provide powerful AI assistance without compromising your privacy. All your notes and AI processing stay on your device.

## Problem Statement

Traditional note-taking apps with AI features require sending your data to external servers, requiring internet connectivity and essentially raising privacy concerns. 
Notester solves this by:

- **Privacy-First**: All AI processing happens locally using Chrome's Built-in AI.
- **No External Databases**: Notes are stored in your browser's IndexedDB using [PGlite](https://github.com/electric-sql/pglite). They're not stored on any third-party database.
- **Offline-Capable**: Works without an internet connection
- **Cost-Free**: No API costs or quotas - unlimited AI usage
- **Multimodal Input**: Generate notes from images, PDFs, and audio files without uploading them anywhere

## Demo

(TODO): ADD

## Chrome Built-in AI APIs Used

### 1. **Prompt API**
The foundation of most features in Notester. Used for:
- **Text generation**: Create notes from scratch with AI assistance
- **Content improvement**: Enhance writing quality and clarity
- **Text shortening/lengthening**: Adjust content length while maintaining meaning
- **Grammar fixing**: Correct spelling and grammar errors
- **AI Chat**: Conversational interface for note assistance
- **Title generation**: Auto-generate titles for your notes
- **Smart AI auto-complete**: Real-time intelligent text suggestions as you type

### 2. **Translator API**
- Translate selected text into multiple languages: English, Danish, French, Japanese, and Spanish
- Seamless integration in the editor with visual feedback
- Streaming translation output for responsive UX

### 3. **Multimodal Capabilities** (Prompt API with Image/Audio Input)
- **Image analysis**: Upload images to automatically generate notes from visual content
- **PDF processing**: Extract and analyze content from PDF documents to create structured notes
- **Audio transcription**: Upload audio files for automatic transcription and note creation

### 4. **Tool calling**
- **Web Search Tool**: AI assistant can search the web (via Exa API) for current information
- **Edit note**: AI assistant can edit the note if you ask it to in natural language

## Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **AI Integration**: [`@built-in-ai/core`](https://github.com/jakobhoeg/built-in-ai) for React integration with the Prompt API
- **Editor**: TipTap (Novel framework) editor with custom AI extensions
- **Database**: PGlite (PostgreSQL in the browser)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn with Radix UI primitives
- **3D Graphics**: Three.js, React Three Fiber
- **State Management**: Zustand

## Local installation

1. **Prerequisites**: Chrome with Prompt-API and Translator-API enabled
2. **Clone repository**
3. **Install dependencies**: `npm install`
4. **Run development server**: `npm run dev`
5. **Optional**: Add `EXA_API_KEY` to `.env.local` for web search functionality

## Use-cases

- Transcribe lectures, analyze diagrams, organize study materials
- Process PDFs, take meeting notes, organize findings
- Draft content, improve writing, translate text

