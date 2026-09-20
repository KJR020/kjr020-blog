# Supply Chain Security

npmパッケージとGitHub Actionsのサプライチェーン侵害を前提に、依存追加・依存更新・CI実行時の運用ルールを定義する。

## パッケージマネージャ

- pnpm 11.xを使う。GitHub Actionsは`package.json`の`packageManager`からpnpm versionを決定する
- lockfileは`pnpm-lock.yaml`に一本化する。`package-lock.json` / `yarn.lock`は追加しない
- registryは`.npmrc`の`https://npm.flatt.tech`に統一する。CIとDependabotでは`TAKUMI_GUARD_TOKEN`をsecretから渡す
- CIは`pnpm install --frozen-lockfile`を使い、lockfileとmanifestの不整合を検出する

## pnpm install時の防御

- `minimumReleaseAge: 1440`で、公開直後のnpm packageを即時導入しない
- `blockExoticSubdeps: true`で、transitive dependencyのexotic specifierをブロックする
- `strictDepBuilds: true`と`allowBuilds`で、未審査のinstall script / postinstall scriptを失敗扱いにする
- build scriptを許可するpackageは`pnpm-workspace.yaml`の`allowBuilds`に明示する

現在の許可方針:

| Package | Policy | Reason |
|---|---|---|
| `esbuild` | allow | Astro / Vite 系ツールチェーンで必要 |
| `sharp` | allow | Astro の画像処理で利用 |
| `workerd` | deny | 通常の lint / test / build では不要 |

依存を追加・更新した後は、次を確認する:

```shell
pnpm install --frozen-lockfile
pnpm ignored-builds
```

`pnpm ignored-builds`に未審査のpackageが出た場合は、必要性を確認して`allowBuilds`に`true`または`false`を明示する。

## 依存追加時のレビュー観点

- 既存依存で代替できないか
- 直接依存として入れる必要があるか
- `install` / `postinstall` / `prepare`などのlifecycle scriptを持つか
- lockfile差分に想定外のtransitive dependencyが増えていないか
- メンテナンス状況、直近リリース頻度、issue / advisoryの状況に不自然さがないか
- GitHub Actionsを追加する場合はfull-length commit SHAで固定し、対応するtagを同じ行のコメントに残す

## GitHub Actions

- third-party actionsはfull-length commit SHAで固定する
- SHAの右側にtagコメントを残し、Dependabotが更新PRで追従できるようにする
- workflowの`permissions`は最小権限を明示する。CIは`contents: read`、deployは`contents: read`と`deployments: write`のみを基本とする

## 依存更新

- Dependabotでnpm依存とGitHub Actionsを週次更新する
- npmとGitHub Actionsの更新は別PRに分ける
- Dependabotのnpm更新には、Dependabot secretとして`TAKUMI_GUARD_TOKEN`を登録する
- Dependabot PRでも`pnpm ignored-builds`の結果とlockfile差分を確認する
