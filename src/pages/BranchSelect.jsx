import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Store, Plus, Lock, CheckCircle2, PhoneCall, LogOut, MapPin, X } from 'lucide-react';

export default function BranchSelect({ currentUser, onSelectBranch, onLogout }) {
  const [branches, setBranches] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State ฟอร์มสร้างสาขาใหม่
  const [newShop, setNewShop] = useState({
    shop_name: '',
    latitude: '',
    longitude: '',
    radius_meters: 100
  });
  const [isSaving, setIsSaving] = useState(false);

  // ดึงโควต้าของลูกค้า (ถ้าไม่มีตั้งไว้ให้ = 1)
  const maxBranches = currentUser?.max_branches || 1;
  const canAddBranch = branches.length < maxBranches;

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase.from('shops').select('*');
    if (data) setBranches(data);
  };

  // ดึงพิกัด GPS ปัจจุบันให้อัตโนมัติ เพื่อความสะดวกของลูกค้า
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewShop((prev) => ({
            ...prev,
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6)
          }));
        },
        () => alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาเปิดระบบ Location บนอุปกรณ์')
      );
    }
  };

  // บันทึกสาขาใหม่ (กรณีลูกค้ายังมีโควต้าเหลือ)
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        shop_name: newShop.shop_name,
        latitude: parseFloat(newShop.latitude) || 13.7563,
        longitude: parseFloat(newShop.longitude) || 100.5018,
        radius_meters: parseInt(newShop.radius_meters) || 100
      };

      const { error } = await supabase.from('shops').insert([payload]);
      if (error) throw error;

      await fetchBranches();
      setShowAddModal(false);
      setNewShop({ shop_name: '', latitude: '', longitude: '', radius_meters: 100 });
      alert('สร้างสาขาใหม่สำเร็จเรียบร้อย!');
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClick = () => {
    if (canAddBranch) {
      setShowAddModal(true); // ปลดล็อกให้กรอกสร้างเอง
    } else {
      setShowContactModal(true); // ติดต่อซื้อเพิ่มเมื่อเกินโควต้า
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col justify-between overflow-x-hidden">
      
      {/* Header สีเขียวทรงโค้ง ขยายเต็มความกว้าง */}
      <div className="bg-[#15803d] pt-8 pb-12 px-6 text-white text-center rounded-b-[40px] sm:rounded-b-[56px] shadow-md w-full shrink-0">
        <div className="max-w-2xl mx-auto relative">
          <button
            onClick={onLogout}
            className="absolute top-0 right-0 p-2 sm:p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition active:scale-95 backdrop-blur-sm cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut size={18} />
          </button>

          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white text-[#15803d] rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
            <Store size={36} strokeWidth={2.2} className="sm:w-10 sm:h-10" />
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-wide">เลือกสาขาเข้าใช้งาน</h1>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1 font-light">
            ยินดีต้อนรับ {currentUser?.name || 'เจ้าของร้าน'}
          </p>
        </div>
      </div>

      {/* รายชื่อสาขา จัดกึ่งกลางหน้าจอ */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-3.5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs sm:text-sm font-bold text-gray-500 uppercase tracking-wider">
            สาขาที่คุณมีสิทธิ์เข้าถึง ({branches.length}/{maxBranches})
          </p>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
            โควต้า {maxBranches} สาขา
          </span>
        </div>

        {branches.map((shop) => (
          <button
            key={shop.id}
            onClick={() => onSelectBranch(shop)}
            className="w-full p-4 sm:p-5 bg-white hover:bg-emerald-50/70 border border-gray-200 hover:border-emerald-500 rounded-2xl flex items-center justify-between transition group text-left shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-700 rounded-xl shadow-sm border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
                <Store size={22} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm sm:text-base group-hover:text-emerald-900">
                  {shop.shop_name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">รัศมีลงงาน {shop.radius_meters} เมตร</p>
              </div>
            </div>
            <CheckCircle2 size={20} className="text-emerald-600 opacity-0 group-hover:opacity-100 transition shrink-0" />
          </button>
        ))}

        {/* ปุ่มเพิ่มสาขาใหม่ */}
        <button
          onClick={handleAddClick}
          className={`w-full p-4 sm:p-5 border rounded-2xl flex items-center justify-between transition mt-4 active:scale-[0.98] cursor-pointer ${
            canAddBranch
              ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-300 text-emerald-800'
              : 'bg-amber-50/60 hover:bg-amber-100/80 border-dashed border-amber-300 text-amber-800'
          }`}
        >
          <div className="flex items-center space-x-3.5">
            <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${canAddBranch ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200/80'}`}>
              <Plus size={22} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm sm:text-base">
                {canAddBranch ? 'เพิ่มสาขาใหม่ (มีโควต้า)' : 'เพิ่ม / ขยายสาขาใหม่'}
              </h3>
              <p className={`text-xs mt-0.5 ${canAddBranch ? 'text-emerald-700 font-semibold' : 'text-amber-600'}`}>
                {canAddBranch ? 'คลิกเพื่อตั้งชื่อร้านและตั้งค่าพิกัด' : 'สิทธิ์ครบแล้ว ติดต่อผู้พัฒนาเพื่อเพิ่มสิทธิ์'}
              </p>
            </div>
          </div>
          {canAddBranch ? (
            <span className="text-xs bg-[#15803d] text-white px-3 py-1 rounded-xl font-bold shrink-0">ปลดล็อกแล้ว</span>
          ) : (
            <Lock size={20} className="text-amber-600 shrink-0" />
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 text-center border-t border-gray-100 text-xs sm:text-sm text-gray-400 shrink-0">
        ต้องการขยายโควต้าสาขา ติดต่อทีมงานผู้พัฒนา
      </div>

      {/* POPUP 1: กรอกข้อมูลสร้างสาขาเอง (เมื่อปลดล็อกสิทธิ์แล้ว) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] p-6 max-w-md w-full space-y-4 shadow-2xl text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-sm sm:text-base text-gray-800 flex items-center space-x-2">
                <Store size={18} className="text-[#15803d]" />
                <span>เพิ่มข้อมูลสาขาใหม่</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold transition cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3.5">
              <div>
                <label className="font-bold text-gray-700 block mb-1">ชื่อสาขา / ชื่อร้าน</label>
                <input
                  type="text"
                  placeholder="เช่น ร้านกาแฟ TT สาขา 2"
                  value={newShop.shop_name}
                  onChange={(e) => setNewShop({ ...newShop, shop_name: e.target.value })}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-700">พิกัด GPS ร้านค้า</label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="text-xs text-emerald-700 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                  >
                    <MapPin size={13} />
                    <span>ดึงพิกัดปัจจุบัน</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={newShop.latitude}
                    onChange={(e) => setNewShop({ ...newShop, latitude: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-xs sm:text-sm"
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={newShop.longitude}
                    onChange={(e) => setNewShop({ ...newShop, longitude: e.target.value })}
                    className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">รัศมีที่อนุญาตสแกน (เมตร)</label>
                <input
                  type="number"
                  placeholder="100"
                  value={newShop.radius_meters}
                  onChange={(e) => setNewShop({ ...newShop, radius_meters: e.target.value })}
                  className="w-full p-3 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-xs sm:text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs sm:text-sm active:scale-95 disabled:bg-gray-400 mt-2 cursor-pointer"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกเปิดใช้งานสาขา'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POPUP 2: แจ้งเตือนซื้อโควต้าเพิ่ม (เมื่อใช้สิทธิ์ครบแล้ว) */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg sm:text-xl text-gray-800">ต้องการขยายสาขา</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                ตอนนี้คุณมี {maxBranches} สาขา หากต้องการเพิ่มสาขาใหม่ กรุณาติดต่อทีมงานเพื่อซื้อโควต้าปลดล็อกสาขาเพิ่ม
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-left space-y-1.5">
              <p className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center space-x-1.5">
                <PhoneCall size={14} />
                <span>ช่องทางซื้อโควต้าเพิ่ม:</span>
              </p>
              <p className="text-xs sm:text-sm text-emerald-700 font-mono font-semibold">LINE: @arif_mrn</p>
              <p className="text-xs sm:text-sm text-emerald-700 font-mono font-semibold">โทร: 0810072917</p>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full py-3.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs sm:text-sm active:scale-95 transition shadow-md cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}