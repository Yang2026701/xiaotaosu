-- ============================================================
-- 小桃酥的成长记录 — Supabase Database Schema
-- 在 Supabase SQL Editor 中一次性执行
-- ============================================================

-- 1. 应用配置表（密码、宝宝基础信息）
CREATE TABLE app_config (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  passcode    TEXT NOT NULL DEFAULT '123456',
  baby_name   TEXT NOT NULL DEFAULT '小桃酥',
  birth_date  DATE NOT NULL DEFAULT '2026-07-16',
  birth_height REAL DEFAULT 50.0,
  birth_weight REAL DEFAULT 3.3,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 初始配置
INSERT INTO app_config (id, passcode, baby_name, birth_date) VALUES (1, '123456', '小桃酥', '2026-07-16');

-- 2. 照片表
CREATE TABLE photos (
  id            TEXT PRIMARY KEY,           -- 客户端生成的 ID
  title         TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  photo_date    DATE NOT NULL,
  storage_path  TEXT NOT NULL,              -- Supabase Storage 路径
  thumb_path    TEXT DEFAULT '',            -- 缩略图 Storage 路径
  tags          TEXT[] DEFAULT '{}',        -- PostgreSQL 数组
  favorite      BOOLEAN DEFAULT false,
  original_size INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_photos_date ON photos (photo_date DESC);

-- 3. 成长里程碑表
CREATE TABLE milestones (
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

CREATE INDEX idx_milestones_date ON milestones (milestone_date DESC);

-- 4. 发育记录表
CREATE TABLE growth_records (
  id                 TEXT PRIMARY KEY,
  record_date        DATE NOT NULL,
  age_days           INTEGER DEFAULT 0,
  height             REAL,
  weight             REAL,
  head_circumference REAL,
  notes              TEXT DEFAULT '',
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_growth_date ON growth_records (record_date ASC);

-- 5. 日记表
CREATE TABLE diary_entries (
  id         TEXT PRIMARY KEY,
  entry_date DATE NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  content    TEXT DEFAULT '',
  mood       TEXT DEFAULT 'joyful',
  photo_ids  TEXT[] DEFAULT '{}',
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_diary_date ON diary_entries (entry_date DESC);

-- 6. 更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_config_updated BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_diary_updated BEFORE UPDATE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. RLS: 允许 anon 读写（通过前端密码门控保护）
-- 因为这是纯前端应用，使用 anon key，所以 RLS 开启但不做行级限制
-- 真正的访问控制由前端密码锁实现
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

-- anon 角色可以读取 app_config（用于密码校验）
CREATE POLICY "anon_read_config" ON app_config FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_config" ON app_config FOR UPDATE TO anon USING (true);

-- 照片
CREATE POLICY "anon_all_photos" ON photos FOR ALL TO anon USING (true) WITH CHECK (true);

-- 里程碑
CREATE POLICY "anon_all_milestones" ON milestones FOR ALL TO anon USING (true) WITH CHECK (true);

-- 发育记录
CREATE POLICY "anon_all_growth" ON growth_records FOR ALL TO anon USING (true) WITH CHECK (true);

-- 日记
CREATE POLICY "anon_all_diary" ON diary_entries FOR ALL TO anon USING (true) WITH CHECK (true);
