import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, Store, Clock, MapPin, Search, 
  Locate, Save, CheckCircle2, RotateCcw,
  Home, Users, Calculator, Settings,
  ShieldCheck, Lock, User, Key, AlertCircle
} from 'lucide-react';

export default function AdminSettings({ currentUser, selectedBranch, onBack, onTabChange, onBranchUpdated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // State ข้อมูลตั้งค่าสาขา
  const [shopName, setShopName] = useState('ร้านตัวอย่าง สาขา1');
  const [workStart, setWorkStart] = useState('16:00');
  const [workEnd, setWorkEnd] = useState('00:00');
  const [offDay, setOffDay] = useState('วันพุธ');
  const [latitude, setLatitude] = useState(6.8202259);
  const [longitude, setLongitude] = useState(101.2804537);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [searchQuery, setSearchQuery] = useState('');

  // State บัญชีผู้ดูแลระบบ (ชื่อผู้ใช้งาน & รหัสผ่าน)
  const [adminUsername, setAdminUsername] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [accountError, setAccountError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    fetchShopSettings();
    if (currentUser) {
      setAdminUsername(currentUser.id_card_last4 || '');
    }
  }, [selectedBranch, currentUser]);

  // ดึงข้อมูลการตั้งค่าสาขาปัจจุบันจาก Supabase
  const fetchShopSettings = async () => {
    setLoading(true);
    try {
      if (!selectedBranch?.id) return;
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', selectedBranch.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setShopName(data.shop_name || selectedBranch.shop_name || 'ร้านตัวอย่าง สาขา1');
        setWorkStart(data.default_work_start || '16:00');
        setWorkEnd(data.default_work_end || '00:00');
        setOffDay(data.default_off_day || 'วันพุธ');
        setLatitude(data.latitude || 6.8202259);
        setLongitude(data.longitude || 101.2804537);
        setRadiusMeters(data.radius_meters || 100);
      }
    } catch (err) {
      console.error('Error fetching shop settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. ดึงพิกัด GPS ปัจจุบันจากมือถือ/เบราว์เซอร์
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(7)));
        setLongitude(Number(pos.coords.longitude.toFixed(7)));
      },
      (err) => {
        alert('ไม่สามารถดึงพิกัด GPS ได้ โปรดเปิดสิทธิ์ Location บนอุปกรณ์ของคุณ');
      },
      { enableHighAccuracy: true }
    );
  };

  // 2. ล้างค่าพิกัด
  const handleResetLocation = () => {
    setLatitude('');
    setLongitude('');
  };

  // 3. ค้นหาสถานที่ผ่าน OpenStreetMap Nominatim API
  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setLatitude(Number(parseFloat(data[0].lat).toFixed(7)));
        setLongitude(Number(parseFloat(data[0].lon).toFixed(7)));
      } else {
        alert('ไม่พบสถานที่ที่ค้นหา โปรดระบุชื่อให้ชัดเจนขึ้น');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการค้นหาพิกัด');
    }
  };

  // 4. บันทึกการตั้งค่าสาขาลง Supabase
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        shop_name: shopName,
        default_work_start: workStart,
        default_work_end: workEnd,
        default_off_day: offDay,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        radius_meters: parseFloat(radiusMeters) || 100,
      };

      let shopId = selectedBranch?.id;
      if (shopId) {
        const { error } = await supabase
          .from('shops')
          .update(payload)
          .eq('id', shopId);
        if (error) throw error;
      }

      if (onBranchUpdated) {
        onBranchUpdated({ ...selectedBranch, ...payload });
      }

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // 5. บันทึกเปลี่ยนชื่อผู้ใช้งานและรหัสผ่านแอดมิน
const handleSaveAccountCredentials = async (e) => {
  e.preventDefault();
  setAccountError('');
  setAccountSuccess('');

  // ดึง userId และดักจับกรณีไม่มีค่า id
  const userId = currentUser?.id || currentUser?.user_id || selectedBranch?.owner_id;
  if (!userId) {
    setAccountError('ไม่พบ ID ผู้ใช้งาน ไม่สามารถอัปเดตบัญชีได้');
    return;
  }

  if (!adminUsername.trim()) {
    setAccountError('กรุณากรอกชื่อผู้ใช้งาน');
    return;
  }

  if (newPin && newPin.length < 4) {
    setAccountError('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร/ตัวเลข');
    return;
  }

  if (newPin && newPin !== confirmPin) {
    setAccountError('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
    return;
  }

  setSavingAccount(true);
  try {
    const updatePayload = {
      id_card_last4: adminUsername,
    };

    if (newPin) {
      updatePayload.pin_code = newPin;
    }

    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId);

    if (error) throw error;

    setAccountSuccess('อัปเดตชื่อผู้ใช้งานและรหัสผ่านเรียบร้อยแล้ว');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => setAccountSuccess(''), 3500);
  } catch (err) {
    setAccountError('เกิดข้อผิดพลาดในการอัปเดตบัญชี: ' + err.message);
  } finally {
    setSavingAccount(false);
  }
};

  // URL แผนที่แสดงพิกัด
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(longitude) - 0.003}%2C${Number(latitude) - 0.003}%2C${Number(longitude) + 0.003}%2C${Number(latitude) + 0.003}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-0 sm:p-4">
      <div className="w-full max-w-sm bg-gray-50 h-screen sm:h-[720px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-24">
          
          {/* Header สีเขียวทรงโค้ง */}
          <div className="bg-[#15803d] p-5 text-white rounded-b-[32px] shadow-md sticky top-0 z-20">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-extrabold text-base leading-tight">ตั้งค่าระบบ</h1>
                <p className="text-[11px] text-emerald-100 font-light">
                  จัดการข้อมูลร้าน เวลา บัญชีและสิทธิ์เข้าใช้
                </p>
              </div>
            </div>
          </div>

          {/* แจ้งเตือนเมื่อบันทึกการตั้งค่าร้านสำเร็จ */}
          {successToast && (
            <div className="m-4 mb-0 p-3.5 bg-emerald-100 border border-emerald-300 text-[#15803d] rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-sm animate-in fade-in zoom-in duration-200">
              <CheckCircle2 size={18} />
              <span>บันทึกข้อมูลการตั้งค่าร้านเรียบร้อยแล้ว</span>
            </div>
          )}

          {/* เนื้อหาฟอร์มตั้งค่า */}
          <div className="p-4 space-y-4">
            
            {/* CARD 1: ข้อมูลสาขา */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center space-x-2.5 text-gray-800 font-extrabold text-sm border-b border-gray-50 pb-2.5">
                <div className="w-8 h-8 bg-emerald-100/70 text-[#15803d] rounded-xl flex items-center justify-center">
                  <Store size={18} />
                </div>
                <span>ข้อมูลร้าน</span>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">ชื่อร้าน / สาขา</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="เช่น ร้านตัวอย่าง สาขา1"
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-medium"
                />
              </div>
            </div>

            {/* CARD 2: เวลาทำงานและวันหยุดตั้งต้นของร้าน */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center space-x-2.5 text-gray-800 font-extrabold text-sm border-b border-gray-50 pb-2.5">
                <div className="w-8 h-8 bg-purple-100/70 text-purple-600 rounded-xl flex items-center justify-center">
                  <Clock size={18} />
                </div>
                <span>เวลาทำงานและวันหยุดตั้งต้นของร้าน</span>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">เวลาเข้างานมาตรฐาน</label>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">เวลาออกงานมาตรฐาน</label>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">วันหยุดประจำร้าน (ค่าตั้งต้น)</label>
                <select
                  value={offDay}
                  onChange={(e) => setOffDay(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-medium"
                >
                  <option value="ไม่มีวันหยุด">ไม่มีวันหยุด</option>
                  <option value="วันจันทร์">วันจันทร์</option>
                  <option value="วันอังคาร">วันอังคาร</option>
                  <option value="วันพุธ">วันพุธ</option>
                  <option value="วันพฤหัสบดี">วันพฤหัสบดี</option>
                  <option value="วันศุกร์">วันศุกร์</option>
                  <option value="วันเสาร์">วันเสาร์</option>
                  <option value="วันอาทิตย์">วันอาทิตย์</option>
                </select>
              </div>
            </div>

            {/* CARD 3: พิกัดลงเวลา (GPS) */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3.5">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                <div className="flex items-center space-x-2.5 text-gray-800 font-extrabold text-sm">
                  <div className="w-8 h-8 bg-emerald-100/70 text-[#15803d] rounded-xl flex items-center justify-center">
                    <MapPin size={18} />
                  </div>
                  <span>พิกัดลงเวลา (GPS)</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetLocation}
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs flex items-center space-x-1 transition"
                >
                  <RotateCcw size={13} />
                  <span>ล้างพิกัด</span>
                </button>

                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#15803d] font-bold rounded-xl text-xs flex items-center space-x-1 transition border border-emerald-200/60"
                >
                  <Locate size={14} />
                  <span>ดึงพิกัดปัจจุบัน</span>
                </button>
              </div>

              <form onSubmit={handleSearchLocation} className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="พิมพ์ชื่อสถานที่, ถนน หรืออำเภอ..."
                  className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shrink-0 transition shadow-sm"
                >
                  <Search size={14} />
                  <span>ค้นหา</span>
                </button>
              </form>

              <div className="relative rounded-2xl overflow-hidden border border-gray-200 h-44 bg-gray-100">
                <iframe
                  title="Shop GPS Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={mapEmbedUrl}
                />
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-medium text-gray-600 shadow-sm border border-gray-100 pointer-events-none">
                  ⓘ คลิกบนแผนที่หรือลากหมุดเพื่อตั้งจุดร้าน
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">ละติจูด (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="6.8202259"
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-600 block mb-1">ลองจิจูด (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="101.2804537"
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-gray-700">ระยะทางที่อนุญาตให้ลงเวลาได้ (เมตร)</label>
                  <span className="text-[10px] font-bold text-emerald-600">แนะนำ: 50 - 150 เมตร</span>
                </div>
                <input
                  type="number"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  placeholder="100"
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono font-bold"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-lg transition text-xs flex items-center justify-center space-x-2 active:scale-[0.98] disabled:bg-gray-400"
              >
                <Save size={18} />
                <span>{saving ? 'กำลังบันทึกตั้งค่าร้าน...' : 'บันทึกตั้งค่าสาขา & GPS'}</span>
              </button>
            </div>

            {/* CARD 4: เปลี่ยนชื่อผู้ใช้งาน & รหัสผ่านแอดมิน (เพิ่มใหม่) */}
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3.5">
              <div className="flex items-center space-x-2.5 text-gray-800 font-extrabold text-sm border-b border-gray-50 pb-2.5">
                <div className="w-8 h-8 bg-blue-100/80 text-blue-700 rounded-xl flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-800 text-sm">บัญชีผู้ดูแลระบบ & ความปลอดภัย</h3>
                  <p className="text-[10px] text-gray-400 font-normal">แก้ไขชื่อผู้ใช้งานและรหัสผ่านเข้าสู่ระบบแอดมิน</p>
                </div>
              </div>

              {accountError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-semibold flex items-center space-x-1.5">
                  <AlertCircle size={15} />
                  <span>{accountError}</span>
                </div>
              )}

              {accountSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 size={15} />
                  <span>{accountSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveAccountCredentials} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">ชื่อผู้ใช้งานเข้าสู่ระบบ</label>
                  <div className="relative flex items-center">
                    <User size={16} className="absolute left-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="เช่น admin หรือ admin_shop1"
                      className="w-full pl-10 pr-3 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-semibold text-gray-800"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">รหัสผ่านใหม่</label>
                  <div className="relative flex items-center">
                    <Lock size={16} className="absolute left-3.5 text-gray-400" />
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
                      className="w-full pl-10 pr-3 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {newPin && (
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">ยืนยันรหัสผ่านใหม่</label>
                    <div className="relative flex items-center">
                      <Key size={16} className="absolute left-3.5 text-gray-400" />
                      <input
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                        className="w-full pl-10 pr-3 py-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingAccount}
                  className="w-full py-3 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs flex items-center justify-center space-x-1.5 active:scale-95 disabled:bg-gray-400 mt-1"
                >
                  <Key size={15} />
                  <span>{savingAccount ? 'กำลังบันทึก...' : 'บันทึกเปลี่ยนรหัสผ่าน / Username'}</span>
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* BOTTOM NAVIGATION BAR */}
        <div className="absolute bottom-3 left-4 right-4 bg-white/90 backdrop-blur-md rounded-[28px] shadow-lg border border-gray-100 p-1.5 flex justify-around items-center z-30">
          <button
            onClick={() => onTabChange ? onTabChange('home') : onBack()}
            className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600"
          >
            <Home size={20} className="text-gray-400" />
            <span className="text-[10px] mt-0.5">หน้าแรก</span>
          </button>

          <button
            onClick={() => onTabChange ? onTabChange('employees') : onBack()}
            className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600"
          >
            <Users size={20} className="text-gray-400" />
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
            className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition bg-emerald-50 text-[#15803d] font-bold"
          >
            <Settings size={20} className="text-[#15803d]" />
            <span className="text-[10px] mt-0.5">ตั้งค่า</span>
          </button>
        </div>

      </div>
    </div>
  );
}