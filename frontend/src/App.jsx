import { useState, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('card1');

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* 공개 안내문 (T06-C82) */}
      <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '15px', marginBottom: '20px', borderRadius: '5px', border: '1px solid #ffeeba' }}>
        <strong>⚠️ 안내:</strong> 지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요.
      </div>

      <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button onClick={() => setActiveTab('card1')} style={{ marginRight: '10px', fontWeight: activeTab === 'card1' ? 'bold' : 'normal' }}>카드 1 (계획)</button>
          <button onClick={() => setActiveTab('card2')} style={{ marginRight: '10px', fontWeight: activeTab === 'card2' ? 'bold' : 'normal' }}>카드 2 (할 일)</button>
          <button onClick={() => setActiveTab('card3')} style={{ marginRight: '10px', fontWeight: activeTab === 'card3' ? 'bold' : 'normal' }}>카드 3 (실행 기록)</button>
          <button onClick={() => setActiveTab('card4')} style={{ fontWeight: activeTab === 'card4' ? 'bold' : 'normal' }}>카드 4 (돌아보기)</button>
        </div>
        <button onClick={async () => {
          const res = await fetch('/api/export');
          const data = await res.json();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'pds-planner-backup.json';
          a.click();
          URL.revokeObjectURL(url);
        }} style={{ backgroundColor: '#4CAF50', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
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
            {/* 💡 추가된 부분: 다음 계획 고칠 점 표시 */}
            {plan.next_improvement && (
              <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '5px 0' }}>
                🎯 다음 계획을 위한 고칠 점: {plan.next_improvement}
              </p>
            )}
            <button onClick={() => handleEdit(plan)}>수정하기</button>
          </li>
        ))}
      </ul>
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
      } else {
        alert(data.error);
      }
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div>
      <h2>카드 3: 실제로 한 일 적기 (실행 기록)</h2>
      
      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
        <h3>어떤 일을 기록할까요?</h3>
        <select value={selectedTaskId} onChange={handleTaskChange} style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>
          <option value="">할 일을 선택하세요</option>
          {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      {selectedTaskId && (
        <>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px', padding: '20px', border: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
            <h3>실행 기록 추가</h3>
            <label>시작 시각:</label>
            <input type="datetime-local" name="started_at" value={form.started_at} onChange={handleChange} required />
            <label>끝난 시각:</label>
            <input type="datetime-local" name="ended_at" value={form.ended_at} onChange={handleChange} required />
            <label>막혔던 이유 (선택):</label>
            <input name="blocked_reason" placeholder="예: 개념 이해 부족" value={form.blocked_reason} onChange={handleChange} />
            
            <button type="submit" disabled={isLoading}>
              {isLoading ? '저장 중...' : '실행 기록 저장'}
            </button>
          </form>

          <h3>이 할 일의 실행 기록 목록</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {executions.length === 0 && <p>기록이 없습니다.</p>}
            {executions.map(ex => (
              <li key={ex.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px' }}>
                <p><strong>걸린 시간:</strong> {ex.duration_minutes}분</p>
                <p><strong>시작:</strong> {ex.started_at} ~ <strong>종료:</strong> {ex.ended_at}</p>
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
      <h2>카드 4: 돌아보기 (집계)</h2>
      
      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc' }}>
        <h3>어떤 계획을 돌아볼까요?</h3>
        <select value={selectedPlanId} onChange={handlePlanChange} style={{ width: '100%', padding: '10px' }}>
          <option value="">계획을 선택하세요</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>

      {review && (
        <div>
          <h3>📊 집계 결과 (숫자를 누르면 기록을 볼 수 있어요)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
              <p><strong>전체 할 일:</strong> {review.total_tasks}개</p>
            </div>
            
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer' }} onClick={() => handleDrilldown('done')}>
              <p><strong>완료:</strong> <span style={{ color: 'blue', textDecoration: 'underline' }}>{review.done_tasks}개</span> (클릭)</p>
            </div>

            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer' }} onClick={() => handleDrilldown('delayed')}>
              <p><strong>지연:</strong> <span style={{ color: 'red', textDecoration: 'underline' }}>{review.delayed_tasks}개</span> (클릭)</p>
            </div>

            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', cursor: 'pointer' }} onClick={() => handleDrilldown('blocked')}>
              <p><strong>막힘:</strong> <span style={{ color: 'orange', textDecoration: 'underline' }}>{review.blocked_tasks}개</span> (클릭)</p>
            </div>

            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
              <p><strong>예상 시간:</strong> {review.total_estimated}분</p>
            </div>

            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px' }}>
              <p><strong>실제 시간:</strong> {review.total_actual}분</p>
            </div>
            
            <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', gridColumn: '1 / -1', backgroundColor: '#fff3e0' }}>
              <p><strong>시간 차이 (실제 - 예상):</strong> {review.difference}분</p>
            </div>
          </div>

          {drilldownData && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
              <h4>{drilldownType === 'done' ? '완료된' : drilldownType === 'delayed' ? '지연된' : '막힌'} 할 일 기록 ({drilldownData.length}건)</h4>
              <ul style={{ paddingLeft: '20px' }}>
                {drilldownData.map(task => (
                  <li key={task.id}>{task.title} (상태: {task.status}, 마감: {task.due_date ? task.due_date.split('T')[0] : '없음'})</li>
                ))}
                {drilldownData.length === 0 && <p>해당하는 기록이 없습니다.</p>}
              </ul>
            </div>
          )}

          <hr style={{ margin: '30px 0' }} />
          
          <div style={{ padding: '20px', border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
            <h3>다음 계획으로 넘길 고칠 점 한 줄 (T06-C33)</h3>
            <p style={{ fontSize: '12px', color: '#666' }}>위 집계를 보고 느낀 점을 적어 다음 계획에 반영해 보세요.</p>
            <input 
              style={{ width: '80%', padding: '10px', marginRight: '10px' }}
              placeholder="예: 다음에는 예상 시간을 넉넉하게 잡자" 
              value={nextImprovement} 
              onChange={(e) => setNextImprovement(e.target.value)} 
            />
            <button onClick={async () => {
               if(!nextImprovement) return alert('내용을 입력하세요');
               const res = await fetch(`/api/plans/${selectedPlanId}/improvement`, {
                 method: 'PATCH',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ improvement: nextImprovement })
               });
               if (res.ok) {
                 alert('다음 계획으로 넘길 고칠 점이 저장되었습니다.');
                 setNextImprovement(''); // 입력창 비우기
                 fetchPlans(); // 카드 1 목록 새로고침 유도 (탭 이동 시 반영됨)
               }
            }}>저장</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;