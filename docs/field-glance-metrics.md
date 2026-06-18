# 現場グランス 指標定義（確定版）

> このドキュメントは、釣果管理アプリ「現場グランス」画面に表示する指標の定義と、その設計判断の根拠を記録したもの。後から読み返して「なぜこのロジックなのか」が分かることを目的とする。統合・将来拡張の議論は fishing-dashboard #40 を参照。
>
> 2026-06 更新: 実スキーマ（catch-management）に整合。`started_at` は不要となり、既存の `sessions.date` を使用。列名も実体に合わせた。

## 1. 背景

**現場グランスとは。** スマホ（catch-management）上で、操作も熟読も要らず1〜2秒で状況を掴めるサマリ画面。深掘り分析（多変数の探索・相関）はデスクトップ側（fishing-dashboard / deck.gl・Plotly）に分離する。役割は「探索させない / ひと目で答え / 機械が文脈（GPS・潮汐API）を補う」こと。

**信頼性の原則。** 薄いデータで自信ありげな数字を出さない。各指標は「最低サンプル数」と、満たないときの「データ不足」フォールバックを“定義の一部”として持つ。個人ログでは各セルのサンプルが少ないのが普通なので、この低信頼状態こそが主たる仕様である。

## 2. 確定した設計判断（理由つき）

### A. 指標ロジック

1. **簡易か率か → 簡易（尾数最多）を採用。** 投入回数（努力ログ）を取らない初期は“率”の分母が無く、誤導につながるため。使用頻度・努力バイアスという限界を各指標に明記する。将来、努力ログを足したら率版へ昇格する。
2. **最低サンプル数 → 5。** 個人ログは各セルが薄いので、5件未満の率/ランキングはノイズとみなし「データ不足／収集中」と表示する。
3. **ヒット率の時間窓 → 直近12ヶ月。** 季節性を1年で一周カバーしつつ、古すぎる傾向を排除する。
4. **時間帯バケツ → 固定。** 朝まづめ 4–8 / 日中 8–16 / 夕まづめ 16–19 / 夜 19–4。日の出の季節変動より実装の単純さを優先。将来は日出日没APIで可変化しうる。
5. **「今日の釣果」の範囲 → 全スポット合算。** 「今日の自分の釣り」の総括として自然なため。
6. **リリースの扱い → 件数に含める。** 「釣れた」という事実を数えるため。

### B. データ記録・モデル

7. **ボウズ釣行 → session として必ず記録する。** ヒット率の分母は釣行数。0尾の釣行を残さないと率が嘘になる。
8. **努力ログの粒度 → 釣行単位のみ（キャスト数は取らない）。** 入力負担を抑えるため。投入あたり率は将来の拡張とする。
9. **共有の粒度 → 釣果ごと（`is_public` を catches に置く）。** 釣果単位で公開可否を選べる柔軟性のため。

## 3. スキーマ前提（この設計で必要な追加）

実スキーマ（catch-management）に整合済み。追加分は `catch-management:supabase/migrations/001_dual_domain_schema.sql` を参照。

- `sessions.tide_phase` enum（新規） — 集計可能な潮回り（大潮/中潮/小潮/長潮/若潮）。自由記述の `tide` とは別に持つ。
- `sessions.date`（既存・NOT NULL） — 釣行日。ヒット率の分母・時間窓に利用。`started_at` の新設は不要。
- `catches.length_cm`（既存） — ベスト記録用。
- タックル参照 — `catches.lure_id` / `lure_name`（既存）または `catches.rig`（海系・新規）。

> スコープの源: `:spot_id`＝GPS で特定した現在地、`:tide`＝潮汐 API で算出した現在の潮回り。ユーザー絞り込みは Supabase RLS に任せる。

## 4. 指標定義（7件）

各指標は「定義 / スコープ / 時間窓 / 最低サンプル / フォールバック」で確定する。

### 4.1 今日の釣果

- 定義: 今日（JST 暦日）の総釣果尾数。リリース含む。全スポット。
- 時間窓: 当日 ／ 最低サンプル: なし ／ フォールバック: 0件 → 「まだ釣果なし」

