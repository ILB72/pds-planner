import { useState, useEffect } from 'react';
import './index.css'; // CSS 불러오기

function App() {
  const [activeTab, setActiveTab] = useState('card1');

  return (
    <div className="app-container">
      <div className="notice-banner">
        <strong>⚠️ 안내:</strong> 지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요.
      </div>

      <div className="nav-bar">
        {/* 모바일 가로 스크롤을 위한 래퍼 */}
        <div className="tab-group-wrapper">
          <div className="tab-group">
            <button onClick={() => setActiveTab('card1')} className={`tab-btn ${activeTab === 'card1' ? 'active' : ''}`}>계획</button>
            <button onClick={() => setActiveTab('card2')} className={`tab-btn ${activeTab === 'card2' ? 'active' : ''}`}>할 일</button>
            <button onClick={() => setActiveTab('card3')} className={`tab-btn ${activeTab === 'card3' ? 'active' : ''}`}>기록</button>
            <button onClick={() => setActiveTab('card4')} className={`tab-btn ${activeTab === 'card4' ? 'active' : ''}`}>돌아보기</button>
          </div>
        </div>
        <button className="btn-export" onClick={async () => {
          const res = await fetch('/api/export');
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pds-planner-backup.json';
          a.click();
          URL.revokeObjectURL(url);
        }}>
          📥 내 데이터 내보내기
        </button>
      </div>

      {activeTab === 'card1' && <Card1 />}
      {activeTab === 'card2' && <Card2 />}
      {activeTab === 'card3' && <Card3 />}
      {activeTab === 'card4' && <Card4 />}
    </div>
  );
}

