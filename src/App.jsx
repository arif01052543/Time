import React, { useState } from 'react';
import EmployeeLogin from './pages/employee/EmployeeLogin';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import BranchSelect from './pages/BranchSelect';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [viewState, setViewState] = useState('employee-login'); 
  // 'employee-login', 'admin-login', 'branch-select', 'employee-dashboard', 'admin-dashboard'

  // 1. หน้าล็อกอินเจ้าของร้าน (Admin Login)
  if (viewState === 'admin-login') {
    return (
      <AdminLogin
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setViewState('branch-select'); // เมื่อล็อกอินผ่าน ให้ไปเลือกสาขา
        }}
        onSwitchToEmployee={() => setViewState('employee-login')}
      />
    );
  }

  // 2. หน้าเลือกสาขา (Branch Selection)
  if (viewState === 'branch-select') {
    return (
      <BranchSelect
        currentUser={currentUser}
        onSelectBranch={(branch) => {
          setSelectedBranch(branch);
          setViewState('admin-dashboard'); // เมื่อเลือกสาขาเสร็จ ไปหน้า Dashboard แอดมิน
        }}
        onLogout={() => {
          setCurrentUser(null);
          setViewState('employee-login');
        }}
      />
    );
  }

  // 3. หน้าแอดมิน Dashboard
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

  // 4. ถ้าพนักงานล็อกอินแล้ว ให้แสดงหน้าลงเวลา
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

  // 5. หน้าล็อกอินพนักงาน (Default)
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