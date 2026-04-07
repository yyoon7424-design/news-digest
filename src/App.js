import { useState, useEffect } from "react";
import "./App.css";

const SECTIONS = [
  { key: "politics", label: "세계 정치", icon: "🌍" },
  { key: "economy", label: "글로벌 경제", icon: "📈" },
  { key: "markets", label: "글로벌 증시", icon: "💹" },
  { key: "semiconductor", label: "반도체", icon: "🔬" },
  { key: "ai", label: "AI 산업", icon: "🤖" },
];

// ── API 호출은 /api/news 프록시를 통해 (API 키 보호) ──
async function fetchSection(sectionKey, sectionLabel, onDone, onError) {
  try {
    const res = await fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionKey, sectionLabel }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "서버 오류");
    onDone(data.items);
  } catch (e) {
    onError(e?.message || String(e));
  }
}

function SectionBlock({ label, icon, items, loading, errorMsg }) {
  return (
    <div className="section-block">
      <div className="section-header">
        <span className="section-icon">{icon}</span>
        <span className="section-title">{label}</span>
        {loading && <span className="section-loading">수집 중...</span>}
      </div>
      {loading ? (
        <div className="skeleton-list">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ opacity: 1 - i * 0.12 }} />)}
        </div>
      ) : items === "error" ? (
        <div className="error-box">
          <div className="error-title">이 섹션을 불러오는 데 실패했습니다.</div>
          {errorMsg && <div className="error-msg">오류: {errorMsg}</div>}
        </div>
      ) : (items || []).map((item, i) => (
        <div key={i} className="news-item">
          <div className="news-title">{i + 1}. {item.title}</div>
          <div className="news-summary">{item.summary}</div>
        </div>
      ))}
    </div>
  );
}

