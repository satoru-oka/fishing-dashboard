# 東京湾 釣果ダッシュボード

東京湾の釣果データを **3D 地図 + 6 枚の 2D 分析チャート** で可視化する SPA。
Kepler.gl 風の地理可視化と Superset 風の BI ダッシュボードを 1 画面に同居させた、
データジャーナリズム志向のダークテーマ・エディトリアル UI です。

🌅 **ライブデモ**: <https://satoru-oka.github.io/fishing-dashboard/>

![Overview — 全体ビュー](docs/overview.png)

ヘッダー直下に「アクティブフィルタ」ストリップ、5 枚の KPI カード、左に 3D マップ、右にフィルタパネル、下にタイムスライダーと 6 枚の Plotly チャートが並ぶ標準レイアウト。

## 目次

- [主な機能](#主な機能)
- [スクリーンショット](#スクリーンショット)
- [クイックスタート](#クイックスタート)
- [技術スタック](#技術スタック)
- [ファイル構成](#ファイル構成)
- [デザイン](#デザイン)
- [スクリプト](#スクリプト)
- [デプロイ](#デプロイ)
- [依存ライブラリのライセンス](#依存ライブラリのライセンス)

## 主な機能

- **3D マップ（deck.gl + MapLibre）**
  - 8 釣り場ごとに 3D カラム。高さ = 釣果数、色 = 平均体長（コーラル→金）
  - 初期視点: 35.5°N / 139.85°E, zoom 10, pitch 45°
  - ホバーでツールチップ、クリックで「その釣り場のみ」フィルタ
  - マップスタイル切替: Demo / Dark / Voyager
- **KPI Strip**: 総釣果・釣行数・平均体長・最大重量（魚種）・リリース率
- **フィルタパネル**: 魚種・釣り場・天気・潮 のマルチセレクト＋リリース除外トグル
- **時間軸スライダー**: 開始/終了月の双方向レンジ＋▶再生（1ヶ月ずつ 500ms 間隔）
- **URL 同期**: フィルタ状態が `?from=…&species=…` の形で URL に反映され、共有可能
- **6 枚チャート（Plotly）**
  - 月別 × 魚種（積み上げ棒, top6+その他）
  - 魚種 Top10（横棒, クリックで魚種フィルタ）
  - 体長 × 重量（散布図, log Y, 色=魚種）
  - 釣り場 × 魚種 ヒートマップ（夕焼けカラースケール）
  - 水温帯別 釣果（4°C ビニング）
  - 釣り場別 釣果＋平均体長（棒＋折れ線, デュアル軸）

## スクリーンショット

### 3D マップ詳細

![Map — 3D カラムレイヤー](docs/map.png)

deck.gl の `ColumnLayer` で 8 釣り場に立体カラム。高さ＝釣果数、色＝平均体長（コーラル→金）。左下に凡例、右下にマップスタイル切替（Demo / Dark / Voyager）。

### フィルタ適用後（魚種＝クロダイ × 釣り場＝浦安総合公園）

![Filtered — 絞り込み状態](docs/filtered.png)

URL クエリ `?species=クロダイ&spots=浦安総合公園` をそのまま開いた状態。アクティブフィルタピルに条件が表示され、KPI（6 尾 / 1 釣行 / 平均 35.5 cm）、地図（浦安総合公園のみ点灯）、6 枚チャートすべてが連動して絞り込まれる。リンクを共有すれば同じビューを再現できる。

## クイックスタート

### 前提条件

- Node.js（npm が使えること）
- 外部のマップトークン（Mapbox 等）は**不要**です

### データ

アプリの起動には `data/catches_enriched.csv` がリポジトリ直下の `data/` に置かれていることが前提です。
Vite の dev サーバーが `/data/*` を該当フォルダから配信します（ビルド時は `dist/data/` にコピー）。

> `data/tokyo_bay_stations_geo.csv` は将来の拡張用のリファレンス（東京湾の観測所メタ）。
> 現状アプリ本体は参照していませんが、`data/` 配下にあるため dev / build どちらでも配信対象になります。

### 起動

```bash
npm install
npm run dev
```

ブラウザで <http://localhost:5173> を開きます。

## 技術スタック

| 層 | 採用 |
| --- | --- |
| ビルド | Vite + React 18 + TypeScript |
| 3D 地図 | deck.gl 9 / react-map-gl / maplibre-gl |
| 2D チャート | plotly.js-dist-min / react-plotly.js |
| スタイル | Tailwind CSS v4 |
| CSV | papaparse |
| 日付 | date-fns |
| 状態 | React Context + useReducer |

## ファイル構成

```
fishing-dashboard/
├── data/                            # 入力 CSV（リポジトリ直下に配置）
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── theme.ts
│   ├── types.ts
│   ├── lib/
│   │   ├── csv.ts
│   │   ├── aggregations.ts
│   │   └── url-state.ts
│   ├── context/
│   │   └── DataContext.tsx
│   └── components/
│       ├── Header.tsx
│       ├── KpiStrip.tsx
│       ├── Map3D.tsx
│       ├── FiltersPanel.tsx
│       ├── TimeSlider.tsx
│       ├── ChartsGrid.tsx
│       └── charts/...
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
└── tsconfig*.json
```

## デザイン

- コンセプト: **「夕焼けの東京湾」**
- パレット: ダークネイビー基調にコーラル / ゴールド / アンバー
- タイポ: Fraunces + Shippori Mincho B1（見出し）/ Noto Sans JP（本文）/ JetBrains Mono（数字）
- モーション: マウント時のステージング・フェードイン、3D カラムの高さアニメーション、Plotly 300ms トランジション

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | dev サーバー起動（HMR） |
| `npm run build` | 型チェック + 本番ビルド |
| `npm run preview` | ビルド結果をローカル配信 |

## デプロイ

`main` ブランチへの push で GitHub Actions が自動ビルドし、GitHub Pages へデプロイします
（ワークフロー定義: `.github/workflows/deploy.yml`）。

## 依存ライブラリのライセンス

deck.gl (MIT) / Plotly.js (MIT) / MapLibre GL (BSD-3) — いずれも商用利用可。
