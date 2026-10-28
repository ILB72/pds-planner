import { useState, useEffect } from 'react';

function App() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    title: '',
    period_start: '',
    period_end: '',
    priority: 'medium',
    success_criteria: '',
    estimated_minutes: 0,
  });
  const [editingId, setEditingId] = useState(null);

  // 계획 목록 불러오기
  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    const data = await res.json();
    setPlans(data);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // 입력값 변경
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 계획 생성 또는 수정
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/plans/${editingId}` : '/api/plans';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      alert(editingId ? '수정되었습니다. (이력이 저장됨)' : '생성되었습니다.');
      setForm({
        title: '',
        period_start: '',
        period_end: '',
        priority: 'medium',
        success_criteria: '',
        estimated_minutes: 0,
      });
      setEditingId(null);
      fetchPlans(); // 목록 새로고침
    }
  };

  // 수정 버튼 클릭
  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setForm({
      title: plan.title,
      period_start: plan.period_start.split('T')[0],
      period_end: plan.period_end.split('T')[0],
      priority: plan.priority,
      success_criteria: plan.success_criteria,
      estimated_minutes: plan.estimated_minutes,
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>카드 1: 계획 세우기</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px', padding: '20px', border: '1px solid #ccc' }}>
        <h3>{editingId ? '계획 수정하기' : '새 계획 만들기'}</h3>
        <input name="title" placeholder="계획 제목" value={form.title} onChange={handleChange} required />
        
        <div>
          <label>기간: </label>
          <input type="date" name="period_start" value={form.period_start} onChange={handleChange} required />
          ~
          <input type="date" name="period_end" value={form.period_end} onChange={handleChange} required />
        </div>

        <div>
          <label>우선순위: </label>
          <select name="priority" value={form.priority} onChange={handleChange}>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>

        <input name="success_criteria" placeholder="성공 기준 (예: 하루 1시간 이상 공부)" value={form.success_criteria} onChange={handleChange} required />
        <input type="number" name="estimated_minutes" placeholder="예상 시간 (분)" value={form.estimated_minutes} onChange={handleChange} required />

        <button type="submit">{editingId ? '수정 완료' : '계획 추가'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', period_start: '', period_end: '', priority: 'medium', success_criteria: '', estimated_minutes: 0 }); }}>취소</button>}
      </form>

      <h3>내 계획 목록</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {plans.map((plan) => (
          <li key={plan.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '5px' }}>
            <h4>{plan.title} ({plan.priority})</h4>
            <p>기간: {plan.period_start.split('T')[0]} ~ {plan.period_end.split('T')[0]}</p>
            <p>성공 기준: {plan.success_criteria} | 예상 시간: {plan.estimated_minutes}분</p>
            <button onClick={() => handleEdit(plan)}>수정하기</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;