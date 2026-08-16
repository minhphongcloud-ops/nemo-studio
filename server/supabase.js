import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[Supabase] ❌ Thiếu SUPABASE_URL hoặc SUPABASE_KEY trong env!');
  console.error('[Supabase] Tạo file .env từ .env.example và điền thông tin.');
  process.exit(1);
}

import WebSocket from 'ws';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket }
});

console.log('[Supabase] ✅ Đã kết nối:', SUPABASE_URL);
