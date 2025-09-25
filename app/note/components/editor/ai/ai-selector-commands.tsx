import { ArrowDownWideNarrow, CheckCheck, Languages, RefreshCcwDot, StepForward, WrapText, ChevronRight } from "lucide-react";
import { getPrevText, useEditor, removeAIHighlight } from "novel";
import { CommandGroup, CommandItem, CommandSeparator } from "@/components/ui/command";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

const options = [
  {
    value: "improve",
    label: "Improve writing",
    icon: RefreshCcwDot,
  },
  {
    value: "fix",
    label: "Fix grammar",
    icon: CheckCheck,
  },
  {
    value: "shorter",
    label: "Make shorter",
    icon: ArrowDownWideNarrow,
  },
  {
    value: "longer",
    label: "Make longer",
    icon: WrapText,
  },
];

const translationLanguages = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ja", label: "Japanese" },
  { code: "es", label: "Spanish" },
];

interface AISelectorCommandsProps {
  onSelect: (value: string, option: string) => void;
  onTranslate: (text: string, targetLanguage: string) => void;
}

const AISelectorCommands = ({ onSelect, onTranslate }: AISelectorCommandsProps) => {
  const { editor } = useEditor();

  return (
    <>
      <CommandGroup heading="Edit or review selection" >
        {
          options.map((option) => (
            <CommandItem
              onSelect={(value) => {
                const { from, to } = editor!.state.selection;
                const text = editor!.state.doc.textBetween(from, to);

                onSelect(text, value);
              }}
              className="flex gap-2 px-4"
              key={option.value}
              value={option.value}
            >
              <option.icon className="size-4 text-primary" />
              {option.label}
            </CommandItem>
          ))}
        {/* Translation with hover card */}
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <CommandItem
              className="flex gap-2 px-4"
              value="translate"
              onSelect={() => {
                // Default to English if no specific language is hovered
                const { from, to } = editor!.state.selection;
                const text = editor!.state.doc.textBetween(from, to);

                onTranslate(text, "en");
              }}
            >
              <Languages className="size-4 text-primary" />
              Translate
              <ChevronRight className="size-4 ml-auto" />
            </CommandItem>
          </HoverCardTrigger>
          <HoverCardContent side="right" className="w-48 p-2">
            <div className="grid gap-1">
              <div className="text-sm font-medium mb-2">Choose language:</div>
              {translationLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    const { from, to } = editor!.state.selection;
                    const text = editor!.state.doc.textBetween(from, to);

                    onTranslate(text, lang.code);
                  }}
                  className="flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-primary/30 hover:text-accent-foreground transition-colors text-left"
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      </CommandGroup>
      < CommandSeparator />
      <CommandGroup heading="Use AI to do more" >
        <CommandItem
          onSelect={
            () => {
              const { from, to } = editor!.state.selection;
              const text = editor!.state.doc.textBetween(from, to);

              console.log("Continue writing text:", text);
              onSelect(text, "continue");
            }
          }
          value="continue"
          className="gap-2 px-4"
        >
          <StepForward className="size-4 text-primary" />
          Continue writing
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AISelectorCommands;
