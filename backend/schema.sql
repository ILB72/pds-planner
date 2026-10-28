-- 데이터베이스 생성 (최초 1회)
CREATE DATABASE IF NOT EXISTS pds_planner
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pds_planner;

-- 1) 계획
CREATE TABLE IF NOT EXISTS plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  success_criteria TEXT NOT NULL,
  estimated_minutes INT NOT NULL DEFAULT 0,
  next_improvement VARCHAR(500) NULL,   -- 카드4 C33
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2) 계획 수정 이력 (카드1 C08)
CREATE TABLE IF NOT EXISTS plan_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  snapshot JSON NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ph_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

-- 3) 할 일 (카드2)
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  due_date DATE NULL,
  priority ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  tags VARCHAR(200) NULL,
  estimated_minutes INT NOT NULL DEFAULT 0,
  status ENUM('todo','done') NOT NULL DEFAULT 'todo',
  deleted_at DATETIME NULL,             -- 소프트 삭제 (C28)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
);

-- 4) 실행 기록 (카드3)
CREATE TABLE IF NOT EXISTS executions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL,
  blocked_reason VARCHAR(500) NULL,
  idempotency_key VARCHAR(64) NOT NULL, -- 카드3 C21/C22 중복 방지
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_exec_idem (idempotency_key),
  CONSTRAINT fk_exec_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);