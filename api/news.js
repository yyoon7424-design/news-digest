export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { sectionKey, sectionLabel } = req.body;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "API 키가 설정되지 않았습니다." });

  const prompt = `오늘 ${sectionLabel} 관련 세계 주요 뉴스 5건을 검색하고, 아래 JSON 배열 형식으로만 응답해주세요. 마크다운이나 설명 없이 순수 JSON만:
[{"title":"제목","summary":"2-3문장 요약"},{"title":"제목","summary":"요약"},{"title":"제목","summary":"요약"},{"title":"제목","summary":"요약"},{"title":"제목","summary":"요약"}]`;

  const messages = [{ role: "user", content: prompt }];
  let finalText = "";

  try {
    for (let i = 0; i < 4; i++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages,
        }),
      });

      const data = await response.json();
      const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const toolUses = (data.content || []).filter(b => b.type === "tool_use");

      if (data.stop_reason === "end_turn" && textBlocks) { finalText = textBlocks; break; }
      if (!toolUses.length) { finalText = textBlocks; break; }

      messages.push({ role: "assistant", content: data.content });
      messages.push({ role: "user", content: toolUses.map(t => ({ type: "tool_result", tool_use_id: t.id, content: "검색 완료. JSON으로 응답해주세요." })) });
    }

    const clean = finalText.replace(/```json|```/g, "").trim();
    const match = clean.match(/\[[\s\S]*\]/);
    let jsonStr = match ? match[0] : clean;

    let items;
    try {
      items = JSON.parse(jsonStr);
    } catch {
      const lastComplete = jsonStr.lastIndexOf("},");
      items = JSON.parse(jsonStr.slice(0, lastComplete + 1) + "]");
    }

    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
