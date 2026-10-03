# サプライチェーンセキュリティ

npmパッケージとGitHub Actionsの依存関係を追加・更新するときの確認規則を定義する。サプライチェーン侵害による不正なコードの導入リスクを減らすため、取得元と実行権限を制限する。

## パッケージマネージャ

- pnpm 11.xを使う。GitHub Actionsは`package.json`の`packageManager`からpnpmのバージョンを決定する
- ロックファイルは`pnpm-lock.yaml`に一本化する。`package-lock.json` / `yarn.lock`は追加しない
- レジストリは`.npmrc`の`https://npm.flatt.tech`に統一する。CIとDependabotでは`TAKUMI_GUARD_TOKEN`をsecretから渡す
- CIは`pnpm install --frozen-lockfile`を使い、ロックファイルと`package.json`の不整合を検出する

## pnpm install時の防御

- `minimumReleaseAge`で、公開直後のnpmパッケージを即時導入しない
- `blockExoticSubdeps`で、間接依存の特殊な指定方法(exotic specifier)をブロックする
- `strictDepBuilds`と`allowBuilds`で、未審査のインストールスクリプトを失敗扱いにする
- ビルドスクリプトを許可するパッケージは`pnpm-workspace.yaml`の`allowBuilds`に明示する

各防御設定の値と、パッケージごとの許可・禁止は[pnpm設定](../../pnpm-workspace.yaml)を正本とする。文書には値や一覧を複製せず、変更時は対象パッケージの必要性とインストールスクリプトの内容をレビューする。

依存を追加・更新した後は、次のコマンドを実行する。

```shell
pnpm install --frozen-lockfile
pnpm ignored-builds
```

`pnpm ignored-builds`に未審査のパッケージが出た場合は、必要性を確認して`allowBuilds`に`true`または`false`を明示する。

## 依存追加時のレビュー観点

- 既存依存で代替できないか
- 直接依存として入れる必要があるか
- `install` / `postinstall` / `prepare`などのライフサイクルスクリプトを持つか
- ロックファイルの差分に想定外の間接依存が増えていないか
- メンテナンス状況、直近リリース頻度、Issueやセキュリティアドバイザリの状況に不自然さがないか
- GitHub Actionsを追加する場合は完全なコミットSHAで固定し、対応するタグを同じ行のコメントに残す

## GitHub Actions

- 第三者のGitHub Actionsは完全なコミットSHAで固定する
- SHAの右側にタグのコメントを残し、Dependabotが更新PRで追従できるようにする
- workflowの`permissions`は最小権限を明示する。CIは`contents: read`、deployは`contents: read`と`deployments: write`のみを基本とする

## 依存更新

- Dependabotでnpm依存とGitHub Actionsを週次更新する
- npmとGitHub Actionsの更新は別PRに分ける
- Dependabotのnpm更新には、Dependabot secretとして`TAKUMI_GUARD_TOKEN`を登録する
- Dependabot PRでも`pnpm ignored-builds`の結果とロックファイルの差分を確認する