```sql
select count(*) as today_catches
from catches c
join sessions s on s.id = c.session_id
where (c.caught_at at time zone 'Asia/Tokyo')::date
    = (now()       at time zone 'Asia/Tokyo')::date;
```

### 4.2 直近7日（スパークライン）

- 定義: 直近7日（今日含む）の日別釣果尾数の系列。欠損日は 0 埋め。全スポット。
- 最低サンプル: なし ／ フォールバック: 0 埋め必須（連続性のため）

```sql
select d::date as day, count(c.id) as n
from generate_series(
       (now() at time zone 'Asia/Tokyo')::date - interval '6 days',
       (now() at time zone 'Asia/Tokyo')::date,
       interval '1 day') as d
left join catches c
  on (c.caught_at at time zone 'Asia/Tokyo')::date = d::date
group by d order by d;
```

### 4.3 このスポット通算

- 定義: このスポットでの通算釣果尾数（全期間・リリース含む）。
- 最低サンプル: なし ／ フォールバック: 0件 → 「ここでの釣果はまだなし（新規スポット）」

```sql
select count(*) as spot_total
from catches c
join sessions s on s.id = c.session_id
where s.spot_id = :spot_id;
```

### 4.4 このスポットのベスト記録

- 定義: このスポットでの最大サイズ（`length_cm`）とその魚種。同サイズはより新しい記録。サイズ未記録は除外。全体で1件。
- 最低サンプル: なし ／ フォールバック: 記録ありの釣果が無ければ「記録なし」

```sql
select c.fish_species, c.length_cm
from catches c
join sessions s on s.id = c.session_id
where s.spot_id = :spot_id and c.length_cm is not null
order by c.length_cm desc, c.caught_at desc
limit 1;
```

### 4.5 よく釣れる時間帯

- 定義（簡易版）: 時間帯バケツ別の釣果尾数が最多の帯。
- 限界: 尾数最多は「よく行く時間帯」が出るだけの努力バイアスを含む。信頼版は時間帯別ヒット率（努力ログが必要）。
- 最低サンプル: 総釣果 < 10 → 「収集中」

```sql
select
  case
    when h >= 4  and h < 8  then '朝まづめ'
    when h >= 8  and h < 16 then '日中'
    when h >= 16 and h < 19 then '夕まづめ'
    else '夜'
  end as tod,
  count(*) as n
from (
  select extract(hour from (c.caught_at at time zone 'Asia/Tokyo')) as h
  from catches c
  join sessions s on s.id = c.session_id
  where s.spot_id = :spot_id
) t
group by tod
order by n desc
limit 1;
```

### 4.6 潮 × ヒット率

- 定義: このスポット・指定潮回りで、1尾以上釣れた釣行の割合（直近12ヶ月）。分母は釣行（session）。期間は既存 `sessions.date` で絞る。
- 最低サンプル: 釣行 < 5 → 「データ不足（N回）」。出力に `sessions`（信頼度）を併記。

```sql
select
  count(*) filter (where cc.n > 0)::numeric / nullif(count(*), 0) as hit_rate,
  count(*) as sessions
from sessions s
left join (
  select session_id, count(*) as n from catches group by session_id
) cc on cc.session_id = s.id
where s.spot_id    = :spot_id
  and s.tide_phase = :tide
  and s.date       >= (now() - interval '12 months')::date;
```

### 4.7 この潮のベストルアー／タックル

- 定義（簡易版）: このスポット・指定潮回りで、釣果数が最多のルアー／タックル。
- 限界: 釣果数最多は使用頻度バイアス（よく投げる物が出るだけ）。本来は投入あたりの釣果率だが投入回数を記録しないため簡易版で割り切る。
- 最低サンプル: 該当釣果 < 5 → 非表示。

```sql
select l.name as lure, count(*) as n
from catches c
join sessions s on s.id = c.session_id
join lures   l on l.id = c.lure_id     -- 海系は c.rig を使う
where s.spot_id    = :spot_id
  and s.tide_phase = :tide
group by l.name
order by n desc
limit 1;
```

## 5. 残課題・将来拡張

- 努力ログ（キャスト数）→「投入あたり率」への昇格
- 時間帯バケツの日出日没連動
- 変数追加・相関分析（#40 の「将来拡張の継ぎ目」メモ参照）
