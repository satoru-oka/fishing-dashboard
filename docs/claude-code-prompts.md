# Claude Code 用プロンプト集 — issue #48〜#63 消化プラン

レビュー結果（2026-06-12）の issue を効率的に消化する順序。各ステップのコードブロックをそのまま Claude Code に貼り付けて使う。1ステップ = 1 PR。進行管理は tracking issue #64 を参照。

前提: リポジトリは `satoru-oka/fishing-dashboard`。各 PR の説明に `Fixes #XX` を含めることでマージ時に issue が自動クローズされる。

---

## Step 1 — vite.config.ts セキュリティ修正（#48, #51）

既存ブランチ `codex/sam-19-secure-data-serving` の続きとして実施。

```text
GitHub issue #48 と #51 を修正してください。ブランチは既存の codex/sam-19-secure-data-serving を使います。

1. vite.config.ts の server.fs.allow: ['..'] を削除する。fs 設定が他に不要なら server.fs ごと削除してよい。port: 5173 は残す。
2. 同ファイルの dataFolderPlugin のミドルウェアに symlink 対策を追加する。fs.existsSync / isFile チェックの後に fs.realpathSync(filePath) で実パスを取得し、isInsideDataDir(realPath) で再検証。範囲外なら 404 を返す。

検証:
- npm run dev を起動し、以下を curl で確認:
  - GET /data/catches_enriched.csv → 200
  - GET /data/../package.json → 404
  - GET /data/%2e%2e/package.json → 404
  - GET /data/%2e%2e%2fpackage.json → 404
- npx tsc -b が通ること

完了したら commit して origin に push し、PR の説明に "Fixes #48, Fixes #51" を追記してください。
```

---

## Step 2 — eslint + vitest 導入、CI 整備（#54, #63）

以降の全修正の検証基盤になるため最優先。main から新ブランチ。

```text
GitHub issue #54 と #63 を対応してください。main から chore/tooling ブランチを切ってください。

1. eslint 導入 (#54):
   - eslint + typescript-eslint + eslint-plugin-react-hooks + eslint-plugin-react-refresh を devDependencies に追加
   - eslint.config.js (flat config) を作成。対象は src/**/*.{ts,tsx} と vite.config.ts
   - npm run lint を実行し、既存の警告・エラーをすべて解消する。ただし src/components/TimeSlider.tsx の eslint-disable-next-line react-hooks/exhaustive-deps は issue #62 で対応するため今回は残してよい
2. vitest 導入 (#63):
   - vitest を devDependencies に追加、package.json に "test": "vitest run" を追加
   - 次の純関数のユニットテストを作成:
     - src/lib/url-state.ts: filterToParams / paramsToFilter のラウンドトリップ。issue #52 のタイムゾーンバグ（toISOString による1日ずれ、to の end-of-day 欠落）を示すテストは test.fails でマークして含める（修正は別 PR）
     - src/lib/aggregations.ts: applyFilters / computeKpi / aggregateMonthlyBySpecies / topSpecies。境界ケース: 空配列、NaN の length_cm / weight_g / water_temp_c
     - src/lib/csv.ts: 不正行スキップ、release_flag の解釈、count 欠損時のフォールバック（fetch は vi.stubGlobal でモック）
3. CI: .github/workflows/ci.yml を新規作成。pull_request と push (main) で npm ci → lint → test → build を実行。permissions は contents: read のみ

検証: npm run lint / npm test / npm run build がすべて通ること（test.fails のテスト以外）。

完了したら PR を作成し、説明に "Fixes #54, Fixes #63" を含めてください。
```

---

## Step 3 — 日付タイムゾーンバグ修正（#52, #61）

同根（`toISOString()` の UTC 変換）なので1PR。Step 2 マージ後。

```text
GitHub issue #52 と #61 を修正してください。main から fix/date-timezone ブランチを切ってください。

1. src/lib/url-state.ts (#52):
   - 書き出し: toISOString().slice(0, 10) をやめ、date-fns の format(d, 'yyyy-MM-dd') でローカル日付として書き出す
   - 復元: new Date('YYYY-MM-DD')（UTC 解釈）をやめ、文字列を分解して new Date(y, m - 1, d) でローカル解釈する。to 側は date-fns の endOfDay() を適用して終了日全体が範囲に含まれるようにする
2. src/components/charts/ScatterChart.tsx L17 (#61):
   - ツールチップの r.caught_at.toISOString().slice(0, 10) を format(r.caught_at, 'yyyy-MM-dd') に置き換える
3. 既存テストで test.fails になっているタイムゾーン関連テストを通常のテストに戻し、ラウンドトリップ（filterToParams → paramsToFilter で同じ期間に戻る）を検証する

検証: npm test / npm run lint / npx tsc -b がすべて通ること。

完了したら PR を作成し、説明に "Fixes #52, Fixes #61" を含めてください。
```

---

## Step 4 — 小バグ2件（#53, #55）

```text
GitHub issue #53 と #55 を修正してください。main から fix/small-bugs ブランチを切ってください。

1. src/components/ActiveFilters.tsx (#53): 「フィルタなし — 全 166 件の釣果を表示中」のハードコードされた 166 を、useData() の rows.length に置き換える
2. src/lib/csv.ts (#55): count: num(r['count']) || 1 は count=0 も 1 に変換してしまう。
   const c = num(r['count']); として count: Number.isFinite(c) ? c : 1 に変更する
3. csv.ts のテストに count=0 の行が 0 のまま読み込まれる回帰テストを追加する

検証: npm test / npm run lint が通ること。

完了したら PR を作成し、説明に "Fixes #53, Fixes #55" を含めてください。
```

