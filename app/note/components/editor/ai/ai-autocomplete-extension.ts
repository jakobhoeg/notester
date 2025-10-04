import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { builtInAI, doesBrowserSupportBuiltInAI } from '@built-in-ai/core';
import { generateText } from 'ai';
import { AUTOCOMPLETE_SYSTEM_PROMPT } from '@/app/constants/prompts';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Command } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiAutocomplete: {
      toggleAutocomplete: () => ReturnType;
      clearAutocompleteSuggestion: () => ReturnType;
    };
  }
}

export interface AutocompleteOptions {
  debounceMs: number;
  minChars: number;
  maxSuggestionLength: number;
  enabled: boolean;
}

export interface AutocompleteSuggestion {
  text: string;
  position: number;
  isStreaming?: boolean;
}

export const AutocompletePluginKey = new PluginKey('ai-autocomplete');

export const AIAutocompleteExtension = Extension.create<AutocompleteOptions>({
  name: 'aiAutocomplete',

  addOptions() {
    return {
      debounceMs: 500,
      minChars: 5,
      maxSuggestionLength: 250,
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    let debounceTimer: NodeJS.Timeout | null = null;
    let currentController: AbortController | null = null;

    function createDecorations(doc: ProseMirrorNode, suggestion: AutocompleteSuggestion) {
      if (!suggestion || suggestion.position > doc.content.size) {
        return DecorationSet.empty;
      }

      const decoration = Decoration.widget(
        suggestion.position,
        () => {
          const span = document.createElement('span');
          span.className = suggestion.isStreaming
            ? 'ai-autocomplete-suggestion streaming'
            : 'ai-autocomplete-suggestion';
          span.textContent = suggestion.text;
          span.style.display = 'inline-block';
          span.style.whiteSpace = 'nowrap';
          span.style.maxWidth = '300px';
          span.style.overflow = 'visible';

          return span;
        },
        {
          side: 1,
          // No key to force recreation every time
        }
      );

      return DecorationSet.create(doc, [decoration]);
    }

    return [
      new Plugin({
        key: AutocompletePluginKey,

        state: {
          init() {
            return {
              suggestion: null as AutocompleteSuggestion | null,
              decorations: DecorationSet.empty,
            };
          },

          apply(tr: Transaction, oldState: any) {
            const meta = tr.getMeta(AutocompletePluginKey);

            if (meta) {
              if (meta.type === 'setSuggestion') {
                const suggestion = meta.suggestion as AutocompleteSuggestion | null;
                return {
                  suggestion,
                  decorations: suggestion
                    ? createDecorations(tr.doc, suggestion)
                    : DecorationSet.empty,
                };
              }

              if (meta.type === 'clearSuggestion') {
                return {
                  suggestion: null,
                  decorations: DecorationSet.empty,
                };
              }
            }

            // Clear suggestions on document changes unless it's just cursor movement
            if (tr.docChanged) {
              return {
                suggestion: null,
                decorations: DecorationSet.empty,
              };
            }

            // Always recreate decorations to ensure updates
            return {
              ...oldState,
              decorations: oldState.suggestion
                ? createDecorations(tr.doc, oldState.suggestion)
                : DecorationSet.empty,
            };
          },
        },

        props: {
          decorations(state) {
            return this.getState(state)?.decorations;
          },

          handleKeyDown(view, event) {
            const state = this.getState(view.state);

            // Accept suggestion with Tab or Right Arrow
            if (state?.suggestion && !state.suggestion.isStreaming) {
              if (event.key === 'Tab' || event.key === 'ArrowRight') {
                event.preventDefault();

                const { suggestion } = state;
                const tr = view.state.tr.insertText(
                  suggestion.text,
                  suggestion.position
                );

                // Clear the suggestion
                tr.setMeta(AutocompletePluginKey, {
                  type: 'clearSuggestion',
                });

                view.dispatch(tr);
                return true;
              }

              // Dismiss suggestion with Escape
              if (event.key === 'Escape') {
                event.preventDefault();

                const tr = view.state.tr.setMeta(AutocompletePluginKey, {
                  type: 'clearSuggestion',
                });

                view.dispatch(tr);
                return true;
              }
            }

            return false;
          },

          handleTextInput(view: EditorView, from: number, to: number, text: string) {
            if (!options.enabled) return false;

            // Clear existing timer and controller
            if (debounceTimer) {
              clearTimeout(debounceTimer);
            }
            if (currentController) {
              currentController.abort();
            }

            // Clear current suggestion immediately on text input
            const clearTr = view.state.tr.setMeta(AutocompletePluginKey, {
              type: 'clearSuggestion',
            });
            view.dispatch(clearTr);

            // Set up debounced suggestion generation
            debounceTimer = setTimeout(async () => {
              await generateSuggestion(view, from + text.length);
            }, options.debounceMs);

            return false;
          },
        },
      }),
    ];

    async function generateSuggestion(view: EditorView, position: number) {
      if (!doesBrowserSupportBuiltInAI()) {
        return;
      }

      try {
        // Get text before cursor
        const doc = view.state.doc;
        const textBefore = doc.textBetween(0, position);

        // Check if we have enough context
        if (textBefore.trim().length < options.minChars) {
          return;
        }

        // Get the last few sentences for context
        const sentences = textBefore.split(/[.!?]+/).filter((s: string) => s.trim());
        const contextSentences = sentences.slice(-3).join('. ').trim();
        console.log(sentences)
        console.log(contextSentences)

        if (!contextSentences) return;

        // Create new abort controller for this request
        currentController = new AbortController();

        const model = builtInAI();
        const availability = await model.availability();

        if (availability === 'unavailable') {
          const clearTr = view.state.tr.setMeta(AutocompletePluginKey, {
            type: 'clearSuggestion',
          });
          view.dispatch(clearTr);
          return;
        }

        // If model needs downloading, skip autocomplete to avoid interrupting user
        if (availability === 'downloadable') {
          const clearTr = view.state.tr.setMeta(AutocompletePluginKey, {
            type: 'clearSuggestion',
          });
          view.dispatch(clearTr);
          return;
        }

        const systemPrompt = AUTOCOMPLETE_SYSTEM_PROMPT;

        const userPrompt = `Context: "${contextSentences}"

        Provide a natural continuation for this text:`;

        const { text } = await generateText({
          model,
          system: systemPrompt,
          prompt: userPrompt,
          abortSignal: currentController.signal,
        });

        let suggestion = text.trim();

        // Limit suggestion length
        if (suggestion.length > options.maxSuggestionLength) {
          suggestion = suggestion.substring(0, options.maxSuggestionLength);
        }

        console.log('AI Autocomplete - Generated suggestion:', suggestion, 'Length:', suggestion.length);

        if (suggestion && !currentController.signal.aborted) {
          // Display the complete suggestion
          const finalTr = view.state.tr.setMeta(AutocompletePluginKey, {
            type: 'setSuggestion',
            suggestion: {
              text: suggestion,
              position,
              isStreaming: false,
            },
          });
          view.dispatch(finalTr);
          console.log('AI Autocomplete - Suggestion displayed');
        } else {
          // Clear suggestion if no text was generated or request was aborted
          const clearTr = view.state.tr.setMeta(AutocompletePluginKey, {
            type: 'clearSuggestion',
          });
          view.dispatch(clearTr);
          console.log('AI Autocomplete - Cleared suggestion (no text generated or aborted)');
        }

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Request was cancelled, ignore
        }

        console.error('Error generating autocomplete suggestion:', error);

        // Clear loading state on error
        const clearTr = view.state.tr.setMeta(AutocompletePluginKey, {
          type: 'clearSuggestion',
        });
        view.dispatch(clearTr);
      }
    }
  },

  addCommands() {
    return {
      toggleAutocomplete: () => ({ editor }) => {
        this.options.enabled = !this.options.enabled;
        return true;
      },

      clearAutocompleteSuggestion: () => ({ tr, dispatch }) => {
        if (dispatch) {
          const newTr = tr.setMeta(AutocompletePluginKey, {
            type: 'clearSuggestion',
          });
          dispatch(newTr);
        }
        return true;
      },
    };
  },
});
