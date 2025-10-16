import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { JSONContent } from "novel"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateTransformationPrompt(type: string, content: string): string {
  const prompts: Record<string, string> = {
    "summarize": `Please summarize the following text in a clear and concise way:\n\n${content}`,
    "expand": `Please expand on the following text, adding more detail and context:\n\n${content}`,
    "simplify": `Please simplify the following text, making it easier to understand:\n\n${content}`,
    "formal": `Please rewrite the following text in a more formal tone:\n\n${content}`,
    "casual": `Please rewrite the following text in a more casual, conversational tone:\n\n${content}`,
    "bullet-points": `Please convert the following text into bullet points:\n\n${content}`,
    "paragraph": `Please convert the following bullet points or list into a flowing paragraph:\n\n${content}`,
  }
  return prompts[type] || `Please ${type} the following text:\n\n${content}`
}

// Helper function to validate and sanitize JSONContent
export function validateAndSanitizeContent(content: JSONContent): JSONContent {
  // Ensure content has the correct structure
  if (!content || typeof content !== 'object' || content.type !== 'doc') {
    return { type: 'doc', content: [] };
  }

  // Ensure content.content is an array
  if (!Array.isArray(content.content)) {
    return { type: 'doc', content: [] };
  }

  // Sanitize each node in the content
  const sanitizedContent = content.content.map(node => {
    if (node.type === 'text' && node.text !== undefined) {
      // Ensure text nodes have string values, not nested objects
      if (typeof node.text === 'object') {
        return { type: 'text', text: '' };
      }
      return node;
    }
    return node;
  });

  return {
    type: 'doc',
    content: sanitizedContent
  };
}

// Helper function to create empty JSONContent
export function createEmptyContent(): JSONContent {
  return { type: 'doc', content: [] };
}

// Helper function to parse inline markdown formatting (bold, italic, code, etc.)
function parseInlineMarkdown(text: string): JSONContent[] {
  const result: JSONContent[] = [];
  let currentPos = 0;

  // Pattern for inline markdown: bold, italic, code, strikethrough
  const patterns = [
    { regex: /\*\*\*(.+?)\*\*\*/g, marks: ['bold', 'italic'] },
    { regex: /\*\*(.+?)\*\*/g, marks: ['bold'] },
    { regex: /__(.+?)__/g, marks: ['bold'] },
    { regex: /\*(.+?)\*/g, marks: ['italic'] },
    { regex: /_(.+?)_/g, marks: ['italic'] },
    { regex: /`(.+?)`/g, marks: ['code'] },
    { regex: /~~(.+?)~~/g, marks: ['strike'] },
  ];

  // Find all matches and their positions
  const matches: Array<{ start: number; end: number; text: string; marks: string[] }> = [];

  for (const { regex, marks } of patterns) {
    const regexCopy = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = regexCopy.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        marks: marks
      });
    }
  }

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Remove overlapping matches (keep first match)
  const filteredMatches: typeof matches = [];
  for (const match of matches) {
    const overlaps = filteredMatches.some(
      existing => !(match.end <= existing.start || match.start >= existing.end)
    );
    if (!overlaps) {
      filteredMatches.push(match);
    }
  }

  // Build the result with plain text and formatted text
  let lastEnd = 0;
  for (const match of filteredMatches) {
    // Add plain text before this match
    if (match.start > lastEnd) {
      const plainText = text.substring(lastEnd, match.start);
      if (plainText) {
        result.push({ type: "text", text: plainText });
      }
    }

    // Add formatted text
    const marks = match.marks.map(mark => ({ type: mark }));
    result.push({
      type: "text",
      text: match.text,
      marks: marks
    });

    lastEnd = match.end;
  }

  // Add remaining plain text
  if (lastEnd < text.length) {
    const plainText = text.substring(lastEnd);
    if (plainText) {
      result.push({ type: "text", text: plainText });
    }
  }

  // If no matches found, return the original text
  return result.length > 0 ? result : [{ type: "text", text }];
}

// Helper function to parse markdown table
function parseMarkdownTable(tableLines: string[]): JSONContent | null {
  if (tableLines.length < 2) return null;

  // Parse rows
  const rows = tableLines.map(line => {
    // Remove leading/trailing pipes and split by pipe
    const cells = line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
    return cells;
  });

  // Check if second row is separator (contains dashes)
  const hasSeparator = rows[1] && rows[1].every(cell => /^[-:\s]+$/.test(cell));
  const hasHeaderRow = hasSeparator;

  // Skip separator row if present
  const dataRows = hasSeparator ? [rows[0], ...rows.slice(2)] : rows;

  const tableContent: JSONContent[] = [];

  dataRows.forEach((row, rowIndex) => {
    const isHeader = hasHeaderRow && rowIndex === 0;
    const cellType = isHeader ? "tableHeader" : "tableCell";

    const rowContent: JSONContent[] = row.map(cellText => ({
      type: cellType,
      attrs: {
        colspan: 1,
        rowspan: 1,
        colwidth: null,
      },
      content: [{
        type: "paragraph",
        content: cellText ? parseInlineMarkdown(cellText) : [{ type: "text", text: "" }]
      }]
    }));

    tableContent.push({
      type: "tableRow",
      content: rowContent
    });
  });

  return {
    type: "table",
    content: tableContent
  };
}

