module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) return res.status(500).json({ error: "Resend API 키가 없습니다." });

  const { subscribers, sections } = req.body;

  // 이메일 HTML 생성
  const generateHTML = (name) => `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9f9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:2rem 1rem;">
    <div style="text-align:center;margin-bottom:2rem;">
      <div style="font-size:12px;font-weight:600;letter-spacing:0.1em;color:#888;margin-bottom:8px;">GLOBAL NEWS DIGEST</div>
      <h1 style="font-size:24px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">오늘의 글로벌 뉴스 브리핑</h1>
      <p style="font-size:14px;color:#888;margin:0;">${new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"long", day:"numeric", weekday:"long" })}</p>
    </div>

    ${["politics","economy","markets","semiconductor","ai"].map(key => {
      const section = sections[key];
      if (!section || section === "error" || !Array.isArray(section)) return "";
      const labels = { politics:"🌍 세계 정치", economy:"📈 글로벌 경제", markets:"💹 글로벌 증시", semiconductor:"🔬 반도체", ai:"🤖 AI 산업" };
      return `
      <div style="margin-bottom:2rem;">
        <h2 style="font-size:16px;font-weight:700;color:#1a1a1a;border-bottom:2px solid #e8e8e4;padding-bottom:8px;margin-bottom:12px;">${labels[key]}</h2>
        ${section.map((item, i) => `
        <div style="padding:10px 12px;border-left:3px solid #e0e0dc;margin-bottom:8px;background:#fff;border-radius:0 8px 8px 0;">
          <div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:4px;">${i+1}. ${item.title}</div>
          <div style="font-size:13px;color:#555;line-height:1.6;">${item.summary}</div>
        </div>`).join("")}
      </div>`;
    }).join("")}

    <div style="border-top:1px solid #e8e8e4;padding-top:1.5rem;text-align:center;margin-top:2rem;">
      <p style="font-size:12px;color:#aaa;margin:0 0 8px;">이 이메일은 Global News Digest 구독자에게 발송되었습니다.</p>
      <a href="https://news-digest-tau-umber.vercel.app/?unsubscribe=${encodeURIComponent("{{email}}")}" 
         style="font-size:12px;color:#aaa;text-decoration:underline;">구독 취소</a>
    </div>
  </div>
</body>
</html>`;

  try {
    const results = [];
    for (const sub of subscribers.filter(s => s.active)) {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Global News Digest <news@globalnewsdigest.co.kr>",
          to: sub.email,
          subject: `오늘의 글로벌 뉴스 브리핑 - ${new Date().toLocaleDateString("ko-KR")}`,
          html: generateHTML(sub.name).replace(/\{\{email\}\}/g, sub.email),
        }),
      });
      results.push(result);
      await new Promise(r => setTimeout(r, 600));
    }
    const succeeded = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    res.status(200).json({ succeeded, failed });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
