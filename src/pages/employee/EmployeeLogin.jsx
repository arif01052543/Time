import React, { useState } from 'react';
import { Clock, Shield, Store, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import EmployeeRegister from './EmployeeRegister';

export default function EmployeeLogin({ onLoginSuccess, onSwitchToAdmin }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (pin.length < 4) return;
    setLoading(true);
    setErrorMsg('');

    // ค้นหาพนักงานจาก PIN 4 หลัก
    const { data, error } = await supabase
      .from('users')
      .select('*, shops(*)')
      .eq('pin_code', pin)
      .eq('role', 'employee')
      .single();

    if (error || !data) {
      setErrorMsg('ไม่พบข้อมูลพนักงาน หรือ PIN ไม่ถูกต้อง');
    } else if (data.status === 'pending') {
      // บัญชียังไม่ได้รับอนุมัติจากแอดมิน
      setErrorMsg('บัญชีของคุณอยู่ระหว่างรอแอดมินอนุมัติเข้าใช้งาน');
    } else if (data.status === 'rejected') {
      setErrorMsg('คำขอลงทะเบียนของคุณไม่ได้รับการอนุมัติ');
    } else {
      onLoginSuccess(data);
    }
    setLoading(false);
  };

  if (showRegister) {
    return (
      <EmployeeRegister 
        onBack={() => setShowRegister(false)} 
        onRegisterSuccess={() => setShowRegister(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white h-screen sm:h-auto sm:min-h-[640px] sm:rounded-[36px] shadow-2xl overflow-y-auto border-0 sm:border border-gray-100 flex flex-col justify-between">
        
        {/* Header สีเขียวทรงโค้ง */}
        <div className="bg-[#15803d] pt-8 pb-10 px-6 text-center text-white relative rounded-b-[40px] shadow-md shrink-0">
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="absolute top-5 right-5 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full flex items-center space-x-1 backdrop-blur-sm transition font-medium active:scale-95"
          >
            <Store size={14} />
            <span>เจ้าของร้าน</span>
          </button>

          <div className="w-20 h-20 bg-white text-[#15803d] rounded-full flex items-center justify-center mx-auto mb-3 shadow-md mt-2">
            <Clock size={44} strokeWidth={2.5} />
          </div>

          <h1 className="text-2xl font-black tracking-wider">TIME TRACK</h1>
          <p className="text-xs text-emerald-100 mt-1 font-light">ระบบลงเวลาเข้า-ออกงาน</p>

          <div className="inline-flex items-center space-x-1.5 mt-3 px-4 py-1.5 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">
            <Shield size={14} />
            <span>สำหรับพนักงาน</span>
          </div>
        </div>

        {/* ฟอร์มเข้าสู่ระบบ */}
        <div className="px-6 py-6 flex-1 flex flex-col justify-center">
          <h2 className="text-center font-bold text-gray-800 text-xl">เข้าสู่ระบบ</h2>
          <p className="text-center text-xs text-gray-400 mt-1 mb-5">
            พนักงานกรอกเลขบัตรประชาชน 4 ตัวท้าย
          </p>

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl text-center font-semibold flex items-center justify-center space-x-1.5">
              <AlertCircle size={16} className="shrink-0 text-amber-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="relative">
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="• • • •"
                className="w-full text-center tracking-[1em] text-2xl py-4 px-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-emerald-600 focus:bg-white transition font-bold text-gray-700"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2 transition active:scale-[0.98] disabled:bg-gray-400"
            >
              <span className="text-base">{loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
              <LogIn size={18} />
            </button>
          </form>
        </div>

        {/* ปุ่มสมัครพนักงานใหม่ด้านล่าง */}
        <div className="p-6 pt-0 shrink-0">
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-100"></div>
            <span className="flex-shrink mx-4 text-[11px] text-gray-400">พนักงานใหม่?</span>
            <div className="flex-grow border-t border-gray-100"></div>
          </div>

          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-[#15803d] font-semibold rounded-2xl border border-emerald-200/60 flex items-center justify-center space-x-2 text-xs transition mt-2 active:scale-95"
          >
            <UserPlus size={16} />
            <span>ลงทะเบียนที่นี่</span>
          </button>
        </div>

      </div>
    </div>
  );
}