# Supply Chain Security

npmパッケージとGitHub Actionsのサプライチェーン侵害を前提に、依存の追加・更新とCI実行時の運用ルールを定義する。

## 概要

設定値は各設定ファイルを正本とし、この文書は何をなぜ防ぐかと、人が確認する手順を定める。

| 対象 | 正本 |
| --- | --- |
| pnpmのバージョン | `package.json`の`packageManager` |
| registry | `.npmrc` |
| install時の防御とbuild scriptの許可 | `pnpm-workspace.yaml` |
| 依存の自動更新 | `.github/dependabot.yml` |
| workflowの権限とactionsの固定 | `.github/workflows/` |

## パッケージマネージャ

- pnpmだけを使い、lockfileを`pnpm-lock.yaml`に一本化する
  - `package-lock.json`と`yarn.lock`は追加しない
- registryを1つに統一する
  - CIとDependabotでは`TAKUMI_GUARD_TOKEN`をsecretから渡す
- CIは`pnpm install --frozen-lockfile`を使う
  - lockfileとmanifestの不整合を検出するため

## install時の防御

- 公開直後のpackageを即時導入しない
  - 侵害されたバージョンは公開から短時間で取り下げられることが多いため
  - `minimumReleaseAge`で待機時間を設ける
- transitive dependencyのexotic specifierをブロックする
  - registryを経由しない取得元を、依存の依存から持ち込ませないため
  - `blockExoticSubdeps`を有効にする
- 未審査のinstall scriptとpostinstall scriptを失敗扱いにする
  - `strictDepBuilds`を有効にし、build scriptを許可するpackageを`allowBuilds`に明示する

依存を追加・更新した後は、次を確認する。

```shell
pnpm install --frozen-lockfile
pnpm ignored-builds
```

`pnpm ignored-builds`に未審査のpackageが出た場合は、必要性を確認して`allowBuilds`に`true`または`false`を明示する。

## 依存追加時のレビュー観点

- 既存依存で代替できないか
- 直接依存として入れる必要があるか
- `install`、`postinstall`、`prepare`などのlifecycle scriptを持つか
- lockfile差分に想定外のtransitive dependencyが増えていないか
- メンテナンス状況、直近リリース頻度、issueやadvisoryの状況に不自然さがないか

## GitHub Actions

- third-party actionsはfull-length commit SHAで固定する
  - tagは付け替えられるため
  - SHAの右側にtagコメントを残し、Dependabotが更新PRで追従できるようにする
- workflowの`permissions`は最小権限を明示する

## 依存更新

- Dependabotでnpm依存とGitHub Actionsを定期更新する
  - npmとGitHub Actionsの更新は別PRに分ける
- Dependabot PRでも`pnpm ignored-builds`の結果とlockfile差分を確認する

## 関連ファイル

- [pnpm-workspace.yaml](../../pnpm-workspace.yaml) - install時の防御とbuild scriptの許可
- [dependabot.yml](../../.github/dependabot.yml) - 依存の自動更新
- [CI workflow](../../.github/workflows/ci.yml) - `--frozen-lockfile`とactionsの固定
