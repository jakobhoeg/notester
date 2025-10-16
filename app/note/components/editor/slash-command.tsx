import {
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  MessageSquarePlus,
  Table,
  Text,
  TextQuote,
  Twitter,
  Youtube,
} from "lucide-react";
import { Command, createSuggestionItems, renderItems } from "novel";

export const suggestionItems = createSuggestionItems([
  {
    title: "Text",
    description: "Just start typing with plain text.",
    searchTerms: ["p", "paragraph"],
    icon: <Text size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
    },
  },
  {
    title: "To-do List",
    description: "Track tasks with a to-do list.",
    searchTerms: ["todo", "task", "list", "check", "checkbox"],
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: "Heading 1",
    description: "Big section heading.",
    searchTerms: ["title", "big", "large"],
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading.",
    searchTerms: ["subtitle", "medium"],
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading.",
    searchTerms: ["subtitle", "small"],
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Create a simple bullet list.",
    searchTerms: ["unordered", "point"],
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Create a list with numbering.",
    searchTerms: ["ordered"],
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: "Quote",
    description: "Capture a quote.",
    searchTerms: ["blockquote"],
    icon: <TextQuote size={18} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").toggleBlockquote().run(),
  },
  {
    title: "Code",
    description: "Capture a code snippet.",
    searchTerms: ["codeblock"],
    icon: <Code size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Table",
    description: "Insert a table.",
    searchTerms: ["table", "grid", "spreadsheet"],
    icon: <Table size={18} />,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Image",
    description: "Insert an image from URL.",
    searchTerms: ["image", "img", "picture", "photo"],
    icon: <ImageIcon size={18} />,
    command: ({ editor, range }) => {
      const imageUrl = prompt("Please enter image URL");
      if (imageUrl) {
        // Basic URL validation
        try {
          new URL(imageUrl);
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setImage({ src: imageUrl })
            .run();
        } catch {
          alert("Please enter a valid image URL");
        }
      }
    },
  },
  {
    title: "YouTube",
    description: "Embed a YouTube video.",
    searchTerms: ["youtube", "video", "embed"],
    icon: <Youtube size={18} />,
    command: ({ editor, range }) => {
      const youtubeUrl = prompt("Please enter YouTube URL");
      if (youtubeUrl) {
        // YouTube URL validation
        const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        if (youtubeRegex.test(youtubeUrl)) {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setYoutubeVideo({
              src: youtubeUrl,
            })
            .run();
        } else {
          alert("Please enter a valid YouTube URL");
        }
      }
    },
  },
  {
    title: "Twitter",
    description: "Embed a Tweet.",
    searchTerms: ["twitter", "embed"],
    icon: <Twitter size={18} />,
    command: ({ editor, range }) => {
      const tweetLink = prompt("Please enter Twitter Link");
      const tweetRegex = new RegExp(/^https?:\/\/(www\.)?x\.com\/([a-zA-Z0-9_]{1,15})(\/status\/(\d+))?(\/\S*)?$/);

      if (tweetRegex.test(tweetLink!)) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setTweet({
            src: tweetLink!,
          })
          .run();
      } else {
        if (tweetLink !== null) {
          alert("Please enter a correct Twitter Link");
        }
      }
    },
  },
]);

export const slashCommand = Command.configure({
  suggestion: {
    items: () => suggestionItems,
    render: renderItems,
  },
});
