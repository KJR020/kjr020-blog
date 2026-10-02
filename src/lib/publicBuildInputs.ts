import path from "node:path";

/**
 * 公開入力に置いてはいけないファイル名。
 *
 * AIエージェント向けの指示ファイルは作業ディレクトリごとに置かれることがある。
 * 公開入力に混ざると、そのままサイトの一部として配信される。
 */
const forbiddenPageFileNames = new Set(["CLAUDE.md"]);

/** 中身がそのまま、またはルートとして公開されるディレクトリ。 */
export const PUBLIC_BUILD_INPUT_DIRS: readonly string[] = ["src/pages", "public"];

type PreparePublicBuildOptions = {
  publicInputDirs: readonly string[];
  outputDir: string;
  listFiles: (directory: string) => string[];
  removeOutputDir: (directory: string) => void;
};

function toPosixPath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

/** 公開入力に含まれる、公開してはいけないファイルのパスを昇順で返す。 */
export function findForbiddenPublicPageFiles(filePaths: string[]) {
  return filePaths
    .map(toPosixPath)
    .filter((filePath) => {
      const isPublicBuildInput = PUBLIC_BUILD_INPUT_DIRS.some(
        (directory) => filePath === directory || filePath.startsWith(`${directory}/`),
      );
      return isPublicBuildInput && forbiddenPageFileNames.has(path.posix.basename(filePath));
    })
    .sort();
}

/**
 * ビルド出力を初期化し、公開入力に含まれる公開禁止ファイルを返す。
 *
 * ファイル操作は引数で受け取り、検査の順序と判定だけをここで決める。
 */
export function preparePublicBuild({
  publicInputDirs,
  outputDir,
  listFiles,
  removeOutputDir,
}: PreparePublicBuildOptions) {
  removeOutputDir(outputDir);
  const publicInputFiles = publicInputDirs.flatMap(listFiles);
  return findForbiddenPublicPageFiles(publicInputFiles);
}
