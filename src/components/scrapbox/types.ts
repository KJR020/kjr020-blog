/**
 * クライアント用の正規化されたページデータ型
 * Proxy（worker/_lib/cms-proxy.ts）の PageData と一致する
 */
export interface ScrapboxPageData {
  id: string;
  title: string;
  imageUrl: string | null;
  description: string;
  updatedAt: string;
  url: string;
}
