module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { sectionLabel } = req.body;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "API 키가 없습니다." });

  const isWarSection = sectionLabel === "이란·미국·이스라엘 전쟁 현황 및 분석";

  try {
    const body = {
      model: isWarSection ? "claude-opus-4-5" : "claude-opus-4-5",
      max_tokens: isWarSection ? 4000 : 2000,
      messages: [{
        role: "user",
        content: isWarSection
          ? `오늘 날짜 기준 이란, 미국, 이스라엘 간 전쟁 및 분쟁의 최신 현황을 웹에서 검색하여 가장 중요한 3가지를 아래 형식으로 답하세요. 반드시 최신 뉴스를 기반으로 하며 각 항목에서 1)군사적 현황 2)정치적 파급효과 3)글로벌 경제 및 에너지 시장 영향 4)한국 경제 영향을 심층 분석해주세요:\n##1##제목||분석내용\n##2##제목||분석내용\n##3##제목||분석내용`
          : `오늘의 ${sectionLabel} 주요 뉴스 5건을 아래 형식으로만 답하세요:\n##1##제목||요약\n##2##제목||요약\n##3##제목||요약\n##4##제목||요약\n##5##제목||요약`
      }]
    };

    if (isWarSection) {
      body.tools = [{ type: "web_search_20250305", name: "web_search" }];
    }

    const messages = [{ role: "user", content: body.messages[0].content }];
    let finalText = "";

    if (isWarSection) {
      for (let i = 0; i < 4; i++) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-opus-4-5",
            max_tokens: 4000,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages
          }),
        });
        const data = await response.json();
        const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        const toolUses = (data.content || []).filter(b => b.type === "tool_use");
        if (data.stop_reason === "end_turn" && textBlocks) { finalText = textBlocks; break; }
        if (!toolUses.length) { finalText = textBlocks; break; }
        messages.push({ role: "assistant", content: data.content });
        messages.push({ role: "user", content: toolUses.map(t => ({ type: "tool_result", tool_use_id: t.id, content: "검색 완료. 답변해주세요." })) });
      }
    } else {
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
          messages
        }),
      });
      const data = await response.json();
      finalText = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    }

    const items = [];
    for (const line of finalText.split("\n")) {
      const match = line.match(/##\d+##(.+)\|\|(.+)/);
      if (match) items.push({ title: match[1].trim(), summary: match[2].trim() });
    }
    if (items.length === 0) return res.status(500).json({ error: "파싱 실패: " + finalText.slice(0, 200) });
    res.status(200).json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
