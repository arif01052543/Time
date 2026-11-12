import React, { useState, useEffect } from 'react';
import EmployeeLogin from './pages/employee/EmployeeLogin';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeRegister from './pages/employee/EmployeeRegister';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import BranchSelect from './pages/BranchSelect';
import { setActiveShopId } from './services/supabaseClient';

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
    return params.get('shop') ? 'employee-register' : 'employee-login';
  });

  // ซิงค์รหัสร้านเข้า Header ของ Supabase อัตโนมัติตามสถานะปัจจุบัน
  useEffect(() => {
    const activeId =
      selectedBranch?.id ||
      currentUser?.shop_id ||
      urlShopId ||
      '';
    setActiveShopId(activeId);
  }, [selectedBranch, currentUser, urlShopId]);

  const clearShopUrlParam = () => {
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setUrlShopId('');
    setActiveShopId('');
  };

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
          setActiveShopId(branch?.id || '');
          setViewState('admin-dashboard');
        }}
        onLogout={() => {
          setCurrentUser(null);
          setActiveShopId('');
          setViewState('employee-login');
        }}
      />
    );
  }

  // 4. หน้าแอดมิน Dashboard
  if (viewState === 'admin-dashboard') {
    return (
      <AdminDashboard
        currentUser={currentUser}
        selectedBranch={selectedBranch}
        onLogout={() => {
          setCurrentUser(null);
          setSelectedBranch(null);
          setActiveShopId('');
          setViewState('employee-login');
        }}
      />
    );
  }

  // 5. ถ้าพนักงานล็อกอินแล้ว ให้แสดงหน้าลงเวลา
  if (currentUser && viewState === 'employee-dashboard') {
    return (
      <EmployeeDashboard
        currentUser={currentUser}
        onLogout={() => {
          setCurrentUser(null);
          setActiveShopId('');
          setViewState('employee-login');
        }}
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