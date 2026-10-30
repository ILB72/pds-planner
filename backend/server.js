const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { pool, sessionStore } = require('./db');
require('dotenv').config();

const app = express();

// 🚨 Render 프록시 환경에서 HTTPS 인식 및 쿠키 전송을 위한 설정
app.set('trust proxy', 1); 

// 🚨 Vercel 프론트엔드 주소 명시 및 쿠키(credentials) 허용
app.use(cors({
  origin: 'https://pds-planner-frontend.vercel.app',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'pds-secret-key-2026',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // 배포 환경(HTTPS)에서만 secure 쿠키 사용
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24, // 1일
  }
}));

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: '로그인이 필요합니다.' });
  next();
};

// ==========================================
// 🔐 인증 API
// ==========================================
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요.' });
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: '이미 가입된 이메일입니다.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash]);

    req.session.userId = result.insertId;
    req.session.email = email;
    res.status(201).json({ message: '가입 성공', userId: result.insertId });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: '회원가입 실패' }); 
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    req.session.userId = user.id;
    req.session.email = user.email;
    res.json({ message: '로그인 성공', userId: user.id });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: '로그인 실패' }); 
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: '로그아웃 실패' });
    res.clearCookie('connect.sid');
    res.json({ message: '로그아웃 성공' });
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ userId: req.session.userId, email: req.session.email });
});

// ==========================================
// 📝 카드 1~4 API (계획 삭제 포함)
// ==========================================
app.post('/api/plans', requireAuth, async (req, res) => {
  const { title, period_start, period_end, priority, success_criteria, estimated_minutes } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO plans (user_id, title, period_start, period_end, priority, success_criteria, estimated_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, title, period_start, period_end, priority, success_criteria, estimated_minutes]
    );
    res.status(201).json({ id: result.insertId, message: '계획이 생성되었습니다.' });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: '계획 생성 실패' }); 
  }
});

app.get('/api/plans', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM plans WHERE user_id = ? ORDER BY id DESC', [req.session.userId]);
    res.json(rows);
  } catch (error) { res.status(500).json({ error: '계획 조회 실패' }); }
});

app.put('/api/plans/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, period_start, period_end, priority, success_criteria, estimated_minutes } = req.body;
  const connection = await pool.getConnection();
  try {
    const [oldPlans] = await connection.query('SELECT * FROM plans WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (oldPlans.length === 0) return res.status(404).json({ error: '계획을 찾을 수 없습니다.' });
    
    await connection.beginTransaction();
    await connection.query('INSERT INTO plan_history (plan_id, snapshot) VALUES (?, ?)', [id, JSON.stringify(oldPlans[0])]);
    await connection.query(
      `UPDATE plans SET title=?, period_start=?, period_end=?, priority=?, success_criteria=?, estimated_minutes=? WHERE id=? AND user_id=?`,
      [title, period_start, period_end, priority, success_criteria, estimated_minutes, id, req.session.userId]
    );
    await connection.commit();
    res.json({ message: '계획이 수정되었습니다.' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: '계획 수정 실패' });
  } finally { connection.release(); }
});

app.delete('/api/plans/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM plans WHERE id = ? AND user_id = ?', [id, req.session.userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: '계획을 찾을 수 없거나 권한이 없습니다.' });
    res.json({ message: '계획이 삭제되었습니다.' });
  } catch (error) { res.status(500).json({ error: '계획 삭제 실패' }); }
});

app.get('/api/plans/:id/history', requireAuth, async (req, res) => {
  const [plan] = await pool.query('SELECT id FROM plans WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (plan.length === 0) return res.status(404).json({ error: '계획 없음' });
  const [rows] = await pool.query('SELECT * FROM plan_history WHERE plan_id = ? ORDER BY changed_at DESC', [req.params.id]);
  res.json(rows);
});

app.patch('/api/plans/:id/improvement', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { improvement } = req.body;
  const [result] = await pool.query('UPDATE plans SET next_improvement = ? WHERE id = ? AND user_id = ?', [improvement, id, req.session.userId]);
  if (result.affectedRows === 0) return res.status(404).json({ error: '계획 없음' });
  res.json({ message: '저장 완료' });
});

app.post('/api/tasks', requireAuth, async (req, res) => {
  const { plan_id, title, due_date, priority, tags, estimated_minutes } = req.body;
  const [plan] = await pool.query('SELECT id FROM plans WHERE id = ? AND user_id = ?', [plan_id, req.session.userId]);
  if (plan.length === 0) return res.status(403).json({ error: '권한 없음' });
  
  const [result] = await pool.query(
    `INSERT INTO tasks (user_id, plan_id, title, due_date, priority, tags, estimated_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.session.userId, plan_id, title, due_date, priority, tags, estimated_minutes]
  );
  res.status(201).json({ id: result.insertId });
});

app.get('/api/tasks', requireAuth, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY id DESC', [req.session.userId]);
  res.json(rows);
});

app.put('/api/tasks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, due_date, priority, tags, estimated_minutes } = req.body;
  const [result] = await pool.query(
    `UPDATE tasks SET title=?, due_date=?, priority=?, tags=?, estimated_minutes=? WHERE id=? AND user_id=?`,
    [title, due_date, priority, tags, estimated_minutes, id, req.session.userId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: '할 일 없음' });
  res.json({ message: '수정 완료' });
});

app.patch('/api/tasks/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const [result] = await pool.query(`UPDATE tasks SET status=? WHERE id=? AND user_id=?`, [status, id, req.session.userId]);
  if (result.affectedRows === 0) return res.status(404).json({ error: '할 일 없음' });
  res.json({ message: '상태 변경 완료' });
});

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const [result] = await pool.query(`UPDATE tasks SET deleted_at = NOW() WHERE id=? AND user_id=?`, [id, req.session.userId]);
  if (result.affectedRows === 0) return res.status(404).json({ error: '할 일 없음' });
  res.json({ message: '삭제 완료' });
});

app.post('/api/executions', requireAuth, async (req, res) => {
  const { task_id, started_at, ended_at, blocked_reason } = req.body;
  const [task] = await pool.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [task_id, req.session.userId]);
  if (task.length === 0) return res.status(403).json({ error: '권한 없음' });

  const start = new Date(started_at);
  const end = new Date(ended_at);
  const duration_minutes = Math.floor((end - start) / 1000 / 60);
  const idempotency_key = `task_${task_id}_${started_at}`;

  try {
    const [result] = await pool.query(
      `INSERT INTO executions (user_id, task_id, started_at, ended_at, duration_minutes, blocked_reason, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, task_id, started_at, ended_at, duration_minutes, blocked_reason || null, idempotency_key]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '이미 저장된 기록입니다.' });
    res.status(500).json({ error: '저장 실패' });
  }
});

