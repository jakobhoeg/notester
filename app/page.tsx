"use client"

import { RecordingModal } from "@/components/recording-modal"
import { UploadModal } from "@/components/upload-modal"
import { Button } from "@/components/ui/button"
import { useNotes } from "@/app/hooks/useNotes"
import { ArrowUpRight, BookPlus, Mic2, Upload } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import Footer from "@/components/footer"
import ListSkeleton from "./note/components/list-skeleton"
import { useRouter } from "next/navigation"
import ImageUpload from "@/components/image-upload"

export default function Home() {
  const { addNote } = useNotes()
  const [isRecordingModalOpen, setRecordingModalOpen] = useState(false)
  const [isUploadModalOpen, setUploadModalOpen] = useState(false)
  const [isWriteNoteModalOpen, setWriteNoteModalOpen] = useState(false)
  const router = useRouter();

  const handleOpenRecordingModal = () => {
    setRecordingModalOpen(true)
  }

  const handleCloseRecordingModal = () => {
    setRecordingModalOpen(false)
  }

  const handleOpenUploadModal = () => {
    setUploadModalOpen(true)
  }

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false)
  }

  const handleCreateNewNote = async () => {
    const newNote = await addNote({
      title: "My new note",
    });
    router.push(`/note/${newNote.id}`);
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0">
      <main className="px-4 overflow-y-auto w-full max-w-4xl mx-auto min-h-0 overflow-hidden flex flex-col items-center justify-center h-full">
        <h1></h1>
        <div className="w-full max-w-2xl space-y-6">
          {/* Image Upload Section */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Create Note from Images</h2>
            <p className="text-muted-foreground text-sm">
              Upload images and let AI analyze them to create comprehensive notes
            </p>
            <ImageUpload />
          </div>

          {/* Other Options */}
          <div className="flex gap-4">
            <Button size="lg" onClick={handleOpenRecordingModal} className="flex-1">
              <Mic2 className="size-4 mr-1" />
              Record new note
            </Button>
            <Button size="lg" onClick={handleOpenUploadModal} variant="secondary" className="flex-1">
              <Upload className="size-4 mr-1" />
              Upload audio file
            </Button>
            <Button size="lg" onClick={handleCreateNewNote} variant="outline" className="flex-1">
              <BookPlus className="size-4 mr-1" />
              Write new note
            </Button>
          </div>
        </div>
      </main>

      <div className="flex-shrink-0 pb-2 w-full flex flex-col gap-2 absolute bottom-0">
        <Footer />
      </div>

      {isRecordingModalOpen && <RecordingModal onClose={handleCloseRecordingModal} />}
      {isUploadModalOpen && <UploadModal onClose={handleCloseUploadModal} />}
    </div>
  )
}
