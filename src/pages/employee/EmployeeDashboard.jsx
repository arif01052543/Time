import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import EmployeePayroll from './EmployeePayroll';
import EmployeeProfile from './EmployeeProfile';
import { 
  Clock, LogOut, MapPin, FileText, Banknote, 
  Home, Wallet, User, CheckCircle2, ArrowRight, ArrowLeft,
  Store, XCircle, AlertCircle, Coffee
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

  // ตรวจสอบวันหยุดประจำสัปดาห์
  const checkIsOffDay = () => {
    const userOffDay = currentUser?.off_day || currentUser?.shops?.default_off_day || 'ไม่มีวันหยุด';
    if (!userOffDay || userOffDay === 'ไม่มีวันหยุด' || userOffDay === 'ไม่มี') return false;

    const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const todayThai = thaiDays[currentTime.getDay()];

    return userOffDay.includes(todayThai);
  };

  const isOffDay = checkIsOffDay();

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
    if (isOffDay) {
      showAlert('วันนี้เป็นวันหยุด', 'วันนี้เป็นวันหยุดประจำสัปดาห์ของคุณ ไม่จำเป็นต้องลงเวลาเข้างานครับ', 'warning');
      return;
    }

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
    <div className="min-h-screen w-full bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {/* ส่วนเนื้อหาหลัก สามารถ Scroll ได้ */}
      <div className="flex-1 pb-24 w-full">
        
        {/* TAB 1: หน้าหลัก (Home) */}
        {activeTab === 'home' && (
          <div>
            
            {/* TOP GREEN HEADER */}
            <div className="bg-[#15803d] pt-5 pb-10 px-5 sm:px-6 text-center text-white relative rounded-b-[36px] sm:rounded-b-[48px] shadow-md w-full">
              <div className="max-w-3xl mx-auto relative">
                <button
                  onClick={onLogout}
                  className="absolute top-0 right-0 w-8 h-8 sm:w-9 sm:h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition active:scale-95 cursor-pointer"
                >
                  <LogOut size={16} />
                </button>

                <p className="text-xs sm:text-sm font-medium text-emerald-100 tracking-wide">
                  {fullThaiDate}
                </p>
                
                <h1 className="text-2xl sm:text-4xl font-black font-mono tracking-wider my-1">
                  {timeStr}
                </h1>

                <div className="inline-flex items-center space-x-1.5 px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-medium">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    isOffDay 
                      ? 'bg-indigo-300 animate-pulse'
                      : isCheckedOut 
                      ? 'bg-red-400' 
                      : isCheckedIn 
                      ? 'bg-emerald-300 animate-pulse' 
                      : 'bg-amber-400 animate-pulse'
                  }`}></span>
                  <span>
                    {isOffDay 
                      ? 'วันนี้วันหยุดของคุณ' 
                      : isCheckedOut 
                      ? 'ออกงานเรียบร้อยแล้ว' 
                      : isCheckedIn 
                      ? 'เข้างานแล้ว' 
                      : 'ยังไม่เข้างาน'}
                  </span>
                </div>
              </div>
            </div>

            {/* คอนเทนเนอร์หลักตรงกลาง */}
            <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">

              {/* PROFILE CARD OVERLAY */}
              <div className="-mt-10 relative z-10 bg-white rounded-3xl p-3.5 sm:p-5 shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 rounded-full border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-gray-400 text-base sm:text-lg">
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{currentUser?.name ? currentUser.name.charAt(0) : 'U'}</span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-gray-800 text-sm sm:text-base leading-tight">{currentUser?.name || 'สมชาย ใจดี'}</h3>
                    <p className="text-xs text-gray-400">ตำแหน่ง: {currentUser?.position || 'พนักงานทั่วไป'}</p>
                    
                    <div className="mt-1 inline-flex items-center space-x-1 bg-emerald-50 text-[#15803d] text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                      <Store size={12} />
                      <span>{currentUser?.shops?.shop_name || 'ร้านตัวอย่าง สาขา1'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-2 sm:p-2.5 rounded-xl border border-gray-100 text-xs sm:text-sm font-mono space-y-1 text-gray-600">
                  <div className="flex items-center space-x-1 text-emerald-700 font-bold">
                    <ArrowRight size={13} className="text-emerald-600" />
                    <span>{currentUser?.work_start || '15:30'} น.</span>
                  </div>
                  <div className="flex items-center space-x-1 text-orange-600 font-bold border-t border-gray-200 pt-1">
                    <ArrowLeft size={13} className="text-orange-500" />
                    <span>{currentUser?.work_end || '00:00'} น.</span>
                  </div>
                </div>
              </div>

              {/* กล่องแสดงเวลาเข้างาน - ออกงาน */}
              <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-sm flex items-center space-x-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium block">เวลาเข้างาน</span>
                    <span className="font-bold text-gray-800 font-mono text-xs sm:text-sm">
                      {todayEntry ? formatTimeOnly(todayEntry.created_at) : '--:-- น.'}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-orange-100 shadow-sm flex items-center space-x-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium block">เวลาออกงาน</span>
                    <span className="font-bold text-gray-800 font-mono text-xs sm:text-sm">
                      {todayEntry?.check_out ? formatTimeOnly(todayEntry.check_out) : '--:-- น.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* GPS BANNER */}
              <div className={`border rounded-2xl p-2.5 sm:p-3 text-center transition-all ${
                isOffDay
                  ? 'bg-indigo-50/90 border-indigo-200'
                  : isInRange 
                  ? 'bg-emerald-50/90 border-emerald-200' 
                  : 'bg-red-50/90 border-red-200'
              }`}>
                <div className="flex items-center justify-center space-x-1.5 text-xs sm:text-sm">
                  <MapPin size={15} className={isOffDay ? 'text-indigo-600' : isInRange ? 'text-[#15803d]' : 'text-red-600'} />
                  <h4 className="font-bold text-xs sm:text-sm text-gray-800 truncate">
                    ร้าน: {currentUser?.shops?.shop_name || 'ร้านกาแฟ TT'}
                  </h4>
                  <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${
                    isOffDay
                      ? 'bg-indigo-100 text-indigo-800'
                      : isInRange 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isOffDay ? 'วันหยุดพักผ่อน' : `ไม่เกิน ${currentUser?.shops?.radius_meters || 100} ม.`}
                  </span>
                </div>
                <p className={`text-[10px] sm:text-xs font-medium mt-1 ${
                  isOffDay
                    ? 'text-indigo-600 font-bold'
                    : isInRange 
                    ? 'text-emerald-600' 
                    : 'text-red-500 animate-pulse'
                }`}>
                  {isOffDay ? 'วันนี้เป็นวันหยุดประจำสัปดาห์ ไม่ต้องลงเวลาเข้างาน' : locationStatus}
                </p>
              </div>

              {/* ปุ่มวงกลมกดลงเวลางาน */}
              <div className="my-6 flex justify-center">
                <button
                  onClick={handleClockAction}
                  disabled={loading || isCheckedOut || isOffDay}
                  className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full shadow-2xl flex flex-col items-center justify-center text-white transition-all transform active:scale-95 border-4 border-white cursor-pointer ${
                    isOffDay
                      ? 'bg-indigo-600 shadow-indigo-600/30 cursor-not-allowed'
                      : isCheckedOut
                      ? 'bg-gray-400 cursor-not-allowed'
                      : !isInRange
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                      : isCheckedIn
                      ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/30'
                      : 'bg-[#15803d] hover:bg-emerald-800 shadow-emerald-700/40'
                  }`}
                >
                  {isOffDay ? (
                    <Coffee size={40} strokeWidth={2.2} className="mb-1" />
                  ) : (
                    <Clock size={40} strokeWidth={2.2} className="mb-1" />
                  )}
                  <span className="text-base sm:text-lg font-black tracking-wide text-center px-2">
                    {loading 
                      ? 'กำลังบันทึก...' 
                      : isOffDay
                      ? 'วันนี้วันหยุด'
                      : isCheckedOut 
                      ? 'ออกงานแล้ว' 
                      : !isInRange 
                      ? 'อยู่นอกระยะร้าน' 
                      : isCheckedIn 
                      ? 'กดลงเวลาออกงาน' 
                      : 'กดลงเวลางาน'}
                  </span>
                  <span className="text-[10px] sm:text-xs text-emerald-100 font-light mt-0.5">
                    {isOffDay
                      ? 'พักผ่อนให้เต็มที่ครับ'
                      : isInRange 
                      ? 'สแกนพิกัด GPS สำเร็จ' 
                      : 'ระยะทางเกินกำหนด'}
                  </span>
                </button>
              </div>

              {/* ปุ่มยื่นใบลา & ขอเบิกเงิน */}
              <div className="grid grid-cols-2 gap-3 pb-2">
                <button
                  onClick={() => setShowLeaveModal(true)}
                  className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center space-x-2 text-gray-700 hover:bg-emerald-50/50 transition font-bold text-xs sm:text-sm active:scale-95 cursor-pointer"
                >
                  <FileText size={18} className="text-[#15803d]" />
                  <span>ยื่นใบลา</span>
                </button>

                <button
                  onClick={() => setShowAdvanceModal(true)}
                  className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center space-x-2 text-gray-700 hover:bg-emerald-50/50 transition font-bold text-xs sm:text-sm active:scale-95 cursor-pointer"
                >
                  <Banknote size={18} className="text-[#15803d]" />
                  <span>ขอเบิกเงิน</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* CUSTOM ALERT POPUP */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl text-center space-y-4">
            
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
              <h3 className="font-extrabold text-gray-800 text-base sm:text-lg">{alertModal.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">{alertModal.message}</p>
            </div>

            <button
              onClick={() => setAlertModal({ ...alertModal, show: false })}
              className="w-full py-3 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs sm:text-sm active:scale-95 cursor-pointer"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* MODAL ยื่นใบลา */}
{showLeaveModal && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
    <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 shadow-2xl space-y-4 text-xs sm:text-sm">
      <div className="flex justify-between items-center border-b pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center">
            <FileText size={18} />
          </div>
          <h3 className="font-extrabold text-gray-800 text-sm sm:text-base">ยื่นใบลา</h3>
        </div>
        <button 
          onClick={() => setShowLeaveModal(false)} 
          className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-full flex items-center justify-center transition cursor-pointer"
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
            className="w-full min-w-0 p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs sm:text-sm cursor-pointer"
          >
            <option value="ลากิจ">ลากิจ</option>
            <option value="ลาป่วย">ลาป่วย</option>
            <option value="ลาพักร้อน">ลาพักร้อน</option>
          </select>
        </div>

        {/* ปรับเป็น min-w-0 และซ่อนข้อความล้นด้วย truncate */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="min-w-0">
            <label className="font-bold text-gray-700 block mb-1 truncate text-[11px] sm:text-xs">ตั้งแต่วันที่</label>
            <input
              type="date"
              value={leaveForm.start_date}
              onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
              className="w-full min-w-0 px-2 py-2 sm:p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-[11px] sm:text-xs font-medium text-center"
              required
            />
          </div>
          <div className="min-w-0">
            <label className="font-bold text-gray-700 block mb-1 truncate text-[11px] sm:text-xs">ถึงวันที่</label>
            <input
              type="date"
              value={leaveForm.end_date}
              onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
              className="w-full min-w-0 px-2 py-2 sm:p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-[11px] sm:text-xs font-medium text-center"
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
            className="w-full min-w-0 p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs sm:text-sm active:scale-95 cursor-pointer"
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
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center">
                  <Banknote size={18} />
                </div>
                <h3 className="font-extrabold text-gray-800 text-sm sm:text-base">ขอเบิกเงินล่วงหน้า</h3>
              </div>
              <button 
                onClick={() => setShowAdvanceModal(false)} 
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-full flex items-center justify-center transition cursor-pointer"
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
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-mono font-bold"
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
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs sm:text-sm active:scale-95 cursor-pointer"
              >
                ส่งคำขอเบิกเงิน
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR จัดกลางตามทุกขนาดหน้าจอ */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md rounded-[28px] shadow-xl border border-gray-100 p-1.5 flex justify-around items-center z-30">
        
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center py-1.5 px-5 rounded-2xl transition cursor-pointer ${
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
          className={`flex flex-col items-center py-1.5 px-5 rounded-2xl transition cursor-pointer ${
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
          className={`flex flex-col items-center py-1.5 px-5 rounded-2xl transition cursor-pointer ${
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
  );
}