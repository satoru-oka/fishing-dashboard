# 深掘り分析ダッシュボード — たたき台（→ 確定仕様へ統合済み）

> **このたたき台は `docs/deep-dive-dashboard-spec.md` に一本化しました。**
> 最新の確定仕様・プロトタイプはそちらを参照してください。本ファイルは経緯（どの未決項目がどう決着したか）の記録として残します。

## 統合先

- 確定仕様: `docs/deep-dive-dashboard-spec.md`
- プロトタイプ: `docs/samples/deep-dive-dashboard.html` / `docs/samples/correlation-explorer-and-table.html`
- 新セッションの入口: ルート直下 `CLAUDE.md`

## 旧・未決項目（A〜F）の決着

- **A. パネルの顔ぶれ** … ①地図 ②釣果推移 ③魚種内訳（＋色一致ランキング）④サイズ分布 ⑤環境×ヒット率 ⑥ルアー/餌効果 の**6枚で確定**。相関エクスプローラは常設パネルにせず、**別モード**（探索→昇格の入口）として用意。
- **B. レイアウト** … サイト準拠で確定（`KpiStrip → [Map | FiltersPanel(340)] → 期間スライダー → ChartsGrid（md=2 / xl=3）`）。地図は左の主役のまま。
- **C. モード切替時の振る舞い** … ⑤環境パネルはセレクタで軸切替。海/汽水＝**潮位フェーズ／水温帯**、淡水＝**水温帯／水位帯**（既定=水温帯）。水位帯は多摩川の放水・増水に対応（`water_level` 由来）。潮汐系は海・汽水限定。
- **D. 個人/公開ビューの既定** … **既定＝公開ビュー**（匿名 `public_catches`／認証不要で即・意味ある初期表示）、個人ビュー（JWT）は **Header 右上のグローバルトグル**で切替（#40 の方針どおり）。ダッシュボードは可視化のみ。
- **E. 各パネルの実データ仕様** … サーバ集計（FastAPI）前提。spec の §2/§5 と `docs/field-glance-metrics.md` を期間・モード・スポットで可変化する形に拡張（実装は今後）。
- **F. データ配線** … #40（`public_catches` / 個人 JWT fetch、統計はサーバ側、クライアントは描画）。

## たたき台で確定済みだった設計原則（spec に継承）

1. フィルタが全体を駆動し、クロスフィルタの起点は地図。さらに ③④⑤⑥ のクリックでも絞り込み（AND 合成）、アクティブフィルタ・バーで一覧・個別解除。
2. 地図（deck.gl 3Dカラム）を主役に。高さ＝釣果数・色＝平均体長。
3. 信頼性を UI に織り込む（n= 表示、データ充足ゲート＝薄いデータで断定しない）。
4. 重い描画（deck.gl/Plotly）はデスクトップのみ。モバイルには載せない（疎結合の理由）。

## 参照

- 確定仕様: `docs/deep-dive-dashboard-spec.md`
- 関係図: `docs/architecture-overview.md`（catch-management にも同一）
- 指標定義: `docs/field-glance-metrics.md`
- スキーマ: catch-management `supabase/migrations/001_dual_domain_schema.sql`
- 将来拡張（相関・変数追加）: fishing-dashboard #40
