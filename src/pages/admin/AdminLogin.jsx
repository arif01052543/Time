import React, { useState } from 'react';
import { Clock, Shield, Users, User, Lock, LogIn } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

export default function AdminLogin({ onLoginSuccess, onSwitchToEmployee }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      // 1. ค้นหาผู้ใช้จากตาราง users (ใช้ ilike เพื่อไม่สนตัวพิมพ์เล็ก-ใหญ่)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('name', cleanUsername)
        .eq('pin_code', cleanPassword)
        .in('role', ['admin', 'owner'])
        .maybeSingle();

      console.log('User query result:', { userData, userError });

      if (userError) {
        throw new Error(`[Database Error] ${userError.message}`);
      }

      if (!userData) {
        setErrorMsg('ไม่พบบัญชีผู้ใช้ หรือ PIN ไม่ถูกต้อง');
        setLoading(false);
        return;
      }

      // 2. ดึงข้อมูลร้านค้าเพิ่มเติม (ถ้ามี shop_id)
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

      // ผูกข้อมูลร้านค้ากลับเข้าไปใน Object
      const fullUserData = {
        ...userData,
        shops: shopData
      };

      console.log('Login Successful:', fullUserData);
      onLoginSuccess(fullUserData);

    } catch (err) {
      console.error('Login Process Exception:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white h-screen sm:h-auto sm:min-h-[620px] sm:rounded-[36px] shadow-2xl overflow-y-auto border-0 sm:border border-gray-100 flex flex-col justify-between">
        
        {/* Header */}
        <div className="bg-[#15803d] pt-8 pb-10 px-6 text-center text-white relative rounded-b-[40px] shadow-md shrink-0">
          <button
            type="button"
            onClick={onSwitchToEmployee}
            className="absolute top-5 right-5 bg-white/20 hover:bg-white/30 text-white text-xs px-3.5 py-1.5 rounded-full flex items-center space-x-1.5 backdrop-blur-sm transition font-medium active:scale-95"
          >
            <Users size={14} />
            <span>พนักงาน</span>
          </button>

          <div className="w-20 h-20 bg-white text-[#15803d] rounded-full flex items-center justify-center mx-auto mb-3 shadow-md mt-2">
            <Clock size={44} strokeWidth={2.5} />
          </div>

          <h1 className="text-2xl font-black tracking-wider">TIME TRACK</h1>
          <p className="text-xs text-emerald-100 mt-1 font-light">ระบบลงเวลาเข้า-ออกงาน</p>

          <div className="inline-flex items-center space-x-1.5 mt-3 px-4 py-1.5 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
            <Shield size={14} />
            <span>สำหรับเจ้าของร้าน</span>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-6 flex-1 flex flex-col justify-center">
          <h2 className="text-center font-bold text-gray-800 text-xl mb-5">เข้าสู่ระบบ</h2>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-2xl text-center font-medium border border-red-100 break-words">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">ชื่อผู้ใช้งาน</label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้งาน"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition text-gray-700"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">รหัสผ่าน</label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition text-gray-700"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2 transition active:scale-[0.98] disabled:bg-gray-400"
            >
              <span className="text-base">{loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
              <LogIn size={18} />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-[11px] text-gray-400 shrink-0">
          TIME TRACK © Admin Management
        </div>

      </div>
    </div>
  );
}