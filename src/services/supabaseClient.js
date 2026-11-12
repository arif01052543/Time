import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qhaijldijqberjtqqeha.supabase.co';
const supabaseAnonKey = 'sb_publishable_dQGbIPxI3zwDbIYkE4_C6A_Lvg1h7pB';

// ฟังก์ชันตั้งค่า/ล้างรหัสร้านปัจจุบันสำหรับส่งยืนยันตัวตนกับ RLS
export const setActiveShopId = (shopId) => {
  const cleanId = shopId ? String(shopId).trim() : '';
  if (cleanId) {
    sessionStorage.setItem('active_shop_id', cleanId);
    localStorage.setItem('active_shop_id', cleanId);
  } else {
    sessionStorage.removeItem('active_shop_id');
    localStorage.removeItem('active_shop_id');
  }
};

export const getActiveShopId = () => {
  // 1. ดึงจาก sessionStorage หรือ localStorage
  const storedId =
    sessionStorage.getItem('active_shop_id') ||
    localStorage.getItem('active_shop_id');
  if (storedId) return storedId;

  // 2. สำรอง: ดึงจาก URL (?shop=...) ทันทีกรณีเปิดลิงก์สมัครพนักงานครั้งแรก
  if (typeof window !== 'undefined') {
    const urlShopId = new URLSearchParams(window.location.search).get('shop');
    if (urlShopId) {
      setActiveShopId(urlShopId);
      return urlShopId.trim();
    }
  }

  return '';
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