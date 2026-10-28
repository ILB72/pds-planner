import { useState, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('card1');

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('card1')} style={{ marginRight: '10px', fontWeight: activeTab === 'card1' ? 'bold' : 'normal' }}>카드 1 (계획)</button>
        <button onClick={() => setActiveTab('card2')} style={{ fontWeight: activeTab === 'card2' ? 'bold' : 'normal' }}>카드 2 (할 일)</button>
      </div>

      {activeTab === 'card1' && <Card1 />}
      {activeTab === 'card2' && <Card2 />}
    </div>
  );
}

// ================= 카드 1 컴포넌트 =================
function Card1() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ title: '', period_start: '', period_end: '', priority: 'medium', success_criteria: '', estimated_minutes: 0 });
  const [editingId, setEditingId] = useState(null);

  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    const data = await res.json();
    setPlans(data);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/plans/${editingId}` : '/api/plans';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) {
      alert(editingId ? '수정되었습니다. (이력이 저장됨)' : '생성되었습니다.');
      setForm({ title: '', period_start: '', period_end: '', priority: 'medium', success_criteria: '', estimated_minutes: 0 });
      setEditingId(null);
      fetchPlans();
    }
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setForm({ title: plan.title, period_start: plan.period_start.split('T')[0], period_end: plan.period_end.split('T')[0], priority: plan.priority, success_criteria: plan.success_criteria, estimated_minutes: plan.estimated_minutes });
  };

  return (
    <div>
      <h2>카드 1: 계획 세우기</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px', padding: '20px', border: '1px solid #ccc' }}>
        <h3>{editingId ? '계획 수정하기' : '새 계획 만들기'}</h3>
        <input name="title" placeholder="계획 제목" value={form.title} onChange={handleChange} required />
        <div>
          <input type="date" name="period_start" value={form.period_start} onChange={handleChange} required />
          ~
          <input type="date" name="period_end" value={form.period_end} onChange={handleChange} required />
        </div>
        <select name="priority" value={form.priority} onChange={handleChange}>
          <option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option>
        </select>
        <input name="success_criteria" placeholder="성공 기준" value={form.success_criteria} onChange={handleChange} required />
        <input type="number" name="estimated_minutes" placeholder="예상 시간 (분)" value={form.estimated_minutes} onChange={handleChange} required />
        <button type="submit">{editingId ? '수정 완료' : '계획 추가'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', period_start: '', period_end: '', priority: 'medium', success_criteria: '', estimated_minutes: 0 }); }}>취소</button>}
      </form>
      <h3>내 계획 목록</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {plans.map((plan) => (
          <li key={plan.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px' }}>
            <h4>{plan.title} ({plan.priority})</h4>
            <button onClick={() => handleEdit(plan)}>수정하기</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================= 카드 2 컴포넌트 =================
function Card2() {
  const [tasks, setTasks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ plan_id: '', title: '', due_date: '', priority: 'medium', tags: '', estimated_minutes: 0 });
  const [editingId, setEditingId] = useState(null);
  
  // 검색/필터/정렬 상태
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('priority_desc');

  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    setPlans(await res.json());
  };

  const fetchTasks = async () => {
    // 검색, 필터, 정렬 쿼리 파라미터 조합
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);
    if (sort) params.append('sort', sort);

    const res = await fetch(`/api/tasks?${params.toString()}`);
    setTasks(await res.json());
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // 검색, 필터, 정렬이 바뀔 때마다 목록 다시 불러오기
  useEffect(() => {
    fetchTasks();
  }, [search, statusFilter, sort]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/tasks/${editingId}` : '/api/tasks';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) {
      alert(editingId ? '할 일이 수정되었습니다.' : '할 일이 생성되었습니다.');
      setForm({ plan_id: '', title: '', due_date: '', priority: 'medium', tags: '', estimated_minutes: 0 });
      setEditingId(null);
      fetchTasks();
    }
  };

  const handleEdit = (task) => {
    setEditingId(task.id);
    setForm({ plan_id: task.plan_id, title: task.title, due_date: task.due_date ? task.due_date.split('T')[0] : '', priority: task.priority, tags: task.tags || '', estimated_minutes: task.estimated_minutes });
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    await fetch(`/api/tasks/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
    fetchTasks();
  };

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchTasks();
  };

  return (
    <div>
      <h2>카드 2: 할 일 다루기</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px', padding: '20px', border: '1px solid #ccc' }}>
        <h3>{editingId ? '할 일 수정하기' : '새 할 일 만들기'}</h3>
        
        <select name="plan_id" value={form.plan_id} onChange={handleChange} required>
          <option value="">계획을 선택하세요</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>

        <input name="title" placeholder="할 일 내용" value={form.title} onChange={handleChange} required />
        <input type="date" name="due_date" value={form.due_date} onChange={handleChange} />
        
        <select name="priority" value={form.priority} onChange={handleChange}>
          <option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option>
        </select>

        <input name="tags" placeholder="태그 (쉼표로 구분)" value={form.tags} onChange={handleChange} />
        <input type="number" name="estimated_minutes" placeholder="예상 시간 (분)" value={form.estimated_minutes} onChange={handleChange} />
        
        <button type="submit">{editingId ? '수정 완료' : '할 일 추가'}</button>
        {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ plan_id: '', title: '', due_date: '', priority: 'medium', tags: '', estimated_minutes: 0 }); }}>취소</button>}
      </form>

      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
        <h3>검색 / 필터 / 정렬</h3>
        <p style={{ fontSize: '12px', color: '#666' }}>* 정렬 기준: 기본은 우선순위(높음→낮음) 순이며, 마감일이 빠른 순서, ID 순서로 정렬됩니다.</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input placeholder="제목 또는 태그 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">전체 상태</option>
            <option value="todo">진행 중</option>
            <option value="done">완료</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="priority_desc">우선순위 높은 순 (기본)</option>
            <option value="due_date_asc">마감일 빠른 순</option>
            <option value="due_date_desc">마감일 늦은 순</option>
          </select>
        </div>
      </div>

      <h3>내 할 일 목록</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task) => (
          <li key={task.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', backgroundColor: task.status === 'done' ? '#e8f5e9' : 'white' }}>
            <h4>{task.title} <span style={{fontSize: '12px'}}>[{task.priority}]</span></h4>
            <p>태그: {task.tags} | 예상: {task.estimated_minutes}분 | 마감: {task.due_date ? task.due_date.split('T')[0] : '없음'} | 상태: {task.status}</p>
            <button onClick={() => handleEdit(task)}>수정</button> | 
            <button onClick={() => handleStatusToggle(task.id, task.status)}>{task.status === 'done' ? '되돌리기' : '완료'}</button> | 
            <button onClick={() => handleDelete(task.id)}>삭제</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;