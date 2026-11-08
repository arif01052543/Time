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
    <div className="min-h-screen bg-gray-100 flex justify-center items-start sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-sm bg-white h-screen sm:h-auto sm:min-h-[600px] sm:rounded-[36px] shadow-2xl overflow-y-auto border-0 sm:border border-gray-100 flex flex-col justify-between">
        
        {/* Header */}
        <div className="bg-[#15803d] pt-8 pb-10 px-6 text-white text-center rounded-b-[40px] relative shadow-md shrink-0">
          <button
            onClick={onLogout}
            className="absolute top-5 right-5 p-2 bg-white/10 rounded-full hover:bg-white/20 transition active:scale-95"
            title="ออกจากระบบ"
          >
            <LogOut size={16} />
          </button>

          <div className="w-16 h-16 bg-white text-[#15803d] rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
            <Store size={32} strokeWidth={2.2} />
          </div>

          <h1 className="text-xl font-bold tracking-wide">เลือกสาขาเข้าใช้งาน</h1>
          <p className="text-xs text-emerald-100 mt-0.5 font-light">
            ยินดีต้อนรับ {currentUser?.name || 'เจ้าของร้าน'}
          </p>
        </div>

        {/* รายชื่อสาขา */}
        <div className="p-5 flex-1 space-y-3 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              สาขาที่คุณมีสิทธิ์เข้าถึง ({branches.length}/{maxBranches})
            </p>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              โควต้า {maxBranches} สาขา
            </span>
          </div>

          {branches.map((shop) => (
            <button
              key={shop.id}
              onClick={() => onSelectBranch(shop)}
              className="w-full p-4 bg-gray-50 hover:bg-emerald-50/70 border border-gray-200 hover:border-emerald-500 rounded-2xl flex items-center justify-between transition group text-left shadow-sm active:scale-[0.98]"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white text-emerald-700 rounded-xl shadow-sm border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm group-hover:text-emerald-900">
                    {shop.shop_name}
                  </h3>
                  <p className="text-[11px] text-gray-400">รัศมีลงงาน {shop.radius_meters} เมตร</p>
                </div>
              </div>
              <CheckCircle2 size={18} className="text-emerald-600 opacity-0 group-hover:opacity-100 transition" />
            </button>
          ))}

          {/* ปุ่มเพิ่มสาขาใหม่ */}
          <button
            onClick={handleAddClick}
            className={`w-full p-4 border rounded-2xl flex items-center justify-between transition mt-4 active:scale-[0.98] ${
              canAddBranch
                ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-300 text-emerald-800'
                : 'bg-amber-50/60 hover:bg-amber-100/80 border-dashed border-amber-300 text-amber-800'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2.5 rounded-xl ${canAddBranch ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200/80'}`}>
                <Plus size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-sm">
                  {canAddBranch ? 'เพิ่มสาขาใหม่ (มีโควต้า)' : 'เพิ่ม / ขยายสาขาใหม่'}
                </h3>
                <p className={`text-[10px] ${canAddBranch ? 'text-emerald-700 font-semibold' : 'text-amber-600'}`}>
                  {canAddBranch ? 'คลิกเพื่อตั้งชื่อร้านและตั้งค่าพิกัด' : 'สิทธิ์ครบแล้ว ติดต่อผู้พัฒนาเพื่อเพิ่มสิทธิ์'}
                </p>
              </div>
            </div>
            {canAddBranch ? (
              <span className="text-xs bg-[#15803d] text-white px-2.5 py-1 rounded-xl font-bold">ปลดล็อกแล้ว</span>
            ) : (
              <Lock size={18} className="text-amber-600" />
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 text-center border-t text-xs text-gray-400 shrink-0">
          ต้องการขยายโควต้าสาขา ติดต่อทีมงานผู้พัฒนา
        </div>

      </div>

      {/* POPUP 1: กรอกข้อมูลสร้างสาขาเอง (เมื่อปลดล็อกสิทธิ์แล้ว) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full space-y-3.5 shadow-2xl text-xs">
            <div className="flex justify-between items-center border-b pb-2.5">
              <h3 className="font-extrabold text-sm text-gray-800 flex items-center space-x-1.5">
                <Store size={16} className="text-[#15803d]" />
                <span>เพิ่มข้อมูลสาขาใหม่</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">ชื่อสาขา / ชื่อร้าน</label>
                <input
                  type="text"
                  placeholder="เช่น ร้านกาแฟ TT สาขา 2"
                  value={newShop.shop_name}
                  onChange={(e) => setNewShop({ ...newShop, shop_name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-gray-700">พิกัด GPS ร้านค้า</label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="text-[10px] text-emerald-700 font-bold flex items-center space-x-0.5 hover:underline"
                  >
                    <MapPin size={12} />
                    <span>ดึงพิกัดปัจจุบัน</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude"
                    value={newShop.latitude}
                    onChange={(e) => setNewShop({ ...newShop, latitude: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-[11px]"
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude"
                    value={newShop.longitude}
                    onChange={(e) => setNewShop({ ...newShop, longitude: e.target.value })}
                    className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-[11px]"
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
                  className="w-full p-2.5 border rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-mono text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md transition text-xs active:scale-95 disabled:bg-gray-400 mt-1"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึกเปิดใช้งานสาขา'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POPUP 2: แจ้งเตือนซื้อโควต้าเพิ่ม (เมื่อใช้สิทธิ์ครบแล้ว) */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-800">สิทธิ์จำนวนสาขาเต็มแล้ว</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                คุณใช้งานสิทธิ์ครบ {maxBranches} สาขาแล้ว หากต้องการเพิ่มสาขาใหม่ กรุณาติดต่อทีมงานเพื่อซื้อโควต้าปลดล็อกสาขาเพิ่ม
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-left space-y-1">
              <p className="text-[11px] font-bold text-emerald-800 flex items-center space-x-1">
                <PhoneCall size={12} />
                <span>ช่องทางซื้อโควต้าเพิ่ม:</span>
              </p>
              <p className="text-xs text-emerald-700 font-mono">LINE: @yourdeveloper</p>
              <p className="text-xs text-emerald-700 font-mono">โทร: 08X-XXX-XXXX</p>
            </div>
            <button
              onClick={() => setShowContactModal(false)}
              className="w-full py-3 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs active:scale-95 transition shadow-md"
            >
              ตกลง / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

    </div>
  );
}