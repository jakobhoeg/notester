import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// Helper to detect if text is a markdown table
function isMarkdownTable(text: string): boolean {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return false;

  // Check if lines start with |
  const hasTableFormat = lines.every(line => line.trim().startsWith('|') && line.trim().endsWith('|'));

  // Check if there's a separator row (second row typically)
  const hasSeparator = lines.some(line => {
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    return cells.length > 0 && cells.every(cell => /^[-:\s]+$/.test(cell));
  });

  return hasTableFormat && hasSeparator;
}

// Helper to parse markdown table into Tiptap table structure
function parseMarkdownTable(text: string) {
  const lines = text.trim().split('\n');

  const rows = lines.map(line => {
    return line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
  });

  // Find separator row
  const separatorIndex = rows.findIndex(row =>
    row.every(cell => /^[-:\s]+$/.test(cell))
  );

  const hasHeaderRow = separatorIndex > 0;
  const headerRow = hasHeaderRow ? rows[0] : null;
  const dataRows = hasHeaderRow
    ? rows.slice(separatorIndex + 1)
    : rows.filter((_, idx) => idx !== separatorIndex);

  const tableRows = [];

  // Add header row
  if (headerRow) {
    const headerCells = headerRow.map(cellText => ({
      type: 'tableHeader',
      content: [{
        type: 'paragraph',
        content: cellText ? [{ type: 'text', text: cellText }] : []
      }]
    }));

    tableRows.push({
      type: 'tableRow',
      content: headerCells
    });
  }

  // Add data rows
  dataRows.forEach(row => {
    const cells = row.map(cellText => ({
      type: 'tableCell',
      content: [{
        type: 'paragraph',
        content: cellText ? [{ type: 'text', text: cellText }] : []
      }]
    }));

    tableRows.push({
      type: 'tableRow',
      content: cells
    });
  });

  return {
    type: 'table',
    content: tableRows
  };
}

export const MarkdownTablePaste = Extension.create({
  name: 'markdownTablePaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownTablePaste'),
        props: {
          handlePaste: (view, event, slice) => {
            const text = event.clipboardData?.getData('text/plain');

            if (!text) return false;

            // Check if it's a markdown table
            if (isMarkdownTable(text)) {
              const tableNode = parseMarkdownTable(text);
              const { tr } = view.state;
              const { from } = view.state.selection;

              // Insert the table
              const node = view.state.schema.nodeFromJSON(tableNode);
              tr.replaceSelectionWith(node);
              view.dispatch(tr);

              return true; // Handled
            }

            return false; // Not handled, let other handlers process
          },
        },
      }),
    ];
  },
});