// ================= 카드 1 컴포넌트 (계획) =================
function Card1() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ title: '', period_start: '', period_end: '', priority: 'medium', success_criteria: '', estimated_minutes: 0 });
  const [editingId, setEditingId] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    setPlans(await res.json());
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

  const handleShowHistory = async (id) => {
    const res = await fetch(`/api/plans/${id}/history`);
    setHistoryData(await res.json());
  };

  return (
    <div>
      <h2>계획 세우기</h2>
      <div className="form-card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="plan-title">계획 제목</label>
            <input id="plan-title" name="title" placeholder="계획 제목" value={form.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="plan-start">시작일</label>
            <input id="plan-start" type="date" name="period_start" value={form.period_start} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="plan-end">종료일</label>
            <input id="plan-end" type="date" name="period_end" value={form.period_end} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="plan-priority">우선순위</label>
            <select id="plan-priority" name="priority" value={form.priority} onChange={handleChange}>
              <option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="plan-est">예상 시간 (분)</label>
            <input id="plan-est" type="number" name="estimated_minutes" placeholder="예상 시간 (분)" value={form.estimated_minutes} onChange={handleChange} required />
          </div>
          <div className="form-group full-width">
            <label htmlFor="plan-success">성공 기준</label>
            <input id="plan-success" name="success_criteria" placeholder="성공 기준" value={form.success_criteria} onChange={handleChange} required />
          </div>
          <div className="full-width" style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="submit" className="btn-primary">{editingId ? '수정 완료' : '계획 추가'}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm({ title: '', period_start: '', period_end: '', priority: 'medium', success_criteria: '', estimated_minutes: 0 }); }}>취소</button>}
          </div>
        </form>
      </div>

      <h3>내 계획 목록</h3>
      {plans.length === 0 && <div className="empty-text">아직 계획이 없습니다. 첫 계획을 세워보세요!</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {plans.map((plan) => (
          <li key={plan.id} className="list-card">
            <h4>{plan.title} <span className={`badge ${plan.priority === 'high' ? 'text-high' : plan.priority === 'low' ? 'text-low' : ''}`} style={{ backgroundColor: plan.priority === 'high' ? '#ffcdd2' : plan.priority === 'low' ? '#c8e6c9' : '#ffe0b2', color: 'inherit' }}>{plan.priority}</span></h4>
            <p>기간: {plan.period_start.split('T')[0]} ~ {plan.period_end.split('T')[0]} | 예상: {plan.estimated_minutes}분</p>
            <p>성공 기준: {plan.success_criteria}</p>
            {plan.next_improvement && (
              <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>🎯 다음 계획을 위한 고칠 점: {plan.next_improvement}</p>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn-secondary" onClick={() => handleEdit(plan)}>수정하기</button>
              <button className="btn-secondary" onClick={() => handleShowHistory(plan.id)}>이력 보기</button>
            </div>
          </li>
        ))}
      </ul>

      {historyData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>계획 수정 이력</h3>
            {historyData.length === 0 ? <p>수정 이력이 없습니다.</p> : (
              <ul style={{ paddingLeft: '20px' }}>
                {historyData.map((h, idx) => {
                  const snap = typeof h.snapshot === 'string' ? JSON.parse(h.snapshot) : h.snapshot;
                  return (
                    <li key={idx} style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                      <p style={{ fontSize: '12px', color: '#888' }}>수정 시각: {new Date(h.changed_at).toLocaleString('ko-KR')}</p>
                      <p><strong>이전 제목:</strong> {snap.title}</p>
                      <p><strong>이전 성공 기준:</strong> {snap.success_criteria}</p>
                      <p><strong>이전 예상 시간:</strong> {snap.estimated_minutes}분</p>
                    </li>
                  );
                })}
              </ul>
            )}
            <button className="btn-secondary" style={{ marginTop: '15px' }} onClick={() => setHistoryData(null)}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= 카드 2 컴포넌트 (할 일) =================
function Card2() {
  const [tasks, setTasks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ plan_id: '', title: '', due_date: '', priority: 'medium', tags: '', estimated_minutes: 0 });
  const [editingId, setEditingId] = useState(null);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('priority_desc');

  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    setPlans(await res.json());
  };

  const fetchTasks = async () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter) params.append('status', statusFilter);
    if (sort) params.append('sort', sort);
    const res = await fetch(`/api/tasks?${params.toString()}`);
    setTasks(await res.json());
  };

  useEffect(() => { fetchPlans(); }, []);
  useEffect(() => { fetchTasks(); }, [search, statusFilter, sort]);

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
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchTasks();
  };

  return (
    <div>
      <h2>할 일 다루기</h2>
      <div className="form-card">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="task-plan">계획 선택</label>
            <select id="task-plan" name="plan_id" value={form.plan_id} onChange={handleChange} required>
              <option value="">계획을 선택하세요</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div className="form-group full-width">
            <label htmlFor="task-title">할 일 내용</label>
            <input id="task-title" name="title" placeholder="할 일 내용" value={form.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="task-due">마감일</label>
            <input id="task-due" type="date" name="due_date" value={form.due_date} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="task-priority">우선순위</label>
            <select id="task-priority" name="priority" value={form.priority} onChange={handleChange}>
              <option value="high">높음</option><option value="medium">보통</option><option value="low">낮음</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="task-tags">태그 (쉼표로 구분)</label>
            <input id="task-tags" name="tags" placeholder="예: 공부,알고리즘" value={form.tags} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="task-est">예상 시간 (분)</label>
            <input id="task-est" type="number" name="estimated_minutes" placeholder="예상 시간 (분)" value={form.estimated_minutes} onChange={handleChange} />
          </div>
          <div className="full-width" style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="submit" className="btn-primary">{editingId ? '수정 완료' : '할 일 추가'}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={() => { setEditingId(null); setForm({ plan_id: '', title: '', due_date: '', priority: 'medium', tags: '', estimated_minutes: 0 }); }}>취소</button>}
          </div>
        </form>
      </div>

      <div className="form-card" style={{ backgroundColor: '#f8f9fb', border: 'none' }}>
        <h3 style={{ marginTop: 0, fontSize: '16px' }}>검색 / 필터 / 정렬</h3>
        <p style={{ fontSize: '12px', color: '#666' }}>* 정렬 기준: 기본은 우선순위(높음→낮음) 순이며, 마감일이 빠른 순서, ID 순서로 정렬됩니다.</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input placeholder="제목 또는 태그 검색" value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '8px', flex: 1, minWidth: '150px', border: '1px solid #ddd', borderRadius: '8px' }} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <option value="">전체 상태</option>
            <option value="todo">진행 중</option>
            <option value="done">완료</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <option value="priority_desc">우선순위 높은 순 (기본)</option>
            <option value="due_date_asc">마감일 빠른 순</option>
            <option value="due_date_desc">마감일 늦은 순</option>
          </select>
        </div>
      </div>

      <h3>내 할 일 목록</h3>
      {tasks.length === 0 && <div className="empty-text">조건에 맞는 할 일이 없습니다.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {tasks.map((task) => (
          <li key={task.id} className="list-card" style={{ backgroundColor: task.status === 'done' ? '#f2faf5' : '#fff' }}>
            <h4 style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--muted)' : 'inherit' }}>
              {task.status === 'done' ? '✅ ' : '⬜ '} 
              {task.title} 
              <span className={`badge ${task.priority === 'high' ? 'text-high' : task.priority === 'low' ? 'text-low' : ''}`} style={{ marginLeft: '8px', backgroundColor: task.priority === 'high' ? '#ffcdd2' : task.priority === 'low' ? '#c8e6c9' : '#ffe0b2', color: 'inherit' }}>[{task.priority}]</span>
            </h4>
            <p>태그: {task.tags || '없음'} | 예상: {task.estimated_minutes}분 | 마감: {task.due_date ? task.due_date.split('T')[0] : '없음'} | 상태: {task.status}</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn-secondary" onClick={() => handleEdit(task)}>수정</button>
              <button className="btn-secondary" onClick={() => handleStatusToggle(task.id, task.status)}>{task.status === 'done' ? '되돌리기' : '완료'}</button>
              <button className="btn-secondary" style={{ color: '#d32f2f' }} onClick={() => handleDelete(task.id)}>삭제</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ================= 카드 3 컴포넌트 (실행 기록) =================
function Card3() {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [executions, setExecutions] = useState([]);
  const [form, setForm] = useState({ started_at: '', ended_at: '', blocked_reason: '' });
  const [isLoading, setIsLoading] = useState(false);

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    setTasks(await res.json());
  };

  const fetchExecutions = async (taskId) => {
    if (!taskId) return;
    const res = await fetch(`/api/executions/${taskId}`);
    setExecutions(await res.json());
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleTaskChange = (e) => {
    const taskId = e.target.value;
    setSelectedTaskId(taskId);
    fetchExecutions(taskId);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTaskId) return alert('할 일을 선택하세요.');
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, task_id: selectedTaskId }),
      });
      const data = await res.json();

      if (res.ok) {
        alert('실행 기록이 저장되었습니다.');
        fetchExecutions(selectedTaskId);
        setForm({ started_at: '', ended_at: '', blocked_reason: '' });
      } else {
        alert(data.error);
      }
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div>
      <h2>실제로 한 일 적기</h2>
      
      <div className="form-card" style={{ marginBottom: '20px' }}>
        <div className="form-group">
          <label htmlFor="exec-task">어떤 일을 기록할까요?</label>
          <select id="exec-task" value={selectedTaskId} onChange={handleTaskChange}>
            <option value="">할 일을 선택하세요</option>
            {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
      </div>

      {selectedTaskId && (
        <>
          <div className="form-card" style={{ backgroundColor: '#fafafa' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ marginTop: 0, fontSize: '16px' }}>실행 기록 추가</h3>
              <div className="form-group">
                <label htmlFor="exec-start">시작 시각</label>
                <input id="exec-start" type="datetime-local" name="started_at" value={form.started_at} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="exec-end">끝난 시각</label>
                <input id="exec-end" type="datetime-local" name="ended_at" value={form.ended_at} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="exec-blocked">막혔던 이유 (선택)</label>
                <input id="exec-blocked" name="blocked_reason" placeholder="예: 개념 이해 부족" value={form.blocked_reason} onChange={handleChange} />
              </div>
              
              <button type="submit" className="btn-primary" disabled={isLoading} style={{ marginTop: '8px' }}>
                {isLoading ? '저장 중...' : '실행 기록 저장'}
              </button>
            </form>
          </div>

          <h3>이 할 일의 실행 기록 목록</h3>
          {executions.length === 0 && <div className="empty-text">기록이 없습니다.</div>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {executions.map(ex => (
              <li key={ex.id} className="list-card">
                <p><strong>걸린 시간:</strong> {ex.duration_minutes}분</p>
                <p><strong>시작:</strong> {new Date(ex.started_at).toLocaleString('ko-KR')} ~ <strong>종료:</strong> {new Date(ex.ended_at).toLocaleString('ko-KR')}</p>
                <p><strong>막힌 이유:</strong> {ex.blocked_reason || '없음'}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ================= 카드 4 컴포넌트 (돌아보기) =================
function Card4() {
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [review, setReview] = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [drilldownType, setDrilldownType] = useState('');
  const [nextImprovement, setNextImprovement] = useState('');

  const fetchPlans = async () => {
    const res = await fetch('/api/plans');
    setPlans(await res.json());
  };

  const fetchReview = async (planId) => {
    if (!planId) return;
    const res = await fetch(`/api/review/${planId}`);
    setReview(await res.json());
    setDrilldownData(null);
  };

  useEffect(() => { fetchPlans(); }, []);

  const handlePlanChange = (e) => {
    const planId = e.target.value;
    setSelectedPlanId(planId);
    fetchReview(planId);
  };

  const handleDrilldown = async (type) => {
    if (type === drilldownType) {
      setDrilldownData(null);
      setDrilldownType('');
      return;
    }
    const res = await fetch(`/api/review/${selectedPlanId}/drilldown?type=${type}`);
    const data = await res.json();
    setDrilldownData(data);
    setDrilldownType(type);
  };

  return (
    <div>
      <h2>돌아보기</h2>
      
      <div className="form-card" style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <label htmlFor="review-plan">어떤 계획을 돌아볼까요?</label>
          <select id="review-plan" value={selectedPlanId} onChange={handlePlanChange}>
            <option value="">계획을 선택하세요</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
      </div>

      {review && (
        <div>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>📊 집계 결과 (숫자를 누르면 기록을 볼 수 있어요)</h3>
          <div className="review-grid">
            <div className={`review-card ${drilldownType === 'total' ? 'active' : ''}`} onClick={() => handleDrilldown('total')}>
              <p><strong>전체 할 일:</strong> <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{review.total_tasks}개</span></p>
            </div>
            <div className={`review-card ${drilldownType === 'done' ? 'active' : ''}`} onClick={() => handleDrilldown('done')}>
              <p><strong>완료:</strong> <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{review.done_tasks}개</span></p>
            </div>
            <div className={`review-card ${drilldownType === 'delayed' ? 'active' : ''}`} onClick={() => handleDrilldown('delayed')}>
              <p><strong>지연:</strong> <span style={{ color: '#d32f2f', textDecoration: 'underline' }}>{review.delayed_tasks}개</span></p>
            </div>
            <div className={`review-card ${drilldownType === 'blocked' ? 'active' : ''}`} onClick={() => handleDrilldown('blocked')}>
              <p><strong>막힘:</strong> <span style={{ color: '#ed6c02', textDecoration: 'underline' }}>{review.blocked_tasks}개</span></p>
            </div>
            <div className={`review-card ${drilldownType === 'estimated' ? 'active' : ''}`} onClick={() => handleDrilldown('estimated')}>
              <p><strong>예상 시간:</strong> <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{review.total_estimated}분</span></p>
            </div>
            <div className={`review-card ${drilldownType === 'actual' ? 'active' : ''}`} onClick={() => handleDrilldown('actual')}>
              <p><strong>실제 시간:</strong> <span style={{ color: 'var(--accent)', textDecoration: 'underline' }}>{review.total_actual}분</span></p>
            </div>
            <div className="review-card" style={{ gridColumn: '1 / -1', backgroundColor: '#fff8e1', cursor: 'default' }}>
              <p><strong>시간 차이 (실제 - 예상):</strong> {review.difference}분</p>
            </div>
          </div>

          {drilldownData && (
            <div className="form-card" style={{ backgroundColor: '#f0f7ff', border: '1px solid #cce5ff' }}>
              <h4>{drilldownType === 'done' ? '완료된' : drilldownType === 'delayed' ? '지연된' : drilldownType === 'blocked' ? '막힌' : '해당'} 할 일 기록 ({drilldownData.length}건)</h4>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {drilldownData.map(task => (
                  <li key={task.id} style={{ marginBottom: '8px' }}>{task.title} (상태: {task.status}, 마감: {task.due_date ? task.due_date.split('T')[0] : '없음'})</li>
                ))}
                {drilldownData.length === 0 && <p style={{ margin: 0 }}>해당하는 기록이 없습니다.</p>}
              </ul>
            </div>
          )}

          <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid var(--border)' }} />
          
          <div className="form-card">
            <h3 style={{ marginTop: 0, fontSize: '16px' }}>다음 계획으로 넘길 고칠 점 한 줄</h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>위 집계를 보고 느낀 점을 적어 다음 계획에 반영해 보세요.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                style={{ flex: 1, padding: '10px', border: '1px solid var(--border)', borderRadius: '8px' }}
                placeholder="예: 다음에는 예상 시간을 넉넉하게 잡자" 
                value={nextImprovement} 
                onChange={(e) => setNextImprovement(e.target.value)} 
              />
              <button className="btn-primary" onClick={async () => {
                if(!nextImprovement) return alert('내용을 입력하세요');
                const res = await fetch(`/api/plans/${selectedPlanId}/improvement`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ improvement: nextImprovement })
                });
                if (res.ok) {
                  alert('다음 계획으로 넘길 고칠 점이 저장되었습니다.');
                  setNextImprovement('');
                  fetchPlans();
                }
              }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;