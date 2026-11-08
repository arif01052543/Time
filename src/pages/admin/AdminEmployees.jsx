import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, UserPlus, Briefcase, Clock, 
  Edit3, Trash2, X, Save, QrCode, CreditCard,
  UserCheck, UserX, Check, AlertCircle,
  Home, Users, Calculator, Settings 
} from 'lucide-react';

export default function AdminEmployees({ selectedBranch, onBack, onTabChange }) {
  const [employees, setEmployees] = useState([]);
  const [filterType, setFilterType] = useState('pending'); // 'pending', 'full_time', 'part_time'
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  
  const emptyForm = {
    name: '',
    pin_code: '',
    position: '',
    employment_type: 'full_time',
    salary_rate: '',
    work_start: '16:00',
    work_end: '00:00',
    off_day: 'ไม่มีวันหยุด',
    late_penalty_rate: '0',
    bank_name: 'กสิกรไทย',
    bank_account_no: '',
    bank_account_name: '',
    qr_code_url: '',
    avatar_url: '',
    status: 'approved'
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    fetchEmployees();
  }, [selectedBranch]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase.from('users').select('*').eq('role', 'employee');
      if (selectedBranch?.id) {
        query = query.eq('shop_id', selectedBranch.id);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingEmp(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const handleOpenEditModal = (emp) => {
    setEditingEmp(emp);
    setFormData({
      name: emp.name || '',
      pin_code: emp.pin_code || '',
      position: emp.position || '',
      employment_type: emp.employment_type === 'part_time' ? 'part_time' : 'full_time',
      salary_rate: emp.salary_rate || '',
      work_start: emp.work_start || '16:00',
      work_end: emp.work_end || '00:00',
      off_day: emp.off_day || 'ไม่มีวันหยุด',
      late_penalty_rate: emp.late_penalty_rate ?? '0',
      bank_name: emp.bank_name || 'กสิกรไทย',
      bank_account_no: emp.bank_account_no || '',
      bank_account_name: emp.bank_account_name || '',
      qr_code_url: emp.qr_code_url || '',
      avatar_url: emp.avatar_url || '',
      status: 'approved' // เมื่อแอดมินแก้ไข/อนุมัติ จะปรับเป็น approved
    });
    setShowModal(true);
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        salary_rate: parseFloat(formData.salary_rate) || 0,
        late_penalty_rate: parseFloat(formData.late_penalty_rate) || 0,
        id_card_last4: formData.pin_code,
        shop_id: selectedBranch?.id,
        role: 'employee',
        status: 'approved' // อนุมัติให้อนุมัติเข้าใช้งานได้
      };

      if (editingEmp) {
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', editingEmp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('users')
          .insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  // ปฏิเสธคำขอลงทะเบียน
  const handleReject = async (id, name) => {
    if (!confirm(`คุณต้องการปฏิเสธคำขอลงทะเบียนของ "${name}" ใช่หรือไม่?`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`คุณต้องการลบพนักงาน "${name}" ออกจากระบบใช่หรือไม่?`)) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const pendingEmps = employees.filter(e => e.status === 'pending');
  const fullTimeEmps = employees.filter(e => e.status !== 'pending' && (e.employment_type === 'full_time' || e.employment_type === 'monthly' || e.employment_type === 'daily'));
  const partTimeEmps = employees.filter(e => e.status !== 'pending' && e.employment_type === 'part_time');

  const displayedEmps = 
    filterType === 'pending' ? pendingEmps :
    filterType === 'full_time' ? fullTimeEmps : partTimeEmps;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-0 sm:p-4">
      <div className="w-full max-w-sm bg-gray-50 h-screen sm:h-[720px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
        
        {/* ส่วนเนื้อหาภายใน Scroll ได้ */}
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Header สีเขียว */}
          <div className="bg-[#15803d] p-5 text-white rounded-b-[32px] shadow-md sticky top-0 z-20">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <button
                  onClick={onBack}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="font-extrabold text-base leading-tight">จัดการพนักงาน</h1>
                  <p className="text-[11px] text-emerald-100 font-light">
                    ชื่อร้าน: {selectedBranch?.shop_name || 'สาขาหลัก'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleOpenAddModal}
                className="bg-white text-[#15803d] hover:bg-emerald-50 text-xs font-bold px-3 py-2 rounded-2xl flex items-center space-x-1 shadow-md transition active:scale-95"
              >
                <UserPlus size={15} />
                <span>เพิ่มพนักงาน</span>
              </button>
            </div>
          </div>

          {/* รายชื่อพนักงาน */}
          <div className="p-4 space-y-3">
            
            {/* Filter Tabs 3 หมวด (รออนุมัติ / ประจำ / พาร์ทไทม์) */}
            <div className="grid grid-cols-3 gap-1 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm text-center">
              <button
                onClick={() => setFilterType('pending')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition ${
                  filterType === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Clock size={13} />
                <span>รออนุมัติ ({pendingEmps.length})</span>
              </button>

              <button
                onClick={() => setFilterType('full_time')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition ${
                  filterType === 'full_time'
                    ? 'bg-emerald-50 text-[#15803d] border border-emerald-200'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Briefcase size={13} />
                <span>ประจำ ({fullTimeEmps.length})</span>
              </button>

              <button
                onClick={() => setFilterType('part_time')}
                className={`py-2 px-1 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition ${
                  filterType === 'part_time'
                    ? 'bg-emerald-50 text-[#15803d] border border-emerald-200'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Clock size={13} />
                <span>พาร์ทไทม์ ({partTimeEmps.length})</span>
              </button>
            </div>

            {/* การ์ดพนักงาน */}
            <div className="space-y-3 pt-1">
              {loading ? (
                <div className="text-center py-10 text-xs text-gray-400">กำลังโหลดข้อมูล...</div>
              ) : displayedEmps.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">ไม่พบรายชื่อพนักงานในหมวดนี้</div>
              ) : (
                displayedEmps.map((emp) => (
                  <div
                    key={emp.id}
                    className={`bg-white rounded-3xl p-4 shadow-sm border transition relative overflow-hidden space-y-3 ${
                      emp.status === 'pending' ? 'border-amber-300 ring-1 ring-amber-300/40' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center font-bold text-base border overflow-hidden shrink-0">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{emp.name ? emp.name.charAt(0) : 'U'}</span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-gray-800 text-sm leading-none">{emp.name}</h3>
                            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                              #{emp.pin_code || '----'}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-emerald-600">
                            {emp.position || 'พนักงานเสิร์ฟ'}
                          </p>

                          {emp.status !== 'pending' && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                ฿{emp.salary_rate} /{emp.employment_type === 'part_time' ? 'ชม.' : 'วัน'}
                              </span>

                              <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                                กะ {emp.work_start || '16:00'} - {emp.work_end || '00:00'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {emp.status !== 'pending' && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(emp)}
                            className="w-9 h-9 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center transition"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            onClick={() => handleDelete(emp.id, emp.name)}
                            className="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-full flex items-center justify-center transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ข้อมูลบัญชีธนาคาร */}
                    {emp.bank_name && (
                      <div className="bg-gray-50 p-2.5 rounded-2xl border border-gray-100 text-[11px] text-gray-600 flex justify-between items-center">
                        <span>รับเงินผ่าน: <strong className="font-bold text-emerald-800">{emp.bank_name}</strong></span>
                        <span className="font-mono text-gray-500">{emp.bank_account_no}</span>
                      </div>
                    )}

                    {/* ปุ่มอนุมัติสำหรับคำขอใหม่ (Pending) */}
                    {emp.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                        <button
                          onClick={() => handleReject(emp.id, emp.name)}
                          className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs flex items-center justify-center space-x-1 border border-red-200 transition"
                        >
                          <UserX size={15} />
                          <span>ปฏิเสธคำขอ</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="py-2.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1 shadow-md transition active:scale-95"
                        >
                          <UserCheck size={15} />
                          <span>ตรวจข้อมูล & อนุมัติ</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ==================== POPUP MODAL (อนุมัติ / แก้ไข) ==================== */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
              
              <div className="p-4 px-5 border-b flex justify-between items-center bg-white shrink-0">
                <h3 className="font-bold text-gray-800 text-base">
                  {editingEmp?.status === 'pending' ? 'ตั้งค่า & อนุมัติพนักงานใหม่' : editingEmp ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form id="emp-form" onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">ชื่อ - นามสกุล</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">รหัส PIN (4 หลัก)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={formData.pin_code}
                      onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                      className="w-full p-3 border rounded-xl bg-gray-50 text-center font-mono focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">ตำแหน่งงาน</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100">
                  <div>
                    <label className="font-bold text-emerald-800 block mb-1">ประเภทการจ้าง</label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                      className="w-full p-2.5 border rounded-xl bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs"
                    >
                      <option value="full_time">ประจำ</option>
                      <option value="part_time">พาร์ทไทม์</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-emerald-800 block mb-1">อัตราค่าจ้าง (บาท)</label>
                    <input
                      type="number"
                      value={formData.salary_rate}
                      onChange={(e) => setFormData({ ...formData, salary_rate: e.target.value })}
                      placeholder="400"
                      className="w-full p-2.5 border rounded-xl bg-white font-mono focus:outline-none focus:border-emerald-600 text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">เวลาเข้างาน (กะ)</label>
                    <input
                      type="time"
                      value={formData.work_start}
                      onChange={(e) => setFormData({ ...formData, work_start: e.target.value })}
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">เวลาออกงาน (กะ)</label>
                    <input
                      type="time"
                      value={formData.work_end}
                      onChange={(e) => setFormData({ ...formData, work_end: e.target.value })}
                      className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">วันหยุดประจำสัปดาห์</label>
                    <select
                      value={formData.off_day}
                      onChange={(e) => setFormData({ ...formData, off_day: e.target.value })}
                      className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs"
                    >
                      <option value="ไม่มีวันหยุด">ไม่มีวันหยุด</option>
                      <option value="จันทร์">จันทร์</option>
                      <option value="อังคาร">อังคาร</option>
                      <option value="พุธ">พุธ</option>
                      <option value="พฤหัสบดี">พฤหัสบดี</option>
                      <option value="ศุกร์">ศุกร์</option>
                      <option value="เสาร์">เสาร์</option>
                      <option value="อาทิตย์">อาทิตย์</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">หักมาสาย (บาท/นาที)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.late_penalty_rate}
                      onChange={(e) => setFormData({ ...formData, late_penalty_rate: e.target.value })}
                      placeholder="1"
                      className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                    />
                  </div>
                </div>

                {/* ข้อมูลธนาคาร */}
                <div className="border-t pt-3 space-y-3">
                  <div className="flex items-center space-x-1.5 text-gray-800 font-bold text-xs">
                    <CreditCard size={15} className="text-emerald-600" />
                    <span>ข้อมูลบัญชีรับเงิน & QR Code</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">ธนาคาร</label>
                      <select
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs"
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
                      <label className="font-bold text-gray-700 block mb-1">เลขที่บัญชี / พร้อมเพย์</label>
                      <input
                        type="text"
                        value={formData.bank_account_no}
                        onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                        className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">ชื่อบัญชี</label>
                    <input
                      type="text"
                      value={formData.bank_account_name}
                      onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                      className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                    />
                  </div>
                </div>

              </form>

              <div className="p-4 bg-gray-50 border-t shrink-0">
                <button
                  type="submit"
                  form="emp-form"
                  className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition text-sm flex items-center justify-center space-x-1.5 active:scale-[0.98]"
                >
                  <Save size={18} />
                  <span>{editingEmp?.status === 'pending' ? 'ยืนยันอนุมัติพนักงาน' : 'บันทึกข้อมูลพนักงาน'}</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-3 left-4 right-4 bg-white/90 backdrop-blur-md rounded-[28px] shadow-lg border border-gray-100 p-1.5 flex justify-around items-center z-30">
          <button
            onClick={() => onTabChange ? onTabChange('home') : onBack()}
            className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600"
          >
            <Home size={20} className="text-gray-400" />
            <span className="text-[10px] mt-0.5">หน้าแรก</span>
          </button>

          <button
            className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition bg-emerald-50 text-[#15803d] font-bold"
          >
            <Users size={20} className="text-[#15803d]" />
            <span className="text-[10px] mt-0.5">พนักงาน</span>
          </button>

          <button
            onClick={() => onTabChange ? onTabChange('payroll') : onBack()}
            className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600"
          >
            <Calculator size={20} className="text-gray-400" />
            <span className="text-[10px] mt-0.5">เงินเดือน</span>
          </button>

          <button
            onClick={() => onTabChange ? onTabChange('settings') : onBack()}
            className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600"
          >
            <Settings size={20} className="text-gray-400" />
            <span className="text-[10px] mt-0.5">ตั้งค่า</span>
          </button>
        </div>

      </div>
    </div>
  );
}