# 深掘りダッシュボード データ契約（#65 E）

各パネル（KPI＋②〜⑥＋§5 表）が引く**サーバ集計エンドポイントの契約**を定義する。統計・集計はサーバ側（catch-management の FastAPI）、ダッシュボードは**描画専念**（#40 / design-references 決定F）。本書は catch-management `#72`（サーバ集計エンドポイント）が実装すべき I/O 仕様であり、配線（#65 F）はこの契約に乗る。

- 確定仕様（パネルの見た目・操作）: [`deep-dive-dashboard-spec.md`](./deep-dive-dashboard-spec.md)
- グランス指標（モバイル側・SQL 雛形の出典）: [`field-glance-metrics.md`](./field-glance-metrics.md)
- スキーマ: catch-management `supabase/migrations/001_dual_domain_schema.sql`

## 0. 前提（確定済みの設計原則を契約に反映）

- **可変軸は3つ**：すべてのパネル契約は `mode`（海/汽水/淡水）・`period`（期間）・`spot`（スポット）で可変。さらにクロスフィルタ次元（魚種/サイズ帯/環境バケツ/ルアー等）も AND 合成で効く（spec §3）。
- **2経路・同一契約**：`公開`（匿名 `public_catches`）と `個人`（JWT）で**レスポンス形は同一**、データ源と認証のみ異なる（#40 / 既定=公開）。
- **データ充足ゲート**：各パネルは `min_sample` と充足フラグを契約の一部として返す（薄いデータで断定しない／spec §4・field-glance §1）。
- **時刻は JST**：日付境界・期間・時間窓は `caught_at at time zone 'Asia/Tokyo'` を前提（→ catch-management **#68 で確定が必要**。下記§4依存）。
- **ヒット率の分母は釣行（session）**：ボウズ釣行も session として数える（field-glance B.7）。リリースは件数に含む（A.6）。

## 1. 共通リクエスト（全パネル共通エンベロープ）

| パラメータ | 型 | 説明 |
|---|---|---|
| `view` | `public` \| `personal` | データ源（匿名ビュー / 個人JWT）。既定 `public` |
| `mode` | `all` \| `sea` \| `brackish` \| `freshwater` | `spots.water_type` で絞り込み。`all`=絞らない |
| `from`, `to` | date (JST 暦日) | 期間。`sessions.date` で絞る |
| `spot_id` | int[]（任意） | スポット絞り込み（クロスフィルタ起点＝地図） |
| `species` | string[]（任意） | 魚種クロスフィルタ |
| `size_bin` | string[]（任意） | サイズ帯クロスフィルタ（④由来、`"40-45"`等） |
| `env_bucket` | string[]（任意） | 環境バケツクロスフィルタ（⑤由来） |
| `method` | string[]（任意） | ルアー/餌クロスフィルタ（⑥由来） |
| `tide_phase` `tide` `weather` `bait` `clarity` `time_of_day` | string[]（任意） | フィルタパネル次元（spec §3） |
| `exclude_released` | bool | リリース除外（既定 false） |

> クロスフィルタの作法（spec §3）：各「選択元」パネルは**自分の次元を除く**全条件で集計し、自次元は全選択肢を返す（選択をハイライト）。実装は「そのパネルの軸に対応する絞り込みだけ外して集計」。

## 2. 共通レスポンス（メタ・エンベロープ）

```jsonc
{
  "data": { /* パネル固有（§3） */ },
  "meta": {
    "n_catches": 0,        // 集計に使った釣果数
    "n_sessions": 0,       // 集計に使った釣行数（ヒット率系の分母）
    "min_sample": 5,       // このパネルの最低サンプル
    "sufficient": false,   // 充足ゲート（false なら「データ収集中（n=… / 必要 …）」表示）
    "window": "selected" , // 期間の説明（"selected" or "last_12_months" 等）
    "last_updated": "2026-06-28T09:00:00Z",
    "mode": "all",
    "period": ["2025-04-01", "2026-05-18"]
  }
}
```

- `min_sample` 既定 **5**（field-glance A.2）。バケツ単位で評価するパネル（⑤⑥）は**バケツごと**に `sufficient` を持つ（§3 参照）。

## 3. パネル別契約

現行のクライアント集計（`src/lib/aggregations.ts`）が、そのままサーバ実装の参照ロジックになる。各 `data` 形は既存の型に対応。

