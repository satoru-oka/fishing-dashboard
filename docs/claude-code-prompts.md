# Claude Code 用プロンプト集 — レビュー issue 消化プラン（2026-06-12 改訂版）

2026-06-12 のコードレビュー issue のうち、main の #39 / #41 マージ後も残っている11件（#48 #49 #50 #51 #55 #57 #59 #60 #61 #62 #63）を消化する順序。各ステップのコードブロックをそのまま Claude Code に貼り付けて使う。1ステップ = 1 PR。進行管理は tracking issue #64 を参照。

前提: リポジトリは `satoru-oka/fishing-dashboard`。各 PR の説明に `Fixes #XX` を含めることでマージ時に issue が自動クローズされる。**全ブランチは最新の main から切ること。**

---

## Step 1 — vite.config.ts セキュリティ修正（#48, #51）

```text
GitHub issue #48 と #51 を修正してください。最新の main から fix/secure-data-serving ブランチを切ってください。

vite.config.ts に対して:
1. server.fs.allow: ['..'] を削除する（#48）。fs 設定が他に不要なら server.fs ごと削除してよい。port: 5173 は残す。
2. dataFolderPlugin のミドルウェアを強化する（#51）:
   - 拡張子チェックを追加: path.extname が .csv 以外なら 404（#39 のリファクタで消失したホワイトリストの復活）
   - fs.existsSync / isFile チェックの後に fs.realpathSync(filePath) で実パスを取得し、isInsideDir(dataDir, realPath) で再検証。範囲外なら 404
   - 範囲外アクセス時のステータスを 403 から 404 に変更（パス探索のヒントを与えない）

検証:
- npm run dev を起動し、curl で確認:
  - GET /data/catches_enriched.csv → 200
  - GET /data/../package.json → 404
  - GET /data/%2e%2e/package.json → 404
  - GET /data/%2e%2e%2fpackage.json → 404
  - data/ 内に外部を指す symlink を一時作成し → 404 になること（確認後削除）
- npx tsc -b と npm run lint が通ること

完了したら PR を作成し、説明に "Fixes #48, Fixes #51" を含めてください。
```

---

## Step 2 — vitest 導入とテスト整備（#63）

以降の全修正の検証基盤になるため最優先。

```text
GitHub issue #63 を対応してください。最新の main から chore/vitest ブランチを切ってください。

1. vitest を devDependencies に追加し、package.json に "test": "vitest run" を追加
2. 次の純関数のユニットテストを作成:
   - src/lib/url-state.ts: filterToParams / paramsToFilter のラウンドトリップ。#52 で修正済みのタイムゾーン挙動（ローカル日付で書き出し・復元、to が 23:59:59.999 になる）の回帰テストを含める
   - src/lib/aggregations.ts: applyFilters / computeKpi / aggregateMonthlyBySpecies / topSpecies。境界ケース: 空配列、NaN の length_cm / weight_g / water_temp_c
   - src/lib/csv.ts: 不正行スキップ、release_flag の解釈、count 欠損時のフォールバック（fetch は vi.stubGlobal でモック）。count=0 の行の現状動作（1 になる既知バグ #55）は test.fails でマークして含める
3. 既存の .github/workflows/ci.yml に npm test ステップを追加

検証: npm run lint / npm test / npm run build がすべて通ること（test.fails 以外）。

完了したら PR を作成し、説明に "Fixes #63" を含めてください。
```

---

## Step 3 — 小修正2件（#55, #61）

```text
GitHub issue #55 と #61 を修正してください。最新の main から fix/small-bugs ブランチを切ってください。

1. src/lib/csv.ts (#55): count: num(r['count']) || 1 は count=0 も 1 に変換してしまう。
   const c = num(r['count']); として count: Number.isFinite(c) ? c : 1 に変更する
2. src/components/charts/ScatterChart.tsx L17 (#61): ツールチップの r.caught_at.toISOString().slice(0, 10) を date-fns の format(r.caught_at, 'yyyy-MM-dd') に置き換える（UTC 変換による日付ずれの解消）
3. csv.ts テストで test.fails になっている count=0 のテストを通常のテストに戻す

検証: npm test / npm run lint が通ること。

完了したら PR を作成し、説明に "Fixes #55, Fixes #61" を含めてください。
```

---

## Step 4 — 集計まわりリファクタ（#60 → #59）

Step 2 のテストが安全網になる。

