import React, { useState, useEffect } from 'react';
import { supabase, setActiveShopId } from '../../services/supabaseClient';
import AdminAdvances from './AdminAdvances';
import AdminEmployees from './AdminEmployees';
import AdminPayroll from './AdminPayroll';
import AdminSettings from './AdminSettings';
import AdminLeaves from './AdminLeaves';
import AdminAttendanceDetails from './AdminAttendanceDetails';
import { 
  Store, LogOut, CheckCircle2, Clock, 
  Banknote, Calendar, ChevronRight, 
  Home, Users, Calculator, Settings, Bell, ArrowLeftRight 
} from 'lucide-react';

export default function AdminDashboard({ currentUser, selectedBranch, onSwitchBranch, onLogout }) {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'employees', 'payroll', 'settings'
  const [subView, setSubView] = useState(null); // null, 'advances', 'leaves', 'attendance'
  const [attendanceInitialFilter, setAttendanceInitialFilter] = useState('all');
  const [branchInfo, setBranchInfo] = useState(selectedBranch);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    pendingAdvances: 0,
    pendingLeaves: 0,
  });

  // ตรวจสอบสถานะการเปิดแจ้งเตือนบนเครื่องนี้
  useEffect(() => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function (OneSignal) {
      if (OneSignal.Notifications?.permission) {
        setNotifEnabled(true);
      }
    });
  }, []);

  useEffect(() => {
    setBranchInfo(selectedBranch);
    const activeId = selectedBranch?.id || currentUser?.shop_id;
    if (activeId) {
      setActiveShopId(activeId);
    }
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
  }, [selectedBranch, activeTab, subView]);

  const fetchDashboardStats = async () => {
    try {
      const shopId = branchInfo?.id || selectedBranch?.id || currentUser?.shop_id;

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
      if (shopId) timeQuery = timeQuery.eq('shop_id', shopId);

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

  // ฟังก์ชันกดขออนุญาตแจ้งเตือนและผูกเครื่องแอดมินกับ OneSignal
  const handleEnableNotifications = () => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.Notifications.requestPermission();
        if (OneSignal.Notifications.permission) {
          await OneSignal.User.addTags({
            role: 'admin',
            shop_id: String(branchInfo?.id || selectedBranch?.id || 'all'),
          });
          setNotifEnabled(true);
          alert('เปิดรับการแจ้งเตือนบนเครื่องนี้เรียบร้อยแล้ว!');
        } else {
          alert('กรุณากด "อนุญาต (Allow)" ในการตั้งค่าเพื่อรับการแจ้งเตือน');
        }
      } catch (err) {
        console.error('OneSignal Error:', err);
        alert('ไม่สามารถเปิดแจ้งเตือนได้: ' + (err?.message || 'กรุณาเปิดผ่านไอคอนแอปบนหน้าจอโฮม'));
      }
    });
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
    <div className="min-h-screen w-full bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {/* Scrollable Main Content Area */}
      <div className="flex-1 pb-24 w-full">
        
        {/* Header สีเขียวทรงโค้ง ขยายเต็มหน้าจอ */}
        <div className="bg-[#15803d] p-5 sm:p-6 text-white rounded-b-[32px] sm:rounded-b-[40px] shadow-md sticky top-0 z-20 w-full">
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center gap-2 mb-4">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
                  <Store size={22} className="text-white sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-extrabold text-base sm:text-lg leading-tight truncate">{shopName}</h1>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <p className="text-[11px] sm:text-xs text-emerald-100 font-light truncate">ยินดีต้อนรับ</p>
                    {onSwitchBranch && (
                      <button
                        type="button"
                        onClick={onSwitchBranch}
                        className="text-[10px] sm:text-[11px] bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg font-semibold inline-flex items-center space-x-1 transition cursor-pointer shrink-0"
                      >
                        <ArrowLeftRight size={10} />
                        <span>สลับสาขา</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleEnableNotifications}
                  title="เปิดแจ้งเตือนมือถือ"
                  className={`h-10 sm:h-11 px-3 rounded-2xl flex items-center space-x-1.5 text-xs font-bold transition backdrop-blur-sm cursor-pointer ${
                    notifEnabled
                      ? 'bg-emerald-400/25 text-white border border-emerald-200/40'
                      : 'bg-white/15 hover:bg-white/25 text-white'
                  }`}
                >
                  <Bell size={16} className={notifEnabled ? 'text-yellow-300 fill-yellow-300' : 'text-white'} />
                  <span>{notifEnabled ? 'แจ้งเตือนเปิดอยู่' : 'เปิดแจ้งเตือน'}</span>
                </button>

                <button
                  onClick={onLogout}
                  title="ออกจากระบบ"
                  className="w-10 h-10 sm:w-11 sm:h-11 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm cursor-pointer shrink-0"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>

            <div className="bg-[#0e5c2b]/80 backdrop-blur-md rounded-2xl p-3 flex justify-between items-center text-xs sm:text-sm">
              <span className="font-medium text-emerald-100">วันที่: {formattedDate}</span>
              <span className="bg-white text-[#15803d] font-bold px-3 py-1 rounded-full text-[11px] sm:text-xs">
                พนักงานที่มา {stats.presentToday}/{stats.totalEmployees}
              </span>
            </div>
          </div>
        </div>

        {/* TAB 1: หน้าแรก (Dashboard Content) */}
        {activeTab === 'home' && (
          <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
            
            {/* การ์ดสรุปยอด 2 บล็อก */}
            <div className="grid grid-cols-2 gap-3.5 sm:gap-5">
              <button
                onClick={() => handleOpenAttendance('present')}
                className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:bg-emerald-50/50 hover:border-emerald-200 transition group active:scale-95 cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-emerald-100/70 text-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <CheckCircle2 size={24} strokeWidth={2.5} className="sm:w-7 sm:h-7" />
                </div>
                <span className="text-2xl sm:text-3xl font-black text-gray-800">{stats.presentToday}</span>
                <span className="text-[11px] sm:text-xs text-gray-400 group-hover:text-emerald-700 font-medium mt-0.5">
                  มาทำงานวันนี้
                </span>
              </button>

              <button
                onClick={() => handleOpenAttendance('late')}
                className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:bg-orange-50/50 hover:border-orange-200 transition group active:scale-95 cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-14 sm:h-14 bg-orange-100/80 text-orange-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <Clock size={24} strokeWidth={2.5} className="sm:w-7 sm:h-7" />
                </div>
                <span className="text-2xl sm:text-3xl font-black text-gray-800">{stats.lateToday}</span>
                <span className="text-[11px] sm:text-xs text-gray-400 group-hover:text-orange-700 font-medium mt-0.5">
                  มาสายวันนี้
                </span>
              </button>
            </div>

            {/* รายการรอการตรวจสอบ */}
            <div>
              <h2 className="font-bold text-gray-800 text-sm sm:text-base mb-3">รายการรอการตรวจสอบ</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => setSubView('advances')}
                  className="w-full bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-emerald-50/50 transition group cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100/70 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Banknote size={22} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800 text-xs sm:text-sm group-hover:text-emerald-800">
                        ขอเบิกเงินล่วงหน้า
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-400">ตรวจสอบและโอนเงิน</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {stats.pendingAdvances > 0 && (
                      <span className="bg-red-500 text-white text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                        {stats.pendingAdvances}
                      </span>
                    )}
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-600 transition" />
                  </div>
                </button>

                <button
                  onClick={() => setSubView('leaves')}
                  className="w-full bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:bg-purple-50/50 transition group cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100/70 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Calendar size={22} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-gray-800 text-xs sm:text-sm group-hover:text-purple-800">
                        คำขอลางาน
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-400">อนุมัติการลาพนักงาน</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {stats.pendingLeaves > 0 && (
                      <span className="bg-red-500 text-white text-[11px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
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

      {/* Bottom Navigation Bar จัดกลาง ปรับตามทุกขนาดหน้าจอ */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md rounded-[28px] shadow-xl border border-gray-100 p-1.5 flex justify-around items-center z-30">
        <button
          onClick={() => handleNavigateTab('home')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition cursor-pointer ${
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
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition cursor-pointer ${
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
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition cursor-pointer ${
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
          className={`flex flex-col items-center py-1.5 px-3 rounded-2xl transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-emerald-50 text-[#15803d] font-bold'
              : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Settings size={20} className={activeTab === 'settings' ? 'text-[#15803d]' : 'text-gray-400'} />
          <span className="text-[10px] mt-0.5">ตั้งค่า</span>
        </button>
      </div>

    </div>
  );
}