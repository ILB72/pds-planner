const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ==========================================
// [카드 1] 계획(Plans) 관련 API
// ==========================================
app.post('/api/plans', async (req, res) => {
  const { title, period_start, period_end, priority, success_criteria, estimated_minutes } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO plans (title, period_start, period_end, priority, success_criteria, estimated_minutes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, period_start, period_end, priority, success_criteria, estimated_minutes]
    );
    res.status(201).json({ id: result.insertId, message: '계획이 생성되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '계획 생성 실패' });
  }
});

app.get('/api/plans', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM plans ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '계획 조회 실패' });
  }
});

app.put('/api/plans/:id', async (req, res) => {
  const { id } = req.params;
  const { title, period_start, period_end, priority, success_criteria, estimated_minutes } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [oldPlans] = await connection.query('SELECT * FROM plans WHERE id = ?', [id]);
    if (oldPlans.length === 0) throw new Error('계획을 찾을 수 없습니다.');
    
    await connection.query(
      'INSERT INTO plan_history (plan_id, snapshot) VALUES (?, ?)',
      [id, JSON.stringify(oldPlans[0])]
    );

    await connection.query(
      `UPDATE plans SET title=?, period_start=?, period_end=?, priority=?, success_criteria=?, estimated_minutes=? WHERE id=?`,
      [title, period_start, period_end, priority, success_criteria, estimated_minutes, id]
    );

    await connection.commit();
    res.json({ message: '계획이 수정되고 이력이 저장되었습니다.' });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: '계획 수정 실패' });
  } finally {
    connection.release();
  }
});

// [카드 4] 다음 계획 고칠 점 저장 API
app.patch('/api/plans/:id/improvement', async (req, res) => {
  const { id } = req.params;
  const { improvement } = req.body;
  try {
    await pool.query('UPDATE plans SET next_improvement = ? WHERE id = ?', [improvement, id]);
    res.json({ message: '다음 계획 고칠 점이 저장되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '저장 실패' });
  }
});

// ==========================================
// [카드 2] 할 일(Tasks) 관련 API
// ==========================================
app.post('/api/tasks', async (req, res) => {
  const { plan_id, title, due_date, priority, tags, estimated_minutes } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO tasks (plan_id, title, due_date, priority, tags, estimated_minutes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plan_id, title, due_date, priority, tags, estimated_minutes]
    );
    res.status(201).json({ id: result.insertId, message: '할 일이 생성되었습니다.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '할 일 생성 실패' });
  }
});

app.get('/api/tasks', async (req, res) => {
  const { plan_id, status, search, sort } = req.query; 
  let query = `SELECT * FROM tasks WHERE deleted_at IS NULL`;
  const params = [];

  if (plan_id) {
    query += ` AND plan_id = ?`;
    params.push(plan_id);
  }
  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }
  if (search) {
    query += ` AND (title LIKE ? OR tags LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (sort === 'due_date_asc') {
    query += ` ORDER BY due_date ASC, id ASC`;
  } else if (sort === 'due_date_desc') {
    query += ` ORDER BY due_date DESC, id ASC`;
  } else {
    query += ` ORDER BY FIELD(priority, 'high', 'medium', 'low'), due_date ASC, id ASC`;
  }

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '할 일 조회 실패' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, due_date, priority, tags, estimated_minutes } = req.body;
  try {
    await pool.query(
      `UPDATE tasks SET title=?, due_date=?, priority=?, tags=?, estimated_minutes=? WHERE id=?`,
      [title, due_date, priority, tags, estimated_minutes, id]
    );
    res.json({ message: '할 일이 수정되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '할 일 수정 실패' });
  }
});

app.patch('/api/tasks/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query(`UPDATE tasks SET status=? WHERE id=?`, [status, id]);
    res.json({ message: `상태가 ${status}로 변경되었습니다.` });
  } catch (error) {
    res.status(500).json({ error: '상태 변경 실패' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`UPDATE tasks SET deleted_at = NOW() WHERE id=?`, [id]);
    res.json({ message: '할 일이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '할 일 삭제 실패' });
  }
});

// ==========================================
// [카드 3] 실행 기록(Executions) 관련 API
// ==========================================
app.post('/api/executions', async (req, res) => {
  const { task_id, started_at, ended_at, blocked_reason } = req.body;
  
  const start = new Date(started_at);
  const end = new Date(ended_at);
  const duration_minutes = Math.floor((end - start) / 1000 / 60);
  const idempotency_key = `task_${task_id}_${started_at}`;

  try {
    const [result] = await pool.query(
      `INSERT INTO executions (task_id, started_at, ended_at, duration_minutes, blocked_reason, idempotency_key) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task_id, started_at, ended_at, duration_minutes, blocked_reason || null, idempotency_key]
    );
    res.status(201).json({ id: result.insertId, message: '실행 기록이 저장되었습니다.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '이미 저장된 실행 기록입니다. (중복 방지됨)' });
    }
    console.error(error);
    res.status(500).json({ error: '실행 기록 저장 실패' });
  }
});

