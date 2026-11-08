import { createClient } from '@supabase/supabase-js';

// URL โปรเจกต์ของคุณ
const supabaseUrl = 'https://qhaijldijqberjtqqeha.supabase.co';

// ใส่ Publishable key (ที่ขึ้นต้นด้วย sb_publishable_...) จากหน้า API Keys
const supabaseAnonKey = 'sb_publishable_dQGbIPxI3zwDbIYkE4_C6A_Lvg1h7pB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);