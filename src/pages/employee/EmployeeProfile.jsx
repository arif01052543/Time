import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, Camera, Lock, LogOut, User, CreditCard, 
  Store, Key, CheckCircle2, X, ShieldCheck, 
  Home, Wallet, QrCode, Upload, Edit3, Trash2, AlertCircle 
} from 'lucide-react';

export default function EmployeeProfile({ currentUser, selectedBranch, onBack, onTabChange, onLogout }) {
  const [userInfo, setUserInfo] = useState(currentUser);
  const [isUploading, setIsUploading] = useState(false);

  // Modal เปลี่ยน PIN
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Modal แก้ไขข้อมูลบัญชี & แนบ QR Code
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    bank_account_no: '',
    bank_account_name: '',
    qr_code_url: null
  });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Toast การแจ้งเตือน
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (currentUser?.id) {
      fetchLatestUserData();
    }
  }, [currentUser]);

  const fetchLatestUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, shops(*)')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      if (data) {
        setUserInfo(data);
        setBankForm({
          bank_name: data.bank_name || 'กสิกรไทย',
          bank_account_no: data.bank_account_no || '',
          bank_account_name: data.bank_account_name || data.name || '',
          qr_code_url: data.qr_code_url || null
        });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // เปลี่ยนรูปโปรไฟล์
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result;

        const { error } = await supabase
          .from('users')
          .update({ avatar_url: base64Image })
          .eq('id', userInfo.id);

        if (error) throw error;

        setUserInfo((prev) => ({ ...prev, avatar_url: base64Image }));
        showToast('อัปเดตรูปโปรไฟล์สำเร็จเรียบร้อย');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการเปลี่ยนรูป: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // แนบไฟล์รูป QR Code
  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBankForm((prev) => ({ ...prev, qr_code_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // บันทึกข้อมูลบัญชีธนาคาร & QR Code
  const handleSaveBankInfo = async (e) => {
    e.preventDefault();
    setIsSavingBank(true);

    try {
      const payload = {
        bank_name: bankForm.bank_name,
        bank_account_no: bankForm.bank_account_no,
        bank_account_name: bankForm.bank_account_name,
        qr_code_url: bankForm.qr_code_url
      };

      const { error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userInfo.id);

      if (error) throw error;

      setUserInfo((prev) => ({ ...prev, ...payload }));
      setShowBankModal(false);
      showToast('บันทึกข้อมูลบัญชีธนาคารและ QR Code เรียบร้อย');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึก: ' + err.message, 'error');
    } finally {
      setIsSavingBank(false);
    }
  };

  // เปลี่ยนรหัส PIN
  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (pinForm.currentPin !== String(userInfo.pin_code)) {
      setPinError('รหัส PIN เดิมไม่ถูกต้อง');
      return;
    }

    if (pinForm.newPin.length < 4) {
      setPinError('รหัส PIN ใหม่ต้องมีอย่างน้อย 4 ตัวอักษร/ตัวเลข');
      return;
    }

    if (pinForm.newPin !== pinForm.confirmPin) {
      setPinError('รหัส PIN ใหม่และการยืนยันรหัสไม่ตรงกัน');
      return;
    }

    setIsSavingPin(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ pin_code: pinForm.newPin })
        .eq('id', userInfo.id);

      if (error) throw error;

      setUserInfo((prev) => ({ ...prev, pin_code: pinForm.newPin }));
      setPinSuccess('เปลี่ยนรหัส PIN สำเร็จแล้ว');
      setTimeout(() => {
        setShowPinModal(false);
        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
        setPinSuccess('');
      }, 1500);
    } catch (err) {
      setPinError('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-0 sm:p-4">
      <div className="w-full max-w-sm bg-gray-50 h-screen sm:h-[720px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
        
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Header */}
          <div className="bg-[#15803d] pt-6 pb-14 px-5 text-white rounded-b-[40px] shadow-md relative sticky top-0 z-20">
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="font-extrabold text-base tracking-wide">โปรไฟล์ของฉัน</h1>
              <div className="w-10"></div>
            </div>
          </div>

          {/* Toast Notification */}
          {toast.show && (
            <div className={`mx-4 mt-3 p-3 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-sm animate-in fade-in zoom-in duration-200 ${
              toast.type === 'success' ? 'bg-emerald-100 text-[#15803d] border border-emerald-300' : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{toast.message}</span>
            </div>
          )}

          {/* PROFILE AVATAR OVERLAY CARD */}
          <div className="-mt-12 mx-4 relative z-20 bg-white rounded-3xl p-5 shadow-lg border border-gray-100 text-center space-y-3">
            <div className="relative w-24 h-24 mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-emerald-500 shadow-md overflow-hidden flex items-center justify-center text-3xl font-extrabold text-gray-400">
                {userInfo?.avatar_url ? (
                  <img src={userInfo.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{userInfo?.name ? userInfo.name.charAt(0) : 'U'}</span>
                )}
              </div>

              <label className="absolute bottom-0 right-0 bg-[#15803d] hover:bg-emerald-800 text-white p-2.5 rounded-full shadow-md cursor-pointer transition transform active:scale-95 border-2 border-white">
                <Camera size={15} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            <div>
              <h2 className="font-extrabold text-gray-800 text-lg">{userInfo?.name || 'พนักงาน'}</h2>
              <span className="inline-block mt-0.5 px-3 py-1 bg-emerald-50 text-[#15803d] text-[11px] font-bold rounded-full border border-emerald-200/80">
                {userInfo?.position || 'พนักงานทั่วไป'}
              </span>
            </div>
          </div>

          <div className="p-4 space-y-3.5">

            {/* 1. ข้อมูลการทำงาน */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center space-x-2 text-[#15803d] font-extrabold text-xs border-b pb-2">
                <Store size={16} />
                <span>ข้อมูลการทำงาน & สาขา</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400">สาขาที่สังกัด:</span>
                  <span className="font-bold text-gray-800">
                    {userInfo?.shops?.shop_name || selectedBranch?.shop_name || 'ร้านกาแฟ TT'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400">เวลาเข้า - ออกงาน:</span>
                  <span className="font-bold font-mono text-emerald-700">
                    {userInfo?.work_start || '15:30'} น. - {userInfo?.work_end || '00:00'} น.
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400">วันหยุดประจำสัปดาห์:</span>
                  <span className="font-bold text-purple-700">
                    {userInfo?.off_day || 'ไม่มีวันหยุด'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400">อัตราค่าจ้าง:</span>
                  <span className="font-extrabold text-gray-800 font-mono">
                    ฿{userInfo?.salary_rate || 0} / วัน
                  </span>
                </div>
              </div>
            </div>

            {/* 2. ข้อมูลบัญชีรับเงิน (เพิ่มปุ่มแก้ไข & แสดง QR Code) */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-2 text-[#15803d] font-extrabold text-xs">
                  <CreditCard size={16} />
                  <span>ข้อมูลบัญชีรับเงิน</span>
                </div>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="flex items-center space-x-1 text-[11px] font-bold text-[#15803d] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl transition"
                >
                  <Edit3 size={13} />
                  <span>แก้ไข</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400">ธนาคาร:</span>
                  <span className="font-bold text-emerald-800">{userInfo?.bank_name || 'ไม่ระบุ'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400">เลขบัญชี/พร้อมเพย์:</span>
                  <span className="font-bold font-mono text-gray-800">{userInfo?.bank_account_no || 'ไม่ระบุ'}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-400">ชื่อบัญชี:</span>
                  <span className="font-semibold text-gray-700">{userInfo?.bank_account_name || userInfo?.name}</span>
                </div>

                {/* ส่วนแสดง QR Code ถ้ามี */}
                <div className="pt-2 text-center">
                  <span className="text-[10px] text-gray-400 block mb-1.5 font-medium">รูป QR Code สำหรับรับเงิน</span>
                  {userInfo?.qr_code_url ? (
                    <div className="w-28 h-28 bg-gray-50 p-1.5 rounded-2xl border mx-auto shadow-sm overflow-hidden">
                      <img src={userInfo.qr_code_url} alt="QR Code" className="w-full h-full object-contain rounded-xl" />
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-2xl border text-[10px] text-gray-400 italic">
                      ยังไม่ได้แนบรูป QR Code รับเงิน
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ความปลอดภัย */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-2.5">
              <div className="flex items-center space-x-2 text-[#15803d] font-extrabold text-xs border-b pb-2">
                <ShieldCheck size={16} />
                <span>ความปลอดภัย & การจัดการ</span>
              </div>

              <button
                onClick={() => setShowPinModal(true)}
                className="w-full p-3 rounded-2xl bg-gray-50 hover:bg-emerald-50/60 border border-gray-100 flex items-center justify-between text-xs transition group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center">
                    <Key size={18} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-gray-800 group-hover:text-emerald-800">เปลี่ยนรหัส PIN เข้างาน</h4>
                    <p className="text-[10px] text-gray-400">รหัสปัจจุบัน: #{userInfo?.pin_code || '1234'}</p>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-white px-2.5 py-1 rounded-xl border border-gray-200">
                  แก้ไข
                </span>
              </button>

              <button
                onClick={onLogout}
                className="w-full p-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-100 flex items-center justify-between text-xs transition text-red-600 font-bold active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                    <LogOut size={18} />
                  </div>
                  <span>ออกจากระบบ</span>
                </div>
              </button>
            </div>

          </div>

        </div>

        {/* ==================== MODAL แก้ไขข้อมูลบัญชี & QR CODE ==================== */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center">
                    <CreditCard size={18} />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-sm">แก้ไขข้อมูลบัญชีรับเงิน</h3>
                </div>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold transition"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveBankInfo} className="space-y-3.5">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">เลือกธนาคาร</label>
                  <select
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs"
                  >
                    <option value="กสิกรไทย">กสิกรไทย (KBANK)</option>
                    <option value="ไทยพาณิชย์">ไทยพาณิชย์ (SCB)</option>
                    <option value="กรุงไทย">กรุงไทย (KTB)</option>
                    <option value="กรุงเทพ">กรุงเทพ (BBL)</option>
                    <option value="กรุงศรีอยุธยา">กรุงศรีอยุธยา (BAY)</option>
                    <option value="ออมสิน">ออมสิน (GSB)</option>
                    <option value="พร้อมเพย์">พร้อมเพย์ (PromptPay)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">เลขที่บัญชี / เบอร์พร้อมเพย์</label>
                  <input
                    type="text"
                    placeholder="เช่น 020-x-xxxxx-x"
                    value={bankForm.bank_account_no}
                    onChange={(e) => setBankForm({ ...bankForm, bank_account_no: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 font-mono focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">ชื่อบัญชี</label>
                  <input
                    type="text"
                    placeholder="ชื่อ-นามสกุล เจ้าของบัญชี"
                    value={bankForm.bank_account_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_account_name: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-semibold"
                    required
                  />
                </div>

                {/* อัปโหลด QR Code */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-gray-700 block">แนบรูป QR Code สแกนจ่ายเงิน</label>
                    {bankForm.qr_code_url && (
                      <button
                        type="button"
                        onClick={() => setBankForm({ ...bankForm, qr_code_url: null })}
                        className="text-red-500 hover:text-red-700 text-[10px] flex items-center space-x-0.5"
                      >
                        <Trash2 size={12} />
                        <span>ลบรูป</span>
                      </button>
                    )}
                  </div>

                  {bankForm.qr_code_url ? (
                    <div className="border border-emerald-200 rounded-2xl p-2 bg-emerald-50/40 text-center">
                      <img
                        src={bankForm.qr_code_url}
                        alt="QR Code Preview"
                        className="w-32 h-32 object-contain mx-auto rounded-xl shadow-sm bg-white p-1"
                      />
                      <span className="text-[10px] text-emerald-700 font-bold block mt-1">✓ เลือกรูป QR Code แล้ว</span>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center bg-gray-50 cursor-pointer transition group">
                      <QrCode size={24} className="text-gray-400 group-hover:text-emerald-600 mb-1" />
                      <span className="text-xs font-bold text-gray-600 group-hover:text-emerald-800">คลิกเพื่ออัปโหลด QR Code</span>
                      <span className="text-[10px] text-gray-400">รองรับไฟล์ JPG, PNG</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSavingBank}
                  className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs active:scale-95 disabled:bg-gray-400 mt-2"
                >
                  {isSavingBank ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบัญชี'}
                </button>
              </form>

            </div>
          </div>
        )}

        {/* ==================== MODAL เปลี่ยนรหัส PIN ==================== */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl space-y-4 text-xs">
              
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center">
                    <Lock size={18} />
                  </div>
                  <h3 className="font-extrabold text-gray-800 text-sm">เปลี่ยนรหัส PIN เข้าใช้งาน</h3>
                </div>
                <button
                  onClick={() => setShowPinModal(false)}
                  className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold transition"
                >
                  <X size={16} />
                </button>
              </div>

              {pinError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold flex items-center space-x-1.5">
                  <AlertCircle size={15} />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 size={15} />
                  <span>{pinSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePin} className="space-y-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">รหัส PIN เดิม</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="ป้อน PIN เดิม"
                    value={pinForm.currentPin}
                    onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 text-center font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">รหัส PIN ใหม่</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="ป้อน PIN ใหม่ (4-6 ตัว)"
                    value={pinForm.newPin}
                    onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 text-center font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">ยืนยันรหัส PIN ใหม่</label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="ป้อน PIN ใหม่ อีกครั้ง"
                    value={pinForm.confirmPin}
                    onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 text-center font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingPin}
                  className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs active:scale-95 disabled:bg-gray-400 mt-2"
                >
                  {isSavingPin ? 'กำลังบันทึก...' : 'บันทึกรหัส PIN ใหม่'}
                </button>
              </form>

            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR */}
        <div className="absolute bottom-3 left-4 right-4 bg-white/90 backdrop-blur-md rounded-[28px] shadow-lg border border-gray-100 p-1.5 flex justify-around items-center z-30">
          <button
            onClick={() => onTabChange ? onTabChange('home') : onBack()}
            className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition text-gray-400 hover:text-gray-600"
          >
            <Home size={20} className="text-gray-400" />
            <span className="text-[10px] mt-0.5">หน้าแรก</span>
          </button>

          <button
            onClick={() => onTabChange ? onTabChange('payroll') : onBack()}
            className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition text-gray-400 hover:text-gray-600"
          >
            <Wallet size={20} className="text-gray-400" />
            <span className="text-[10px] mt-0.5">เงินเดือน</span>
          </button>

          <button
            className="flex flex-col items-center py-1.5 px-4 rounded-2xl transition bg-emerald-50 text-[#15803d] font-bold"
          >
            <User size={20} className="text-[#15803d]" />
            <span className="text-[10px] mt-0.5">ฉัน</span>
          </button>
        </div>

      </div>
    </div>
  );
}