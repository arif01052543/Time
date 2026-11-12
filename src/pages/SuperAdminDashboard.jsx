import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import {
  ShieldCheck, Store, UserPlus, Lock, Unlock, Copy, Check,
  LogOut, Calendar, Users, RefreshCw, KeyRound
} from 'lucide-react';

export default function SuperAdminDashboard({ onBack }) {
  const [masterKey, setMasterKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  // ฟอร์มสร้างลูกค้าใหม่
  const [newTenant, setNewTenant] = useState({
    shop_name: '',
    admin_name: '',
    admin_pin: '',
    max_branches: 1,
    expire_date: ''
  });
  const [creating, setCreating] = useState(false);

  const fetchTenants = async (keyToUse = masterKey) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('super_get_tenants', {
        p_master_key: keyToUse.trim()
      });
      if (error) throw error;
      setTenants(data || []);
      setIsAuthenticated(true);
    } catch (err) {
      alert(err.message || 'รหัสผ่านไม่ถูกต้อง');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!masterKey.trim()) return;
    fetchTenants(masterKey);
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (newTenant.admin_pin.trim().length !== 4) {
      alert('รหัส PIN ต้องมี 4 หลัก');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('super_create_tenant', {
        p_master_key: masterKey.trim(),
        p_shop_name: newTenant.shop_name.trim(),
        p_admin_name: newTenant.admin_name.trim(),
        p_admin_pin: newTenant.admin_pin.trim(),
        p_max_branches: parseInt(newTenant.max_branches) || 1,
        p_expire_date: newTenant.expire_date || null
      });
      if (error) throw error;

      alert(`เปิดร้าน "${data.shop_name}" เรียบร้อยแล้ว!`);
      setNewTenant({
        shop_name: '',
        admin_name: '',
        admin_pin: '',
        max_branches: 1,
        expire_date: ''
      });
      fetchTenants();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (shop) => {
    const nextStatus = shop.subscription_status === 'active' ? 'suspended' : 'active';
    const confirmMsg =
      nextStatus === 'suspended'
        ? `ยืนยัน "ระงับการใช้งาน" ร้าน ${shop.shop_name} (ลูกค้าค้างจ่าย)?`
        : `ยืนยัน "เปิดใช้งาน" ร้าน ${shop.shop_name}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase.rpc('super_update_tenant_status', {
        p_master_key: masterKey.trim(),
        p_shop_id: shop.shop_id,
        p_status: nextStatus,
        p_expire_date: shop.expire_date
      });
      if (error) throw error;
      fetchTenants();
    } catch (err) {
      alert('อัปเดตสถานะไม่สำเร็จ: ' + err.message);
    }
  };

  const handleCopyInvite = (shop) => {
    const inviteUrl = `${window.location.origin}/?shop=${shop.shop_id}`;
    const text = `ข้อมูลเข้าใช้งานระบบ TimeTrack\nร้าน: ${shop.shop_name}\nลิงก์เว็บ: ${window.location.origin}\nชื่อแอดมิน: ${shop.admin_name || '-'}\nรหัส PIN: ${shop.admin_pin || '-'}\n\nลิงก์ส่งให้พนักงานสมัคร:\n${inviteUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedId(shop.shop_id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  // หน้าจอกรอกรหัสลับ Super Admin
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 p-6 sm:p-8 rounded-3xl max-w-sm w-full space-y-5 text-white shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
            <ShieldCheck size={34} />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-xl font-extrabold">Super Admin Portal</h1>
            <p className="text-xs text-slate-400">ระบบจัดการร้านค้าลูกค้า (สำหรับผู้พัฒนา)</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="กรอก Master Key"
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-sm transition cursor-pointer"
            >
              {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบจัดการ'}
            </button>
          </form>
          <button
            onClick={onBack}
            className="w-full text-xs text-slate-400 hover:text-white transition cursor-pointer"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 sm:p-6 shadow-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg">ระบบจัดการลูกค้า (Super Admin)</h1>
              <p className="text-xs text-slate-400">เปิดร้านใหม่ & ควบคุมสิทธิ์การชำระเงิน</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchTenants()}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={onBack}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <LogOut size={15} />
              <span>ออก</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ฟอร์มเปิดร้านลูกค้าใหม่ในปุ่มเดียว */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-extrabold text-gray-800 text-sm sm:text-base flex items-center space-x-2 border-b pb-3">
            <UserPlus size={18} className="text-emerald-600" />
            <span>เปิดร้านลูกค้าใหม่ (สร้างร้าน + แอดมินพร้อมกัน)</span>
          </h2>

          <form onSubmit={handleCreateTenant} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
            <div>
              <label className="font-bold text-gray-700 block mb-1">ชื่อร้านลูกค้า *</label>
              <input
                type="text"
                placeholder="เช่น ร้านคาเฟ่สุขใจ"
                value={newTenant.shop_name}
                onChange={(e) => setNewTenant({ ...newTenant, shop_name: e.target.value })}
                className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">ชื่อเจ้าของร้าน (ใช้ล็อกอิน) *</label>
              <input
                type="text"
                placeholder="เช่น คุณบอส"
                value={newTenant.admin_name}
                onChange={(e) => setNewTenant({ ...newTenant, admin_name: e.target.value })}
                className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">ตั้งรหัส PIN แอดมิน (4 หลัก) *</label>
              <input
                type="text"
                maxLength={4}
                placeholder="เช่น 8899"
                value={newTenant.admin_pin}
                onChange={(e) => setNewTenant({ ...newTenant, admin_pin: e.target.value })}
                className="w-full p-3 border rounded-xl bg-gray-50 font-mono font-bold focus:bg-white focus:outline-none focus:border-emerald-600"
                required
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">วันหมดอายุรอบบิล (เว้นว่างได้)</label>
              <input
                type="date"
                value={newTenant.expire_date}
                onChange={(e) => setNewTenant({ ...newTenant, expire_date: e.target.value })}
                className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="sm:col-span-2 pt-1">
              <button
                type="submit"
                disabled={creating}
                className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 disabled:bg-gray-400 text-white font-bold rounded-2xl shadow-md transition cursor-pointer"
              >
                {creating ? 'กำลังสร้างร้านและบัญชี...' : '+ สร้างร้านลูกค้าใหม่ทันที'}
              </button>
            </div>
          </form>
        </div>

        {/* รายชื่อร้านลูกค้าทั้งหมด */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-gray-700 text-sm px-1">
            รายชื่อลูกค้าทั้งหมด ({tenants.length} ร้าน)
          </h3>

          {tenants.map((shop) => {
            const isActive = shop.subscription_status === 'active';
            return (
              <div
                key={shop.shop_id}
                className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isActive ? 'border-gray-100' : 'border-red-200 bg-red-50/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Store size={18} className={isActive ? 'text-emerald-600' : 'text-red-500'} />
                    <span className="font-extrabold text-gray-800 text-sm sm:text-base">{shop.shop_name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isActive ? 'ใช้งานปกติ' : 'ระงับการใช้งาน'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span>แอดมิน: <strong className="text-gray-700">{shop.admin_name || '-'}</strong> (PIN: <strong className="font-mono text-emerald-700">{shop.admin_pin || '-'}</strong>)</span>
                    <span className="flex items-center space-x-1">
                      <Users size={13} />
                      <span>พนักงาน {shop.employee_count} คน</span>
                    </span>
                    {shop.expire_date && (
                      <span className="flex items-center space-x-1 text-amber-700">
                        <Calendar size={13} />
                        <span>หมดอายุ: {shop.expire_date}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleCopyInvite(shop)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    {copiedId === shop.shop_id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedId === shop.shop_id ? 'คัดลอกแล้ว' : 'คัดลอกข้อมูลส่งลูกค้า'}</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(shop)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer ${
                      isActive
                        ? 'bg-red-100 hover:bg-red-200 text-red-700'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isActive ? <Lock size={14} /> : <Unlock size={14} />}
                    <span>{isActive ? 'ระงับร้าน' : 'ปลดล็อก'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}