function SubscribePage({ onSwitch, onSubscribe }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !name) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSubscribe({ name, email });
      setSubmitted(true);
    } catch (e) {
      alert("오류: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="page subscribe-page">
      <div className="hero">
        <div className="hero-badge">GLOBAL NEWS DIGEST</div>
        <h1 className="hero-title">매일 아침 7시,<br />세계가 한눈에</h1>
        <p className="hero-desc">AI가 선별한 정치·경제·증시·반도체·AI 핵심 뉴스를<br />매일 아침 이메일로 받아보세요.</p>
      </div>

      <div className="feature-grid">
        {[
          { icon: "🌍", label: "세계 정치", desc: "주요 5건" },
          { icon: "📈", label: "글로벌 경제", desc: "주요 5건" },
          { icon: "💹", label: "글로벌 증시", desc: "주요 5건" },
          { icon: "🔬", label: "반도체", desc: "주요 5건" },
          { icon: "🤖", label: "AI 산업", desc: "주요 5건" },
          { icon: "⏰", label: "오전 7시 발송", desc: "매일 정시" },
        ].map(f => (
          <div key={f.label} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-label">{f.label}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      {!submitted ? (
        <div className="form-card">
          <div className="form-group">
            <label>이름</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="홍길동" />
          </div>
          <div className="form-group">
            <label>이메일</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <button className={`submit-btn ${email && name ? "active" : ""}`} onClick={handleSubmit} disabled={!email || !name || loading}>
            {loading ? "처리 중..." : "무료 구독 시작하기"}
          </button>
          <p className="form-note">언제든지 구독 취소 가능 · 스팸 없음</p>
        </div>
      ) : (
        <div className="success-box">
          <div className="success-check">✓</div>
          <div className="success-title">구독이 완료되었습니다!</div>
          <div className="success-desc">{name}님, 내일 아침 7시에 첫 뉴스레터를 보내드릴게요.</div>
        </div>
      )}

      <div className="switch-link">
        <button onClick={onSwitch}>관리자 대시보드 →</button>
      </div>
    </div>
  );
}

function Dashboard({ onSwitch, subscribers, setSubscribers }) {
  const [tab, setTab] = useState("overview");
  const [sections, setSections] = useState({});
  const [loadingSections, setLoadingSections] = useState({});
  const [anyLoading, setAnyLoading] = useState(false);
  const [errorMsgs, setErrorMsgs] = useState({});
  const [sendStatus, setSendStatus] = useState(null);

  useEffect(() => {
    fetch("/api/subscribers")
      .then(r => r.json())
      .then(data => { if (data.subscribers) setSubscribers(data.subscribers); });
  }, [setSubscribers]);

  const active = subscribers.filter(s => s.active).length;
  const allDone = SECTIONS.every(s => sections[s.key] && !loadingSections[s.key]);

  const fetchAllNews = () => {
    setSections({}); setSendStatus(null); setErrorMsgs({}); setAnyLoading(true); setLoadingSections({});
    const run = async () => {
      for (let i = 0; i < SECTIONS.length; i++) {
        const { key, label } = SECTIONS[i];
        setLoadingSections(p => ({ ...p, [key]: true }));
        await new Promise(resolve => {
          fetchSection(key, label,
            (data) => { setSections(p => ({ ...p, [key]: data })); setLoadingSections(p => ({ ...p, [key]: false })); resolve(); },
            (err) => { setSections(p => ({ ...p, [key]: "error" })); setErrorMsgs(p => ({ ...p, [key]: err })); setLoadingSections(p => ({ ...p, [key]: false })); resolve(); }
          );
        });
        if (i < SECTIONS.length - 1) await new Promise(r => setTimeout(r, 1000));
      }
      setAnyLoading(false);
    };
    run();
  };

  const toggleActive = (id) => setSubscribers(subscribers.map(s => s.id === id ? { ...s, active: !s.active } : s));

  return (
    <div className="page dashboard-page">
      <div className="dash-header">
        <div>
          <div className="dash-label">관리자 대시보드</div>
          <h2 className="dash-title">글로벌 뉴스 다이제스트</h2>
        </div>
        <button onClick={onSwitch}>구독 페이지 →</button>
      </div>

      <div className="stat-grid">
        {[
          { label: "전체 구독자", value: subscribers.length },
          { label: "활성 구독자", value: active },
          { label: "이번 달 발송", value: 3 },
        ].map(m => (
          <div key={m.label} className="stat-card">
            <div className="stat-label">{m.label}</div>
            <div className="stat-value">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="tabs">
        {[["overview","뉴스 미리보기"],["subscribers","구독자 관리"],["history","발송 이력"]].map(([k, l]) => (
          <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div className="action-row">
            <button onClick={fetchAllNews} disabled={anyLoading} className="fetch-btn">
              {anyLoading ? "뉴스 수집 중..." : "오늘의 뉴스 AI 수집·요약"}
            </button>
            {allDone && (
              <button className={`send-btn ${sendStatus === "done" ? "done" : ""}`}
                onClick={() => { setSendStatus("sending"); setTimeout(() => setSendStatus("done"), 2000); }}>
                {sendStatus === "sending" ? "발송 중..." : sendStatus === "done" ? "발송 완료 ✓" : `${active}명에게 발송`}
              </button>
            )}
          </div>
          {Object.keys(sections).length === 0 && !anyLoading && (
            <div className="empty-state">위 버튼을 눌러 오늘의 뉴스를 수집해보세요</div>
          )}
          {SECTIONS.map(({ key, label, icon }) =>
            (loadingSections[key] || sections[key]) ?
              <SectionBlock key={key} label={label} icon={icon} items={sections[key]} loading={!!loadingSections[key]} errorMsg={errorMsgs[key]} /> : null
          )}
        </div>
      )}

      {tab === "subscribers" && (
        <div>
          {subscribers.length === 0 && <div className="empty-state">구독자가 없습니다.</div>}
          {subscribers.map(sub => (
            <div key={sub.id} className="subscriber-row">
              <div className="avatar">{sub.name[0]}</div>
              <div className="sub-info">
                <div className="sub-name">{sub.name}</div>
                <div className="sub-email">{sub.email}</div>
              </div>
              <div className="sub-date">{sub.date}</div>
              <button className={`status-btn ${sub.active ? "active" : ""}`} onClick={() => toggleActive(sub.id)}>
                {sub.active ? "활성" : "비활성"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div>
          {["2026-04-03","2026-04-02","2026-04-01"].map((date, i) => (
            <div key={i} className="history-row">
              <div>
                <div className="history-subject">오늘의 글로벌 뉴스 브리핑</div>
                <div className="history-meta">{date} · {active}명 발송</div>
              </div>
              <span className="badge-success">발송 완료</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnsubscribePage({ email, onDone }) {
  const [status, setStatus] = useState("confirm"); // confirm | done | notfound

 const handleUnsubscribe = async () => {
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus("done");
    } catch (e) {
      setStatus("notfound");
    }
  };

  return (
    <div className="page" style={{ textAlign: "center", paddingTop: "4rem" }}>
      <div className="hero-badge">GLOBAL NEWS DIGEST</div>
      {status === "confirm" && (
        <>
          <h2 className="hero-title" style={{ fontSize: "22px", marginTop: "1rem" }}>구독을 취소하시겠어요?</h2>
          <p style={{ fontSize: "14px", color: "#888", margin: "1rem 0 2rem" }}>{email}</p>
          <button className="submit-btn active" style={{ maxWidth: "280px", margin: "0 auto" }} onClick={handleUnsubscribe}>
            구독 취소하기
          </button>
          <div style={{ marginTop: "1rem" }}>
            <button className="switch-link" style={{ fontSize: "13px", color: "#888", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }} onClick={onDone}>
              취소하지 않고 돌아가기
            </button>
          </div>
        </>
      )}
      {status === "done" && (
        <div className="success-box" style={{ maxWidth: "360px", margin: "2rem auto" }}>
          <div className="success-check">✓</div>
          <div className="success-title">구독이 취소되었습니다</div>
          <div className="success-desc" style={{ marginTop: "8px" }}>더 이상 뉴스레터가 발송되지 않아요.</div>
        </div>
      )}
      {status === "notfound" && (
        <div className="error-box" style={{ maxWidth: "360px", margin: "2rem auto" }}>
          <div className="error-title">이메일을 찾을 수 없습니다</div>
          <div className="error-msg">이미 취소되었거나 등록되지 않은 이메일이에요.</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("unsubscribe") ? "unsubscribe" : "subscribe";
  });
  const [unsubEmail] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("unsubscribe") || "";
  });
  const [subscribers, setSubscribers] = useState(() => {
    try { return JSON.parse(localStorage.getItem("subscribers") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("subscribers", JSON.stringify(subscribers));
  }, [subscribers]);

  const handleSubscribe = ({ name, email }) => {
    setSubscribers(prev => [...prev, { id: Date.now(), email, name, date: new Date().toISOString().slice(0,10), active: true }]);
  };

  if (page === "unsubscribe") {
    return <UnsubscribePage email={unsubEmail} onDone={() => setPage("subscribe")} />;
  }

  return page === "subscribe"
    ? <SubscribePage onSwitch={() => setPage("dashboard")} onSubscribe={handleSubscribe} />
    : <Dashboard onSwitch={() => setPage("subscribe")} subscribers={subscribers} setSubscribers={setSubscribers} />;
}