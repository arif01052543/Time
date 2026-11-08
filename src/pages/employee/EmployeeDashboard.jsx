import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import EmployeePayroll from './EmployeePayroll';
import EmployeeProfile from './EmployeeProfile';
import { 
  Clock, LogOut, MapPin, FileText, Banknote, 
  Home, Wallet, User, CheckCircle2, ArrowRight, ArrowLeft,
  Store, XCircle, AlertCircle
} from 'lucide-react';

export default function EmployeeDashboard({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayEntry, setTodayEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState(null);
  const [isInRange, setIsInRange] = useState(false);
  const [locationStatus, setLocationStatus] = useState('กำลังตรวจสอบตำแหน่ง GPS...');

  // Custom Alert Modal State
  const [alertModal, setAlertModal] = useState({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Modal State ใบลา & เบิกเงิน
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  // ฟอร์มใบลา
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'ลากิจ',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // ฟอร์มขอเบิกเงิน
  const [advanceForm, setAdvanceForm] = useState({
    amount: '',
    reason: ''
  });

  const showAlert = (title, message, type = 'success') => {
    setAlertModal({
      show: true,
      type,
      title,
      message
    });
  };

  // นาฬิกาเดินเรียลไทม์
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ดึงข้อมูลการลงเวลาของวันนี้
  useEffect(() => {
    if (currentUser?.id) {
      fetchTodayAttendance();
    }
  }, [currentUser]);

  // ติดตามพิกัด GPS เรียลไทม์ (watchPosition)
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('อุปกรณ์ไม่รองรับระบบ GPS');
      setIsInRange(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        
        const shopLat = currentUser?.shops?.latitude || 13.7563;
        const shopLng = currentUser?.shops?.longitude || 100.5018;
        const allowedRadius = currentUser?.shops?.radius_meters || 100;

        const dist = calculateDistance(userLat, userLng, shopLat, shopLng);
        const roundedDist = Math.round(dist);
        
        setDistance(roundedDist);

        if (roundedDist <= allowedRadius) {
          setIsInRange(true);
          setLocationStatus(`อยู่ในระยะลงเวลา (${roundedDist} ม. / ไม่เกิน ${allowedRadius} ม.)`);
        } else {
          setIsInRange(false);
          setLocationStatus(`อยู่นอกระยะร้าน! (${roundedDist} ม. / ไม่เกิน ${allowedRadius} ม.)`);
        }
      },
      (err) => {
        console.error('GPS Error:', err);
        setIsInRange(false);
        setLocationStatus('กรุณาเปิด GPS และอนุญาตสิทธิ์ Location');
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0 
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [currentUser]);

  const fetchTodayAttendance = async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', currentUser.id)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setTodayEntry(data[0]);
      } else {
        setTodayEntry(null);
      }
    } catch (err) {
      console.error('Error fetching today entry:', err);
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // ลงเวลาเข้า / ออก งาน
  const handleClockAction = async () => {
    const allowedRadius = currentUser?.shops?.radius_meters || 100;

    if (distance === null) {
      showAlert('ไม่พบตำแหน่ง GPS', 'กรุณาเปิดระบบ GPS บนอุปกรณ์เพื่อระบุตำแหน่งของคุณ', 'warning');
      return;
    }

    if (distance > allowedRadius) {
      showAlert(
        'อยู่นอกพื้นที่ลงเวลา!',
        `ตำแหน่งของคุณอยู่ห่างจากร้าน ${distance} เมตร (อนุญาตไม่เกิน ${allowedRadius} เมตร) กรุณาเข้าใกล้บริเวณร้านค้าครับ`,
        'error'
      );
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();

      if (!todayEntry) {
        const payload = {
          user_id: currentUser.id,
          created_at: now,
          status: 'present'
        };

        const shopId = currentUser?.shop_id || currentUser?.shops?.id;
        if (shopId) payload.shop_id = shopId;

        const { error } = await supabase.from('time_entries').insert([payload]);
        if (error) throw error;
        showAlert('ลงเวลาเข้างานสำเร็จ', 'ระบบได้บันทึกเวลาเข้างานของคุณเรียบร้อยแล้ว', 'success');
      } else if (!todayEntry.check_out) {
        const { error } = await supabase
          .from('time_entries')
          .update({ check_out: now })
          .eq('id', todayEntry.id);
        if (error) throw error;
        showAlert('ลงเวลาออกงานสำเร็จ', 'ระบบได้บันทึกเวลาออกงานเรียบร้อยแล้ว ขอบคุณสำหรับวันนี้ครับ!', 'success');
      } else {
        showAlert('แจ้งเตือน', 'คุณได้ลงเวลาออกงานของวันนี้ไปเรียบร้อยแล้ว', 'warning');
      }

      fetchTodayAttendance();
    } catch (err) {
      showAlert('เกิดข้อผิดพลาดในการลงเวลา', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ยื่นใบลา
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    try {
      const shopId = currentUser?.shop_id || currentUser?.shops?.id;
      const payload = {
        user_id: currentUser.id,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason,
        status: 'pending'
      };

      if (shopId) payload.shop_id = shopId;

      const { error } = await supabase.from('leaves').insert([payload]);
      if (error) throw error;

      setShowLeaveModal(false);
      setLeaveForm({
        leave_type: 'ลากิจ',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: ''
      });
      showAlert('ส่งใบลาสำเร็จ', 'คำขอลางานของคุณถูกส่งไปยังผู้ดูแลเรียบร้อยแล้ว', 'success');
    } catch (err) {
      showAlert('เกิดข้อผิดพลาดในการส่งใบลา', err.message, 'error');
    }
  };

  // ขอเบิกเงินล่วงหน้า
  const handleSubmitAdvance = async (e) => {
    e.preventDefault();
    try {
      const shopId = currentUser?.shop_id || currentUser?.shops?.id;
      const payload = {
        user_id: currentUser.id,
        amount: parseFloat(advanceForm.amount),
        reason: advanceForm.reason,
        status: 'pending'
      };

      if (shopId) payload.shop_id = shopId;

      const { error } = await supabase.from('advances').insert([payload]);
      if (error) throw error;

      setShowAdvanceModal(false);
      setAdvanceForm({ amount: '', reason: '' });
      showAlert('ส่งคำขอเบิกเงินสำเร็จ', 'คำขอเบิกเงินล่วงหน้าถูกส่งไปยังผู้ดูแลเรียบร้อยแล้ว', 'success');
    } catch (err) {
      showAlert('เกิดข้อผิดพลาดในการขอเบิกเงิน', err.message, 'error');
    }
  };

  const fullThaiDate = currentTime.toLocaleDateString('th-TH', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  const timeStr = currentTime.toLocaleTimeString('th-TH', { hour12: false });

  const formatTimeOnly = (isoStr) => {
    if (!isoStr) return '--:--';
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} น.`;
  };

  const isCheckedIn = !!todayEntry;
  const isCheckedOut = !!todayEntry?.check_out;

  // ROUTING แท็บเงินเดือน
  if (activeTab === 'payroll') {
    return (
      <EmployeePayroll 
        currentUser={currentUser} 
        selectedBranch={currentUser?.shops} 
        onBack={() => setActiveTab('home')} 
        onTabChange={(tab) => setActiveTab(tab)} 
      />
    );
  }

  // ROUTING แท็บฉัน (โปรไฟล์)
  if (activeTab === 'profile') {
    return (
      <EmployeeProfile 
        currentUser={currentUser} 
        selectedBranch={currentUser?.shops} 
        onBack={() => setActiveTab('home')} 
        onTabChange={(tab) => setActiveTab(tab)} 
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-0 sm:p-4">
      <div className="w-full max-w-sm bg-gray-50 h-screen sm:h-[720px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
        
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* TAB 1: หน้าหลัก (Home) */}
          {activeTab === 'home' && (
            <div>
              
              {/* TOP GREEN HEADER (กระชับความสูงลง) */}
              <div className="bg-[#15803d] pt-4 pb-8 px-5 text-center text-white relative rounded-b-[36px] shadow-md">
                <button
                  onClick={onLogout}
                  className="absolute top-3.5 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition active:scale-95"
                >
                  <LogOut size={16} />
                </button>

                <p className="text-xs font-medium text-emerald-100 tracking-wide">
                  {fullThaiDate}
                </p>
                
                <h1 className="text-2xl font-black font-mono tracking-wider my-0.5">
                  {timeStr}
                </h1>

                <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-medium">
                  <span className={`w-2 h-2 rounded-full ${
                    isCheckedOut ? 'bg-red-400' : isCheckedIn ? 'bg-emerald-300 animate-pulse' : 'bg-amber-400 animate-pulse'
                  }`}></span>
                  <span>
                    {isCheckedOut ? 'ออกงานเรียบร้อยแล้ว' : isCheckedIn ? 'เข้างานแล้ว' : 'ยังไม่เข้างาน'}
                  </span>
                </div>
              </div>

              {/* PROFILE CARD OVERLAY (ปรับขนาดตัวอักษรและระยะเว้น) */}
              <div className="-mt-6 mx-3.5 relative z-10 bg-white rounded-2xl p-2.5 shadow-md border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 bg-gray-100 rounded-full border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-gray-400 text-sm">
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{currentUser?.name ? currentUser.name.charAt(0) : 'U'}</span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-800 text-xs leading-tight">{currentUser?.name || 'สมชาย ใจดี'}</h3>
                    <p className="text-[10px] text-gray-400">ตำแหน่ง: {currentUser?.position || 'พนักงานทั่วไป'}</p>
                    
                    <div className="mt-0.5 inline-flex items-center space-x-1 bg-emerald-50 text-[#15803d] text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-100">
                      <Store size={11} />
                      <span>{currentUser?.shops?.shop_name || 'ร้านตัวอย่าง สาขา1'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 text-[9px] font-mono space-y-0.5 text-gray-600">
                  <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                    <ArrowRight size={11} className="text-emerald-600" />
                    <span>{currentUser?.work_start || '15:30'} น.</span>
                  </div>
                  <div className="flex items-center space-x-1 text-orange-600 font-bold border-t pt-0.5">
                    <ArrowLeft size={11} className="text-orange-500" />
                    <span>{currentUser?.work_end || '00:00'} น.</span>
                  </div>
                </div>
              </div>

              {/* กล่องแสดงเวลาเข้างาน - ออกงาน (กระชับลง) */}
              <div className="mx-3.5 mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-xl border border-emerald-100 shadow-sm flex items-center space-x-2.5">
                  <div className="w-7 h-7 bg-emerald-100 text-[#15803d] rounded-lg flex items-center justify-center shrink-0">
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-medium block">เวลาเข้างาน</span>
                    <span className="font-bold text-gray-800 font-mono text-[11px]">
                      {todayEntry ? formatTimeOnly(todayEntry.created_at) : '--:-- น.'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xl border border-orange-100 shadow-sm flex items-center space-x-2.5">
                  <div className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                    <Clock size={15} />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 font-medium block">เวลาออกงาน</span>
                    <span className="font-bold text-gray-800 font-mono text-[11px]">
                      {todayEntry?.check_out ? formatTimeOnly(todayEntry.check_out) : '--:-- น.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* GPS BANNER (ทำเป็นแถบแนวนอนบางๆ กระชับพื้นที่) */}
              <div className={`mx-3.5 mt-2 border rounded-2xl py-1.5 px-3 text-center transition-all ${
                isInRange 
                  ? 'bg-emerald-50/90 border-emerald-200' 
                  : 'bg-red-50/90 border-red-200'
              }`}>
                <div className="flex items-center justify-center space-x-1.5 text-xs">
                  <MapPin size={13} className={isInRange ? 'text-[#15803d]' : 'text-red-600'} />
                  <h4 className="font-bold text-[10px] text-gray-800 truncate">
                    ร้าน: {currentUser?.shops?.shop_name || 'ร้านกาแฟ TT'}
                  </h4>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${isInRange ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    ไม่เกิน {currentUser?.shops?.radius_meters || 100} ม.
                  </span>
                </div>
                <p className={`text-[9px] font-medium mt-0.5 ${isInRange ? 'text-emerald-600' : 'text-red-500 animate-pulse'}`}>
                  {locationStatus}
                </p>
              </div>

              {/* ปุ่มวงกลมกดลงเวลางาน (อยู่ตรงกลางเด่นชัด) */}
              <div className="my-3 flex justify-center">
                <button
                  onClick={handleClockAction}
                  disabled={loading || isCheckedOut}
                  className={`w-36 h-36 rounded-full shadow-2xl flex flex-col items-center justify-center text-white transition-all transform active:scale-95 border-4 border-white ${
                    isCheckedOut
                      ? 'bg-gray-400 cursor-not-allowed'
                      : !isInRange
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                      : isCheckedIn
                      ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30'
                      : 'bg-[#15803d] hover:bg-emerald-800 shadow-emerald-700/40'
                  }`}
                >
                  <Clock size={36} strokeWidth={2.2} className="mb-0.5" />
                  <span className="text-sm font-black tracking-wide text-center px-2">
                    {loading 
                      ? 'กำลังบันทึก...' 
                      : isCheckedOut 
                      ? 'ออกงานแล้ว' 
                      : !isInRange 
                      ? 'อยู่นอกระยะร้าน' 
                      : isCheckedIn 
                      ? 'กดลงเวลาออกงาน' 
                      : 'กดลงเวลางาน'}
                  </span>
                  <span className="text-[9px] text-emerald-100 font-light mt-0.5">
                    {isInRange ? 'สแกนพิกัด GPS สำเร็จ' : 'ระยะทางเกินกำหนด'}
                  </span>
                </button>
              </div>

              {/* ปุ่มยื่นใบลา & ขอเบิกเงิน */}
              <div className="mx-3.5 grid grid-cols-2 gap-2.5 pb-2">
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center space-x-1.5 text-gray-700 hover:bg-emerald-50/50 transition font-bold text-xs active:scale-95"
                >
                  <FileText size={16} className="text-[#15803d]" />
                  <span>ยื่นใบลา</span>
                </button>

                <button
                  onClick={() => setShowAdvanceModal(true)}
                  className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center space-x-1.5 text-gray-700 hover:bg-emerald-50/50 transition font-bold text-xs active:scale-95"
                >
                  <Banknote size={16} className="text-[#15803d]" />
                  <span>ขอเบิกเงิน</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* CUSTOM ALERT POPUP */}
        {alertModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in zoom-in duration-200">
            <div className="bg-white w-full max-w-[300px] rounded-[32px] p-6 shadow-2xl text-center space-y-3.5">
              
              {alertModal.type === 'success' && (
                <div className="w-16 h-16 bg-emerald-100 text-[#15803d] rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={40} strokeWidth={2.5} />
                </div>
              )}
              {alertModal.type === 'error' && (
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <XCircle size={40} strokeWidth={2.5} />
                </div>
              )}
              {alertModal.type === 'warning' && (
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <AlertCircle size={40} strokeWidth={2.5} />
                </div>
              )}

              <div>
                <h3 className="font-extrabold text-gray-800 text-base">{alertModal.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alertModal.message}</p>
              </div>

              <button
                onClick={() => setAlertModal({ ...alertModal, show: false })}
                className="w-full py-3 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs active:scale-95"
              >
                ตกลง
              </button>
            </div>
          </div>
        )}

        {/* MODAL ยื่นใบลา */}
        {showLeaveModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-sm">ยื่นใบลา</h3>
                </div>
                <button 
                  onClick={() => setShowLeaveModal(false)} 
                  className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-full flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitLeave} className="space-y-3.5">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">ประเภทการลา</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs"
                  >
                    <option value="ลากิจ">ลากิจ</option>
                    <option value="ลาป่วย">ลาป่วย</option>
                    <option value="ลาพักร้อน">ลาพักร้อน</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">ตั้งแต่วันที่</label>
                    <input
                      type="date"
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">ถึงวันที่</label>
                    <input
                      type="date"
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">เหตุผลการลา</label>
                  <textarea
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="ระบุเหตุผลการลากิจ / ลาป่วย..."
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs active:scale-95"
                >
                  ยื่นใบลา
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL ขอเบิกเงิน */}
        {showAdvanceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center">
                    <Banknote size={18} />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-sm">ขอเบิกเงินล่วงหน้า</h3>
                </div>
                <button 
                  onClick={() => setShowAdvanceModal(false)} 
                  className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-full flex items-center justify-center transition"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitAdvance} className="space-y-3.5">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">จำนวนเงินที่ขอเบิก (บาท)</label>
                  <input
                    type="number"
                    placeholder="เช่น 500"
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">เหตุผลความจำเป็น</label>
                  <textarea
                    rows={3}
                    value={advanceForm.reason}
                    onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                    placeholder="ระบุเหตุผลการขอเบิกเงินล่วงหน้า..."
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs active:scale-95"
                >
                  ส่งคำขอเบิกเงิน
                </button>
              </form>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <div className="absolute bottom-3 left-4 right-4 bg-white/90 backdrop-blur-md rounded-[28px] shadow-lg border border-gray-100 p-1.5 flex justify-around items-center z-30">
          
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-1.5 px-5 rounded-2xl transition ${
              activeTab === 'home'
                ? 'bg-emerald-50 text-[#15803d] font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Home size={22} className={activeTab === 'home' ? 'text-[#15803d]' : 'text-gray-400'} />
            <span className="text-[10px] mt-0.5">หน้าแรก</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex flex-col items-center py-1.5 px-5 rounded-2xl transition ${
              activeTab === 'payroll'
                ? 'bg-emerald-50 text-[#15803d] font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Wallet size={22} className={activeTab === 'payroll' ? 'text-[#15803d]' : 'text-gray-400'} />
            <span className="text-[10px] mt-0.5">เงินเดือน</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-1.5 px-5 rounded-2xl transition ${
              activeTab === 'profile'
                ? 'bg-emerald-50 text-[#15803d] font-bold'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <User size={22} className={activeTab === 'profile' ? 'text-[#15803d]' : 'text-gray-400'} />
            <span className="text-[10px] mt-0.5">ฉัน</span>
          </button>

        </div>

      </div>
    </div>
  );
}