import "@tanstack/react-start/server-only";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

import type { SnippetLang } from "./snippets";

let highlighter: Promise<HighlighterCore> | undefined;

function loadHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [import("shiki/themes/github-light.mjs"), import("shiki/themes/github-dark.mjs")],
    langs: [
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/javascript.mjs"),
      import("shiki/langs/python.mjs"),
      import("shiki/langs/json.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

const shikiLang: Record<SnippetLang, string> = {
  bash: "bash",
  js: "javascript",
  python: "python",
  json: "json",
};

/** HTML with both themes as CSS variables; styles.css picks one by the `.dark` class. */
export async function highlight(code: string, lang: SnippetLang) {
  const core = await loadHighlighter();
  const lines = code.split("\n");
  return core.codeToHtml(code, {
    lang: shikiLang[lang],
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
    transformers: [
      {
        line(node, number) {
          const indent = lines[number - 1]?.search(/\S/) ?? 0;
          node.properties.style = `--indent:${Math.max(indent, 0)}ch`;
        },
      },
    ],
  });
}
