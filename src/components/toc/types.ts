/** 見出し情報 */
export interface HeadingItem {
  /** 見出し要素のID（アンカーリンク用） */
  id: string;
  /** 見出しのテキスト */
  text: string;
  /** 見出しレベル（2 = h2, 3 = h3） */
  level: 2 | 3;
}

/** useScrollSpyのオプション */
export interface UseScrollSpyOptions {
  /** Observerのrootマージン（ヘッダー高さ考慮） */
  rootMargin?: string;
  /** 検出閾値 */
  threshold?: number | number[];
}

/** useScrollSpyの戻り値 */
export interface UseScrollSpyReturn {
  /** 現在アクティブな見出しのID */
  activeId: string | null;
}

/** TableOfContentsのprops */
export interface TableOfContentsProps {
  /** 記事内の見出し一覧 */
  headings: HeadingItem[];
  /** 表示するレイアウト */
  variant?: "responsive" | "mobile" | "desktop";
  /** カスタムクラス名 */
  className?: string;
  /** アバター画像のパス（public/からの相対パス、例: "/images/kuri_photo.png"） */
  avatarSrc?: string;
  /** アバターの代替テキスト */
  avatarAlt?: string;
}

/** TOCListのprops */
export interface TOCListProps {
  headings: HeadingItem[];
  activeId: string | null;
  onItemClick?: (id: string) => void;
  /** アバター画像のパス（デスクトップのみ表示） */
  avatarSrc?: string;
  /** アバターの代替テキスト */
  avatarAlt?: string;
}

/** MobileTOCのprops */
export interface MobileTOCProps {
  headings: HeadingItem[];
  activeId: string | null;
  onItemClick?: (id: string) => void;
}
