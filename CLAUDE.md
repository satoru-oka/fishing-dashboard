# CLAUDE.md — fishing-dashboard

新しいセッションで**最初に読む前提コンテキスト＆作業指針**。詳細仕様は `docs/` を参照。

## プロジェクト要約
- **全魚種対応**の釣果管理・分析基盤の「可視化フロント」。シーバス（多摩川・汽水）は現在の個人メインターゲットの**一例**にすぎず、システムをシーバス専用にしない。
- 目的：**条件（環境）× 行動（アングラーの選択）→ 結果（釣果）** を可視化し、仮説→検証（釣行）のループでヒット率を上げる。

## スタック / 構成
- Vite + React 18 + TypeScript + Tailwind + **deck.gl** + **Plotly** の SPA（GitHub Pages デプロイ）。
- データは別リポジトリの catch-management（Next.js + FastAPI + Supabase）が所有。本リポジトリは**読み取り・可視化のみ**（Pattern A 疎結合）。
- 配色は「**東京湾サンセット**」ダークテーマ（`src/theme.ts`）。タイポは明朝(eyebrow) ＋ セリフ(見出し) ＋ sans ＋ mono。

## 画面の並び（`src/App.tsx`）
`Header → ActiveFilters → KpiStrip(5) → [Map3D | FiltersPanel(340)] → TimeSlider → PhotoGallery → Recommendations → ForecastView → ChartsGrid → footer`

## まず読むドキュメント
- `docs/architecture-overview.md`
- `docs/design-references.md` … 信号の強弱・統計の作法・データの質モデル・相関エクスプローラ設計
- `docs/deep-dive-dashboard-spec.md` … **深掘り画面の確定仕様（本セッションの成果）**
- `docs/field-glance-metrics.md`
- `docs/samples/` … モックデータの単一HTMLプロトタイプ（現状の到達点を実際に触れる）

## 進行中
- **深掘り分析ダッシュボード（issue #65）**。設計確定（`docs/deep-dive-dashboard-spec.md`）。現在地：
  - **A〜D 設計判断＝確定**（C: ⑤環境セレクタ＝海/汽水{潮位フェーズ,水温帯}・淡水{水温帯,水位帯}／D: 既定=公開ビュー、個人(JWT)は Header 右上のグローバルトグル）。
  - **フェーズ1 足場固め（#64＝レビュー指摘 #48〜#63）＝全件完了**（vitest・vite.config セキュリティ・集計リファクタ・Map3D・TimeSlider・vite8）。
  - **E データ契約＝定義済み** → `docs/deep-dive-data-contract.md`（catch-management `#72` の実装契約）。
  - **次の前提＝フェーズ2（catch-management 側）**：`#68`（時刻方針/JST）→ `#72`（サーバ集計、契約準拠）→ `#66`（RLS/`public_catches`）。これが済んで初めて **#65 F（配線：DataContext の源を CSV→契約エンドポイントへ）** に着手できる。
  - 全体ロードマップ：#66。fishing-dashboard 側の backend 非依存タスクは現状出尽くし。
- **#40**：海/淡水デュアル、公開/個人ビュー、相関分析は「将来の縫い目」（jsonb 実験層＋変数レジストリ＋analytics ビュー、統計はサーバ側、ダッシュボードは可視化のみ）。

## 作法（重要）
- **日本語**でやり取り。コードコメントも日本語。
- 完成済み・そのままコミットできる粒度の成果物を好む。構造化Markdown。
- 大きなスコープ変更の前に確認。**全魚種スコープを崩さない**。
- 相関エクスプローラは**探索専用**。効くと確証が取れた変数だけ**手動で**パネル/フィルタに昇格。天気・潮汐（種類）は弱い/未確証/交絡しやすいので当面は探索軸に置く。
- **データの質 ＞ 統計の精緻さ**。努力ログ（釣行/ボウズ/滞在時間。キャスト数は取らない）。小 n は頻度論 NHST に不向き → 効果量＋区間＋可視化＋シーズン跨ぎの再確認。

## 新セッションでの始め方
1. 本ファイルと `docs/deep-dive-dashboard-spec.md` を読む。
2. `docs/samples/` の最新プロトタイプ（現状の到達点）を確認。
3. 続きから着手。必要に応じて issue #65 を参照。大きな方針変更は事前に相談。
