import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: "이름과 이메일을 입력해주세요." });
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .upsert({ name, email, active: true })
      .select();
    if (error) throw error;
    res.status(200).json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
