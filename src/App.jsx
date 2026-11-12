import React, { useState, useEffect } from 'react';
import EmployeeLogin from './pages/employee/EmployeeLogin';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeRegister from './pages/employee/EmployeeRegister';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import BranchSelect from './pages/BranchSelect';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { supabase, setActiveShopId } from './services/supabaseClient';
import { Lock, PhoneCall, RefreshCw, LogOut } from 'lucide-react';

export default function App() {
  // ตรวจสอบว่าเข้าเว็บผ่านลิงก์สมัครพนักงานของร้าน (?shop=...) หรือไม่
  const [urlShopId, setUrlShopId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('shop') || '';
  });

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [viewState, setViewState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('super') === '1') return 'super-admin';
    return params.get('shop') ? 'employee-register' : 'employee-login';
  });

  // State สำหรับตรวจสอบการระงับการใช้งาน (Soft Lock)
  const [suspendedShop, setSuspendedShop] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const activeShopId =
    viewState === 'super-admin'
      ? ''
      : selectedBranch?.id || currentUser?.shop_id || urlShopId || '';

  // ซิงค์รหัสร้านเข้า Header และตรวจสอบสถานะการชำระเงินทุกครั้งที่เปลี่ยนหน้า/รีเฟรช
  useEffect(() => {
    setActiveShopId(activeShopId);
    if (activeShopId && viewState !== 'super-admin') {
      checkShopSubscription(activeShopId);
    } else {
      setSuspendedShop(null);
    }
  }, [activeShopId, viewState]);

  const checkShopSubscription = async (shopIdToCheck) => {
    if (!shopIdToCheck) return;
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('id, shop_name, subscription_status, expire_date')
        .eq('id', shopIdToCheck)
        .single();

      if (!error && data) {
        const today = new Date().toISOString().split('T')[0];
        const isExpired = data.expire_date && data.expire_date < today;
        const isSuspended = data.subscription_status === 'suspended' || isExpired;

        if (isSuspended) {
          setSuspendedShop(data);
        } else {
          setSuspendedShop(null);
        }
      }
    } catch (err) {
      console.error('Error checking shop status:', err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const clearShopUrlParam = () => {
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setUrlShopId('');
    setActiveShopId('');
    setSuspendedShop(null);
  };

  const handleFullLogout = () => {
    setCurrentUser(null);
    setSelectedBranch(null);
    setSuspendedShop(null);
    clearShopUrlParam();
    setViewState('employee-login');
  };

  // 0. หน้าจัดการลูกค้าสำหรับเจ้าของระบบ (?super=1)
  if (viewState === 'super-admin') {
    return (
      <SuperAdminDashboard
        onBack={() => {
          clearShopUrlParam();
          setViewState('employee-login');
        }}
      />
    );
  }

  // 🚨 หน้าจอแจ้งเตือนเต็มหน้าจอ (Soft Lock) เมื่อร้านถูกระงับ หรือหมดอายุรอบบิล
  if (suspendedShop) {
    return (
      <div className="min-h-screen w-full bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-red-100 animate-in fade-in zoom-in duration-200">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Lock size={38} strokeWidth={2.5} />
          </div>

          <div className="space-y-2">
            <span className="inline-block text-[11px] font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full">
              {suspendedShop.shop_name}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-800 leading-snug">
              ร้านนี้ถูกระงับการใช้งานชั่วคราว
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              กรุณาติดต่อผู้ดูแลระบบ หรือชำระค่าบริการเพื่อปลดล็อกเข้าใช้งานต่อ
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 text-left space-y-1.5">
            <p className="text-xs sm:text-sm font-bold text-gray-800 flex items-center space-x-1.5">
              <PhoneCall size={15} className="text-[#15803d]" />
              <span>ช่องทางติดต่อผู้ดูแลระบบ:</span>
            </p>
            <p className="text-xs sm:text-sm text-emerald-700 font-mono font-bold">LINE: @arif_mrn</p>
            <p className="text-xs sm:text-sm text-emerald-700 font-mono font-bold">โทร: 081-007-2917</p>
          </div>

          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => checkShopSubscription(suspendedShop.id)}
              disabled={checkingStatus}
              className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition shadow-md active:scale-95 cursor-pointer"
            >
              <RefreshCw size={16} className={checkingStatus ? 'animate-spin' : ''} />
              <span>{checkingStatus ? 'กำลังตรวจสอบสถานะ...' : 'ตรวจสอบสถานะอีกครั้ง (หลังชำระเงิน)'}</span>
            </button>

            <button
              onClick={handleFullLogout}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <LogOut size={15} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. หน้าลงทะเบียนพนักงานใหม่ (เมื่อเปิดผ่านลิงก์เฉพาะร้าน ?shop=...)
  if (viewState === 'employee-register') {
    return (
      <EmployeeRegister
        initialShopId={urlShopId}
        onBack={() => {
          clearShopUrlParam();
          setViewState('employee-login');
        }}
        onRegisterSuccess={() => {
          clearShopUrlParam();
          setViewState('employee-login');
        }}
      />
    );
  }

  // 2. หน้าล็อกอินเจ้าของร้าน (Admin Login)
  if (viewState === 'admin-login') {
    return (
      <AdminLogin
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user?.shop_id) setActiveShopId(user.shop_id);
          setViewState('branch-select');
        }}
        onSwitchToEmployee={() => setViewState('employee-login')}
      />
    );
  }

  // 3. หน้าเลือกสาขา (Branch Selection)
  if (viewState === 'branch-select') {
    return (
      <BranchSelect
        currentUser={currentUser}
        onSelectBranch={(branch) => {
          setSelectedBranch(branch);
          // ซิงค์ shop_id ใน currentUser ให้ตรงกับสาขาที่เลือกทุกหน้าย่อย
          setCurrentUser((prev) =>
            prev ? { ...prev, shop_id: branch.id, shops: branch } : prev
          );
          setActiveShopId(branch?.id || '');
          setViewState('admin-dashboard');
        }}
        onLogout={handleFullLogout}
      />
    );
  }

  // 4. หน้าแอดมิน Dashboard
  if (viewState === 'admin-dashboard') {
    return (
      <AdminDashboard
        currentUser={currentUser}
        selectedBranch={selectedBranch}
        onSwitchBranch={() => {
          setSelectedBranch(null);
          setViewState('branch-select');
        }}
        onLogout={handleFullLogout}
      />
    );
  }

  // 5. ถ้าพนักงานล็อกอินแล้ว ให้แสดงหน้าลงเวลา
  if (currentUser && viewState === 'employee-dashboard') {
    return (
      <EmployeeDashboard
        currentUser={currentUser}
        onLogout={handleFullLogout}
      />
    );
  }

  // 6. หน้าล็อกอินพนักงาน (Default)
  return (
    <EmployeeLogin
      onLoginSuccess={(user) => {
        setCurrentUser(user);
        if (user?.shop_id) setActiveShopId(user.shop_id);
        setViewState('employee-dashboard');
      }}
      onSwitchToAdmin={() => setViewState('admin-login')}
    />
  );
}