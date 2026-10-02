/**
 * 記事一覧と記事ヘッダーで使う派生情報。
 * Markdown本文から抜粋を作る。
 */

/** Markdown記法とコードを取り除き、読者が読む文字だけを残す */
export function toPlainText(markdown: string): string {
  return (
    markdown
      // コードブロックとHTMLコメント
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      // HTMLタグ
      .replace(/<[^>]+>/g, " ")
      // 画像
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      // リンクはテキストだけ残す
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // 脚注参照と定義
      .replace(/\[\^[^\]]+\]:?/g, " ")
      // 単独URL
      .replace(/https?:\/\/\S+/g, " ")
      // 見出し・引用・リスト・Callout記号
      .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
      .replace(/^\s*\[![a-z]+\][^\n]*$/gim, " ")
      // 表の区切り
      .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, " ")
      .replace(/\|/g, " ")
      // 強調とインラインコード
      .replace(/[*_~`]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** 本文の冒頭から、文の切れ目を優先して抜粋を作る */
export function createExcerpt(markdown: string, maxLength = 120): string {
  const text = toPlainText(markdown);
  const characters = Array.from(text);
  if (characters.length <= maxLength) {
    return text;
  }

  const clipped = characters.slice(0, maxLength).join("");
  const sentenceEnd = clipped.lastIndexOf("。");
  if (sentenceEnd >= maxLength * 0.5) {
    return clipped.slice(0, sentenceEnd + 1);
  }
  return `${clipped}…`;
}
