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

// [카드 1] 계획 생성 API
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

// [카드 1] 계획 조회 API
app.get('/api/plans', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM plans ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: '계획 조회 실패' });
  }
});

// [카드 1] 계획 수정 및 이력 저장 API (핵심)
app.put('/api/plans/:id', async (req, res) => {
  const { id } = req.params;
  const { title, period_start, period_end, priority, success_criteria, estimated_minutes } = req.body;
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. 수정 전 기존 계획 데이터 조회 (이력으로 남기기 위해)
    const [oldPlans] = await connection.query('SELECT * FROM plans WHERE id = ?', [id]);
    if (oldPlans.length === 0) throw new Error('계획을 찾을 수 없습니다.');
    
    // 2. 기존 데이터를 plan_history 테이블에 스냅샷으로 저장
    await connection.query(
      'INSERT INTO plan_history (plan_id, snapshot) VALUES (?, ?)',
      [id, JSON.stringify(oldPlans[0])]
    );

    // 3. plans 테이블 업데이트
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

const PORT = process.env.PORT || 3000;

// ==========================================
// [카드 2] 할 일(Task) 관련 API
// ==========================================

// 1. 할 일 생성 API
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

// 2. 할 일 조회 API (검색, 필터, 정렬 포함)
app.get('/api/tasks', async (req, res) => {
  const { plan_id, status, search, sort } = req.query; 
  // sort 기본값: priority_desc (우선순위 높은순), 동점일 땐 due_date 오름차순
  
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

  // 정렬 조건 (화면에 명시할 기준)
  if (sort === 'due_date_asc') {
    query += ` ORDER BY due_date ASC, id ASC`;
  } else if (sort === 'due_date_desc') {
    query += ` ORDER BY due_date DESC, id ASC`;
  } else {
    // 기본: 우선순위(high > medium > low) -> 마감일 빠른 순 -> ID 순
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

// 3. 할 일 수정 API (내용 수정)
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

// 4. 할 일 완료/되돌리기 API
app.patch('/api/tasks/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'done' 또는 'todo'
  try {
    await pool.query(`UPDATE tasks SET status=? WHERE id=?`, [status, id]);
    res.json({ message: `상태가 ${status}로 변경되었습니다.` });
  } catch (error) {
    res.status(500).json({ error: '상태 변경 실패' });
  }
});

// 5. 할 일 삭제 API (소프트 삭제)
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`UPDATE tasks SET deleted_at = NOW() WHERE id=?`, [id]);
    res.json({ message: '할 일이 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ error: '할 일 삭제 실패' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});