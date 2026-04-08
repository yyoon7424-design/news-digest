const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
//  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
//    return res.status(401).json({ error: "Unauthorized" });
//  }

  const SECTIONS = [
    { key: "politics", label: "세계 정치" },
    { key: "economy", label: "글로벌 경제" },
    { key: "markets", label: "글로벌 증시" },
    { key: "semiconductor", label: "반도체" },
    { key: "ai", label: "AI 산업" },
  ];

  try {
    // 1. Supabase에서 활성 구독자 목록 가져오기
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('*')
      .eq('active', true);
    if (error) throw error;
    if (!subscribers || subscribers.length === 0) {
      return res.status(200).json({ message: "활성 구독자 없음" });
    }

    // 2. 뉴스 수집
    const sections = {};
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://news-digest-tau-umber.vercel.app";
    for (const { key, label } of SECTIONS) {
      const r = await fetch(`${baseUrl}/api/news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey: key, sectionLabel: label }),
      });
      const data = await r.json();
      sections[key] = data.items || [];
      await new Promise(r => setTimeout(r, 1000));
    }

    // 3. 이메일 발송
    const sendRes = await fetch(`${baseUrl}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscribers, sections }),
    });
    const sendData = await sendRes.json();

    res.status(200).json({ success: true, subscriberCount: subscribers.length, ...sendData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
