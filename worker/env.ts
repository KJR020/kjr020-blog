/** Worker の実行時バインディング。wrangler.toml の [assets] binding と Secret に対応する。 */
export interface Env {
  SCRAPBOX_SID: string;
  ASSETS: Fetcher;
}