app.get('/api/executions/:task_id', requireAuth, async (req, res) => {
  const [task] = await pool.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [req.params.task_id, req.session.userId]);
  if (task.length === 0) return res.status(403).json({ error: '권한 없음' });
  const [rows] = await pool.query('SELECT * FROM executions WHERE task_id = ? AND user_id = ? ORDER BY created_at DESC', [req.params.task_id, req.session.userId]);
  res.json(rows);
});

app.get('/api/review/:plan_id', requireAuth, async (req, res) => {
  const { plan_id } = req.params;
  const [plan] = await pool.query('SELECT id FROM plans WHERE id = ? AND user_id = ?', [plan_id, req.session.userId]);
  if (plan.length === 0) return res.status(404).json({ error: '계획 없음' });

  const uid = req.session.userId;
  const [[{ total_tasks }]] = await pool.query(`SELECT COUNT(*) as total_tasks FROM tasks WHERE plan_id = ? AND user_id = ? AND deleted_at IS NULL`, [plan_id, uid]);
  const [[{ done_tasks }]] = await pool.query(`SELECT COUNT(*) as done_tasks FROM tasks WHERE plan_id = ? AND user_id = ? AND deleted_at IS NULL AND status = 'done'`, [plan_id, uid]);
  const [[{ delayed_tasks }]] = await pool.query(`SELECT COUNT(*) as delayed_tasks FROM tasks WHERE plan_id = ? AND user_id = ? AND deleted_at IS NULL AND status != 'done' AND DATE(due_date) < DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00'))`, [plan_id, uid]);
  const [[{ blocked_tasks }]] = await pool.query(`SELECT COUNT(DISTINCT t.id) as blocked_tasks FROM tasks t JOIN executions e ON t.id = e.task_id WHERE t.plan_id = ? AND t.user_id = ? AND t.deleted_at IS NULL AND e.blocked_reason IS NOT NULL AND e.blocked_reason != ''`, [plan_id, uid]);
  const [[{ total_estimated }]] = await pool.query(`SELECT COALESCE(SUM(estimated_minutes), 0) as total_estimated FROM tasks WHERE plan_id = ? AND user_id = ? AND deleted_at IS NULL`, [plan_id, uid]);
  const [[{ total_actual }]] = await pool.query(`SELECT COALESCE(SUM(e.duration_minutes), 0) as total_actual FROM executions e JOIN tasks t ON e.task_id = t.id WHERE t.plan_id = ? AND t.user_id = ? AND t.deleted_at IS NULL`, [plan_id, uid]);

  res.json({ total_tasks, done_tasks, delayed_tasks, blocked_tasks, total_estimated, total_actual, difference: total_actual - total_estimated });
});

app.get('/api/review/:plan_id/drilldown', requireAuth, async (req, res) => {
  const { plan_id } = req.params;
  const { type } = req.query;
  const uid = req.session.userId;
  let query = `SELECT t.* FROM tasks t WHERE t.plan_id = ? AND t.user_id = ? AND t.deleted_at IS NULL`;
  const params = [plan_id, uid];

  if (type === 'done') query += ` AND t.status = 'done'`;
  else if (type === 'delayed') query += ` AND t.status != 'done' AND DATE(t.due_date) < DATE(CONVERT_TZ(NOW(), '+00:00', '+09:00'))`;
  else if (type === 'blocked') {
    query = `SELECT DISTINCT t.* FROM tasks t JOIN executions e ON t.id = e.task_id WHERE t.plan_id = ? AND t.user_id = ? AND t.deleted_at IS NULL AND e.blocked_reason IS NOT NULL AND e.blocked_reason != ''`;
  }
  const [rows] = await pool.query(query, params);
  res.json(rows);
});

app.get('/api/export', requireAuth, async (req, res) => {
  const uid = req.session.userId;
  const [plans] = await pool.query('SELECT * FROM plans WHERE user_id = ?', [uid]);
  const [tasks] = await pool.query('SELECT * FROM tasks WHERE user_id = ?', [uid]);
  const [executions] = await pool.query('SELECT * FROM executions WHERE user_id = ?', [uid]);
  res.json({ plans, tasks, executions, exported_at: new Date().toISOString() });
});

app.delete('/api/auth/account', requireAuth, (req, res) => {
  const uid = req.session.userId;
  pool.query('DELETE FROM users WHERE id = ?', [uid], (err) => {
    if (err) return res.status(500).json({ error: '계정 삭제 실패' });
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.json({ message: '계정과 모든 자료가 삭제되었습니다.' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on http://localhost:${PORT}`); });