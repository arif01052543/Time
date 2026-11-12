import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, Calendar, ChevronDown, CheckCircle2, 
  Banknote, X, Sliders, FileText, Check,
  CreditCard, Upload, Image as ImageIcon, Trash2,
  Home, Users, Calculator, Settings, QrCode, Download,
  TrendingUp, TrendingDown, Clock, UserCheck, AlertCircle
} from 'lucide-react';

export default function AdminPayroll({ selectedBranch, onBack, onTabChange }) {
  const [employees, setEmployees] = useState([]);
  const [filterType, setFilterType] = useState('full_time'); // 'full_time' | 'part_time'
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all'); // 'all' | 'pending' | 'paid'
  const [loading, setLoading] = useState(true);

  // 1. สร้าง State เก็บปี-เดือน และ งวดการจ่าย
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedPeriod, setSelectedPeriod] = useState('full'); // 'full', 'half1', 'half2'
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [paidRecords, setPaidRecords] = useState({});
  const [successToast, setSuccessToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [transferSlip, setTransferSlip] = useState(null);

  const [adjustments, setAdjustments] = useState({
    bonus: 0,
    deduction: 0,
    latePenalty: 0,
    advanceDeduction: 0,
  });

  // 2. คำนวณช่วงวันที่แบบไดนามิก ตามเดือนที่เลือก (selectedMonth) และงวด (selectedPeriod)
  const getDateRange = () => {
    if (!selectedMonth) return { start: new Date(), end: new Date() };
    const [year, monthNum] = selectedMonth.split('-').map(Number);
    const monthIndex = monthNum - 1; // 0-indexed ใน JS Date

    let start = new Date(year, monthIndex, 1, 0, 0, 0);
    let end = new Date(year, monthIndex + 1, 0, 23, 59, 59);

    if (selectedPeriod === 'half1') {
      end = new Date(year, monthIndex, 15, 23, 59, 59);
    } else if (selectedPeriod === 'half2') {
      start = new Date(year, monthIndex, 16, 0, 0, 0);
    }
    return { start, end };
  };

  // 3. ดึงข้อมูลใหม่ทันทีเมื่อมีการเปลี่ยน สาขา, เดือน หรือ งวดการจ่าย
  useEffect(() => {
    fetchPayrollData();
    fetchPaidHistory();
  }, [selectedBranch, selectedMonth, selectedPeriod]);

  // ดึงประวัติคนที่จ่ายเงินแล้วจาก Supabase
  const fetchPaidHistory = async () => {
    if (!selectedBranch?.id) {
      setPaidRecords({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payrolls')
        .select('*')
        .eq('month', selectedMonth)
        .eq('period', selectedPeriod)
        .eq('shop_id', selectedBranch.id);

      if (error) throw error;

      const recordMap = {};
      (data || []).forEach(item => {
        recordMap[item.user_id] = {
          id: item.id,
          paidAt: item.created_at,
          finalNet: Number(item.net_amount),
          adjustments: {
            bonus: Number(item.bonus),
            deduction: Number(item.deduction),
            latePenalty: Number(item.late_penalty),
            advanceDeduction: Number(item.advance_deduction)
          },
          transferSlip: item.transfer_slip_url
        };
      });
      setPaidRecords(recordMap);
    } catch (err) {
      console.error('Error fetching paid history:', err);
    }
  };

  const calculateLateMinutes = (entryTimeStr, shiftStartStr) => {
    if (!entryTimeStr || !shiftStartStr) return 0;
    const entryDate = new Date(entryTimeStr);
    const [shiftHour, shiftMinute] = shiftStartStr.split(':').map(Number);
    
    const shiftDate = new Date(entryDate);
    shiftDate.setHours(shiftHour, shiftMinute, 0, 0);

    const diffMs = entryDate - shiftDate;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes > 0 ? diffMinutes : 0;
  };

  const fetchPayrollData = async () => {
    if (!selectedBranch?.id) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const { data: empList, error: empErr } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .eq('shop_id', selectedBranch.id);

      if (empErr) throw empErr;

      const updatedEmps = await Promise.all(
        (empList || []).map(async (emp) => {
          const { data: timeEntries } = await supabase
            .from('time_entries')
            .select('*')
            .eq('user_id', emp.id)
            .eq('shop_id', selectedBranch.id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

          const { data: advances } = await supabase
            .from('advances')
            .select('amount')
            .eq('user_id', emp.id)
            .eq('shop_id', selectedBranch.id)
            .eq('status', 'approved')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());

          const daysWorked = (timeEntries || []).length;
          
          let totalLateMinutes = 0;
          (timeEntries || []).forEach(entry => {
            totalLateMinutes += calculateLateMinutes(entry.created_at, emp.work_start || '16:00');
          });

          const totalAdvances = (advances || []).reduce((sum, item) => sum + Number(item.amount), 0);

          const rate = Number(emp.salary_rate) || 0;
          const gross = daysWorked * rate;
          const latePenalty = totalLateMinutes * (Number(emp.late_penalty_rate) || 0);
          const net = Math.max(0, gross - latePenalty - totalAdvances);

          return {
            ...emp,
            daysWorked,
            lateMinutes: totalLateMinutes,
            latePenalty,
            grossSalary: gross,
            advanceDeduction: totalAdvances,
            netSalary: net,
          };
        })
      );

      setEmployees(updatedEmps);
    } catch (err) {
      console.error('Error calculating payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (emp) => {
    setSelectedEmp(emp);
    const paidInfo = paidRecords[emp.id];

    if (paidInfo) {
      setAdjustments(paidInfo.adjustments || {
        bonus: 0,
        deduction: 0,
        latePenalty: emp.latePenalty || 0,
        advanceDeduction: emp.advanceDeduction || 0,
      });
      setTransferSlip(paidInfo.transferSlip || null);
    } else {
      setAdjustments({
        bonus: 0,
        deduction: 0,
        latePenalty: emp.latePenalty || 0,
        advanceDeduction: emp.advanceDeduction || 0,
      });
      setTransferSlip(null);
    }
    setShowPayslipModal(true);
  };

  const handleSlipUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTransferSlip(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadQR = (url, empName) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_Code_${empName || 'Payment'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmPayment = async () => {
    if (!selectedEmp || !selectedBranch?.id) return;
    setIsSaving(true);

    try {
      const finalNet = Math.max(
        0,
        selectedEmp.grossSalary +
          Number(adjustments.bonus || 0) -
          Number(adjustments.deduction || 0) -
          Number(adjustments.latePenalty || 0) -
          Number(adjustments.advanceDeduction || 0)
      );

      const payload = {
        user_id: selectedEmp.id,
        shop_id: selectedBranch.id,
        month: selectedMonth,
        period: selectedPeriod,
        gross_amount: selectedEmp.grossSalary,
        bonus: Number(adjustments.bonus || 0),
        deduction: Number(adjustments.deduction || 0),
        late_penalty: Number(adjustments.latePenalty || 0),
        advance_deduction: Number(adjustments.advanceDeduction || 0),
        net_amount: finalNet,
        transfer_slip_url: transferSlip,
        status: 'paid'
      };

      const { data, error } = await supabase.from('payrolls').insert([payload]).select();
      if (error) throw error;

      setPaidRecords((prev) => ({
        ...prev,
        [selectedEmp.id]: {
          id: data[0].id,
          paidAt: data[0].created_at,
          finalNet,
          adjustments,
          transferSlip,
        },
      }));

      setShowPayslipModal(false);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกสลิป: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // การกรองข้อมูลพนักงาน (แยกประเภทพนักงาน และ แยกสถานะการโอนเงิน)
  const fullTimeEmps = employees.filter(
    (e) => !e.employment_type || e.employment_type === 'full_time' || e.employment_type === 'monthly' || e.employment_type === 'daily'
  );
  const partTimeEmps = employees.filter((e) => e.employment_type === 'part_time');
  const currentTypeEmps = filterType === 'full_time' ? fullTimeEmps : partTimeEmps;

  const pendingEmps = currentTypeEmps.filter((e) => !paidRecords[e.id]);
  const paidEmps = currentTypeEmps.filter((e) => !!paidRecords[e.id]);

  let displayedEmps = currentTypeEmps;
  if (paymentStatusFilter === 'pending') {
    displayedEmps = pendingEmps;
  } else if (paymentStatusFilter === 'paid') {
    displayedEmps = paidEmps;
  }

  const totalCycleAmount = employees.reduce((sum, e) => {
    const paidInfo = paidRecords[e.id];
    return sum + (paidInfo ? paidInfo.finalNet : e.netSalary);
  }, 0);

  const totalTransferred = Object.values(paidRecords).reduce((sum, r) => sum + r.finalNet, 0);

  const periodLabelMap = {
    full: 'เต็มเดือน (1 - สิ้นเดือน)',
    half1: 'งวดแรก (วันที่ 1 - 15)',
    half2: 'งวดหลัง (16 - สิ้นเดือน)',
  };

  // คำนวณยอดเงินของ modal
  const bonusVal = Number(adjustments.bonus || 0);
  const deductionVal = Number(adjustments.deduction || 0);
  const lateVal = Number(adjustments.latePenalty || 0);
  const advanceVal = Number(adjustments.advanceDeduction || 0);
  const grossVal = selectedEmp?.grossSalary || 0;

  const totalIncome = grossVal + bonusVal;
  const totalDeduction = lateVal + advanceVal + deductionVal;
  const modalNetTotal = Math.max(0, totalIncome - totalDeduction);

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
                <h1 className="font-extrabold text-base sm:text-lg leading-tight">ระบบคำนวณเงินเดือน</h1>
                <p className="text-[11px] sm:text-xs text-emerald-100 font-light">
                  ชื่อร้าน: {selectedBranch?.shop_name || 'สาขาหลัก'}
                </p>
              </div>
            </div>

            {/* แถบเลือกเดือน และ งวดการจ่าย */}
            <div className="grid grid-cols-2 gap-2 bg-[#0e5c2b]/80 backdrop-blur-md p-2 rounded-2xl text-xs sm:text-sm relative">
              
              {/* ช่องเลือกเดือน (กดเปิด Native Month Picker บนมือถือ/คอมได้จริง) */}
              <div className="relative flex items-center justify-between bg-[#0b4822] hover:bg-[#093d1c] px-3 py-2 rounded-xl text-white font-semibold border border-emerald-500/50 transition cursor-pointer overflow-hidden min-w-0">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <span className="truncate text-xs sm:text-sm">{selectedMonth}</span>
                <Calendar size={15} className="text-emerald-200 shrink-0 ml-1 pointer-events-none" />
              </div>

              {/* ช่องเลือกรอบการจ่าย */}
              <div className="relative min-w-0">
                <button
                  onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  className="w-full flex items-center justify-between bg-[#0b4822] px-3 py-2 rounded-xl text-white font-semibold border border-emerald-500/50 hover:bg-[#093d1c] transition cursor-pointer"
                >
                  <span className="truncate text-xs sm:text-sm">{periodLabelMap[selectedPeriod]}</span>
                  <ChevronDown size={15} className="shrink-0 ml-1" />
                </button>

                {showPeriodDropdown && (
                  <div className="absolute top-11 right-0 left-0 bg-[#1b4332] text-white rounded-2xl shadow-2xl overflow-hidden z-30 border border-emerald-500/40 py-1 text-xs sm:text-sm font-medium">
                    <button
                      onClick={() => { setSelectedPeriod('full'); setShowPeriodDropdown(false); }}
                      className={`w-full text-left px-3.5 py-2.5 transition ${selectedPeriod === 'full' ? 'bg-[#2d6a4f] font-bold text-white' : 'text-emerald-100 hover:bg-[#2d6a4f]/50'}`}
                    >
                      เต็มเดือน (1 - สิ้นเดือน)
                    </button>
                    <button
                      onClick={() => { setSelectedPeriod('half1'); setShowPeriodDropdown(false); }}
                      className={`w-full text-left px-3.5 py-2.5 transition ${selectedPeriod === 'half1' ? 'bg-[#2d6a4f] font-bold text-white' : 'text-emerald-100 hover:bg-[#2d6a4f]/50'}`}
                    >
                      งวดแรก (วันที่ 1 - 15)
                    </button>
                    <button
                      onClick={() => { setSelectedPeriod('half2'); setShowPeriodDropdown(false); }}
                      className={`w-full text-left px-3.5 py-2.5 transition ${selectedPeriod === 'half2' ? 'bg-[#2d6a4f] font-bold text-white' : 'text-emerald-100 hover:bg-[#2d6a4f]/50'}`}
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
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">

          {successToast && (
            <div className="p-3.5 bg-emerald-100 border border-emerald-300 text-[#15803d] rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-sm animate-in fade-in zoom-in duration-200">
              <CheckCircle2 size={18} />
              <span>บันทึกการจ่ายเงินเดือนและส่งสลิปเรียบร้อยแล้ว</span>
            </div>
          )}

          {/* การ์ดสรุปยอดเงินรวม */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-emerald-100/80 flex justify-between items-center">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">ยอดรวมรอบนี้</p>
              <h2 className="text-2xl sm:text-3xl font-black text-[#15803d] font-mono mt-0.5">
                ฿{totalCycleAmount.toFixed(2)}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block font-medium">โอนจ่ายแล้ว</span>
              <span className="inline-block mt-0.5 px-3.5 py-1 bg-emerald-50 text-emerald-700 font-mono font-bold text-xs sm:text-sm rounded-full border border-emerald-200/60">
                ฿{totalTransferred.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 1. ตัวกรองประเภทพนักงาน */}
          <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setFilterType('full_time')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                filterType === 'full_time'
                  ? 'bg-emerald-50 text-[#15803d]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              ประจำ/รายวัน ({fullTimeEmps.length})
            </button>
            <button
              onClick={() => setFilterType('part_time')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                filterType === 'part_time'
                  ? 'bg-emerald-50 text-[#15803d]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              พาร์ทไทม์ ({partTimeEmps.length})
            </button>
          </div>

          {/* 2. ตัวกรองแยกสถานะ "โอนจ่ายแล้ว" vs "ยังไม่ได้โอน" */}
          <div className="flex bg-gray-200/60 p-1 rounded-2xl text-xs font-semibold space-x-1">
            <button
              onClick={() => setPaymentStatusFilter('all')}
              className={`flex-1 py-1.5 rounded-xl transition cursor-pointer ${
                paymentStatusFilter === 'all'
                  ? 'bg-white text-gray-800 shadow-sm font-bold'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ทั้งหมด ({currentTypeEmps.length})
            </button>
            <button
              onClick={() => setPaymentStatusFilter('pending')}
              className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer ${
                paymentStatusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-sm font-bold'
                  : 'text-amber-700 hover:bg-amber-100/50'
              }`}
            >
              <Clock size={13} />
              <span>ยังไม่ได้โอน ({pendingEmps.length})</span>
            </button>
            <button
              onClick={() => setPaymentStatusFilter('paid')}
              className={`flex-1 py-1.5 rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer ${
                paymentStatusFilter === 'paid'
                  ? 'bg-[#15803d] text-white shadow-sm font-bold'
                  : 'text-emerald-700 hover:bg-emerald-100/50'
              }`}
            >
              <CheckCircle2 size={13} />
              <span>โอนแล้ว ({paidEmps.length})</span>
            </button>
          </div>

          {/* รายการพนักงาน */}
          <div className="space-y-3 pt-1">
            {loading ? (
              <div className="text-center py-12 text-xs sm:text-sm text-gray-400">กำลังคำนวณเงินเดือนจากฐานข้อมูล...</div>
            ) : displayedEmps.length === 0 ? (
              <div className="text-center py-16 text-xs sm:text-sm text-gray-400 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                {paymentStatusFilter === 'pending' 
                  ? 'ไม่มีรายการที่รอโอนจ่าย' 
                  : paymentStatusFilter === 'paid' 
                  ? 'ยังไม่มีรายการที่โอนจ่ายแล้ว' 
                  : 'ไม่พบรายชื่อพนักงานในหมวดนี้'}
              </div>
            ) : (
              displayedEmps.map((emp) => {
                const paidData = paidRecords[emp.id];
                const isPaid = !!paidData;
                const netShow = isPaid ? paidData.finalNet : emp.netSalary;

                return (
                  <div
                    key={emp.id}
                    className={`bg-white rounded-3xl p-4 sm:p-5 shadow-sm border transition relative overflow-hidden ${
                      isPaid ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-gray-100'
                    }`}
                  >
                    {isPaid ? (
                      <div className="absolute top-0 right-0 bg-[#15803d] text-white text-[10px] sm:text-xs font-bold px-3.5 py-1 rounded-bl-2xl flex items-center space-x-1 shadow-sm">
                        <Check size={13} />
                        <span>โอนแล้ว</span>
                      </div>
                    ) : (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] sm:text-xs font-bold px-3.5 py-1 rounded-bl-2xl flex items-center space-x-1 shadow-sm">
                        <Clock size={13} />
                        <span>ยังไม่ได้โอน</span>
                      </div>
                    )}

                    <div className="flex justify-between items-start pt-1">
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
                            ทำงาน {emp.daysWorked} วัน | สาย {emp.lateMinutes} นาที
                          </p>
                        </div>
                      </div>

                      <div className="text-right pt-1">
                        <span className="text-[10px] sm:text-xs text-gray-400 block">
                          {isPaid ? 'ยอดโอนจริง' : 'รับสุทธิ'}
                        </span>
                        <span className="text-lg sm:text-xl font-black text-[#15803d] font-mono">
                          ฿{netShow.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-50 text-xs sm:text-sm space-y-1">
                      <div className="flex justify-between text-gray-600">
                        <span className="text-gray-400">
                          ค่าจ้างรวม (Gross) <span className="text-[10px] sm:text-xs">(วันละ ฿{emp.salary_rate})</span>
                        </span>
                        <span className="font-semibold text-gray-700">฿{emp.grossSalary.toFixed(2)}</span>
                      </div>

                      {emp.advanceDeduction > 0 && (
                        <div className="flex justify-between text-orange-600 font-medium">
                          <span>หักเบิกล่วงหน้า</span>
                          <span>-฿{emp.advanceDeduction.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      {isPaid ? (
                        <button
                          onClick={() => handleOpenModal(emp)}
                          className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 border border-gray-200 transition cursor-pointer"
                        >
                          <FileText size={16} className="text-emerald-700" />
                          <span>ดูสลิปย้อนหลัง</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenModal(emp)}
                          className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#15803d] font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 border border-emerald-200/80 transition active:scale-[0.98] cursor-pointer"
                        >
                          <Banknote size={17} />
                          <span>ตรวจสอบ / ปรับยอด & จ่ายเงิน</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL สรุปและแจกแจงสลิปเงินเดือน */}
      {showPayslipModal && selectedEmp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            
            <div className="p-4 px-5 border-b flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="font-bold text-gray-800 text-base sm:text-lg">
                  {paidRecords[selectedEmp.id] ? 'สลิปเงินเดือน (โอนแล้ว)' : 'สรุปและปรับปรุงสลิปเงินเดือน'}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-700 font-semibold mt-0.5">
                  {selectedEmp.name} ({selectedEmp.position || 'พนักงาน'})
                </p>
              </div>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
              
              {/* 1. สรุปยอดโอนสุทธิ */}
              <div className="bg-emerald-50/70 p-4 rounded-3xl border border-emerald-100 text-center">
                <span className="text-gray-500 text-xs font-medium block">ยอดเงินสุทธิที่ต้องโอนจริง</span>
                <span className="text-3xl font-black text-[#15803d] font-mono mt-1 block">
                  ฿{modalNetTotal.toFixed(2)}
                </span>
              </div>

              {/* 2. การ์ดสรุปประวัติการทำงาน */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center space-x-1.5 text-gray-700 font-bold text-xs sm:text-sm border-b pb-1.5">
                  <Clock size={15} className="text-emerald-600" />
                  <span>สรุปการทำงานรอบนี้</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium block">จำนวนวันทำงาน</span>
                    <span className="font-bold text-gray-800 font-mono text-xs sm:text-sm">{selectedEmp.daysWorked} วัน</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium block">เวลามาสายสะสม</span>
                    <span className="font-bold text-orange-600 font-mono text-xs sm:text-sm">{selectedEmp.lateMinutes} นาที</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-400 block font-normal">(หัก ฿{selectedEmp.late_penalty_rate || 0}/นาที)</span>
                  </div>
                </div>
              </div>

              {/* 3. รายการเงินได้ (+) & รายการเงินหัก (-) */}
              <div className="p-3.5 bg-white border border-gray-100 rounded-2xl space-y-3">
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-1 text-emerald-700 font-bold text-xs sm:text-sm border-b pb-1">
                    <TrendingUp size={15} />
                    <span>รายการเงินได้ (+)</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pl-2">
                    <span>ค่าจ้างพื้นฐาน ({selectedEmp.daysWorked} วัน × ฿{selectedEmp.salary_rate})</span>
                    <span className="font-bold text-gray-800 font-mono">฿{grossVal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pl-2">
                    <span>โบนัส / ค่าล่วงเวลา (OT)</span>
                    <span className="font-bold text-emerald-700 font-mono">+฿{bonusVal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-1 text-red-600 font-bold text-xs sm:text-sm border-b pb-1">
                    <TrendingDown size={15} />
                    <span>รายการเงินหัก (-)</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pl-2">
                    <span>หักมาสาย ({selectedEmp.lateMinutes} นาที)</span>
                    <span className="font-bold text-red-600 font-mono">-฿{lateVal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pl-2">
                    <span>หักเบิกเงินล่วงหน้า</span>
                    <span className="font-bold text-red-600 font-mono">-฿{advanceVal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 pl-2">
                    <span>หักขาดงาน / อื่นๆ</span>
                    <span className="font-bold text-red-600 font-mono">-฿{deductionVal.toFixed(2)}</span>
                  </div>
                </div>

              </div>

              {/* 4. กล่องฟอร์มปรับแต่งยอด */}
              {!paidRecords[selectedEmp.id] && (
                <div className="p-3.5 bg-gray-50 border border-gray-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-1.5 text-gray-700 font-bold text-xs sm:text-sm border-b pb-2">
                    <Sliders size={16} className="text-emerald-600" />
                    <span>ปรับแก้ตัวเลขเงินสดล่วงหน้าก่อนโอน</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-emerald-700 block mb-1">
                        + บวกเพิ่ม (OT/โบนัส)
                      </label>
                      <input
                        type="number"
                        value={adjustments.bonus}
                        onChange={(e) => setAdjustments({ ...adjustments, bonus: e.target.value })}
                        placeholder="0"
                        className="w-full p-2.5 border rounded-xl bg-white text-center font-mono focus:outline-none focus:border-emerald-600 text-gray-700 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-red-600 block mb-1">
                        - หักอื่นๆ (ขาดงาน)
                      </label>
                      <input
                        type="number"
                        value={adjustments.deduction}
                        onChange={(e) => setAdjustments({ ...adjustments, deduction: e.target.value })}
                        placeholder="0"
                        className="w-full p-2.5 border rounded-xl bg-white text-center font-mono focus:outline-none focus:border-emerald-600 text-gray-700 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-gray-500 block mb-1">
                        หักมาสาย (แก้ไขได้)
                      </label>
                      <input
                        type="number"
                        value={adjustments.latePenalty}
                        onChange={(e) => setAdjustments({ ...adjustments, latePenalty: e.target.value })}
                        placeholder="0.00"
                        className="w-full p-2.5 border rounded-xl bg-white text-center font-mono focus:outline-none focus:border-emerald-600 text-gray-700 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] sm:text-xs font-bold text-gray-500 block mb-1">
                        หักเบิกเงิน (แก้ไขได้)
                      </label>
                      <input
                        type="number"
                        value={adjustments.advanceDeduction}
                        onChange={(e) => setAdjustments({ ...adjustments, advanceDeduction: e.target.value })}
                        placeholder="0.00"
                        className="w-full p-2.5 border rounded-xl bg-white text-center font-mono focus:outline-none focus:border-emerald-600 text-gray-700 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. ข้อมูลบัญชีรับเงินพนักงาน */}
              <div className="p-4 bg-gray-50 border rounded-2xl space-y-3">
                <div className="flex items-center space-x-1.5 text-gray-800 font-bold text-xs sm:text-sm">
                  <CreditCard size={15} className="text-emerald-700" />
                  <span>ข้อมูลบัญชีรับเงินพนักงาน</span>
                </div>

                {selectedEmp.bank_name || selectedEmp.bank_account_no ? (
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">ธนาคาร:</span>
                      <span className="font-bold text-emerald-800">{selectedEmp.bank_name || 'ไม่ระบุ'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">เลขบัญชี/พร้อมเพย์:</span>
                      <span className="font-mono font-bold text-gray-800">{selectedEmp.bank_account_no || 'ไม่ระบุ'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">ชื่อบัญชี:</span>
                      <span className="font-semibold text-gray-700">{selectedEmp.bank_account_name || selectedEmp.name}</span>
                    </div>

                    {selectedEmp.qr_code_url && (
                      <div className="pt-2 border-t border-gray-200 text-center space-y-1.5">
                        <span className="text-[10px] sm:text-xs text-gray-500 font-bold block">
                          รูป QR Code สำหรับสแกนรับเงิน
                        </span>
                        <div className="p-2 bg-white rounded-xl border border-gray-200 inline-block shadow-sm">
                          <img
                            src={selectedEmp.qr_code_url}
                            alt="QR Code รับเงิน"
                            className="w-36 h-36 object-contain rounded-lg mx-auto"
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => handleDownloadQR(selectedEmp.qr_code_url, selectedEmp.name)}
                            className="mt-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#15803d] font-bold text-[11px] sm:text-xs rounded-xl inline-flex items-center space-x-1.5 border border-emerald-200 transition active:scale-95 shadow-sm cursor-pointer"
                          >
                            <Download size={13} />
                            <span>ดาวน์โหลด QR Code สแกนจ่าย</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 italic">พนักงานยังไม่ได้กรอกข้อมูลธนาคาร</p>
                )}
              </div>

              {/* 6. แนบหลักฐานสลิปการโอนเงิน */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-900">
                  <div className="flex items-center space-x-1.5">
                    <ImageIcon size={16} className="text-emerald-700" />
                    <span>หลักฐานสลิปการโอนเงิน</span>
                  </div>
                  {transferSlip && !paidRecords[selectedEmp.id] && (
                    <button
                      type="button"
                      onClick={() => setTransferSlip(null)}
                      className="text-red-500 hover:text-red-700 flex items-center space-x-0.5 text-[10px] sm:text-xs cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>ลบสลิป</span>
                    </button>
                  )}
                </div>

                {transferSlip ? (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-200 bg-white p-2 text-center shadow-sm">
                    <img
                      src={transferSlip}
                      alt="สลิปการโอนเงิน"
                      className="max-h-56 w-auto mx-auto rounded-xl object-contain"
                    />
                    <span className="block text-[10px] sm:text-xs text-emerald-600 font-bold mt-1.5">
                      ✓ แนบสลิปการโอนแล้ว
                    </span>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center bg-white cursor-pointer transition group">
                    <div className="w-10 h-10 bg-emerald-100/70 text-emerald-700 rounded-full flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
                      <Upload size={18} />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-emerald-800">คลิกเพื่อแนบสลิปโอนเงิน</span>
                    <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5">รองรับไฟล์ภาพ JPG, PNG</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSlipUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

            </div>

            <div className="p-4 bg-gray-50 border-t shrink-0">
              {paidRecords[selectedEmp.id] ? (
                <button
                  type="button"
                  onClick={() => setShowPayslipModal(false)}
                  className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-2xl transition text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>ปิดหน้าต่าง</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isSaving}
                  className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition text-xs sm:text-sm flex items-center justify-center space-x-2 active:scale-[0.98] disabled:bg-gray-400 cursor-pointer"
                >
                  <CheckCircle2 size={18} />
                  <span>{isSaving ? 'กำลังบันทึกลงระบบ...' : 'ยืนยันโอนเงิน & ส่งสลิป'}</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md rounded-[28px] shadow-xl border border-gray-100 p-1.5 flex justify-around items-center z-30">
        
        {/* หน้าแรก */}
        <button
          onClick={() => onTabChange && onTabChange('home')}
          className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Home size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">หน้าแรก</span>
        </button>

        {/* พนักงาน */}
        <button
          onClick={() => onTabChange && onTabChange('employees')}
          className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Users size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">พนักงาน</span>
        </button>

        {/* เงินเดือน (Active) */}
        <button
          className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition bg-emerald-50 text-[#15803d] font-bold cursor-pointer"
        >
          <Calculator size={20} className="text-[#15803d]" />
          <span className="text-[10px] mt-0.5">เงินเดือน</span>
        </button>

        {/* ตั้งค่า */}
        <button
          onClick={() => onTabChange && onTabChange('settings')}
          className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Settings size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">ตั้งค่า</span>
        </button>

      </div>
    </div>
  );
}