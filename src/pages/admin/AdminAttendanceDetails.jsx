import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, CheckCircle2, Clock, 
  UserX, Search, Calendar, Coffee,
  Home, Users, Calculator, Settings 
} from 'lucide-react';

export default function AdminAttendanceDetails({ selectedBranch, onBack, onTabChange, initialFilter = 'all' }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(initialFilter); // 'all', 'present', 'late', 'on_leave', 'absent'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTodayAttendance();
  }, [selectedBranch]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const shopId = selectedBranch?.id;
      
      // 1. ดึงข้อมูลพนักงานทั้งหมดในสาขา
      let empQuery = supabase.from('users').select('*, shops(*)').eq('role', 'employee');
      if (shopId) empQuery = empQuery.eq('shop_id', shopId);
      const { data: empList, error: empErr } = await empQuery;
      if (empErr) throw empErr;

      // 2. ช่วงเวลาของวันนี้ (00:00:00 - 23:59:59)
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // คำนวณวันภาษาไทยของวันนี้ (เช่น 'จันทร์', 'อังคาร')
      const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const todayThaiDay = thaiDays[new Date().getDay()];

      // 3. ดึงการลงเวลาวันนี้
      let timeQuery = supabase
        .from('time_entries')
        .select('*')
        .gte('created_at', startOfDay.toISOString());
      if (shopId) timeQuery = timeQuery.eq('shop_id', shopId);

      const { data: timeEntries, error: timeErr } = await timeQuery;
      if (timeErr) throw timeErr;

      // 4. ดึงข้อมูลวันลาที่ได้รับการอนุมัติวันนี้
      let leaveQuery = supabase
        .from('leaves')
        .select('*')
        .eq('status', 'approved')
        .lte('start_date', endOfDay.toISOString())
        .gte('end_date', startOfDay.toISOString());
      if (shopId) leaveQuery = leaveQuery.eq('shop_id', shopId);

      const { data: leaveEntries } = await leaveQuery;

      // 5. รวมข้อมูลพนักงาน การลงเวลา วันลา และวันหยุดประจำสัปดาห์
      const combined = (empList || []).map(emp => {
        const entry = (timeEntries || []).find(e => e.user_id === emp.id);
        const approvedLeave = (leaveEntries || []).find(l => l.user_id === emp.id);

        // เช็กวันหยุดประจำสัปดาห์ของพนักงาน
        const userOffDay = emp.off_day || emp.shops?.default_off_day || '';
        const isWeeklyOffDay = userOffDay && userOffDay !== 'ไม่มีวันหยุด' && userOffDay.includes(todayThaiDay);

        let attendanceStatus = 'absent'; // 'present', 'late', 'on_leave', 'absent'
        let checkInTime = null;
        let checkOutTime = null;
        let lateMinutes = 0;
        let leaveReason = null;

        if (entry) {
          checkInTime = entry.created_at || entry.check_in;
          checkOutTime = entry.check_out || null;

          // คำนวณนาทีสาย
          const shiftStart = emp.work_start || '16:00';
          if (checkInTime) {
            const entryDate = new Date(checkInTime);
            const [sh, sm] = shiftStart.split(':').map(Number);
            const shiftDate = new Date(entryDate);
            shiftDate.setHours(sh, sm, 0, 0);

            const diffMs = entryDate - shiftDate;
            const diffMin = Math.floor(diffMs / (1000 * 60));
            if (diffMin > 0) {
              lateMinutes = diffMin;
              attendanceStatus = 'late';
            } else {
              attendanceStatus = 'present';
            }
          } else {
            attendanceStatus = entry.status === 'late' ? 'late' : 'present';
          }
        } else if (approvedLeave) {
          // มีใบลาที่อนุมัติแล้ว
          attendanceStatus = 'on_leave';
          leaveReason = approvedLeave.reason || approvedLeave.leave_type || 'ลาหยุด';
        } else if (isWeeklyOffDay) {
          // เป็นวันหยุดประจำสัปดาห์
          attendanceStatus = 'on_leave';
          leaveReason = 'วันหยุดประจำสัปดาห์';
        }

        return {
          ...emp,
          entry,
          approvedLeave,
          leaveReason,
          isWeeklyOffDay,
          attendanceStatus,
          checkInTime,
          checkOutTime,
          lateMinutes
        };
      });

      setEmployees(combined);
    } catch (err) {
      console.error('Error fetching attendance details:', err);
    } finally {
      setLoading(false);
    }
  };

  const presentCount = employees.filter(e => e.attendanceStatus === 'present').length;
  const lateCount = employees.filter(e => e.attendanceStatus === 'late').length;
  const leaveCount = employees.filter(e => e.attendanceStatus === 'on_leave').length;
  const absentCount = employees.filter(e => e.attendanceStatus === 'absent').length;

  const filteredEmployees = employees.filter(emp => {
    if (searchQuery && !emp.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterStatus === 'present') return emp.attendanceStatus === 'present';
    if (filterStatus === 'late') return emp.attendanceStatus === 'late';
    if (filterStatus === 'on_leave') return emp.attendanceStatus === 'on_leave';
    if (filterStatus === 'absent') return emp.attendanceStatus === 'absent';
    return true;
  });

  const formatTime = (isoStr) => {
    if (!isoStr) return '--:--';
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
  };

  const todayStr = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {/* ส่วนเนื้อหาหลัก สามารถ Scroll ได้ */}
      <div className="flex-1 pb-24 w-full">
        
        {/* Header สีเขียวทรงโค้ง ขยายเต็มความกว้าง */}
        <div className="bg-[#15803d] p-5 sm:p-6 text-white rounded-b-[32px] sm:rounded-b-[40px] shadow-md sticky top-0 z-20 w-full">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg leading-tight">รายละเอียดการลงเวลาวันนี้</h1>
                <p className="text-[11px] sm:text-xs text-emerald-100 font-light">
                  {todayStr} • {selectedBranch?.shop_name || 'สาขาหลัก'}
                </p>
              </div>
            </div>

            {/* ช่องค้นหาพนักงาน */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-emerald-300 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อพนักงาน..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 text-white placeholder-emerald-200/70 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white/20 border border-white/10 transition"
              />
            </div>
          </div>
        </div>

        {/* คอนเทนเนอร์หลักตรงกลาง */}
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">

          {/* Filter Bar 5 หมวด */}
          <div className="grid grid-cols-5 gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm text-center">
            <button
              onClick={() => setFilterStatus('all')}
              className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-emerald-50 text-[#15803d] border border-emerald-200/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ทั้งหมด ({employees.length})
            </button>

            <button
              onClick={() => setFilterStatus('present')}
              className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                filterStatus === 'present'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ปกติ ({presentCount})
            </button>

            <button
              onClick={() => setFilterStatus('late')}
              className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                filterStatus === 'late'
                  ? 'bg-orange-100 text-orange-800 border border-orange-300/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              สาย ({lateCount})
            </button>

            <button
              onClick={() => setFilterStatus('on_leave')}
              className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                filterStatus === 'on_leave'
                  ? 'bg-purple-100 text-purple-800 border border-purple-300/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ลา/หยุด ({leaveCount})
            </button>

            <button
              onClick={() => setFilterStatus('absent')}
              className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition cursor-pointer ${
                filterStatus === 'absent'
                  ? 'bg-gray-200 text-gray-700 border border-gray-300/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ยังไม่เข้า ({absentCount})
            </button>
          </div>

          {/* รายชื่อพนักงานและการลงเวลา */}
          <div className="space-y-3 pt-1">
            {loading ? (
              <div className="text-center py-12 text-xs sm:text-sm text-gray-400">กำลังโหลดข้อมูลการลงเวลา...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-16 text-xs sm:text-sm text-gray-400 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                ไม่พบข้อมูลตามเงื่อนไขที่เลือก
              </div>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 space-y-3 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-11 h-11 sm:w-13 sm:h-13 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center font-bold text-base sm:text-lg border overflow-hidden shrink-0">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{emp.name ? emp.name.charAt(0) : 'U'}</span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base">{emp.name}</h3>
                        <p className="text-[10px] sm:text-xs text-gray-400">
                          {emp.position || 'พนักงาน'} • กะ {emp.work_start || '16:00'} - {emp.work_end || '00:00'} น.
                        </p>
                      </div>
                    </div>

                    {/* Badge สถานะ */}
                    {emp.attendanceStatus === 'present' && (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] sm:text-xs rounded-xl border border-emerald-200/70 flex items-center space-x-1">
                        <CheckCircle2 size={13} />
                        <span>ตรงเวลา</span>
                      </span>
                    )}
                    {emp.attendanceStatus === 'late' && (
                      <span className="px-3 py-1 bg-orange-50 text-orange-700 font-bold text-[10px] sm:text-xs rounded-xl border border-orange-200/70 flex items-center space-x-1">
                        <Clock size={13} />
                        <span>สาย {emp.lateMinutes} นาที</span>
                      </span>
                    )}
                    
                    {emp.attendanceStatus === 'absent' && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 font-bold text-[10px] sm:text-xs rounded-xl border border-gray-200 flex items-center space-x-1">
                        <UserX size={13} />
                        <span>ยังไม่ลงเวลา</span>
                      </span>
                    )}
                  </div>

                  {/* เวลาลงเวลา เข้า/ออก หรือ รายละเอียดวันลา */}
                  {emp.attendanceStatus === 'on_leave' ? (
                    <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 text-xs sm:text-sm text-purple-800 flex items-center justify-between">
                      <span className="font-semibold text-purple-700">สถานะ: {emp.isWeeklyOffDay ? 'วันหยุดประจำสัปดาห์' : 'อนุมัติวันลาแล้ว'}</span>
                      <span className="font-bold font-mono">{emp.leaveReason}</span>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs text-gray-400 font-medium">เวลาเข้างาน</span>
                        <span className={`font-bold font-mono ${emp.checkInTime ? 'text-gray-800' : 'text-gray-300'}`}>
                          {formatTime(emp.checkInTime)}
                        </span>
                      </div>

                      <div className="flex flex-col border-l border-gray-200 pl-4">
                        <span className="text-[10px] sm:text-xs text-gray-400 font-medium">เวลาออกงาน</span>
                        <span className={`font-bold font-mono ${emp.checkOutTime ? 'text-gray-800' : 'text-gray-300'}`}>
                          {formatTime(emp.checkOutTime)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM NAVIGATION BAR จัดกลางตามทุกขนาดหน้าจอ */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md rounded-[28px] shadow-xl border border-gray-100 p-1.5 flex justify-around items-center z-30">
        <button
          onClick={() => onTabChange ? onTabChange('home') : onBack()}
          className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition bg-emerald-50 text-[#15803d] font-bold cursor-pointer"
        >
          <Home size={20} className="text-[#15803d]" />
          <span className="text-[10px] mt-0.5">หน้าแรก</span>
        </button>

        <button
          onClick={() => onTabChange ? onTabChange('employees') : onBack()}
          className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Users size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">พนักงาน</span>
        </button>

        <button
          onClick={() => onTabChange ? onTabChange('payroll') : onBack()}
          className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Calculator size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">เงินเดือน</span>
        </button>

        <button
          onClick={() => onTabChange ? onTabChange('settings') : onBack()}
          className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Settings size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">ตั้งค่า</span>
        </button>
      </div>

    </div>
  );
}