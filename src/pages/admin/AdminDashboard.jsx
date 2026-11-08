import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import AdminAdvances from './AdminAdvances';
import AdminEmployees from './AdminEmployees';
import AdminPayroll from './AdminPayroll';
import AdminSettings from './AdminSettings';
import AdminLeaves from './AdminLeaves';
import AdminAttendanceDetails from './AdminAttendanceDetails';
import { 
  Store, LogOut, CheckCircle2, Clock, 
  Banknote, Calendar, ChevronRight, 
  Home, Users, Calculator, Settings 
} from 'lucide-react';

export default function AdminDashboard({ currentUser, selectedBranch, onLogout }) {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'employees', 'payroll', 'settings'
  const [subView, setSubView] = useState(null); // null, 'advances', 'leaves', 'attendance'
  const [attendanceInitialFilter, setAttendanceInitialFilter] = useState('all');
  const [branchInfo, setBranchInfo] = useState(selectedBranch);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    pendingAdvances: 0,
    pendingLeaves: 0,
  });

  useEffect(() => {
    setBranchInfo(selectedBranch);
    fetchDashboardStats();

    // ติดตามข้อมูล Real-time เมื่อมีคำขอใหม่จากพนักงาน
    const channel = supabase
      .channel('admin_realtime_badges')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'advances' },
        () => fetchDashboardStats()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leaves' },
        () => fetchDashboardStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedBranch, activeTab, subView]); // 🟢 เพิ่ม activeTab และ subView เพื่อดึงข้อมูลใหม่ทุกครั้งที่สลับหน้ากลับมา

  const fetchDashboardStats = async () => {
    try {
      const shopId = selectedBranch?.id;

      // 1. จำนวนพนักงานทั้งหมด
      let empQuery = supabase.from('users').select('id', { count: 'exact' }).eq('role', 'employee');
      if (shopId) empQuery = empQuery.eq('shop_id', shopId);
      const { count: empCount } = await empQuery;

      // 2. ข้อมูลการลงเวลาของวันนี้
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      let timeQuery = supabase
        .from('time_entries')
        .select('*')
        .gte('created_at', startOfDay.toISOString());

      const { data: timeEntries } = await timeQuery;

      const present = timeEntries ? timeEntries.length : 0;
      const late = timeEntries ? timeEntries.filter(e => e.status === 'late').length : 0;

      // 3. จำนวนคำขอเบิกเงินล่วงหน้าที่รอตรวจสอบ (status = 'pending')
      let advQuery = supabase
        .from('advances')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (shopId) advQuery = advQuery.eq('shop_id', shopId);
      const { count: advCount } = await advQuery;

      // 4. จำนวนคำขอลางานที่รอตรวจสอบ (status = 'pending')
      let leaveQuery = supabase
        .from('leaves')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (shopId) leaveQuery = leaveQuery.eq('shop_id', shopId);
      const { count: leaveCount } = await leaveQuery;

      setStats({
        totalEmployees: empCount || 0,
        presentToday: present,
        lateToday: late,
        pendingAdvances: advCount || 0,
        pendingLeaves: leaveCount || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const shopName = branchInfo?.shop_name || selectedBranch?.shop_name || 'ร้านตัวอย่าง สาขา1';

  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const handleOpenAttendance = (filter) => {
    setAttendanceInitialFilter(filter);
    setSubView('attendance');
  };

  const handleNavigateTab = (tab) => {
    setSubView(null);
    setActiveTab(tab);
    fetchDashboardStats();
  };

  const handleBackSubView = () => {
    setSubView(null);
    fetchDashboardStats();
  };

  // ==================== ROUTING / SUBVIEWS ====================
  if (activeTab === 'employees') {
    return (
      <AdminEmployees 
        selectedBranch={branchInfo} 
        onBack={() => handleNavigateTab('home')} 
        onTabChange={handleNavigateTab} 
      />
    );
  }

  if (activeTab === 'payroll') {
    return (
      <AdminPayroll 
        selectedBranch={branchInfo} 
        onBack={() => handleNavigateTab('home')} 
        onTabChange={handleNavigateTab} 
      />
    );
  }

  if (activeTab === 'settings') {
    return (
      <AdminSettings
        currentUser={currentUser} 
        selectedBranch={branchInfo} 
        onBack={() => handleNavigateTab('home')} 
        onTabChange={handleNavigateTab} 
        onBranchUpdated={(updated) => setBranchInfo(updated)}
      />
    );
  }

  if (subView === 'advances') {
    return (
      <AdminAdvances 
        selectedBranch={branchInfo} 
        onBack={handleBackSubView} 
        onTabChange={handleNavigateTab}
      />
    );
  }

  if (subView === 'leaves') {
    return (
      <AdminLeaves 
        selectedBranch={branchInfo} 
        onBack={handleBackSubView} 
        onTabChange={handleNavigateTab}
      />
    );
  }

  if (subView === 'attendance') {
    return (
      <AdminAttendanceDetails 
        selectedBranch={branchInfo}
        onBack={handleBackSubView}
        onTabChange={handleNavigateTab}
        initialFilter={attendanceInitialFilter}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-0 sm:p-4">
      <div className="w-full max-w-sm bg-gray-50 h-screen sm:h-[720px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
        
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Header สีเขียวทรงโค้ง */}
          <div className="bg-[#15803d] p-5 text-white rounded-b-[32px] shadow-md sticky top-0 z-20">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Store size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="font-extrabold text-base leading-tight">{shopName}</h1>
                  <p className="text-[11px] text-emerald-100 font-light">ยินดีต้อนรับ</p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm"
              >
                <LogOut size={18} />
              </button>
            </div>

            <div className="bg-[#0e5c2b]/80 backdrop-blur-md rounded-2xl p-3 flex justify-between items-center text-xs">
              <span className="font-medium text-emerald-100">วันที่: {formattedDate}</span>
              <span className="bg-white text-[#15803d] font-bold px-3 py-1 rounded-full text-[11px]">
                พนักงานที่มา {stats.presentToday}/{stats.totalEmployees}
              </span>
            </div>
          </div>

          {/* TAB 1: หน้าแรก (Dashboard) */}
          {activeTab === 'home' && (
            <div className="p-5 space-y-5">
              
              {/* การ์ดสรุปยอด 2 บล็อก */}
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  onClick={() => handleOpenAttendance('present')}
                  className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:bg-emerald-50/50 hover:border-emerald-200 transition group active:scale-95"
                >
                  <div className="w-11 h-11 bg-emerald-100/70 text-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <CheckCircle2 size={22} strokeWidth={2.5} />
                  </div>
                  <span className="text-2xl font-black text-gray-800">{stats.presentToday}</span>
                  <span className="text-[11px] text-gray-400 group-hover:text-emerald-700 font-medium mt-0.5">
                    มาทำงานวันนี้
                  </span>
                </button>

                <button
                  onClick={() => handleOpenAttendance('late')}
                  className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:bg-orange-50/50 hover:border-orange-200 transition group active:scale-95"
                >
                  <div className="w-11 h-11 bg-orange-100/80 text-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <Clock size={22} strokeWidth={2.5} />
                  </div>
                  <span className="text-2xl font-black text-gray-800">{stats.lateToday}</span>
                  <span className="text-[11px] text-gray-400 group-hover:text-orange-700 font-medium mt-0.5">
                    มาสายวันนี้
                  </span>
                </button>
              </div>

              {/* รายการรอการตรวจสอบ */}
              <div>
                <h2 className="font-bold text-gray-800 text-sm mb-3">รายการรอการตรวจสอบ</h2>
                
                <div className="space-y-2.5">
                  <button
                    onClick={() => setSubView('advances')}
                    className="w-full bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-emerald-50/50 transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-100/70 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <Banknote size={20} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-800 text-xs group-hover:text-emerald-800">
                          ขอเบิกเงินล่วงหน้า
                        </h3>
                        <p className="text-[10px] text-gray-400">ตรวจสอบและโอนเงิน</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {stats.pendingAdvances > 0 && (
                        <span className="bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                          {stats.pendingAdvances}
                        </span>
                      )}
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-600 transition" />
                    </div>
                  </button>

                  <button
                    onClick={() => setSubView('leaves')}
                    className="w-full bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-purple-50/50 transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100/70 text-purple-600 rounded-2xl flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-800 text-xs group-hover:text-purple-800">
                          คำขอลางาน
                        </h3>
                        <p className="text-[10px] text-gray-400">อนุมัติการลาพนักงาน</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {stats.pendingLeaves > 0 && (
                        <span className="bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                          {stats.pendingLeaves}
                        </span>
                      )}
                      <ChevronRight size={18} className="text-gray-300 group-hover:text-purple-600 transition" />
                    </div>
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-3 left-4 right-4 bg-white/90 backdrop-blur-md rounded-[28px] shadow-lg border border-gray-100 p-1.5 flex justify-around items-center z-30">
          <button
            onClick={() => handleNavigateTab('home')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'home' && !subView
                ? 'bg-emerald-50 text-[#15803d] font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Home size={20} className={activeTab === 'home' && !subView ? 'text-[#15803d]' : 'text-gray-400'} />
            <span className="text-[10px] mt-0.5">หน้าแรก</span>
          </button>

          <button
            onClick={() => handleNavigateTab('employees')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'employees'
                ? 'bg-emerald-50 text-[#15803d] font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users size={20} className={activeTab === 'employees' ? 'text-[#15803d]' : 'text-gray-400'} />
            <span className="text-[10px] mt-0.5">พนักงาน</span>
          </button>

          <button
            onClick={() => handleNavigateTab('payroll')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'payroll'
                ? 'bg-[#15803d] text-white font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Calculator size={20} className={activeTab === 'payroll' ? 'text-white' : 'text-gray-400'} />
            <span className="text-[10px] mt-0.5">เงินเดือน</span>
          </button>

          <button
            onClick={() => handleNavigateTab('settings')}
            className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition ${
              activeTab === 'settings'
                ? 'bg-emerald-50 text-[#15803d font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Settings size={20} className={activeTab === 'settings' ? 'text-[#15803d]' : 'text-gray-400'} />
            <span className="text-[10px] mt-0.5">ตั้งค่า</span>
          </button>
        </div>

      </div>
    </div>
  );
}