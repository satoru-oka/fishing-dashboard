-- ============================================================
-- Tsuribito 統合スキーマ拡張（着手順 1）
-- 3 軸モデル:
--   water_type  … 水質（塩分）。CHECK と環境メトリクスを駆動する唯一の整合性軸
--   spot_type   … 場所の形。フィルタ・地図表現用のメタデータ
--   river_zone  … 河川の縦断位置。フィルタ・魚種予測用のメタデータ
-- 対象: catch-management の既存スキーマ（spots / sessions / catches）を ALTER
-- 注: テーブル名・カラム名・FK 名は既存スキーマに合わせて調整すること
-- ============================================================

-- ---------- 1. ENUM 型 ----------
do $$ begin
  create type water_type as enum ('sea', 'brackish', 'freshwater');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spot_type as enum
    ('open_sea','bay','pier','harbor','reef','river_mouth','river','lake','reservoir','pond');
exception when duplicate_object then null; end $$;

do $$ begin
  create type river_zone as enum ('upper', 'middle', 'lower');
exception when duplicate_object then null; end $$;

-- ---------- 2. spots（場所固有の属性） ----------
alter table spots
  add column if not exists water_type water_type not null default 'sea',  -- 真実はここ（場所固有）
  add column if not exists spot_type  spot_type  not null default 'bay',
  add column if not exists river_zone river_zone,                -- 流水系のみ。それ以外は NULL
  add column if not exists elevation_m           numeric,        -- GPS/標高API から自動補完可
  add column if not exists distance_from_mouth_m numeric;        -- 河川網スナップで自動補完可（縦断位置の連続値）

-- river_zone は流水系の spot でのみ持つ（軽い整合性ガード）
alter table spots drop constraint if exists chk_spot_river_zone;
alter table spots add constraint chk_spot_river_zone check (
  river_zone is null
  or spot_type in ('river', 'river_mouth')
);

-- spot_type と water_type の矛盾組合せを防ぐ軽い軸間ガード
-- （bay/harbor/river_mouth 等は汽水もあり得るので限定的に禁止する）
alter table spots drop constraint if exists chk_spot_type_water_type;
alter table spots add constraint chk_spot_type_water_type check (
  -- 内水面（止水域・河川）は海水ではない
  not (spot_type in ('lake', 'reservoir', 'pond', 'river') and water_type = 'sea')
  -- 外洋・リーフは淡水ではない
  and not (spot_type in ('open_sea', 'reef') and water_type = 'freshwater')
);

-- ---------- 3. sessions（釣行ごとの環境スナップショット） ----------
-- water_type は spots を真実とするが、CHECK は同一行しか参照できないため複製して行内で完結させる
alter table sessions
  add column if not exists water_type   water_type not null default 'sea',  -- spots から同期（下のトリガ）
  add column if not exists tide         text,       -- 潮回り（潮汐系）
  add column if not exists salinity_ppt numeric,    -- 塩分濃度（潮汐系・汽水で最も有効）
  add column if not exists water_temp_c numeric;    -- 水温（全モード共通＝ゲートしない）
-- water_level / water_clarity（内水面系）は既存カラムを利用

-- 既存行の water_type を spots から backfill（CHECK 追加前に必須）
-- is distinct from で実際に変わる行だけ書き換え、無駄な dead tuple を出さない
update sessions se
  set water_type = sp.water_type
  from spots sp
  where sp.id = se.spot_id
    and se.water_type is distinct from sp.water_type;

-- CHECK 追加前に、新区分で許可されないメトリクスを既存行からクリア（ADD CONSTRAINT の abort 回避）
-- 注: 新モデルでは下記の組合せは矛盾データなので破棄する
update sessions set water_level = null, water_clarity = null
  where water_type = 'sea' and (water_level is not null or water_clarity is not null);
update sessions set tide = null, salinity_ppt = null
  where water_type = 'freshwater' and (tide is not null or salinity_ppt is not null);

-- 水質ごとの許可セット（潮汐系 vs 内水面系。brackish は両方許可）
alter table sessions drop constraint if exists chk_session_metrics_by_water_type;
alter table sessions add constraint chk_session_metrics_by_water_type check (
  case water_type
    when 'sea'        then water_level is null and water_clarity is null
    when 'freshwater' then tide is null and salinity_ppt is null
    when 'brackish'   then true
  end
);

-- sessions.water_type を spot から自動同期（アプリ側で設定不要にする）
create or replace function sync_session_water_type() returns trigger as $$
begin
  -- spot が見つかった時だけ上書きし、NULL/不在 spot_id ではデフォルト(または既存値)を残す
  if new.spot_id is not null then
    new.water_type := coalesce(
      (select s.water_type from spots s where s.id = new.spot_id),
      new.water_type
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_session_water_type on sessions;
create trigger trg_sync_session_water_type
  before insert or update of spot_id on sessions
  for each row execute function sync_session_water_type();

-- spots.water_type を後から修正した場合に既存セッションへ伝播（spots を真実とするため）
-- 伝播先セッションのメトリクスが新区分と矛盾する場合は chk_session_metrics_by_water_type が発火し、
-- 不整合をその場で検知できる（黙って stale な値が残らない）
create or replace function propagate_spot_water_type() returns trigger as $$
begin
  update sessions set water_type = new.water_type
    where spot_id = new.id and water_type is distinct from new.water_type;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_propagate_spot_water_type on spots;
create trigger trg_propagate_spot_water_type
  after update of water_type on spots
  for each row when (new.water_type is distinct from old.water_type)
  execute function propagate_spot_water_type();

-- ---------- 4. catches（魚ごとの記録） ----------
alter table catches
  add column if not exists depth_m   numeric,   -- 水深（全モード共通）
  add column if not exists rig       text,      -- 仕掛け（海・汽水のタックル）
  add column if not exists bait      text,      -- 餌
  add column if not exists is_public boolean not null default false;  -- 公開オプトイン
-- is_released / lure（lures 経由）は既存を利用

create index if not exists idx_catches_is_public on catches (is_public) where is_public;

-- ============================================================
-- 参考: ステップ 2 先取り — 公開ビュー（誰でも閲覧する匿名集計用）
-- 基底テーブルの RLS は厳格なまま、is_public = true の行だけを匿名で露出
-- ============================================================
-- security_invoker=true で基底テーブルの RLS を呼び出し元権限で評価させる（PG15+）
-- これがないと通常ビューは所有者権限で実行され、anon に対し RLS が無効化される
create or replace view public_catches with (security_invoker = true) as
select
  c.id, c.species, c.weight_g, c.length_cm, c.is_released, c.caught_at,
  s.water_type, sp.spot_type, sp.river_zone,
  round(sp.lat::numeric, 2) as area_lat,   -- 正確な座標は伏せ、粗いエリアに丸める
  round(sp.lng::numeric, 2) as area_lng
from catches  c
join sessions s  on s.id  = c.session_id
join spots    sp on sp.id = s.spot_id
where c.is_public = true;

grant select on public_catches to anon;
