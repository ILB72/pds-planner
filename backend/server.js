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
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});