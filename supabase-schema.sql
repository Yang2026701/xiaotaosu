-- ============================================================
-- 小桃酥的成长记录 v2 — Supabase Database Schema
-- 在 Supabase SQL Editor 中一次性执行
-- ============================================================

-- 1. 应用配置表（密码、宝宝基础信息）
CREATE TABLE IF NOT EXISTS app_config (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  passcode    TEXT NOT NULL DEFAULT '123456',
  baby_name   TEXT NOT NULL DEFAULT '小桃酥',
  birth_date  DATE NOT NULL DEFAULT '2026-07-16',
  birth_height REAL DEFAULT 50.0,
  birth_weight REAL DEFAULT 3.3,
  ds_api_key  TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 初始配置（仅当不存在时插入）
INSERT INTO app_config (id, passcode, baby_name, birth_date) VALUES (1, '123456', '小桃酥', '2026-07-16')
ON CONFLICT (id) DO NOTHING;

-- 2. 照片/视频表
CREATE TABLE IF NOT EXISTS photos (
  id            TEXT PRIMARY KEY,           -- 客户端生成的 ID
  title         TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  photo_date    DATE NOT NULL,
  photo_time    TEXT DEFAULT '',            -- 时间 HH:MM
  storage_path  TEXT NOT NULL,              -- Supabase Storage 路径
  thumb_path    TEXT DEFAULT '',            -- 缩略图 Storage 路径
  tags          TEXT[] DEFAULT '{}',        -- PostgreSQL 数组
  favorite      BOOLEAN DEFAULT false,
  is_video      BOOLEAN DEFAULT false,      -- 是否为视频
  original_size INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photos_date ON photos (photo_date DESC);

-- 3. 成长里程碑表
CREATE TABLE IF NOT EXISTS milestones (
  id           TEXT PRIMARY KEY,
  category     TEXT NOT NULL DEFAULT 'custom',
  type         TEXT NOT NULL DEFAULT 'custom',
  custom_label TEXT DEFAULT '',
  milestone_date DATE NOT NULL,
  age_days     INTEGER DEFAULT 0,
  title        TEXT NOT NULL,
  emoji        TEXT DEFAULT '⭐',
  notes        TEXT DEFAULT '',
  photo_ids    TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones (milestone_date DESC);

-- 4. 发育记录表
CREATE TABLE IF NOT EXISTS growth_records (
  id                 TEXT PRIMARY KEY,
  record_date        DATE NOT NULL,
  age_days           INTEGER DEFAULT 0,
  height             REAL,
  weight             REAL,
  head_circumference REAL,
  notes              TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_growth_date ON growth_records (record_date ASC);

-- 5. 日记表
CREATE TABLE IF NOT EXISTS diary_entries (
  id         TEXT PRIMARY KEY,
  entry_date DATE NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  content    TEXT DEFAULT '',
  mood       TEXT DEFAULT 'joyful',
  weather    TEXT DEFAULT '',               -- 天气 emoji
  photo_ids  TEXT[] DEFAULT '{}',
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diary_date ON diary_entries (entry_date DESC);

-- 6. 日常记录表（喂养·睡眠·换尿布）
CREATE TABLE IF NOT EXISTS daily_logs (
  id         TEXT PRIMARY KEY,
  log_type   TEXT NOT NULL,                 -- feed / sleep / diaper / other
  log_date   DATE NOT NULL,
  log_time   TEXT DEFAULT '',               -- HH:MM
  value_num  REAL,                          -- 数值（如奶量 ml）
  value_text TEXT DEFAULT '',               -- 文本值（如时长、内容描述）
  notes      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs (log_date DESC);

-- 7. 健康记录表（疫苗·体检·生病·用药）
CREATE TABLE IF NOT EXISTS health_records (
  id           TEXT PRIMARY KEY,
  record_type  TEXT NOT NULL,               -- vaccine / checkup / illness / medication
  title        TEXT NOT NULL,
  record_date  DATE NOT NULL,
  age_days     INTEGER DEFAULT 0,
  notes        TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT false,
  file_path    TEXT DEFAULT '',             -- JSON 数组字符串（多条附件路径）
  file_name    TEXT DEFAULT '',             -- JSON 数组字符串（多条附件名）
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_records_date ON health_records (record_date ASC);

-- 8. 育儿宝典检查清单表
CREATE TABLE IF NOT EXISTS parenting_checks (
  id           TEXT PRIMARY KEY,            -- stage_key + '_' + item_key
  stage_key    TEXT NOT NULL,
  item_key     TEXT NOT NULL,
  completed    BOOLEAN DEFAULT true,
  completed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parenting_checks_stage ON parenting_checks (stage_key);

-- 9. 里程碑竞猜表 (家人互动)
CREATE TABLE IF NOT EXISTS milestone_guesses (
  id            TEXT PRIMARY KEY,
  milestone_key TEXT NOT NULL,
  guesser_name  TEXT NOT NULL DEFAULT '家人',
  guessed_date  DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guesses_key ON milestone_guesses (milestone_key);

-- ============================================================
-- 触发器：更新 updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_config_updated ON app_config;
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_diary_updated ON diary_entries;
CREATE TRIGGER trg_diary_updated BEFORE UPDATE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: 允许 anon 读写（通过前端密码门控保护）
-- 真正的访问控制由前端密码锁实现
-- ============================================================
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE parenting_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_guesses ENABLE ROW LEVEL SECURITY;

-- app_config
DROP POLICY IF EXISTS "anon_read_config" ON app_config;
CREATE POLICY "anon_read_config" ON app_config FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "anon_update_config" ON app_config;
CREATE POLICY "anon_update_config" ON app_config FOR UPDATE TO anon USING (true);

-- 照片
DROP POLICY IF EXISTS "anon_all_photos" ON photos;
CREATE POLICY "anon_all_photos" ON photos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 里程碑
DROP POLICY IF EXISTS "anon_all_milestones" ON milestones;
CREATE POLICY "anon_all_milestones" ON milestones FOR ALL TO anon USING (true) WITH CHECK (true);

-- 发育记录
DROP POLICY IF EXISTS "anon_all_growth" ON growth_records;
CREATE POLICY "anon_all_growth" ON growth_records FOR ALL TO anon USING (true) WITH CHECK (true);

-- 日记
DROP POLICY IF EXISTS "anon_all_diary" ON diary_entries;
CREATE POLICY "anon_all_diary" ON diary_entries FOR ALL TO anon USING (true) WITH CHECK (true);

-- 日常记录
DROP POLICY IF EXISTS "anon_all_daily" ON daily_logs;
CREATE POLICY "anon_all_daily" ON daily_logs FOR ALL TO anon USING (true) WITH CHECK (true);

-- 健康记录
DROP POLICY IF EXISTS "anon_all_health" ON health_records;
CREATE POLICY "anon_all_health" ON health_records FOR ALL TO anon USING (true) WITH CHECK (true);

-- 育儿检查清单
DROP POLICY IF EXISTS "anon_all_parenting" ON parenting_checks;
CREATE POLICY "anon_all_parenting" ON parenting_checks FOR ALL TO anon USING (true) WITH CHECK (true);

-- 里程碑竞猜
DROP POLICY IF EXISTS "anon_all_guesses" ON milestone_guesses;
CREATE POLICY "anon_all_guesses" ON milestone_guesses FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- 关键：授权 anon 角色访问所有表
-- 通过 SQL 新建的表必须显式 GRANT，否则 API 请求会返回 404/403
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- ============================================================
-- 10. 统一事件视图 (所有模块数据聚合)
-- ============================================================
CREATE OR REPLACE VIEW events AS
SELECT id, photo_date AS event_date, NULL::text AS event_time, title,
       COALESCE(description,'') AS notes, 'photo' AS event_type, NULL::text AS ref_type FROM photos
UNION ALL
SELECT id, milestone_date, NULL, title, COALESCE(notes,''), 'milestone', type FROM milestones
UNION ALL
SELECT id, record_date, NULL, '生长记录', COALESCE(notes,''), 'growth', NULL FROM growth_records
UNION ALL
SELECT id, entry_date, NULL, title, COALESCE(content,''), 'diary', mood FROM diary_entries
UNION ALL
SELECT id, log_date, log_time, log_type, COALESCE(value_text,''), 'daily_log', log_type FROM daily_logs
UNION ALL
SELECT id, record_date, NULL, title, COALESCE(notes,''), 'health', record_type FROM health_records;

GRANT SELECT ON events TO anon, authenticated, service_role;
