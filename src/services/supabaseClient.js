import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhaijldijqberjtqqeha.supabase.co';
const supabaseAnonKey = 'sb_publishable_dQGbIPxI3zwDbIYkE4_C6A_Lvg1h7pB';

// ฟังก์ชันตั้งค่า/ล้างรหัสร้านปัจจุบันสำหรับส่งยืนยันตัวตนกับ RLS
export const setActiveShopId = (shopId) => {
  if (shopId) {
    sessionStorage.setItem('active_shop_id', String(shopId).trim());
  } else {
    sessionStorage.removeItem('active_shop_id');
  }
};

export const getActiveShopId = () => {
  return sessionStorage.getItem('active_shop_id') || '';
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (url, options = {}) => {
      const headers = new Headers(options.headers || {});
      const shopId = getActiveShopId();
      if (shopId) {
        headers.set('x-shop-id', shopId);
      }
      return fetch(url, { ...options, headers });
    },
  },
});