import React, { useState, useEffect } from 'react';
import { supabase, setActiveShopId } from '../services/supabaseClient';
import { Store, Lock, CheckCircle2, PhoneCall, LogOut } from 'lucide-react';

export default function BranchSelect({ currentUser, onSelectBranch, onLogout }) {
  const [branches, setBranches] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);

  // ดึงโควต้าของลูกค้า (ถ้าไม่มีตั้งไว้ให้ = 1)
  const maxBranches = currentUser?.max_branches || 1;

  useEffect(() => {
    if (currentUser?.id) {
      setActiveShopId(''); // เคลียร์รหัสร้านเดิมตอนอยู่หน้าเลือกสาขา เพื่อให้โหลดได้ครบทุกสาขา
      fetchBranches();
    } else {
      setBranches([]);
    }
  }, [currentUser]);

  const fetchBranches = async () => {
    if (!currentUser?.id) {
      setBranches([]);
      return;
    }

    // ดึงทุกสาขาที่เป็น shop_id หลัก หรือมี owner_id ตรงกับแอดมินที่ล็อกอินเข้ามา
    const filters = [`owner_id.eq.${currentUser.id}`];
    if (currentUser.shop_id) {
      filters.push(`id.eq.${currentUser.shop_id}`);
    }

    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .or(filters.join(','))
      .order('created_at', { ascending: true });

    if (!error && data) {
      setBranches(data);
    }
  };

  const handleSelectBranch = (shop) => {
    setActiveShopId(shop.id);
    onSelectBranch(shop);
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
            onClick={() => handleSelectBranch(shop)}
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

        {/* ปุ่มติดต่อผู้พัฒนาเพื่อเพิ่มสาขา */}
        <button
          onClick={() => setShowContactModal(true)}
          className="w-full p-4 sm:p-5 border border-dashed border-amber-300 bg-amber-50/60 hover:bg-amber-100/80 text-amber-800 rounded-2xl flex items-center justify-between transition mt-4 active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 sm:p-3 rounded-xl shrink-0 bg-amber-200/80">
              <Lock size={22} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-sm sm:text-base">
                เพิ่ม / ขยายสาขาใหม่
              </h3>
              <p className="text-xs mt-0.5 text-amber-600">
                ติดต่อผู้พัฒนาเพื่อเปิดใช้งานสาขาเพิ่มเติม
              </p>
            </div>
          </div>
          <span className="text-xs bg-amber-600 text-white px-3 py-1 rounded-xl font-bold shrink-0">
            ติดต่อทีมงาน
          </span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-4 text-center border-t border-gray-100 text-xs sm:text-sm text-gray-400 shrink-0">
        ต้องการขยายสาขาเพิ่มเติม ติดต่อทีมงานผู้พัฒนา
      </div>

      {/* POPUP: แจ้งช่องทางติดต่อผู้พัฒนาเพื่อเพิ่มสาขา */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50 animate-in fade-in zoom-in duration-200">
          <div className="bg-white rounded-t-[32px] sm:rounded-[32px] p-6 max-w-md w-full text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Lock size={32} />
            </div>
            <div>
              <h3 className="font-bold text-lg sm:text-xl text-gray-800">ต้องการเพิ่ม / ขยายสาขา</h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                กรุณาติดต่อทีมงานผู้พัฒนาเพื่อแจ้งชื่อสาขาใหม่และเปิดสิทธิ์การใช้งานเพิ่มเติมให้ร้านของคุณ
              </p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-left space-y-1.5">
              <p className="text-xs sm:text-sm font-bold text-emerald-800 flex items-center space-x-1.5">
                <PhoneCall size={14} />
                <span>ช่องทางติดต่อผู้พัฒนา:</span>
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