---

## Step 5 — 集計まわりリファクタ（#60 → #56 → #59）

テストが効く領域なので Step 2 のテスト整備後に安全に実施できる。

```text
GitHub issue #60、#56、#59 をこの順で1ブランチ（refactor/aggregations）で対応してください。main から切ってください。

1. #60: src/lib/aggregations.ts に共通の集計ヘルパを導入する。aggregateBySpot / spotStats / topSpecies に重複している「キーでグループ化して count 合計・length 平均（lenSum / lenN）・maxWeight を集計する」ループを、groupBy ヘルパまたは共通アキュムレータ関数に集約し、各関数は結果の整形だけを担うようにする。公開 API（関数シグネチャと戻り値）は変えないこと。既存のユニットテストが無修正で通ることが保証になる
2. #56: src/components/FiltersPanel.tsx L58-67 の speciesList。sort コンパレータ内で全行を走査して counts を再構築している（O(n²·log n)）。useMemo 内で counts の Map を1回だけ構築してから sort する形に変更
3. #59: src/components/charts/MonthlyStackedChart.tsx の traces 配列を useMemo(() => ..., [data]) でラップし、他チャートと統一する

検証: npm test / npm run lint / npm run build がすべて通ること。

完了したら PR を作成し、説明に "Fixes #56, Fixes #59, Fixes #60" を含めてください。
```

---

## Step 6 — UI リファクタ（#58 → #57）

見た目に関わるため独立 PR で目視確認しやすくする。

```text
GitHub issue #58 と #57 を対応してください。main から refactor/map-ui ブランチを切ってください。

1. #58: coral → sun → gold (#e76f51 → #f4a261 → #e9c46a) の線形補間が src/components/Map3D.tsx の colorForLength() と src/components/charts/TopSpeciesChart.tsx の gradient() に重複実装されている。src/theme.ts に lerpSunset(t: number): [number, number, number] のような共通関数を追加し、両者をそれに置き換える（RGBA タプル化や rgb() 文字列化は呼び出し側でラップ）
2. #57: src/components/Map3D.tsx のマウントアニメ（elevAnim state + requestAnimationFrame で約60回/秒の setState → ColumnLayer 再生成）を、deck.gl 標準の transitions に置き換える。ColumnLayer の transitions: { getElevation: { duration: 900 } } または elevationScale の transition を使い、elevAnim state と rAF の useEffect を削除する

検証:
- npm test / npm run lint / npx tsc -b が通ること
- npm run dev で起動し、(a) 地図の柱がマウント時に成長アニメすること、(b) 柱と Top10 チャートの配色が変更前と同一であることを目視確認

完了したら PR を作成し、説明に "Fixes #57, Fixes #58" を含めてください。
```

---

## Step 7 — exhaustive-deps 解消（#62）

eslint 導入（Step 2）後でないと検証できないため後半に配置。

```text
GitHub issue #62 を修正してください。main から refactor/timeslider-deps ブランチを切ってください。

src/components/TimeSlider.tsx L33-40 の useEffect に付いている eslint-disable-next-line react-hooks/exhaustive-deps を外し、依存配列に months（と必要なら dispatch）を含めても無限ループ・挙動変化が起きない形に整理してください。months は useMemo 済みで dataRange 変更時のみ参照が変わるため、単純に追加するだけで済む可能性が高いです。

検証:
- npm run lint が disable なしで通ること
- npm run dev でタイムスライダー操作・再生ボタン・RESET ボタンの挙動が変わらないこと

完了したら PR を作成し、説明に "Fixes #62" を含めてください。
```

---

## Step 8 — CI 強化と依存更新（#50, #49）

vite 8 メジャー更新はテスト整備後が安全なので最後。

```text
GitHub issue #50 と #49 を対応してください。main から chore/supply-chain ブランチを切ってください。

1. #50: .github/workflows/ 内の全ワークフロー（deploy.yml と ci.yml）で、uses: のタグ参照（@v4 等）をフルコミット SHA 固定に変更し、行末コメントでバージョンを併記する。.github/dependabot.yml を新規作成し、github-actions と npm の両エコシステムを weekly で有効化する
2. #49: vite を 8.x にメジャーアップグレードする（esbuild の moderate 脆弱性 GHSA 対応）。@vitejs/plugin-react も対応バージョンに更新。vite 8 の breaking changes（Node バージョン要件、デフォルト挙動の変更）を確認し、vite.config.ts を必要に応じて修正する

検証:
- npm audit で moderate 以上が 0 件になること
- npm run build / npm test / npm run lint が通ること
- npm run dev で起動し、/data/catches_enriched.csv が 200、/data/../package.json が 404 のままであること（Step 1 のセキュリティ修正のリグレッション確認）

完了したら PR を作成し、説明に "Fixes #49, Fixes #50" を含めてください。
```

---

## 進行チェックリスト

- [ ] Step 1: #48, #51 — vite.config.ts セキュリティ
- [ ] Step 2: #54, #63 — eslint / vitest / CI
- [ ] Step 3: #52, #61 — 日付 TZ バグ
- [ ] Step 4: #53, #55 — 小バグ
- [ ] Step 5: #56, #59, #60 — 集計リファクタ
- [ ] Step 6: #57, #58 — UI リファクタ
- [ ] Step 7: #62 — exhaustive-deps
- [ ] Step 8: #49, #50 — CI 強化・vite 8
