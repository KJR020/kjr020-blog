export interface PostSummary {
  id: string;
  data: {
    title: string;
    date: Date;
    tags?: string[];
    description?: string;
  };
  /** 本文冒頭の抜粋。descriptionがない記事の紹介に使う */
  excerpt?: string;
}
