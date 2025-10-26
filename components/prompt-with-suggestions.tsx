"use client"

import { PromptSuggestion } from "@/components/ui/prompt-suggestion"
import { BrainIcon, Code2Icon, FileEdit, Library, SearchIcon } from "lucide-react"

export type SuggestionGroup = {
  label: string
  icon?: React.ReactNode
  highlight?: string
  items: string[]
}

export type PromptSuggestionsProps = {
  activeCategory: string
  onCategorySelect: (category: string) => void
  onSuggestionSelect: (suggestion: string) => void
}

export function PromptSuggestions({
  activeCategory,
  onCategorySelect,
  onSuggestionSelect,
}: PromptSuggestionsProps) {
  // Get suggestions based on active category

  const suggestionGroups: SuggestionGroup[] = [
    {
      label: "Study guides",
      icon: <Library className="h-4 w-4" />,
      highlight: "Study",
      items: [
        "Create a study guide note on Machine Learning",
        "Create a study guide note on data structures",
        "Create a study guide note on algorithms",
        "Create a study guide note on system design",
      ],
    },
    {
      label: "Summary",
      icon: <FileEdit className="h-4 w-4" />,
      highlight: "Summarize",
      items: [
        "Summarize the document",
        "Summarize the audio",
        "Summarize the content of the image",
      ],
    },
    {
      label: "Code",
      icon: <Code2Icon className="h-4 w-4" />,
      highlight: "Help me",
      items: [
        "Create a note explaining React hooks with examples",
        "Create a note about Python fundamentals",
        "Create a note summarizing JavaScript best practices",
        "Create a study note on TypeScript",
      ],
    },
    {
      label: "Research",
      icon: <SearchIcon className="h-4 w-4" />,
      highlight: "Research",
      items: [
        "Research and write a note on AI developments",
        "Research and write a note on market trends",
        "Research and write a note on best practices for web development",
        "Research and summarize a technical topic",
      ],
    },
  ]

  const activeCategoryData = suggestionGroups.find(
    (group) => group.label === activeCategory
  )

  // Determine which suggestions to show
  const showCategorySuggestions = activeCategory !== ""

  return (
    <div className="relative flex w-full flex-col items-center justify-center space-y-2 pt-4">
      <div className="w-full">
        {showCategorySuggestions ? (
          <div className="flex w-full flex-col space-y-1">
            {activeCategoryData?.items.map((suggestion) => (
              <PromptSuggestion
                key={suggestion}
                highlight={activeCategoryData.highlight}
                onClick={() => onSuggestionSelect(suggestion)}
              >
                {suggestion}
              </PromptSuggestion>
            ))}
          </div>
        ) : (
          <div className="flex flex-row flex-wrap w-full items-start justify-start gap-2">
            {suggestionGroups.map((suggestion) => (
              <PromptSuggestion
                key={suggestion.label}
                onClick={() => onCategorySelect(suggestion.label)}
              >
                {suggestion.icon && (
                  <span className="mr-2">{suggestion.icon}</span>
                )}
                {suggestion.label}
              </PromptSuggestion>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
