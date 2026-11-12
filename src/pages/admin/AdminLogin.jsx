import React, { useState, useEffect } from 'react';
import { Clock, Shield, Users, User, Lock, LogIn } from 'lucide-react';
import { supabase, setActiveShopId } from '../../services/supabaseClient';

export default function AdminLogin({ onLoginSuccess, onSwitchToEmployee }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setActiveShopId(''); // เคลียร์รหัสร้านค้างในเครื่องก่อนล็อกอินใหม่เสมอ
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setActiveShopId(''); // เคลียร์ค่าก่อนค้นหาบัญชี

    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      // 1. ค้นหาผู้ใช้จากตาราง users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('name', cleanUsername)
        .eq('pin_code', cleanPassword)
        .in('role', ['admin', 'owner'])
        .maybeSingle();

      if (userError) {
        throw new Error(`[Database Error] ${userError.message}`);
      }

      if (!userData) {
        setErrorMsg('ไม่พบบัญชีผู้ใช้ หรือ PIN ไม่ถูกต้อง');
        setLoading(false);
        return;
      }

      // ตั้งค่ารหัสร้านหลักเริ่มต้นทันทีที่ล็อกอินสำเร็จ
      if (userData.shop_id) {
        setActiveShopId(userData.shop_id);
      }

      // 2. ดึงข้อมูลร้านค้าเพิ่มเติม
      let shopData = null;
      if (userData.shop_id) {
        const { data: sData, error: sError } = await supabase
          .from('shops')
          .select('*')
          .eq('id', userData.shop_id)
          .maybeSingle();
        
        if (sError) {
          console.warn('Shop query error:', sError.message);
        } else {
          shopData = sData;
        }
      }

      const fullUserData = {
        ...userData,
        shops: shopData
      };

      onLoginSuccess(fullUserData);

    } catch (err) {
      console.error('Login Process Exception:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between overflow-x-hidden">
      
      {/* Header แบนเนอร์สีเขียวเต็มความกว้างทุกหน้าจอ */}
      <div className="bg-[#15803d] w-full pt-10 pb-12 px-6 text-center text-white relative rounded-b-[40px] md:rounded-b-[56px] shadow-md shrink-0 flex flex-col items-center justify-center">
        
        <button
          type="button"
          onClick={onSwitchToEmployee}
          className="absolute top-5 right-5 sm:top-6 sm:right-8 bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm px-4 py-2 rounded-full flex items-center space-x-2 backdrop-blur-sm transition font-medium active:scale-95 cursor-pointer"
        >
          <Users size={16} />
          <span>เข้าสู่ระบบพนักงาน</span>
        </button>

        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white text-[#15803d] rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg mt-4 sm:mt-2">
          <Clock className="w-11 h-11 sm:w-14 sm:h-14" strokeWidth={2.5} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-wider">TIME TRACK</h1>
        <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-light">ระบบลงเวลาเข้า-ออกงาน</p>

        <div className="inline-flex items-center space-x-1.5 mt-3 px-4 py-1.5 bg-white/20 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
          <Shield size={15} />
          <span>สำหรับผู้ดูแล/เจ้าของร้าน</span>
        </div>
      </div>

      {/* Form ฟอร์มตรงกลาง ขยายตามขนาดหน้าจออย่างสมดุล */}
      <div className="w-full max-w-md mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <h2 className="text-center font-bold text-gray-800 text-xl sm:text-2xl mb-6">เข้าสู่ระบบ</h2>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-50 text-red-600 text-xs sm:text-sm rounded-2xl text-center font-medium border border-red-100 break-words">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div>
            <label className="text-xs sm:text-sm font-bold text-gray-700 block mb-1.5">ชื่อผู้ใช้งาน</label>
            <div className="relative flex items-center">
              <User size={18} className="absolute left-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้งาน"
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition text-gray-700 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs sm:text-sm font-bold text-gray-700 block mb-1.5">รหัสผ่าน</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 text-gray-400 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition text-gray-700 font-mono font-bold"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2 transition active:scale-[0.98] disabled:bg-gray-400 cursor-pointer text-sm sm:text-base"
          >
            <span>{loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
            <LogIn size={18} />
          </button>
        </form>
      </div>

      {/* Footer ด้านล่างสุด */}
      <div className="w-full p-4 text-center text-xs text-gray-400 shrink-0">
        TIME TRACK © Admin Management
      </div>

    </div>
  );
}