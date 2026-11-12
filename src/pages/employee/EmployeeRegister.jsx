import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, User, CreditCard, QrCode, 
  CheckCircle2, UserPlus, Upload, Clock, LogIn
} from 'lucide-react';

export default function EmployeeRegister({ onBack, onRegisterSuccess }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false); // State ควบคุมหน้าส่งคำขอสำเร็จ

  const [formData, setFormData] = useState({
    name: '',
    pin_code: '',
    position: 'พนักงานทั่วไป',
    employment_type: 'full_time',
    shop_id: '',
    bank_name: 'กสิกรไทย',
    bank_account_no: '',
    bank_account_name: '',
    qr_code_url: '',
    avatar_url: ''
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data, error } = await supabase.from('shops').select('*');
      if (error) throw error;
      setBranches(data || []);
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, shop_id: data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [fieldName]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shop_id) {
      alert('กรุณาเลือกร้านที่ทำงานหรือสาขา');
      return;
    }
    if (formData.pin_code.length !== 4) {
      alert('กรุณากรอกรหัส PIN ให้ครบ 4 หลัก');
      return;
    }

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => String(b.id) === String(formData.shop_id));
      const defaultStart = selectedBranch?.default_work_start || '16:00';
      const defaultEnd = selectedBranch?.default_work_end || '00:00';
      const defaultOff = selectedBranch?.default_off_day || 'วันพุธ';

      const payload = {
        ...formData,
        id_card_last4: formData.pin_code,
        role: 'employee',
        status: 'pending', // ส่งคำขอไปที่แอดมินก่อน
        salary_rate: 0,
        late_penalty_rate: 0,
        work_start: defaultStart,
        work_end: defaultEnd,
        off_day: defaultOff
      };

      const { error } = await supabase.from('users').insert([payload]);
      if (error) throw error;

      setIsSubmitted(true); // แสดงหน้าส่งคำขอสำเร็จ
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลงทะเบียน: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {/* แสดงหน้าส่งคำขอสำเร็จ */}
      {isSubmitted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center animate-in fade-in zoom-in duration-200">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full space-y-5 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-[#15803d] rounded-full flex items-center justify-center shadow-inner mx-auto shrink-0">
              <CheckCircle2 size={40} className="sm:w-12 sm:h-12" strokeWidth={2.5} />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-2xl font-extrabold text-gray-800">ส่งคำขอลงทะเบียนสำเร็จ!</h2>
              <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                ข้อมูลของคุณถูกส่งไปยังแอดมินเรียบร้อยแล้ว กรุณารอแอดมินหรือเจ้าของร้านอนุมัติเข้าสู่ระบบ
              </p>
            </div>

            <div className="w-full bg-amber-50 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm text-amber-800 font-medium flex items-center justify-center space-x-2">
              <Clock size={16} className="shrink-0 text-amber-600" />
              <span className="truncate">สถานะปัจจุบัน: <strong className="font-bold">รอแอดมินตรวจสอบ</strong></span>
            </div>

            <button
              onClick={() => onRegisterSuccess ? onRegisterSuccess() : onBack()}
              className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition text-xs sm:text-sm flex items-center justify-center space-x-2 active:scale-95 cursor-pointer mt-2"
            >
              <LogIn size={18} />
              <span>กลับสู่หน้าเข้าสู่ระบบ</span>
            </button>
          </div>
        </div>
      ) : (
        /* ฟอร์มลงทะเบียนปกติ */
        <div className="flex-1 pb-10 w-full">
          
          {/* Header สีเขียวทรงโค้ง */}
          <div className="bg-[#15803d] p-4 sm:p-6 text-white rounded-b-[28px] sm:rounded-b-[40px] shadow-md sticky top-0 z-20 w-full">
            <div className="max-w-2xl mx-auto flex items-center space-x-3">
              <button
                type="button"
                onClick={onBack}
                className="w-9 h-9 sm:w-10 sm:h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm active:scale-95 cursor-pointer shrink-0"
              >
                <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-extrabold text-base sm:text-lg leading-tight truncate">ลงทะเบียนพนักงานใหม่</h1>
                <p className="text-[11px] sm:text-xs text-emerald-100 font-light truncate">
                  กรอกข้อมูลเพื่อส่งคำขออนุมัติเข้าใช้งาน
                </p>
              </div>
            </div>
          </div>

          {/* คอนเทนเนอร์ฟอร์มลงทะเบียน */}
          <div className="max-w-2xl mx-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
            <form id="register-form" onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-xs sm:text-sm w-full">
              
              {/* ข้อมูลส่วนตัว */}
              <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 space-y-3.5 w-full box-border">
                <div className="flex items-center space-x-2 text-gray-800 font-extrabold text-sm sm:text-base border-b border-gray-100 pb-2.5">
                  <User size={18} className="text-[#15803d] shrink-0" />
                  <span>ข้อมูลส่วนตัว</span>
                </div>

                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">ร้านที่ทำงาน/สาขา</label>
                  <select
                    value={formData.shop_id}
                    onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                    className="w-full min-w-0 block p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs sm:text-sm text-gray-800 truncate cursor-pointer box-border"
                    required
                  >
                    {branches.length === 0 ? (
                      <option value="">กำลังโหลดสาขา...</option>
                    ) : (
                      branches.map(b => (
                        <option key={b.id} value={b.id}>{b.shop_name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">ชื่อ - นามสกุล</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full min-w-0 block p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm box-border"
                    required
                  />
                </div>

                {/* Grid 2 คอลัมน์ ล็อกไม่ให้ขยายล้นกรอบ */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full box-border">
                  <div className="min-w-0 overflow-hidden">
                    <label className="font-bold text-gray-700 block mb-1 text-xs sm:text-sm truncate">เลขบัตรประชาชน 4 ตัวท้าย</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={formData.pin_code}
                      onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                      placeholder="1234"
                      className="w-full min-w-0 block p-2.5 sm:p-3 border rounded-xl bg-gray-50 text-center font-mono focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-bold box-border"
                      required
                    />
                  </div>

                  <div className="min-w-0 overflow-hidden">
                    <label className="font-bold text-gray-700 block mb-1 text-xs sm:text-sm truncate">ประเภทการจ้าง</label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                      className="w-full min-w-0 block p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs sm:text-sm text-gray-800 cursor-pointer box-border"
                    >
                      <option value="full_time">ประจำ</option>
                      <option value="part_time">พาร์ทไทม์</option>
                    </select>
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">ตำแหน่งงาน</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="เช่น พนักงานเสิร์ฟ, บาริสต้า"
                    className="w-full min-w-0 block p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm box-border"
                    required
                  />
                </div>

                {/* รูปโปรไฟล์ */}
                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">รูปโปรไฟล์ (ถ้ามี)</label>
                  <div className="flex items-center justify-between sm:justify-start gap-3 bg-gray-50 p-2.5 rounded-xl border border-dashed border-gray-300 w-full box-border">
                    <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center space-x-1.5 hover:bg-gray-100 transition shadow-sm shrink-0 active:scale-95">
                      <Upload size={15} className="text-emerald-600 shrink-0" />
                      <span>อัปโหลดรูป</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'avatar_url')}
                        className="hidden"
                        style={{ display: 'none' }}
                      />
                    </label>
                    {formData.avatar_url && (
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-emerald-300 shrink-0 shadow-sm">
                        <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ข้อมูลบัญชีรับเงิน */}
              <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 space-y-3.5 w-full box-border">
                <div className="flex items-center space-x-2 text-gray-800 font-extrabold text-sm sm:text-base border-b border-gray-100 pb-2.5">
                  <CreditCard size={18} className="text-[#15803d] shrink-0" />
                  <span className="truncate">ข้อมูลบัญชีรับเงิน & QR Code</span>
                </div>

                {/* Grid 2 คอลัมน์ ล็อกไม่ให้ขยายล้นกรอบ */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full box-border">
                  <div className="min-w-0 overflow-hidden">
                    <label className="font-bold text-gray-700 block mb-1 text-xs sm:text-sm truncate">ธนาคาร</label>
                    <select
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full min-w-0 block p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs sm:text-sm text-gray-800 cursor-pointer box-border"
                    >
                      <option value="กสิกรไทย">กสิกรไทย (KBANK)</option>
                      <option value="ไทยพาณิชย์">ไทยพาณิชย์ (SCB)</option>
                      <option value="กรุงเทพ">กรุงเทพ (BBL)</option>
                      <option value="กรุงไทย">กรุงไทย (KTB)</option>
                      <option value="กรุงศรี">กรุงศรี (BAY)</option>
                      <option value="ออมสิน">ออมสิน (GSB)</option>
                      <option value="พร้อมเพย์">พร้อมเพย์ (PromptPay)</option>
                    </select>
                  </div>

                  <div className="min-w-0 overflow-hidden">
                    <label className="font-bold text-gray-700 block mb-1 text-xs sm:text-sm truncate">เลขบัญชี / พร้อมเพย์</label>
                    <input
                      type="text"
                      value={formData.bank_account_no}
                      onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                      placeholder="xxx-x-xxxxx-x"
                      className="w-full min-w-0 block p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-mono box-border"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">ชื่อบัญชี</label>
                  <input
                    type="text"
                    value={formData.bank_account_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                    placeholder="นาย สมชาย ใจดี"
                    className="w-full min-w-0 block p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm box-border"
                  />
                </div>

                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">รูป QR Code รับเงินเดือน</label>
                  <div className="flex items-center justify-between sm:justify-start gap-3 bg-gray-50 p-2.5 rounded-xl border border-dashed border-gray-300 w-full box-border">
                    <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center space-x-1.5 hover:bg-gray-100 transition shadow-sm shrink-0 active:scale-95">
                      <QrCode size={15} className="text-emerald-600 shrink-0" />
                      <span>แนบรูป QR Code</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'qr_code_url')}
                        className="hidden"
                        style={{ display: 'none' }}
                      />
                    </label>
                    {formData.qr_code_url && (
                      <div className="w-10 h-10 border rounded-lg overflow-hidden bg-white shrink-0 shadow-sm">
                        <img src={formData.qr_code_url} alt="QR Code" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ปุ่มส่งคำขอลงทะเบียน */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 sm:py-4 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition text-xs sm:text-sm flex items-center justify-center space-x-2 active:scale-[0.98] cursor-pointer"
              >
                <UserPlus size={18} className="shrink-0" />
                <span>{loading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอลงทะเบียน'}</span>
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}