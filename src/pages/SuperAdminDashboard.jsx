import React, { useState, useEffect } from 'react';
import { supabase, setActiveShopId } from '../services/supabaseClient';
import {
  ShieldCheck, Store, UserPlus, Lock, Unlock, Copy, Check,
  LogOut, Calendar, Users, RefreshCw, KeyRound, Plus, X,
  Pencil, Trash2
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

  // State สำหรับเพิ่มสาขาให้ลูกค้าเดิม
  const [branchModalShop, setBranchModalShop] = useState(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [addingBranch, setAddingBranch] = useState(false);

  // State สำหรับแก้ไขข้อมูลร้าน/สาขา
  const [editModalShop, setEditModalShop] = useState(null);
  const [editForm, setEditForm] = useState({
    shop_name: '',
    admin_name: '',
    admin_pin: '',
    expire_date: '',
    subscription_status: 'active'
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // State สำหรับสถานะกำลังลบ
  const [deletingShopId, setDeletingShopId] = useState('');

  useEffect(() => {
    setActiveShopId(''); // เคลียร์รหัสร้านค้างในเครื่องทุกครั้งที่เข้าหน้า Super Admin
  }, []);

  const fetchTenants = async (keyToUse = masterKey) => {
    setLoading(true);
    setActiveShopId('');
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
    setActiveShopId('');
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

  // เปิดหน้าต่างเพิ่มสาขาให้ลูกค้าเดิม
  const openAddBranchModal = (shop) => {
    setBranchModalShop(shop);
    setNewBranchName(`${shop.shop_name} สาขา 2`);
  };

  // บันทึกสาขาใหม่ผูกกับเจ้าของร้านคนเดิม (พร้อมดึงพิกัดเริ่มต้นจากร้านต้นทาง)
  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!branchModalShop || !newBranchName.trim()) return;

    setAddingBranch(true);
    setActiveShopId('');
    try {
      // 1. ค้นหาบัญชีเจ้าของร้าน (admin/owner) ของร้านต้นทาง
      let ownerUser = null;
      const { data: directAdmins, error: adminErr } = await supabase
        .from('users')
        .select('id, max_branches, shop_id')
        .eq('shop_id', branchModalShop.shop_id)
        .in('role', ['admin', 'owner'])
        .limit(1);

      if (adminErr) throw adminErr;

      if (directAdmins && directAdmins.length > 0) {
        ownerUser = directAdmins[0];
      } else {
        // กรณีกดเพิ่มจากสาขาย่อย ให้ตามหาเจ้าของจากคอลัมน์ owner_id
        const { data: shopRow } = await supabase
          .from('shops')
          .select('owner_id')
          .eq('id', branchModalShop.shop_id)
          .maybeSingle();

        if (shopRow?.owner_id) {
          const { data: linkedOwner } = await supabase
            .from('users')
            .select('id, max_branches, shop_id')
            .eq('id', shopRow.owner_id)
            .maybeSingle();
          ownerUser = linkedOwner;
        }
      }

      if (!ownerUser) {
        throw new Error('ไม่พบบัญชีเจ้าของร้านต้นทาง กรุณาตรวจสอบข้อมูลแอดมิน');
      }

      // 2. ดึงค่าพิกัด latitude / longitude ของร้านต้นทางมาเป็นค่าเริ่มต้น
      const { data: parentShop } = await supabase
        .from('shops')
        .select('latitude, longitude')
        .eq('id', branchModalShop.shop_id)
        .maybeSingle();

      // 3. อัปเดตสาขาหลักให้มี owner_id ตรงกัน (กันกรณีสาขาเก่ายังไม่มี owner_id)
      await supabase
        .from('shops')
        .update({ owner_id: ownerUser.id })
        .eq('id', branchModalShop.shop_id)
        .is('owner_id', null);

      // 4. สร้างสาขาใหม่ผูกกับ owner_id เดียวกัน พร้อมค่า latitude/longitude ไม่ให้เป็น null
      const { error: insertErr } = await supabase
        .from('shops')
        .insert([{
          shop_name: newBranchName.trim(),
          owner_id: ownerUser.id,
          latitude: parentShop?.latitude ?? 0,
          longitude: parentShop?.longitude ?? 0,
          subscription_status: branchModalShop.subscription_status || 'active',
          expire_date: branchModalShop.expire_date || null
        }]);

      if (insertErr) throw insertErr;

      // 5. นับจำนวนสาขาทั้งหมดของเจ้าของคนนี้ และอัปเดตโควต้า max_branches ให้อัตโนมัติ
      const { count } = await supabase
        .from('shops')
        .select('id', { count: 'exact', head: true })
        .or(`owner_id.eq.${ownerUser.id},id.eq.${ownerUser.shop_id}`);

      const updatedQuota = Math.max((ownerUser.max_branches || 1) + 1, count || 2);
      await supabase
        .from('users')
        .update({ max_branches: updatedQuota })
        .eq('id', ownerUser.id);

      alert(`เพิ่มสาขา "${newBranchName.trim()}" เรียบร้อยแล้ว!\nเจ้าของร้านสามารถล็อกอินด้วย PIN เดิมเพื่อเลือกสาขาได้ทันที`);
      setBranchModalShop(null);
      setNewBranchName('');
      fetchTenants();
    } catch (err) {
      alert('เพิ่มสาขาไม่สำเร็จ: ' + err.message);
    } finally {
      setAddingBranch(false);
    }
  };

  // เปิดหน้าต่างแก้ไขข้อมูลร้าน/สาขา
  const openEditModal = (shop) => {
    setEditModalShop(shop);
    setEditForm({
      shop_name: shop.shop_name || '',
      admin_name: shop.admin_name || '',
      admin_pin: shop.admin_pin || '',
      expire_date: shop.expire_date || '',
      subscription_status: shop.subscription_status || 'active'
    });
  };

  // บันทึกการแก้ไขร้าน/สาขา
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModalShop || !editForm.shop_name.trim()) return;

    if (editModalShop.admin_name && editForm.admin_pin.trim().length !== 4) {
      alert('รหัส PIN แอดมินต้องมี 4 หลัก');
      return;
    }

    setSavingEdit(true);
    setActiveShopId('');
    try {
      // 1. อัปเดตข้อมูลในตาราง shops
      const { error: shopErr } = await supabase
        .from('shops')
        .update({
          shop_name: editForm.shop_name.trim(),
          expire_date: editForm.expire_date || null,
          subscription_status: editForm.subscription_status
        })
        .eq('id', editModalShop.shop_id);

      if (shopErr) throw shopErr;

      // 2. หากเป็นร้านหลักที่มีบัญชีแอดมิน ให้อัปเดตชื่อแอดมินและ PIN ด้วย
      if (editModalShop.admin_name) {
        const { error: userErr } = await supabase
          .from('users')
          .update({
            name: editForm.admin_name.trim(),
            pin: editForm.admin_pin.trim()
          })
          .eq('shop_id', editModalShop.shop_id)
          .in('role', ['admin', 'owner']);

        if (userErr) throw userErr;
      }

      alert('บันทึกการแก้ไขเรียบร้อยแล้ว!');
      setEditModalShop(null);
      fetchTenants();
    } catch (err) {
      alert('แก้ไขข้อมูลไม่สำเร็จ: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // ลบร้านค้าหรือสาขา
  const handleDeleteShop = async (shop) => {
    const isSubBranch = !shop.admin_name;
    const warningMsg = isSubBranch
      ? `ยืนยันการลบสาขา "${shop.shop_name}" ?\n(ข้อมูลพนักงานและประวัติลงเวลาของสาขานี้จะถูกลบทั้งหมด แต่ร้านหลักยังอยู่ปกติ)`
      : `⚠️ ยืนยันการลบร้าน "${shop.shop_name}" ?\nข้อมูลแอดมิน พนักงาน สลิปเงินเดือน และประวัติลงเวลาทั้งหมดของร้านนี้จะถูกลบถาวร ไม่สามารถกู้คืนได้!`;

    if (!window.confirm(warningMsg)) return;

    setDeletingShopId(shop.shop_id);
    setActiveShopId('');
    try {
      // ลบข้อมูลที่ผูกกับ shop_id ตามลำดับเพื่อป้องกันติด Foreign Key
      await supabase.from('payrolls').delete().eq('shop_id', shop.shop_id);
      await supabase.from('advances').delete().eq('shop_id', shop.shop_id);
      await supabase.from('leaves').delete().eq('shop_id', shop.shop_id);
      await supabase.from('time_entries').delete().eq('shop_id', shop.shop_id);
      await supabase.from('users').delete().eq('shop_id', shop.shop_id);

      // ลบตัวร้าน/สาขาออกจากตาราง shops
      const { error: delErr } = await supabase
        .from('shops')
        .delete()
        .eq('id', shop.shop_id);

      if (delErr) throw delErr;

      alert(`ลบ "${shop.shop_name}" เรียบร้อยแล้ว`);
      fetchTenants();
    } catch (err) {
      alert('ลบไม่สำเร็จ: ' + err.message);
    } finally {
      setDeletingShopId('');
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
    const text = `ข้อมูลเข้าใช้งานระบบ TimeTrack\nร้าน: ${shop.shop_name}\nลิงก์เว็บ: ${window.location.origin}\nชื่อผู้ใช้งาน: ${shop.admin_name || '-'}\nรหัส PIN: ${shop.admin_pin || '-'}\nรหัสร้าน (สำหรับพนักงานลงทะเบียน): ${shop.shop_id}`;
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
            รายชื่อลูกค้าทั้งหมด ({tenants.length} ร้าน/สาขา)
          </h3>

          {tenants.map((shop) => {
            const isActive = shop.subscription_status === 'active';
            const isDeletingThis = deletingShopId === shop.shop_id;
            return (
              <div
                key={shop.shop_id}
                className={`bg-white p-4 sm:p-5 rounded-2xl border shadow-sm flex flex-col justify-between gap-3.5 ${
                  isActive ? 'border-gray-100' : 'border-red-200 bg-red-50/30'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <Store size={18} className={isActive ? 'text-emerald-600' : 'text-red-500'} />
                    <span className="font-extrabold text-gray-800 text-sm sm:text-base">{shop.shop_name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {isActive ? 'ใช้งานปกติ' : 'ระงับการใช้งาน'}
                    </span>
                    {!shop.admin_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        สาขาเพิ่มเติม
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                    {shop.admin_name ? (
                      <span>แอดมิน: <strong className="text-gray-700">{shop.admin_name}</strong> (PIN: <strong className="font-mono text-emerald-700">{shop.admin_pin || '-'}</strong>)</span>
                    ) : (
                      <span className="text-blue-700 font-medium">ใช้บัญชีเจ้าของร้านหลักในการเข้าจัดการ</span>
                    )}
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

                {/* แถบปุ่มจัดการทั้งหมด */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => openAddBranchModal(shop)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>เพิ่มสาขา</span>
                  </button>

                  <button
                    onClick={() => openEditModal(shop)}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                  >
                    <Pencil size={13} />
                    <span>แก้ไข</span>
                  </button>

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
                        ? 'bg-orange-100 hover:bg-orange-200 text-orange-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isActive ? <Lock size={14} /> : <Unlock size={14} />}
                    <span>{isActive ? 'ระงับร้าน' : 'ปลดล็อก'}</span>
                  </button>

                  <button
                    onClick={() => handleDeleteShop(shop)}
                    disabled={isDeletingThis}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold flex items-center space-x-1 transition cursor-pointer ml-auto"
                  >
                    <Trash2 size={13} />
                    <span>{isDeletingThis ? 'กำลังลบ...' : 'ลบ'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal เพิ่มสาขาใหม่ให้ลูกค้าเดิม */}
      {branchModalShop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-gray-800 text-base flex items-center space-x-2">
                <Store size={18} className="text-emerald-600" />
                <span>เพิ่มสาขาใหม่ให้ลูกค้า</span>
              </h3>
              <button
                onClick={() => setBranchModalShop(null)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-800 space-y-1">
              <p>ร้านต้นทาง: <strong>{branchModalShop.shop_name}</strong></p>
              <p>ระบบจะผูกสาขาใหม่เข้ากับบัญชีเจ้าของร้านเดิมโดยอัตโนมัติ ลูกค้าสามารถล็อกอินด้วย PIN เดิมแล้วกดเลือกสาขาได้ทันที</p>
            </div>

            <form onSubmit={handleAddBranch} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-gray-700 block mb-1">ชื่อสาขาใหม่ *</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="เช่น ร้านคาเฟ่สุขใจ สาขา 2"
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-semibold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={addingBranch}
                className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 disabled:bg-gray-400 text-white font-bold rounded-2xl shadow-md transition cursor-pointer"
              >
                {addingBranch ? 'กำลังสร้างสาขา...' : 'ยืนยันเปิดสาขาใหม่'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal แก้ไขข้อมูลร้านค้า/สาขา */}
      {editModalShop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-gray-800 text-base flex items-center space-x-2">
                <Pencil size={17} className="text-amber-600" />
                <span>แก้ไขข้อมูลร้านค้า / สาขา</span>
              </h3>
              <button
                onClick={() => setEditModalShop(null)}
                className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="font-bold text-gray-700 block mb-1">ชื่อร้าน / ชื่อสาขา *</label>
                <input
                  type="text"
                  value={editForm.shop_name}
                  onChange={(e) => setEditForm({ ...editForm, shop_name: e.target.value })}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-semibold"
                  required
                />
              </div>

              {editModalShop.admin_name && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">ชื่อแอดมิน *</label>
                    <input
                      type="text"
                      value={editForm.admin_name}
                      onChange={(e) => setEditForm({ ...editForm, admin_name: e.target.value })}
                      className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">รหัส PIN (4 หลัก) *</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={editForm.admin_pin}
                      onChange={(e) => setEditForm({ ...editForm, admin_pin: e.target.value })}
                      className="w-full p-3 border rounded-xl bg-gray-50 font-mono font-bold focus:bg-white focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700">วันหมดอายุรอบบิล</label>
                  {editForm.expire_date && (
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, expire_date: '' })}
                      className="text-[11px] text-red-500 hover:underline cursor-pointer"
                    >
                      ล้างวันที่
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={editForm.expire_date}
                  onChange={(e) => setEditForm({ ...editForm, expire_date: e.target.value })}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">สถานะการใช้งาน</label>
                <select
                  value={editForm.subscription_status}
                  onChange={(e) => setEditForm({ ...editForm, subscription_status: e.target.value })}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-semibold"
                >
                  <option value="active">ใช้งานปกติ (Active)</option>
                  <option value="suspended">ระงับการใช้งาน (Suspended)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalShop(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-3 bg-[#15803d] hover:bg-emerald-800 disabled:bg-gray-400 text-white font-bold rounded-2xl shadow-md transition cursor-pointer"
                >
                  {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}