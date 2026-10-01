const copyIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
`;

const copiedIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
`;

const languageNames: Readonly<Record<string, string>> = {
  astro: "Astro",
  bash: "Bash",
  css: "CSS",
  html: "HTML",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  shell: "Shell",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  yaml: "YAML",
  yml: "YAML",
};

function formatLanguage(language: string): string {
  return languageNames[language.toLowerCase()] ?? language;
}

function createCopyButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "copy-button";
  button.setAttribute("aria-label", "コードをコピー");
  button.innerHTML = copyIcon;
  return button;
}

function resetCopyButton(button: HTMLButtonElement, status: HTMLElement): void {
  button.classList.remove("copied");
  button.setAttribute("aria-label", "コードをコピー");
  button.innerHTML = copyIcon;
  status.textContent = "";
}

function bindCopyAction(button: HTMLButtonElement, pre: HTMLPreElement, status: HTMLElement): void {
  button.addEventListener("click", async () => {
    const code = pre.querySelector("code")?.textContent ?? pre.textContent ?? "";

    try {
      await navigator.clipboard.writeText(code);
    } catch {
      button.setAttribute("aria-label", "コピーできませんでした");
      status.textContent = "コードをコピーできませんでした";
      return;
    }

    button.classList.add("copied");
    button.setAttribute("aria-label", "コピーしました");
    button.innerHTML = copiedIcon;
    status.textContent = "コードをコピーしました";

    window.setTimeout(() => resetCopyButton(button, status), 2000);
  });
}

function enhanceCodeBlock(pre: HTMLPreElement): void {
  if (pre.dataset.articleCodeEnhanced === "true") return;

  const language = pre.dataset.language;
  if (!language) return;

  pre.dataset.articleCodeEnhanced = "true";

  const parent = pre.parentElement;
  const reusableParent =
    parent?.classList.contains("demo") && parent.childElementCount === 1 ? parent : null;
  const container = reusableParent ?? document.createElement("div");
  container.classList.add("article-code-example");

  const languageLabel = document.createElement("span");
  languageLabel.className = "article-code-language";
  languageLabel.setAttribute("aria-label", "コードの言語");
  languageLabel.textContent = formatLanguage(language);

  const frame = document.createElement("div");
  frame.className = "code-block-wrapper";

  const copyButton = createCopyButton();
  const status = document.createElement("p");
  status.className = "copy-status";
  status.dataset.copyStatus = "";
  status.setAttribute("aria-live", "polite");

  if (!reusableParent) pre.parentNode?.insertBefore(container, pre);
  container.append(languageLabel, frame, status);
  frame.append(pre, copyButton);
  bindCopyAction(copyButton, pre, status);
}

/**
 * 記事内のコードブロックへ、言語ラベルとコピーボタンを追加する。
 *
 * 処理済みのブロックには印を付けるため、同じ要素に対して繰り返し呼んでも二重には追加しない。
 */
export function enhanceArticleCodeBlocks(root: ParentNode = document): void {
  root.querySelectorAll<HTMLPreElement>("pre[data-language]").forEach((pre) => {
    enhanceCodeBlock(pre);
  });
}
