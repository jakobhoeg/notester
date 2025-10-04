import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import { ModeToggle } from './mode-toggle'

export default function Footer() {
  return (
    <div className="text-xs p-2 text-center text-muted-foreground/60 flex items-center justify-center w-full">
      <p>
        Built for the {" "}
        <Link href="https://developer.chrome.com/blog/ai-challenge-2025" target="_blank" rel="noopener noreferrer" className="font-bold inline-flex items-center underline">
          Built-in AI Hackathon
          <ArrowUpRight className="size-2.5" />
        </Link>
        {" "} by {" "}
        <Link href="https://github.com/jakobhoeg/notester" target="_blank" rel="noopener noreferrer" className="font-bold inline-flex items-center underline">
          @jakobhoeg
          <ArrowUpRight className="size-2.5" />
        </Link>
      </p>
    </div>
  )
}