```text
GitHub issue #60 と #59 をこの順で対応してください。最新の main から refactor/aggregations ブランチを切ってください。

1. #60: src/lib/aggregations.ts に共通の集計ヘルパを導入する。aggregateBySpot / spotStats / topSpecies に重複している「キーでグループ化して count 合計・length 平均（lenSum / lenN）・maxWeight を集計する」ループを、groupBy ヘルパまたは共通アキュムレータ関数に集約し、各関数は結果の整形だけを担うようにする。公開 API（関数シグネチャと戻り値）は変えないこと。既存のユニットテストが無修正で通ることが保証になる
2. #59: src/components/charts/MonthlyStackedChart.tsx の traces 配列を useMemo(() => ..., [data]) でラップし、他チャートと統一する

検証: npm test / npm run lint / npm run build がすべて通ること。

完了したら PR を作成し、説明に "Fixes #59, Fixes #60" を含めてください。
```

---

## Step 5 — Map3D アニメーション（#57）

見た目に関わるため独立 PR で目視確認しやすくする。

```text
GitHub issue #57 を対応してください。最新の main から refactor/map-anim ブランチを切ってください。

src/components/Map3D.tsx のマウントアニメ（elevAnim state + requestAnimationFrame で約60回/秒の setState → ColumnLayer 再生成）を、deck.gl 標準の transitions に置き換える。ColumnLayer の transitions: { getElevation: { duration: 900 } } または elevationScale の transition を使い、elevAnim state と rAF の useEffect を削除する。

検証:
- npm test / npm run lint / npx tsc -b が通ること
- npm run dev で起動し、地図の柱がマウント時に成長アニメすること、配色が変更前と同一であることを目視確認

完了したら PR を作成し、説明に "Fixes #57" を含めてください。
```

---

## Step 6 — exhaustive-deps 解消（#62）

```text
GitHub issue #62 を修正してください。最新の main から refactor/timeslider-deps ブランチを切ってください。

src/components/TimeSlider.tsx の useEffect に付いている eslint-disable-next-line react-hooks/exhaustive-deps を外し、依存配列に months（と必要なら dispatch）を含めても無限ループ・挙動変化が起きない形に整理してください。months は useMemo 済みで dataRange 変更時のみ参照が変わるため、単純に追加するだけで済む可能性が高いです。

検証:
- npm run lint が disable なしで通ること
- npm run dev でタイムスライダー操作・再生ボタン・RESET ボタンの挙動が変わらないこと

完了したら PR を作成し、説明に "Fixes #62" を含めてください。
```

---

## Step 7 — CI 強化と依存更新（#50, #49）

vite 8 メジャー更新はテスト整備後が安全なので最後。

```text
GitHub issue #50 と #49 を対応してください。最新の main から chore/supply-chain ブランチを切ってください。

1. #50: .github/workflows/ 内の全ワークフロー（deploy.yml と ci.yml）で、uses: のタグ参照（@v4 等）をフルコミット SHA 固定に変更し、行末コメントでバージョンを併記する。.github/dependabot.yml を新規作成し、github-actions と npm の両エコシステムを weekly で有効化する
2. #49: vite を 8.x にメジャーアップグレードする（esbuild の moderate 脆弱性対応）。@vitejs/plugin-react も対応バージョンに更新。vite 8 の breaking changes（Node バージョン要件、デフォルト挙動の変更）を確認し、vite.config.ts を必要に応じて修正する

検証:
- npm audit で moderate 以上が 0 件になること
- npm run build / npm test / npm run lint が通ること
- npm run dev で起動し、/data/catches_enriched.csv が 200、/data/../package.json が 404 のままであること（Step 1 のリグレッション確認）

完了したら PR を作成し、説明に "Fixes #49, Fixes #50" を含めてください。
```

---

## 進行チェックリスト

- [ ] Step 1: #48, #51 — vite.config.ts セキュリティ
- [ ] Step 2: #63 — vitest 導入
- [ ] Step 3: #55, #61 — 小修正
- [ ] Step 4: #59, #60 — 集計リファクタ
- [ ] Step 5: #57 — Map3D アニメ
- [ ] Step 6: #62 — exhaustive-deps
- [ ] Step 7: #49, #50 — CI 強化・vite 8

## main で対応済み（クローズ済み）

#52（URL TZ ずれ）・#53（件数ハードコード）・#54（ESLint）・#56（sort O(n²)）・#58（グラデーション重複）— いずれも #39 / #41 で修正。
