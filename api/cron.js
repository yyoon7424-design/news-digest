// 매일 오전 7시(KST) = UTC 22:00 에 자동 실행
export default async function handler(req, res) {
  // Vercel Cron 요청 검증
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const SECTIONS = [
    { key: "politics", label: "세계 정치" },
    { key: "economy", label: "글로벌 경제" },
    { key: "markets", label: "글로벌 증시" },
    { key: "semiconductor", label: "반도체" },
    { key: "ai", label: "AI 산업" },
  ];

  try {
    // 1. 뉴스 수집
    const sections = {};
    for (const { key, label } of SECTIONS) {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://news-digest-tau-umber.vercel.app"}/api/news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey: key, sectionLabel: label }),
      });
      const data = await r.json();
      sections[key] = data.items || "error";
      await new Promise(r => setTimeout(r, 1000));
    }

    // 2. 구독자 목록 가져오기 (Vercel KV 또는 환경변수로 관리)
    const subscribers = JSON.parse(process.env.SUBSCRIBERS || "[]");

    // 3. 이메일 발송
    const sendRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://news-digest-tau-umber.vercel.app"}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscribers, sections }),
    });
    const sendData = await sendRes.json();

    res.status(200).json({ success: true, ...sendData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}