import React, { useState, useEffect } from 'react';
import { supabase, setActiveShopId } from '../../services/supabaseClient';
import { 
  ArrowLeft, Calendar, Clock, CheckCircle2, 
  Banknote, FileText, X, ChevronDown,
  Home, Wallet, User, ChevronRight, FileCheck
} from 'lucide-react';

export default function EmployeePayroll({ currentUser, selectedBranch, onBack, onTabChange }) {
  const [loading, setLoading] = useState(true);
  const [shopInfo, setShopInfo] = useState(selectedBranch || currentUser?.shops || null);
  
  // ตัวเลือกเดือน (มีทั้งชื่อภาษาไทยและรหัส YYYY-MM ให้ตรงกับฝั่งแอดมิน)
  const monthOptions = [
    { label: 'มกราคม 2026', value: '2026-01', monthIndex: 0 },
    { label: 'กุมภาพันธ์ 2026', value: '2026-02', monthIndex: 1 },
    { label: 'มีนาคม 2026', value: '2026-03', monthIndex: 2 },
    { label: 'เมษายน 2026', value: '2026-04', monthIndex: 3 },
    { label: 'พฤษภาคม 2026', value: '2026-05', monthIndex: 4 },
    { label: 'มิถุนายน 2026', value: '2026-06', monthIndex: 5 },
    { label: 'กรกฎาคม 2026', value: '2026-07', monthIndex: 6 },
    { label: 'สิงหาคม 2026', value: '2026-08', monthIndex: 7 },
    { label: 'กันยายน 2026', value: '2026-09', monthIndex: 8 },
    { label: 'ตุลาคม 2026', value: '2026-10', monthIndex: 9 },
    { label: 'พฤศจิกายน 2026', value: '2026-11', monthIndex: 10 },
    { label: 'ธันวาคม 2026', value: '2026-12', monthIndex: 11 },
  ];

  // State การเลือกเดือนและงวดการจ่ายเงิน
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const currentIdx = new Date().getMonth();
    return monthOptions[currentIdx]?.label || 'พฤศจิกายน 2026';
  });
  const [selectedPeriod, setSelectedPeriod] = useState('full');
  
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const isPartTime = currentUser?.employment_type === 'part_time';

  // ดึงข้อมูลชื่อร้านจริงล่าสุดจากฐานข้อมูล
  useEffect(() => {
    const fetchShopDetails = async () => {
      const targetShopId = selectedBranch?.id || currentUser?.shop_id || currentUser?.shops?.id;
      if (!targetShopId) return;

      setActiveShopId(targetShopId);

      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('id', targetShopId)
          .single();

        if (!error && data) {
          setShopInfo(data);
        }
      } catch (err) {
        console.error('Error fetching shop details:', err);
      }
    };

    fetchShopDetails();
  }, [currentUser, selectedBranch]);

  const periodLabelMap = {
    full: 'เต็มเดือน (1 - สิ้นเดือน)',
    half1: 'งวดแรก (วันที่ 1 - 15)',
    half2: 'งวดหลัง (16 - สิ้นเดือน)',
  };

  // ตัวเลขสรุปการทำงานและเงินเดือน
  const [daysWorked, setDaysWorked] = useState(0);
  const [hoursWorked, setHoursWorked] = useState(0);
  const [incompleteShifts, setIncompleteShifts] = useState(0);
  const [leaveDays, setLeaveDays] = useState(0);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [latePenalty, setLatePenalty] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  
  // ตัวเลขสรุปยอดเงิน
  const [grossSalary, setGrossSalary] = useState(0);
  const [totalNetSalary, setTotalNetSalary] = useState(0);
  const [totalPaidAmount, setTotalPaidAmount] = useState(0);
  const [remainingUnpaid, setRemainingUnpaid] = useState(0);

  // ข้อมูลสลิปโอนเงินจากแอดมิน
  const [paidSlips, setPaidSlips] = useState([]);
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  // คำนวณช่วงวันที่เริ่มต้น - สิ้นสุด ตามเดือนและงวดที่เลือก
  const getDateRange = () => {
    const selectedObj = monthOptions.find(m => m.label === selectedMonth) || monthOptions[10];
    const year = 2026;
    const month = selectedObj.monthIndex;

    let start = new Date(year, month, 1, 0, 0, 0);
    let end = new Date(year, month + 1, 0, 23, 59, 59);

    if (selectedPeriod === 'half1') {
      end = new Date(year, month, 15, 23, 59, 59);
    } else if (selectedPeriod === 'half2') {
      start = new Date(year, month, 16, 0, 0, 0);
    }
    return { start, end, selectedObj };
  };

  useEffect(() => {
    if (currentUser?.id) {
      const targetShopId = selectedBranch?.id || currentUser?.shop_id || shopInfo?.id;
      if (targetShopId) {
        setActiveShopId(targetShopId);
      }

      fetchEmployeePayrollData();

      // Realtime Listener
      const channel = supabase
        .channel('employee_payroll_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payrolls',
            filter: `user_id=eq.${currentUser.id}`,
          },
          () => {
            fetchEmployeePayrollData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser, shopInfo, selectedMonth, selectedPeriod]);

  const calculateLateMinutes = (entryTimeStr, shiftStartStr) => {
    if (!entryTimeStr || !shiftStartStr) return 0;
    const entryDate = new Date(entryTimeStr);
    if (isNaN(entryDate.getTime())) return 0;

    const [shiftHour, shiftMinute] = shiftStartStr.split(':').map(Number);
    const shiftDate = new Date(entryDate);
    shiftDate.setHours(shiftHour, shiftMinute, 0, 0);

    const diffMs = entryDate - shiftDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes > 0 ? diffMinutes : 0;
  };

  // คำนวณชั่วโมงทำงานจริงจากเวลาเข้า - เวลาออก (สำหรับพาร์ทไทม์)
  const calculateEntryHours = (entry) => {
    const inVal = entry.clock_in || entry.check_in || entry.in_time || entry.created_at;
    const outVal = entry.clock_out || entry.check_out || entry.out_time || entry.end_time;

    if (!inVal || !outVal) {
      return { hours: 0, isIncomplete: true };
    }

    const inDate = new Date(inVal);
    let outDate = new Date(outVal);

    if (isNaN(outDate.getTime()) && typeof outVal === 'string' && outVal.includes(':')) {
      const [h, m, s = 0] = outVal.split(':').map(Number);
      outDate = new Date(inDate);
      outDate.setHours(h, m, s, 0);
      if (outDate < inDate) {
        outDate.setDate(outDate.getDate() + 1); // กะข้ามเที่ยงคืน
      }
    }

    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
      return { hours: 0, isIncomplete: true };
    }

    const diffMs = outDate - inDate;
    const hours = diffMs > 0 ? diffMs / (1000 * 60 * 60) : 0;
    return { hours, isIncomplete: false };
  };

  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const fetchEmployeePayrollData = async () => {
    setLoading(true);
    try {
      const { start, end, selectedObj } = getDateRange();

      // 1. ดึงเวลาเข้างานตามช่วงวันที่เลือก
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const entries = timeEntries || [];
      const workedCount = entries.length;
      
      let totalLateMins = 0;
      let rawHours = 0;
      let missingOutCount = 0;

      entries.forEach(entry => {
        const clockInStr = entry.clock_in || entry.check_in || entry.in_time || entry.created_at;
        totalLateMins += calculateLateMinutes(clockInStr, currentUser.work_start || '16:00');

        const { hours, isIncomplete } = calculateEntryHours(entry);
        rawHours += hours;
        if (isIncomplete) missingOutCount += 1;
      });

      const totalHours = Number(rawHours.toFixed(2));

      // 2. ดึงวันลาที่อนุมัติแล้วตามช่วงวันที่เลือก
      const { data: leaves } = await supabase
        .from('leaves')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'approved')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      let totalLeaves = 0;
      (leaves || []).forEach(l => {
        totalLeaves += calculateDays(l.start_date, l.end_date);
      });

      // 3. ดึงยอดเบิกเงินที่อนุมัติแล้วตามช่วงวันที่เลือก
      const { data: advances } = await supabase
        .from('advances')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'approved')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const totalAdv = (advances || []).reduce((sum, item) => sum + Number(item.amount), 0);

      // 4. คำนวณยอดเงินรวม (แยกพาร์ทไทม์รายชม. กับ ประจำรายวัน)
      const rate = Number(currentUser.salary_rate) || 0;
      const penaltyRate = Number(currentUser.late_penalty_rate) || 0;
      
      const gross = isPartTime
        ? Number((totalHours * rate).toFixed(2))
        : Number((workedCount * rate).toFixed(2));
      const penalty = totalLateMins * penaltyRate;
      const net = Math.max(0, gross - penalty - totalAdv);

      setDaysWorked(workedCount);
      setHoursWorked(totalHours);
      setIncompleteShifts(missingOutCount);
      setLeaveDays(totalLeaves);
      setLateMinutes(totalLateMins);
      setLatePenalty(penalty);
      setAdvanceAmount(totalAdv);
      setGrossSalary(gross);
      setTotalNetSalary(net);

      // 5. ดึงสลิปการโอนเงินที่บันทึกแล้วตามเดือนและงวดที่เลือก
      const { data: slips } = await supabase
        .from('payrolls')
        .select('*')
        .eq('user_id', currentUser.id)
        .in('month', [selectedObj.value, selectedObj.label])
        .eq('period', selectedPeriod)
        .order('created_at', { ascending: false });

      const slipList = slips || [];
      setPaidSlips(slipList);

      // 6. คำนวณยอดโอนแล้ว และยอดคงเหลือที่ยังไม่ได้โอน
      const paidSum = slipList.reduce((sum, item) => sum + Number(item.net_amount || 0), 0);
      const remaining = Math.max(0, net - paidSum);

      setTotalPaidAmount(paidSum);
      setRemainingUnpaid(remaining);

    } catch (err) {
      console.error('Error fetching employee payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSlip = (slip) => {
    setSelectedSlip(slip);
    setShowSlipModal(true);
  };

  const rateVal = Number(currentUser?.salary_rate) || 0;

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {/* ส่วนเนื้อหาหลัก สามารถ Scroll ได้ */}
      <div className="flex-1 pb-24 w-full">
        
        {/* Header สีเขียวพร้อมปุ่มเลือกเดือนและเลือกงวด */}
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
                <h1 className="font-extrabold text-base sm:text-lg leading-tight">ข้อมูลเงินเดือนของฉัน</h1>
                <p className="text-[11px] sm:text-xs text-emerald-100 font-light">
                  ชื่อร้าน: {shopInfo?.shop_name || 'กำลังโหลดชื่อร้าน...'}
                </p>
              </div>
            </div>

            {/* แถบเลือกเดือน และ เลือกรอบงวด */}
            <div className="grid grid-cols-2 gap-2 bg-[#0e5c2b]/80 backdrop-blur-md p-2 rounded-2xl text-xs sm:text-sm relative">
              
              {/* Dropdown เลือกเดือน */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowMonthDropdown(!showMonthDropdown);
                    setShowPeriodDropdown(false);
                  }}
                  className="w-full flex items-center justify-between bg-[#15803d]/90 px-3 py-2 rounded-xl text-emerald-100 font-semibold border border-emerald-600/50 hover:bg-[#126b33] transition cursor-pointer"
                >
                  <span className="truncate text-xs sm:text-sm">{selectedMonth}</span>
                  <Calendar size={15} className="text-emerald-200 shrink-0 ml-1" />
                </button>

                {showMonthDropdown && (
                  <div className="absolute top-11 left-0 right-0 bg-[#1b4332] text-white rounded-2xl shadow-2xl overflow-hidden z-30 border border-emerald-500/40 py-1 text-xs sm:text-sm font-medium max-h-48 overflow-y-auto">
                    {monthOptions.map((m) => (
                      <button
                        key={m.label}
                        onClick={() => {
                          setSelectedMonth(m.label);
                          setShowMonthDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 transition cursor-pointer ${
                          selectedMonth === m.label ? 'bg-[#2d6a4f] font-bold text-white' : 'text-emerald-100 hover:bg-[#2d6a4f]/50'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown เลือกรอบงวด */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowPeriodDropdown(!showPeriodDropdown);
                    setShowMonthDropdown(false);
                  }}
                  className="w-full flex items-center justify-between bg-[#0b4822] px-3 py-2 rounded-xl text-white font-semibold border border-emerald-500/50 hover:bg-[#093d1c] transition cursor-pointer"
                >
                  <span className="truncate text-xs sm:text-sm">{periodLabelMap[selectedPeriod]}</span>
                  <ChevronDown size={15} className="shrink-0 ml-1" />
                </button>

                {showPeriodDropdown && (
                  <div className="absolute top-11 right-0 left-0 bg-[#1b4332] text-white rounded-2xl shadow-2xl overflow-hidden z-30 border border-emerald-500/40 py-1 text-xs sm:text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedPeriod('full');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 transition cursor-pointer ${
                        selectedPeriod === 'full' ? 'bg-[#2d6a4f] font-bold text-white' : 'text-emerald-100 hover:bg-[#2d6a4f]/50'
                      }`}
                    >
                      เต็มเดือน (1 - สิ้นเดือน)
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPeriod('half1');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 transition cursor-pointer ${
                        selectedPeriod === 'half1' ? 'bg-[#2d6a4f] font-bold text-white' : 'text-emerald-100 hover:bg-[#2d6a4f]/50'
                      }`}
                    >
                      งวดแรก (วันที่ 1 - 15)
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPeriod('half2');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 transition cursor-pointer ${
                        selectedPeriod === 'half2' ? 'bg-[#2d6a4f] font-bold text-white' : 'text-emerald-100 hover:bg-[#2d6a4f]/50'
                      }`}
                    >
                      งวดหลัง (16 - สิ้นเดือน)
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* คอนเทนเนอร์หลักตรงกลาง */}
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

          {loading ? (
            <div className="text-center py-16 text-xs sm:text-sm text-gray-400">กำลังคำนวณข้อมูลเงินเดือนตามช่วงเวลา...</div>
          ) : (
            <>
              {/* การ์ดแสดงยอดเงินรับสุทธิ และสถานะยอดโอน/ยังไม่โอน */}
              <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-emerald-100 relative overflow-hidden space-y-3.5">
                <div className="text-center pt-1">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    ประมาณการเงินเดือนรับสุทธิรอบ {periodLabelMap[selectedPeriod]}
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-black text-[#15803d] font-mono mt-1 mb-1">
                    ฿{totalNetSalary.toFixed(2)}
                  </h2>
                  <p className="text-xs text-gray-400">
                    อัตราค่าจ้าง: ฿{rateVal} / {isPartTime ? 'ชม. (พาร์ทไทม์)' : 'วัน (ประจำ)'}
                  </p>
                  {isPartTime && incompleteShifts > 0 && (
                    <p className="text-[11px] text-amber-600 font-semibold mt-1">
                      * มี {incompleteShifts} กะที่ยังไม่ได้ลงเวลาออกงาน (ยังไม่นำมานับชั่วโมง)
                    </p>
                  )}
                </div>

                {/* สรุปยอดโอนจ่ายแล้ว vs ยอดหักลบที่ยังไม่โอน */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs sm:text-sm">
                  <div className="bg-emerald-50/70 p-3 rounded-2xl text-center border border-emerald-100">
                    <span className="text-xs text-emerald-700 font-medium block">โอนจ่ายแล้ว</span>
                    <span className="font-mono font-black text-emerald-800 text-base sm:text-lg">
                      ฿{totalPaidAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl text-center border ${
                    remainingUnpaid > 0 
                      ? 'bg-orange-50/70 border-orange-200 text-orange-800' 
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <span className="text-xs font-medium block">ยังไม่ได้โอน</span>
                    <span className="font-mono font-black text-base sm:text-lg">
                      ฿{remainingUnpaid.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* การ์ดสรุป 4 ช่อง */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-emerald-100/70 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-400 block font-medium">
                      {isPartTime ? 'ชั่วโมงทำงาน' : 'วันทำงาน'}
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-gray-800 font-mono">
                      {isPartTime ? `${hoursWorked} ชม.` : `${daysWorked} วัน`}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-purple-100/70 text-purple-700 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-400 block font-medium">วันลาอนุมัติ</span>
                    <span className="text-base sm:text-lg font-extrabold text-gray-800 font-mono">{leaveDays} วัน</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-orange-100/80 text-orange-700 rounded-xl flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-400 block font-medium">เวลาสาย</span>
                    <span className="text-base sm:text-lg font-extrabold text-gray-800 font-mono">{lateMinutes} นาที</span>
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-blue-100/70 text-blue-700 rounded-xl flex items-center justify-center shrink-0">
                    <Banknote size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-400 block font-medium">เบิกล่วงหน้า</span>
                    <span className="text-base sm:text-lg font-extrabold text-gray-800 font-mono">฿{advanceAmount}</span>
                  </div>
                </div>
              </div>

              {/* รายละเอียดสรุปรายรับ - รายหัก */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3 text-xs sm:text-sm">
                <h3 className="font-bold text-gray-800 text-xs sm:text-sm border-b pb-2.5 flex items-center justify-between">
                  <span>รายละเอียดสรุปยอดเงิน</span>
                  <span className="text-[10px] sm:text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold">
                    คำนวณอัตโนมัติ
                  </span>
                </h3>

                <div className="flex justify-between text-gray-600">
                  <span>
                    {isPartTime
                      ? `ค่าจ้างรวม (${hoursWorked} ชม. × ฿${rateVal})`
                      : `ค่าจ้างรวม (${daysWorked} วัน × ฿${rateVal})`}
                  </span>
                  <span className="font-bold font-mono text-gray-800">฿{grossSalary.toFixed(2)}</span>
                </div>

                {latePenalty > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>หักมาสาย ({lateMinutes} นาที)</span>
                    <span className="font-bold font-mono">-฿{latePenalty.toFixed(2)}</span>
                  </div>
                )}

                {advanceAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>หักเบิกล่วงหน้า</span>
                    <span className="font-bold font-mono">-฿{advanceAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t flex justify-between items-center font-bold text-gray-700">
                  <span>ยอดสุทธิที่คำนวณได้</span>
                  <span className="font-mono text-emerald-800 text-sm sm:text-base">฿{totalNetSalary.toFixed(2)}</span>
                </div>

                {totalPaidAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold bg-emerald-50/80 p-2.5 rounded-xl">
                    <span>หัก โอนจ่ายแล้ว</span>
                    <span className="font-mono font-bold">-฿{totalPaidAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t flex justify-between items-center text-sm sm:text-base">
                  <span className="font-bold text-gray-800">ยอดคงเหลือที่ยังไม่โอน</span>
                  <span className={`font-black font-mono text-base sm:text-lg ${remainingUnpaid > 0 ? 'text-orange-600' : 'text-[#15803d]'}`}>
                    ฿{remainingUnpaid.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* ส่วนสลิปเงินเดือนที่ได้รับจากแอดมิน */}
              <div className="space-y-3 pt-1">
                <h3 className="font-bold text-gray-800 text-xs sm:text-sm flex items-center space-x-1.5">
                  <FileText size={16} className="text-emerald-700" />
                  <span>สลิปเงินเดือน & หลักฐานโอนเงิน</span>
                </h3>

                {paidSlips.length === 0 ? (
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 text-center text-xs sm:text-sm text-gray-400">
                    ยังไม่มีสลิปโอนเงินสำหรับ {selectedMonth} ({periodLabelMap[selectedPeriod]})
                  </div>
                ) : (
                  paidSlips.map((slip) => (
                    <div
                      key={slip.id}
                      onClick={() => handleOpenSlip(slip)}
                      className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex justify-between items-center cursor-pointer hover:bg-emerald-50/40 transition group"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center shrink-0">
                          <FileCheck size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 text-xs sm:text-sm group-hover:text-emerald-800">
                            สลิปเงินเดือนงวด {slip.month}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-400">
                            โอนแล้วเมื่อ {new Date(slip.created_at).toLocaleDateString('th-TH')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                          ฿{Number(slip.net_amount || 0).toFixed(2)}
                        </span>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-600" />
                      </div>
                    </div>
                  ))
                )}
              </div>

            </>
          )}

        </div>
      </div>

      {/* MODAL แสดงรูปสลิปการโอนเงิน */}
      {showSlipModal && selectedSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            
            <div className="p-4 px-5 border-b flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg">สลิปการโอนเงิน</h3>
                <p className="text-xs sm:text-sm text-emerald-700 font-semibold mt-0.5">
                  งวด: {selectedSlip.month} ({periodLabelMap[selectedSlip.period] || selectedSlip.period})
                </p>
              </div>
              <button
                onClick={() => setShowSlipModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
              <div className="bg-emerald-50/70 p-4 rounded-3xl border border-emerald-100 text-center">
                <span className="text-gray-500 text-xs font-medium block">ยอดเงินโอนสุทธิ</span>
                <span className="text-3xl font-black text-[#15803d] font-mono mt-1 block">
                  ฿{Number(selectedSlip.net_amount || 0).toFixed(2)}
                </span>
              </div>

              {selectedSlip.transfer_slip_url ? (
                <div className="border rounded-2xl p-2 bg-gray-50 text-center">
                  <img
                    src={selectedSlip.transfer_slip_url}
                    alt="สลิปโอนเงิน"
                    className="w-full max-h-72 sm:max-h-80 object-contain rounded-xl mx-auto shadow-sm"
                  />
                </div>
              ) : (
                <div className="py-8 text-center text-xs sm:text-sm text-gray-400 italic bg-gray-50 rounded-2xl border">
                  ไม่มีไฟล์รูปภาพสลิปการโอน
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t shrink-0">
              <button
                onClick={() => setShowSlipModal(false)}
                className="w-full py-3 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs sm:text-sm cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR จัดกลางตามทุกขนาดหน้าจอ */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md rounded-[28px] shadow-xl border border-gray-100 p-1.5 flex justify-around items-center z-30">
        <button
          onClick={() => onTabChange ? onTabChange('home') : onBack()}
          className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Home size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">หน้าแรก</span>
        </button>

        <button
          className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition bg-emerald-50 text-[#15803d] font-bold cursor-pointer"
        >
          <Wallet size={20} className="text-[#15803d]" />
          <span className="text-[10px] mt-0.5">เงินเดือน</span>
        </button>

        <button
          onClick={() => onTabChange ? onTabChange('profile') : onBack()}
          className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <User size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">ฉัน</span>
        </button>
      </div>

    </div>
  );
}