// Helper function to convert markdown text to JSONContent
export function markdownToJSONContent(markdown: string): JSONContent {
  if (!markdown || !markdown.trim()) {
    return { type: "doc", content: [] };
  }

  const lines = markdown.split('\n');
  const content: JSONContent[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join('\n').trim();
      if (text) {
        content.push({
          type: "paragraph",
          content: parseInlineMarkdown(text)
        });
      }
      currentParagraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Empty line - flush current paragraph
    if (!trimmedLine) {
      flushParagraph();
      continue;
    }

    // Heading detection (## or #)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      const level = Math.min(headingMatch[1].length, 6) as 1 | 2 | 3 | 4 | 5 | 6;
      content.push({
        type: "heading",
        attrs: { level },
        content: parseInlineMarkdown(headingMatch[2])
      });
      continue;
    }

    // Unordered list item (- or *)
    const ulMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      // Check if previous item is a bulletList, if so add to it
      const lastItem = content[content.length - 1];
      if (lastItem && lastItem.type === "bulletList") {
        lastItem.content?.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: parseInlineMarkdown(ulMatch[1])
          }]
        });
      } else {
        content.push({
          type: "bulletList",
          content: [{
            type: "listItem",
            content: [{
              type: "paragraph",
              content: parseInlineMarkdown(ulMatch[1])
            }]
          }]
        });
      }
      continue;
    }

    // Ordered list item (1. 2. etc)
    const olMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      const lastItem = content[content.length - 1];
      if (lastItem && lastItem.type === "orderedList") {
        lastItem.content?.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: parseInlineMarkdown(olMatch[1])
          }]
        });
      } else {
        content.push({
          type: "orderedList",
          content: [{
            type: "listItem",
            content: [{
              type: "paragraph",
              content: parseInlineMarkdown(olMatch[1])
            }]
          }]
        });
      }
      continue;
    }

    // Code block detection (```...```)
    if (trimmedLine.startsWith('```')) {
      flushParagraph();
      const language = trimmedLine.slice(3).trim();
      const codeLines: string[] = [];
      i++; // Move to next line

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      content.push({
        type: "codeBlock",
        attrs: { language: language || null },
        content: [{ type: "text", text: codeLines.join('\n') }]
      });
      continue;
    }

    // Blockquote (>)
    const quoteMatch = trimmedLine.match(/^>\s+(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      content.push({
        type: "blockquote",
        content: [{
          type: "paragraph",
          content: parseInlineMarkdown(quoteMatch[1])
        }]
      });
      continue;
    }

    // Table detection (starts with |)
    if (trimmedLine.startsWith('|')) {
      flushParagraph();
      const tableLines: string[] = [trimmedLine];

      // Collect all consecutive table lines
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
        i++;
        tableLines.push(lines[i].trim());
      }

      // Parse table
      const parsedTable = parseMarkdownTable(tableLines);
      if (parsedTable) {
        content.push(parsedTable);
      }
      continue;
    }

    // Regular text - add to current paragraph
    currentParagraph.push(line);
  }

  // Flush any remaining paragraph
  flushParagraph();

  return {
    type: "doc",
    content: content.length > 0 ? content : []
  };
}

// Helper function to create JSONContent from text (plain text, no markdown parsing)
export function createContentFromText(text: string): JSONContent {
  return {
    type: "doc",
    content: text ? [
      {
        type: "paragraph",
        content: [{ type: "text", text }]
      }
    ] : []
  };
}

// Helper function to append text to existing JSONContent
export function appendTextToContent(existingContent: JSONContent, newText: string): JSONContent {
  if (!newText.trim()) {
    return existingContent;
  }

  // Ensure we have valid existing content
  const validatedContent = validateAndSanitizeContent(existingContent);

  // Create new paragraph with the transcribed text
  const newParagraph = {
    type: "paragraph",
    content: [{ type: "text", text: newText }]
  };

  // If there's existing content, add a line break and then the new content
  const updatedContent = [...(validatedContent.content || [])];

  // Add some spacing if there's existing content
  if (updatedContent.length > 0) {
    updatedContent.push({
      type: "paragraph",
      content: []
    });
  }

  updatedContent.push(newParagraph);

  return {
    type: "doc",
    content: updatedContent
  };
}


export const MAIN_LANGUAGES = [
  {
    value: "en",
    name: "English",
  },
  {
    value: "fr",
    name: "French",
  },
  {
    value: "es",
    name: "Spanish",
  },
  {
    value: "de",
    name: "German",
  },
  {
    value: "it",
    name: "Italian",
  },
  {
    value: "pt",
    name: "Portuguese",
  },
  {
    value: "ja",
    name: "Japanese",
  },
  {
    value: "ko",
    name: "Korean",
  },
  {
    value: "zh",
    name: "Chinese",
  },
];

export const RECORDING_TYPES: {
  name: string;
  value: string;
}[] = [
    {
      name: "Summary",
      value: "summary",
    },
    {
      name: "Quick Note",
      value: "quick-note",
    },
    {
      name: "List",
      value: "list",
    },
    {
      name: "Blog post",
      value: "blog",
    },
    {
      name: "Email",
      value: "email",
    },
    // {
    //   name: "Custom Prompt",
    //   value: "custom-prompt",
    // },
  ];

