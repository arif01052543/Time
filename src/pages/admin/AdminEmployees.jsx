import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, UserPlus, Briefcase, Clock, 
  Edit3, Trash2, X, Save, CreditCard,
  UserCheck, UserX, Image, Link2, Check,
  Home, Users, Calculator, Settings 
} from 'lucide-react';

export default function AdminEmployees({ selectedBranch, onBack, onTabChange }) {
  const [employees, setEmployees] = useState([]);
  const [filterType, setFilterType] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  
  const emptyForm = {
    name: '',
    pin_code: '',
    position: 'พนักงานเสิร์ฟ',
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
    if (!selectedBranch?.id) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .eq('shop_id', selectedBranch.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  // คัดลอกลิงก์สมัครพนักงานเฉพาะสาขานี้
  const handleCopyInviteLink = () => {
    if (!selectedBranch?.id) return;
    const inviteUrl = `${window.location.origin}/?shop=${selectedBranch.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
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
      position: emp.position || 'พนักงานเสิร์ฟ',
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
      status: 'approved'
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
    if (!selectedBranch?.id) {
      alert('ไม่พบข้อมูลสาขา กรุณารีเฟรชหน้าจอ');
      return;
    }

    try {
      const cleanPin = formData.pin_code.trim();

      let pinCheckQuery = supabase
        .from('users')
        .select('id')
        .eq('pin_code', cleanPin);

      if (editingEmp?.id) {
        pinCheckQuery = pinCheckQuery.neq('id', editingEmp.id);
      }

      const { data: duplicateUsers, error: pinErr } = await pinCheckQuery;
      if (pinErr) throw pinErr;

      if (duplicateUsers && duplicateUsers.length > 0) {
        alert(`รหัส PIN "${cleanPin}" ถูกใช้งานในระบบแล้ว กรุณาตั้งรหัส 4 หลักอื่น`);
        return;
      }

      const payload = {
        ...formData,
        pin_code: cleanPin,
        salary_rate: parseFloat(formData.salary_rate) || 0,
        late_penalty_rate: parseFloat(formData.late_penalty_rate) || 0,
        id_card_last4: cleanPin || '0000',
        shop_id: selectedBranch.id,
        role: 'employee',
        status: 'approved'
      };

      if (editingEmp) {
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', editingEmp.id)
          .eq('shop_id', selectedBranch.id);
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
      alert(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${err.message}`);
    }
  };

  const handleReject = async (id, name) => {
    if (!confirm(`คุณต้องการปฏิเสธคำขอลงทะเบียนของ "${name}" ใช่หรือไม่?`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'rejected' })
        .eq('id', id)
        .eq('shop_id', selectedBranch.id);

      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการปฏิเสธคำขอ: ${err.message}`);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`คุณต้องการลบพนักงาน "${name}" ออกจากระบบใช่หรือไม่?`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
        .eq('shop_id', selectedBranch.id);

      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      alert(`เกิดข้อผิดพลาดในการลบข้อมูล: ${err.message}`);
    }
  };

  const pendingEmps = employees.filter(e => e.status === 'pending');
  const fullTimeEmps = employees.filter(e => e.status !== 'pending' && (e.employment_type === 'full_time' || e.employment_type === 'monthly' || e.employment_type === 'daily'));
  const partTimeEmps = employees.filter(e => e.status !== 'pending' && e.employment_type === 'part_time');

  const displayedEmps = 
    filterType === 'pending' ? pendingEmps :
    filterType === 'full_time' ? fullTimeEmps : partTimeEmps;

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {/* ส่วนเนื้อหาหลัก สามารถ Scroll ได้ */}
      <div className="flex-1 pb-24 w-full">
        
        {/* Header สีเขียวทรงโค้ง */}
        <div className="bg-[#15803d] p-5 sm:p-6 text-white rounded-b-[32px] sm:rounded-b-[40px] shadow-md sticky top-0 z-20 w-full">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm cursor-pointer"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg leading-tight">จัดการพนักงาน</h1>
                <p className="text-[11px] sm:text-xs text-emerald-100 font-light">
                  ชื่อร้าน: {selectedBranch?.shop_name || 'สาขาหลัก'}
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="bg-white text-[#15803d] hover:bg-emerald-50 text-xs sm:text-sm font-bold px-3.5 py-2 sm:py-2.5 rounded-2xl flex items-center space-x-1.5 shadow-md transition active:scale-95 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>เพิ่มพนักงาน</span>
            </button>
          </div>
        </div>

        {/* รายชื่อพนักงาน และ ฟิลเตอร์ */}
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
          
          {/* แถบคัดลอกลิงก์สมัครพนักงานเฉพาะสาขา */}
          {selectedBranch?.id && (
            <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-emerald-900">
                  ลิงก์ลงทะเบียนพนักงานใหม่ (เฉพาะสาขานี้)
                </p>
                <p className="text-[11px] text-emerald-700 truncate font-mono mt-0.5">
                  รหัสร้าน: {selectedBranch.id}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition active:scale-95 cursor-pointer shadow-sm ${
                  copiedLink
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#15803d] hover:bg-emerald-800 text-white'
                }`}
              >
                {copiedLink ? <Check size={15} /> : <Link2 size={15} />}
                <span>{copiedLink ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์ส่งพนักงาน'}</span>
              </button>
            </div>
          )}

          {/* Filter Tabs 3 หมวด */}
          <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm text-center">
            <button
              onClick={() => setFilterType('pending')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                filterType === 'pending'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Clock size={14} />
              <span>รออนุมัติ ({pendingEmps.length})</span>
            </button>

            <button
              onClick={() => setFilterType('full_time')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                filterType === 'full_time'
                  ? 'bg-emerald-50 text-[#15803d] border border-emerald-200'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Briefcase size={14} />
              <span>ประจำ ({fullTimeEmps.length})</span>
            </button>

            <button
              onClick={() => setFilterType('part_time')}
              className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
                filterType === 'part_time'
                  ? 'bg-emerald-50 text-[#15803d] border border-emerald-200'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Clock size={14} />
              <span>พาร์ทไทม์ ({partTimeEmps.length})</span>
            </button>
          </div>

          {/* การ์ดรายการพนักงาน */}
          <div className="space-y-3 pt-1">
            {loading ? (
              <div className="text-center py-12 text-xs sm:text-sm text-gray-400">กำลังโหลดข้อมูล...</div>
            ) : displayedEmps.length === 0 ? (
              <div className="text-center py-16 text-xs sm:text-sm text-gray-400 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                ไม่พบรายชื่อพนักงานในหมวดนี้
              </div>
            ) : (
              displayedEmps.map((emp) => (
                <div
                  key={emp.id}
                  className={`bg-white rounded-3xl p-4 sm:p-5 shadow-sm border transition relative overflow-hidden space-y-3 ${
                    emp.status === 'pending' ? 'border-amber-300 ring-1 ring-amber-300/40' : 'border-gray-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center font-bold text-base sm:text-lg border overflow-hidden shrink-0">
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{emp.name ? emp.name.charAt(0) : 'U'}</span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-gray-800 text-sm sm:text-base leading-none">{emp.name}</h3>
                          <span className="text-[10px] sm:text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                            #{emp.pin_code || '----'}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-bold text-emerald-600">
                          {emp.position || 'พนักงานเสิร์ฟ'}
                        </p>

                        {emp.status !== 'pending' && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                              ฿{emp.salary_rate} /{emp.employment_type === 'part_time' ? 'ชม.' : 'วัน'}
                            </span>

                            <span className="text-[10px] sm:text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-lg">
                              กะ {emp.work_start || '16:00'} - {emp.work_end || '00:00'} น.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {emp.status !== 'pending' && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center transition cursor-pointer"
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(emp.id, emp.name)}
                          className="w-9 h-9 sm:w-10 sm:h-10 bg-red-50 hover:bg-red-100 text-red-500 rounded-full flex items-center justify-center transition cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ข้อมูลบัญชีธนาคาร */}
                  {emp.bank_name && (
                    <div className="bg-gray-50 p-2.5 sm:p-3 rounded-2xl border border-gray-100 text-[11px] sm:text-xs text-gray-600 flex justify-between items-center">
                      <span>รับเงินผ่าน: <strong className="font-bold text-emerald-800">{emp.bank_name}</strong></span>
                      <span className="font-mono text-gray-500">{emp.bank_account_no}</span>
                    </div>
                  )}

                  {/* ปุ่มอนุมัติสำหรับคำขอใหม่ (Pending) */}
                  {emp.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => handleReject(emp.id, emp.name)}
                        className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-1 border border-red-200 transition cursor-pointer"
                      >
                        <UserX size={15} />
                        <span>ปฏิเสธคำขอ</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(emp)}
                        className="py-2.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-1 shadow-md transition active:scale-95 cursor-pointer"
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

      {/* POPUP MODAL (อนุมัติ / แก้ไข) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden">
            
            <div className="p-4 px-5 border-b flex justify-between items-center bg-white shrink-0">
              <h3 className="font-bold text-gray-800 text-base">
                {editingEmp?.status === 'pending' ? 'ตั้งค่า & อนุมัติพนักงานใหม่' : editingEmp ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-full flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form id="emp-form" onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs sm:text-sm flex-1">
              
              {/* รูปโปรไฟล์ */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">รูปโปรไฟล์</label>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full border flex items-center justify-center overflow-hidden shrink-0">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Image size={20} className="text-gray-400" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'avatar_url')}
                    className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer w-full min-w-0"
                  />
                </div>
              </div>

              {/* ชื่อ - นามสกุล */}
              <div>
                <label className="font-bold text-gray-700 block mb-1">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full min-w-0 p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
                  required
                />
              </div>

              {/* PIN & ตำแหน่งงาน */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">รหัส PIN (4 หลัก)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.pin_code}
                    onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                    placeholder="1234"
                    className="w-full min-w-0 p-2.5 border rounded-xl bg-gray-50 text-center font-mono focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-bold"
                    required
                  />
                </div>
                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">ตำแหน่งงาน</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full min-w-0 p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              {/* ประเภทการจ้าง & อัตราค่าจ้าง (กรอบสีเขียว) */}
              <div className="grid grid-cols-2 gap-2 bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 w-full box-border">
                <div className="min-w-0 overflow-hidden">
                  <label className="font-bold text-emerald-800 block mb-1 truncate text-xs">ประเภทการจ้าง</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full min-w-0 block px-2 py-2 border rounded-xl bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs cursor-pointer box-border"
                  >
                    <option value="full_time">ประจำ</option>
                    <option value="part_time">พาร์ทไทม์</option>
                  </select>
                </div>
                <div className="min-w-0 overflow-hidden">
                  <label className="font-bold text-emerald-800 block mb-1 truncate text-xs">อัตราค่าจ้าง (บาท)</label>
                  <input
                    type="number"
                    value={formData.salary_rate}
                    onChange={(e) => setFormData({ ...formData, salary_rate: e.target.value })}
                    placeholder="400"
                    className="w-full min-w-0 block px-2 py-2 border rounded-xl bg-white font-mono focus:outline-none focus:border-emerald-600 text-xs font-bold box-border"
                    required
                  />
                </div>
              </div>

              {/* เวลาเข้างาน & เวลาออกงาน */}
              <div className="grid grid-cols-2 gap-2 w-full">
                <div className="min-w-0 overflow-hidden">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs">เวลาเข้างาน (กะ)</label>
                  <input
                    type="time"
                    value={formData.work_start}
                    onChange={(e) => setFormData({ ...formData, work_start: e.target.value })}
                    className="w-full min-w-0 block px-2 py-2 border rounded-xl bg-gray-50 text-center font-mono focus:bg-white focus:outline-none focus:border-emerald-600 text-xs box-border"
                    required
                  />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs">เวลาออกงาน (กะ)</label>
                  <input
                    type="time"
                    value={formData.work_end}
                    onChange={(e) => setFormData({ ...formData, work_end: e.target.value })}
                    className="w-full min-w-0 block px-2 py-2 border rounded-xl bg-gray-50 text-center font-mono focus:bg-white focus:outline-none focus:border-emerald-600 text-xs box-border"
                    required
                  />
                </div>
              </div>

              {/* วันหยุดประจำสัปดาห์ & หักมาสาย */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">วันหยุดประจำสัปดาห์</label>
                  <select
                    value={formData.off_day}
                    onChange={(e) => setFormData({ ...formData, off_day: e.target.value })}
                    className="w-full min-w-0 p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs sm:text-sm cursor-pointer"
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
                <div className="min-w-0">
                  <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">หักมาสาย (บาท/นาที)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.late_penalty_rate}
                    onChange={(e) => setFormData({ ...formData, late_penalty_rate: e.target.value })}
                    placeholder="1"
                    className="w-full min-w-0 p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>

              {/* ข้อมูลธนาคาร */}
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center space-x-1.5 text-gray-800 font-bold text-xs sm:text-sm">
                  <CreditCard size={15} className="text-emerald-600 shrink-0" />
                  <span>ข้อมูลบัญชีรับเงิน</span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                  <div className="min-w-0">
                    <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">ธนาคาร</label>
                    <select
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      className="w-full min-w-0 p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium text-xs sm:text-sm cursor-pointer"
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

                  <div className="min-w-0">
                    <label className="font-bold text-gray-700 block mb-1 truncate text-xs sm:text-sm">เลขที่บัญชี / พร้อมเพย์</label>
                    <input
                      type="text"
                      value={formData.bank_account_no}
                      onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                      className="w-full min-w-0 p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">ชื่อบัญชี</label>
                  <input
                    type="text"
                    value={formData.bank_account_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                    className="w-full min-w-0 p-2.5 sm:p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm"
                  />
                </div>
              </div>

            </form>

            <div className="p-4 bg-gray-50 border-t shrink-0">
              <button
                type="submit"
                form="emp-form"
                className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition text-xs sm:text-sm flex items-center justify-center space-x-1.5 active:scale-[0.98] cursor-pointer"
              >
                <Save size={18} />
                <span>{editingEmp?.status === 'pending' ? 'ยืนยันอนุมัติพนักงาน' : 'บันทึกข้อมูลพนักงาน'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md rounded-[28px] shadow-xl border border-gray-100 p-1.5 flex justify-around items-center z-30">
        <button
          onClick={() => onTabChange ? onTabChange('home') : onBack()}
          className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Home size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">หน้าแรก</span>
        </button>

        <button
          className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition bg-emerald-50 text-[#15803d] font-bold cursor-pointer"
        >
          <Users size={20} className="text-[#15803d]" />
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