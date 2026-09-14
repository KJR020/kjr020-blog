# サムネイル公開artifactの運用

生成キャッシュと公開画像の保持を分けます。公開前に、そのビルドが現在参照する`dist/generated-images/`と`dist/generated-images-manifest.json`だけをartifactへ保存し、保存後に直前公開画像のcard/ogpディレクトリをdistへコピーします。manifestは上書きしません。前回から引き継いだ画像を次のartifactへ再帰的に保存しません。

artifact名は`published-generated-images-{run_id}-{run_attempt}`、保持期間は30日です。download時のルートは`generated-images/card/`、`generated-images/ogp/`、`generated-images-manifest.json`です。恒久保存は保証しません。

復元処理は直近20runを確認し、`Deploy to Cloudflare Pages`のstepが成功したrunを選びます。workflow全体が失敗していても公開stepの成功を確認します。前回commitのgit treeを取得し、この保持scriptが存在しなかった場合だけ初回導入として続行します。API取得失敗、artifact期限切れ・欠損、対象runの特定失敗はデプロイを止めます。

既知の制限: runの再実行で以前のattemptだけが公開成功した場合、および20runより古いrunの再実行で公開した場合の特定は未対応です。この条件での自動運用開始前に復元対象選択を拡張する必要があります。通常のmain pushによる既存deploy経路を対象とします。

復元失敗時は公開済みサイトをそのまま維持し、元の生成環境・commitから画像を復元するか、保持期間内の正しいartifactを取得して復旧します。失敗を初回扱いして無条件に継続しないでください。30日以上デプロイが空いた場合も復旧が必要です。

検証: `bash scripts/test-thumbnail-deployment-artifact.sh`。初回導入、正常復元、API失敗、git tree取得失敗、artifact欠損をモックで再現します。実際のCloudflare配信検証はPRマージ後に行います。
