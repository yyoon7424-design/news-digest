export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { sectionLabel } = req.body;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "API 키가 없습니다." });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
       model: "claude-opus-4-5",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `${sectionLabel === "이란·미국·이스라엘 전쟁 현황 및 분석" 
  ? `오늘의 이란, 미국, 이스라엘 간 전쟁 및 분쟁 현황 중 가장 중요한 3가지를 아래 형식으로 답하세요. 각 항목에서 다음 내용을 반드시 포함하여 심층 분석해주세요: 1) 군사적 현황 2) 정치적 파급효과 3) 글로벌 경제 및 에너지 시장에 미치는 영향 4) 한국 경제에 미치는 영향:`
  : `오늘의 ${sectionLabel} 주요 뉴스 5건을 아래 형식으로만 답하세요:`}
##1##제목||분석내용
##2##제목||분석내용
##3##제목||분석내용`
        }]
      }),
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || "API 오류" });
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const items = [];
    for (const line of text.split("\n")) {
      const match = line.match(/##\d+##(.+)\|\|(.+)/);
      if (match) items.push({ title: match[1].trim(), summary: match[2].trim() });
    }
    if (items.length === 0) return res.status(500).json({ error: "파싱 실패: " + text.slice(0, 200) });
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
