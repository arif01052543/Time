import React, { useState } from 'react';
import EmployeeLogin from './pages/employee/EmployeeLogin';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeRegister from './pages/employee/EmployeeRegister';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import BranchSelect from './pages/BranchSelect';

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

  const clearShopUrlParam = () => {
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    setUrlShopId('');
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
          setViewState('admin-dashboard');
        }}
        onLogout={() => {
          setCurrentUser(null);
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
        setViewState('employee-dashboard');
      }}
      onSwitchToAdmin={() => setViewState('admin-login')}
    />
  );
}