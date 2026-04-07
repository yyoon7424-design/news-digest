const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "이메일을 입력해주세요." });
  try {
    const { error } = await supabase
      .from('subscribers')
      .update({ active: false })
      .eq('email', email);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
