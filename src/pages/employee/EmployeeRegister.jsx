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
    if (formData.pin_code.length !== 4) {
      alert('กรุณากรอกรหัส PIN ให้ครบ 4 หลัก');
      return;
    }

    setLoading(true);
    try {
      const selectedBranch = branches.find(b => b.id === formData.shop_id);
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
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-0 sm:p-4">
      <div className="w-full max-w-sm bg-gray-50 h-screen sm:h-[720px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
        
        {/* แสดงหน้าส่งคำขอสำเร็จ */}
        {isSubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 bg-white animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-emerald-100 text-[#15803d] rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 size={50} strokeWidth={2.5} />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-gray-800">ส่งคำขอลงทะเบียนสำเร็จ!</h2>
              <p className="text-xs text-gray-500 max-w-[240px] mx-auto leading-relaxed">
                ข้อมูลของคุณถูกส่งไปยังแอดมินเรียบร้อยแล้ว กรุณารอแอดมินหรือเจ้าของร้านอนุมัติเข้าสู่ระบบ
              </p>
            </div>

            <div className="w-full bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-[11px] text-amber-800 font-medium flex items-center justify-center space-x-2">
              <Clock size={16} className="shrink-0 text-amber-600" />
              <span>สถานะปัจจุบัน: <strong className="font-bold">รอแอดมินตรวจสอบ</strong></span>
            </div>

            <button
              onClick={() => onRegisterSuccess ? onRegisterSuccess() : onBack()}
              className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition text-sm flex items-center justify-center space-x-2 active:scale-95 mt-4"
            >
              <LogIn size={18} />
              <span>กลับสู่หน้าเข้าสู่ระบบ</span>
            </button>
          </div>
        ) : (
          /* ฟอร์มลงทะเบียนปกติ */
          <div className="flex-1 overflow-y-auto pb-6">
            
            {/* Header สีเขียวทรงโค้ง */}
            <div className="bg-[#15803d] p-5 text-white rounded-b-[32px] shadow-md sticky top-0 z-20">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm active:scale-95"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="font-extrabold text-base leading-tight">ลงทะเบียนพนักงานใหม่</h1>
                  <p className="text-[11px] text-emerald-100 font-light">
                    กรอกข้อมูลเพื่อส่งคำขออนุมัติเข้าใช้งาน
                  </p>
                </div>
              </div>
            </div>

            <form id="register-form" onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
              
              {/* ข้อมูลส่วนตัว */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center space-x-2 text-gray-800 font-extrabold text-sm border-b border-gray-50 pb-2">
                  <User size={16} className="text-[#15803d]" />
                  <span>ข้อมูลส่วนตัว</span>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">สาขา / ร้านที่ทำงาน</label>
                  <select
                    value={formData.shop_id}
                    onChange={(e) => setFormData({ ...formData, shop_id: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs text-gray-800 truncate"
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

                <div>
                  <label className="font-bold text-gray-700 block mb-1">ชื่อ - นามสกุล</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1 text-[11px] truncate">PIN เข้างาน (4 หลัก)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={formData.pin_code}
                      onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                      placeholder="1234"
                      className="w-full p-2.5 border rounded-xl bg-gray-50 text-center font-mono focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1 text-[11px] truncate">ประเภทการจ้าง</label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs text-gray-800"
                    >
                      <option value="full_time">ประจำ / รายวัน</option>
                      <option value="part_time">พาร์ทไทม์</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">ตำแหน่งงาน</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="เช่น พนักงานเสิร์ฟ, บาริสต้า"
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                    required
                  />
                </div>

                {/* รูปโปรไฟล์ */}
                <div>
                  <label className="font-bold text-gray-700 block mb-1">รูปโปรไฟล์ (ถ้ามี)</label>
                  <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-xl border border-dashed border-gray-300">
                    <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 hover:bg-gray-100 transition shadow-sm">
                      <Upload size={14} className="text-emerald-600" />
                      <span>อัปโหลดรูป</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'avatar_url')}
                        className="hidden"
                      />
                    </label>
                    {formData.avatar_url && (
                      <div className="w-8 h-8 rounded-full overflow-hidden border">
                        <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ข้อมูลบัญชีรับเงิน */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center space-x-2 text-gray-800 font-extrabold text-sm border-b border-gray-50 pb-2">
                  <CreditCard size={16} className="text-[#15803d]" />
                  <span>ข้อมูลบัญชีรับเงิน & QR Code</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1 text-[11px] truncate">ธนาคาร</label>
                    <select
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs text-gray-800"
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

                  <div>
                    <label className="font-bold text-gray-700 block mb-1 text-[11px] truncate">เลขบัญชี / พร้อมเพย์</label>
                    <input
                      type="text"
                      value={formData.bank_account_no}
                      onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                      placeholder="xxx-x-xxxxx-x"
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">ชื่อบัญชี</label>
                  <input
                    type="text"
                    value={formData.bank_account_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                    placeholder="นาย สมชาย ใจดี"
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">รูป QR Code รับเงินเงินเดือน</label>
                  <div className="flex items-center space-x-3 bg-gray-50 p-2 rounded-xl border border-dashed border-gray-300">
                    <label className="cursor-pointer bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold text-xs flex items-center space-x-1 hover:bg-gray-100 transition shadow-sm">
                      <QrCode size={14} className="text-emerald-600" />
                      <span>แนบรูป QR Code</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'qr_code_url')}
                        className="hidden"
                      />
                    </label>
                    {formData.qr_code_url && (
                      <div className="w-9 h-9 border rounded-lg overflow-hidden bg-white shrink-0">
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
                className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition text-sm flex items-center justify-center space-x-2 active:scale-[0.98]"
              >
                <UserPlus size={18} />
                <span>{loading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอลงทะเบียน'}</span>
              </button>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}