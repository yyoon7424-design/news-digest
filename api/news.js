module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { sectionLabel } = req.body;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "API 키가 없습니다." });

  const isWarSection = sectionLabel === "이란·미국·이스라엘 전쟁 현황 및 분석";

  const prompt = isWarSection
    ? `오늘 날짜 기준 이란, 미국, 이스라엘 간 전쟁 및 분쟁의 최신 현황을 웹에서 검색하여 가장 중요한 3가지를 아래 형식으로 답하세요. 분석내용에는 반드시 군사적현황, 정치적파급효과, 글로벌경제및에너지영향, 한국경제영향을 각각 2-3문장씩 포함하여 상세히 작성해주세요:\n##1##제목||[군사적현황] 내용. [정치적파급] 내용. [경제영향] 내용. [한국경제] 내용.\n##2##제목||[군사적현황] 내용. [정치적파급] 내용. [경제영향] 내용. [한국경제] 내용.\n##3##제목||[군사적현황] 내용. [정치적파급] 내용. [경제영향] 내용. [한국경제] 내용.`
    : `오늘 날짜 기준 ${sectionLabel} 분야에서 세계에 영향을 미칠 수 있는 최신 주요 이슈 3건을 웹에서 검색하여 아래 형식으로 답하세요. 각 항목은 1)핵심 내용 2)글로벌 파급효과 3)한국 경제·정치에 미치는 영향을 2-3문장씩 포함하여 심층 분석해주세요:\n##1##제목||[핵심내용] 내용. [글로벌파급] 내용. [한국영향] 내용.\n##2##제목||[핵심내용] 내용. [글로벌파급] 내용. [한국영향] 내용.\n##3##제목||[핵심내용] 내용. [글로벌파급] 내용. [한국영향] 내용.`;

  try {
    const messages = [{ role: "user", content: prompt }];
    let finalText = "";

    for (let i = 0; i < 5; i++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        return res.status(500).json({ error: "API오류: " + JSON.stringify(err) });
      }

      const data = await response.json();
      const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const toolUses = (data.content || []).filter(b => b.type === "tool_use");

      if (data.stop_reason === "end_turn" && textBlocks) { finalText = textBlocks; break; }
      if (!toolUses.length) { finalText = textBlocks; break; }

      messages.push({ role: "assistant", content: data.content });
      messages.push({ role: "user", content: toolUses.map(t => ({ type: "tool_result", tool_use_id: t.id, content: "검색 완료. 반드시 ##번호##제목||내용 형식으로만 답하세요." })) });
    }

    const items = [];
    for (const line of finalText.split("\n")) {
      const match = line.match(/##\d+##(.+)\|
