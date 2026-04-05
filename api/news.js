export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sectionLabel } = req.body;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "API 키가 없습니다." });

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `${today} 기준 ${sectionLabel} 관련 세계 주요 뉴스 5건을 알려주세요. 반드시 아래 JSON 배열 형식으로만 응답하세요. 마크다운, 코드블록, 설명 없이 순수 JSON 배열만:
[{"title":"뉴스 제목","summary":"2-3문장 요약"},{"title":"뉴스 제목","summary":"2-3문장 요약"},{"title":"뉴스 제목","summary":"2-3문장 요약"},{"title":"뉴스 제목","summary":"2-3문장 요약"},{"title":"뉴스 제목","summary":"2-3문장 요약"}]`
        }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || "API 오류" });
    }

    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    let items;
    try {
      items = JSON.parse(match ? match[0] : clean);
    } catch {
      const lastComplete = (match ? match[0] : clean).lastIndexOf("},");
      items = JSON.parse((match ? match[0] : clean).slice(0, lastComplete + 1) + "]");
    }

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
