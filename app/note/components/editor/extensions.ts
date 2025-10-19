import {
  AIHighlight,
  CharacterCount,
  CodeBlockLowlight,
  Color,
  CustomKeymap,
  GlobalDragHandle,
  HighlightExtension,
  HorizontalRule,
  MarkdownExtension,
  Mathematics,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TextStyle,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
  Twitter,
  Youtube,
} from "novel";
import { Heading } from "@tiptap/extension-heading";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { AIAutocompleteExtension } from "./ai/ai-autocomplete-extension";
import { MarkdownTablePaste } from "./markdown-table-paste";

import { cx } from "class-variance-authority";
import { common, createLowlight } from "lowlight";

//TODO I am using cx here to get tailwind autocomplete working, idk if someone else can write a regex to just capture the class key in objects
const aiHighlight = AIHighlight;
//You can overwrite the placeholder with your own configuration
const placeholder = Placeholder.configure({
  placeholder: ({ node }) => {
    if (node.type.name === "heading") {
      return `Heading ${node.attrs.level}`;
    }
    return "Start writing your note... Type '/' for commands";
  },
  includeChildren: true,
});
const tiptapLink = TiptapLink.configure({
  HTMLAttributes: {
    class: cx(
      "text-muted-foreground underline underline-offset-[3px] hover:text-primary transition-colors cursor-pointer",
    ),
  },
});

const taskList = TaskList.configure({
  HTMLAttributes: {
    class: cx("not-prose pl-2 "),
  },
});
const taskItem = TaskItem.configure({
  HTMLAttributes: {
    class: cx("flex gap-2 items-start my-4"),
  },
  nested: true,
});

const horizontalRule = HorizontalRule.configure({
  HTMLAttributes: {
    class: cx("mt-4 mb-6 border-t border-muted-foreground"),
  },
});

const starterKit = StarterKit.configure({
  bulletList: {
    HTMLAttributes: {
      class: cx("list-disc list-outside leading-3 "),
    },
  },
  orderedList: {
    HTMLAttributes: {
      class: cx("list-decimal list-outside leading-3"),
    },
  },
  listItem: {
    HTMLAttributes: {
      class: cx("leading-normal"),
    },
  },
  blockquote: {
    HTMLAttributes: {
      class: cx("border-l-4 border-primary"),
    },
  },
  codeBlock: {
    HTMLAttributes: {
      class: cx("rounded-md bg-muted text-muted-foreground border p-5 font-mono font-medium"),
    },
  },
  code: {
    HTMLAttributes: {
      class: cx("rounded-md bg-muted  px-1.5 py-1 font-mono font-medium"),
      spellcheck: "false",
    },
  },
  heading: false, // We'll configure this separately
  horizontalRule: false,
  dropcursor: {
    color: "#DBEAFE",
    width: 4,
  },
  gapcursor: false,
});

const codeBlockLowlight = CodeBlockLowlight.configure({
  // configure lowlight: common /  all / use highlightJS in case there is a need to specify certain language grammars only
  // common: covers 37 language grammars which should be good enough in most cases
  lowlight: createLowlight(common),
});

const youtube = Youtube.configure({
  HTMLAttributes: {
    class: cx("rounded-lg border border-muted"),
  },
  inline: false,
});

const twitter = Twitter.configure({
  HTMLAttributes: {
    class: cx("not-prose"),
  },
  inline: false,
});

const mathematics = Mathematics.configure({
  HTMLAttributes: {
    class: cx("text-foreground rounded p-1 hover:bg-accent cursor-pointer"),
  },
  katexOptions: {
    throwOnError: false,
  },
});

const characterCount = CharacterCount.configure();

const tiptapImage = TiptapImage.configure({
  HTMLAttributes: {
    class: cx("rounded-lg border border-muted max-w-full h-auto"),
  },
});

const heading = Heading.configure({
  HTMLAttributes: {
    class: cx("font-semibold leading-tight mb-2"),
  },
  levels: [1, 2, 3, 4, 5, 6],
}).extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        rendered: false,
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const level = node.attrs.level;
    const sizeClasses = {
      1: "text-2xl md:text-3xl",
      2: "text-xl md:text-2xl",
      3: "text-lg md:text-xl",
      4: "text-base md:text-lg",
      5: "text-sm md:text-base",
      6: "text-xs md:text-sm"
    };

    return [
      `h${level}`,
      {
        ...HTMLAttributes,
        class: cx(
          "font-semibold leading-tight mb-2",
          sizeClasses[level as keyof typeof sizeClasses],
          HTMLAttributes.class
        ),
      },
      0,
    ];
  },
});

const markdownExtension = MarkdownExtension.configure({
  html: true,
  tightLists: true,
  tightListClass: "tight",
  bulletListMarker: "-",
  linkify: false,
  breaks: false,
  transformPastedText: false,
  transformCopiedText: false,
});

const table = Table.configure({
  HTMLAttributes: {
    class: cx("border-collapse table-auto w-full my-4 p-4"),
  },
  resizable: true,
});

const tableRow = TableRow.configure({
  HTMLAttributes: {
    class: cx("border-b border-muted"),
  },
});

const tableHeader = TableHeader.configure({
  HTMLAttributes: {
    class: cx("border border-muted bg-muted/50 font-semibold text-left p-2"),
  },
});

const tableCell = TableCell.configure({
  HTMLAttributes: {
    class: cx("border border-muted p-2"),
  },
});

const aiAutocomplete = AIAutocompleteExtension.configure({
  debounceMs: 1000,
  minChars: 10,
  maxSuggestionLength: 250,
  enabled: true,
});

export const defaultExtensions = [
  starterKit,
  heading,
  placeholder,
  tiptapLink,
  tiptapImage,
  taskList,
  taskItem,
  horizontalRule,
  aiHighlight,
  aiAutocomplete,
  codeBlockLowlight,
  youtube,
  twitter,
  mathematics,
  characterCount,
  TiptapUnderline,
  markdownExtension,
  HighlightExtension,
  TextStyle,
  Color,
  CustomKeymap,
  GlobalDragHandle,
  table,
  tableRow,
  tableHeader,
  tableCell,
  MarkdownTablePaste,
];