### KPI — `GET /analytics/kpi`
- 対応: `computeKpi`。`data`: `{ total_count, trip_count, avg_length, max_weight, max_weight_species, release_rate }`。
- 充足: なし（常に表示。0 は 0 として表示）。

### ① Map — `GET /analytics/map`
- 対応: `aggregateBySpot`。`data.spots[]`: `{ spot_id, spot_name, lat, lng, count, avg_length, max_weight }`。
- 用途: deck.gl ColumnLayer（高さ=count / 色=avg_length）。`min_sample` 無し（スポットは全件出す。薄いスポットは UI 側で n 併記）。

### ② Trend — `GET /analytics/trend`
- `data`: `{ months[], catches[], water_temp[], water_level[], discharge_events[] }`（`months`='YYYY-MM'）。
- 対応: `aggregateMonthlyBySpecies` の月別合計＋環境系列。`water_level` は相対（軸目盛り非表示）、`discharge_events` は放水イベントの月。
- 充足: なし（系列は 0 埋めで連続性維持。field-glance 4.2 に倣う）。

### ③ Species — `GET /analytics/species`
- `data`: `{ donut: [{ species, count }], ranking: [{ species, count }] }`（ranking は上位6＋`その他`）。
- 対応: `topSpecies`。`min_sample`=5（魚種別 count<5 は ranking 末尾の「その他」に寄せる／ノイズ抑制）。

### ④ Size — `GET /analytics/size`
- `data.bins[]`: `{ label, lo, hi, count }`（**5cm 刻み**）。`length_cm` 未記録は除外。
- 充足: `n_catches`（サイズ有り）< `min_sample` で `sufficient:false`。

### ⑤ Environment — `GET /analytics/environment?axis=…`
- `axis` ∈ **`tide_phase` | `water_temp_band` | `water_level_band`**。許可される `axis` は `mode` 依存（spec §2 / 決定C）：
  - `sea` / `brackish` → `{ tide_phase, water_temp_band }`
  - `freshwater` → `{ water_temp_band, water_level_band }`（既定 `water_temp_band`）
- `data.buckets[]`: `{ bucket, hit_rate, sessions, n }`（ヒット率 = 1尾以上釣れた釣行÷釣行、field-glance 4.6）。
- 充足: **バケツごと** `sessions < 5` は「データ不足（N回）」。`water_temp_band` は4℃刻み（`waterTempBins` 準拠）、`water_level_band` は `water_level` を等幅ビン。

### ⑥ Method — `GET /analytics/method`
- `data.items[]`: `{ method, count }`（`lure_name`／海系は `rig`）。釣果数ランキング。
- 充足: 該当 count < 5 のルアーは非表示（field-glance 4.7）。`min_sample`=5。

### §5 釣場別サマリ表 — `GET /analytics/spot-table`
- `data.rows[]`: `{ spot, sessions, total, per_trip, avg_length, max_weight }`。
- 対応: `spotStats` を釣行数・尾/釣行で拡張。並べ替えはクライアント。

> **相関エクスプローラ（別モード・#40）は本契約の対象外**。軸は変数レジストリから動的生成し、統計（効果量r・95%CI・FDR・型別手法）はサーバ側で別エンドポイント。E のコアが固まってから別途定義する。

## 4. 依存・未確定（catch-management 側）

- **#68 時刻方針**：本契約の日付境界・期間・時間帯バケツは JST 前提。`caught_at` の保存TZと `at time zone 'Asia/Tokyo'` 運用を #68 で確定させ、本書と整合させる（#65 F の前提）。
- **#66 RLS / `public_catches`**：`view=public` の匿名公開範囲（どの列・どの行を出すか）を RLS で確定。`is_public` は釣果単位（field-glance B.9）。
- **#72 サーバ集計**：本書のエンドポイント群を実装。`mode/period/spot＋クロスフィルタ` を受け、§2 のメタ・エンベロープで返す。
- スキーマ列：`spots.water_type` / `sessions.tide_phase` / `sessions.date` / `catches.length_cm` / `water_level` / `water_clarity` / `lure_name`・`rig`（`001_dual_domain_schema.sql`）。

## 5. クライアント側（#65 F の受け側・本リポ）

- `src/lib/aggregations.ts` の純関数は**サーバ実装の参照ロジック**として維持（公開デモ／オフライン CSV 経路でも使用）。
- F では DataContext のデータ源を「CSV 直読み」→「本契約のエンドポイント fetch」に切替可能にする（疎結合・段階移行）。重い集計はサーバ既定、クライアントは描画専念。
