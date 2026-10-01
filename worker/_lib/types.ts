/** Cosense API `GET /api/pages/:project` が返すページ1件。 */
export interface ScrapboxApiPage {
  id: string;
  title: string;
  image: string | null;
  descriptions: string[];
  /** 最終更新日時（Unix秒）。 */
  updated: number;
  created: number;
  views: number;
  linked: number;
  linesCount: number;
  pin: number;
}