app.get('/api/executions/:task_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM executions WHERE task_id = ? ORDER BY created_at DESC', 
      [req.params.task_id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '실행 기록 조회 실패' });
  }
});

// ==========================================
// [카드 4] 돌아보기(Review) 집계 API
// ==========================================
app.get('/api/review/:plan_id', async (req, res) => {
  const { plan_id } = req.params;
  try {
    const [[{ total_tasks }]] = await pool.query(
      `SELECT COUNT(*) as total_tasks FROM tasks WHERE plan_id = ? AND deleted_at IS NULL`, [plan_id]
    );

    const [[{ done_tasks }]] = await pool.query(
      `SELECT COUNT(*) as done_tasks FROM tasks WHERE plan_id = ? AND deleted_at IS NULL AND status = 'done'`, [plan_id]
    );

    const [[{ delayed_tasks }]] = await pool.query(
      `SELECT COUNT(*) as delayed_tasks FROM tasks 
       WHERE plan_id = ? AND deleted_at IS NULL AND status != 'done' 
       AND DATE(due_date) < DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00'))`, [plan_id]
    );

    const [[{ blocked_tasks }]] = await pool.query(
      `SELECT COUNT(DISTINCT t.id) as blocked_tasks 
       FROM tasks t JOIN executions e ON t.id = e.task_id 
       WHERE t.plan_id = ? AND t.deleted_at IS NULL AND e.blocked_reason IS NOT NULL AND e.blocked_reason != ''`, [plan_id]
    );

    const [[{ total_estimated }]] = await pool.query(
      `SELECT COALESCE(SUM(estimated_minutes), 0) as total_estimated FROM tasks WHERE plan_id = ? AND deleted_at IS NULL`, [plan_id]
    );

    const [[{ total_actual }]] = await pool.query(
      `SELECT COALESCE(SUM(e.duration_minutes), 0) as total_actual 
       FROM executions e JOIN tasks t ON e.task_id = t.id 
       WHERE t.plan_id = ? AND t.deleted_at IS NULL`, [plan_id]
    );

    res.json({
      total_tasks,
      done_tasks,
      delayed_tasks,
      blocked_tasks,
      total_estimated,
      total_actual,
      difference: total_actual - total_estimated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '집계 실패' });
  }
});

app.get('/api/review/:plan_id/drilldown', async (req, res) => {
  const { plan_id } = req.params;
  const { type } = req.query;
  
  let query = `SELECT t.* FROM tasks t WHERE t.plan_id = ? AND t.deleted_at IS NULL`;
  const params = [plan_id];

  if (type === 'done') {
    query += ` AND t.status = 'done'`;
  } else if (type === 'delayed') {
    query += ` AND t.status != 'done' AND DATE(t.due_date) < DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00'))`;
  } else if (type === 'blocked') {
    query = `SELECT DISTINCT t.* FROM tasks t JOIN executions e ON t.id = e.task_id 
             WHERE t.plan_id = ? AND t.deleted_at IS NULL AND e.blocked_reason IS NOT NULL AND e.blocked_reason != ''`;
  }

  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '드릴다운 조회 실패' });
  }
});

// ==========================================
// [카드 5] 데이터 내보내기 API
// ==========================================
app.get('/api/export', async (req, res) => {
  try {
    const [plans] = await pool.query('SELECT * FROM plans');
    const [tasks] = await pool.query('SELECT * FROM tasks');
    const [executions] = await pool.query('SELECT * FROM executions');
    
    res.json({ plans, tasks, executions, exported_at: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: '내보내기 실패' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});