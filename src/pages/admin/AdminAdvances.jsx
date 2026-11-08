import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, Banknote, CheckCircle2, XCircle, 
  Clock, FileText, Check, X, QrCode, CreditCard,
  Home, Users, Calculator, Settings 
} from 'lucide-react';

export default function AdminAdvances({ selectedBranch, onBack, onTabChange }) {
  const [advances, setAdvances] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);

  // Modal แสดงสลิปหลักฐานโอนเงิน
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    fetchAdvances();
  }, [selectedBranch]);

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('advances')
        .select(`
          *,
          users:user_id (
            name,
            position,
            avatar_url,
            bank_name,
            bank_account_no,
            bank_account_name,
            qr_code_url
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedBranch?.id) {
        query = query.eq('shop_id', selectedBranch.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAdvances(data || []);
    } catch (err) {
      console.error('Error fetching advances:', err);
    } finally {
      setLoading(false);
    }
  };

  // อัปเดตสถานะ (อนุมัติ / ปฏิเสธ)
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('advances')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      fetchAdvances();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + (err.message || 'โปรดตรวจสอบสิทธิ์ Supabase'));
    }
  };

  const pendingList = advances.filter(a => a.status === 'pending');
  const approvedList = advances.filter(a => a.status === 'approved');
  const rejectedList = advances.filter(a => a.status === 'rejected');

  const displayedList = 
    filterStatus === 'pending' ? pendingList :
    filterStatus === 'approved' ? approvedList : rejectedList;

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-0 sm:p-4">
      {/* ล็อคขนาดกรอบมือถือ h-screen sm:h-[720px] ไม่ให้ยืดตามเนื้อหา */}
      <div className="w-full max-w-sm bg-gray-50 h-screen sm:h-[720px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
        
        {/* ส่วนเนื้อหาภายในที่สามารถ Scroll ได้ */}
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
                <h1 className="font-extrabold text-base leading-tight">ขอเบิกเงินล่วงหน้า</h1>
                <p className="text-[11px] text-emerald-100 font-light">
                  สาขา: {selectedBranch?.shop_name || 'สาขาหลัก'}
                </p>
              </div>
            </div>
          </div>

          {/* แจ้งเตือนอัปเดตสำเร็จ */}
          {successToast && (
            <div className="m-4 mb-0 p-3.5 bg-emerald-100 border border-emerald-300 text-[#15803d] rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-sm animate-in fade-in zoom-in duration-200">
              <CheckCircle2 size={18} />
              <span>อัปเดตรายการเบิกเงินเรียบร้อยแล้ว</span>
            </div>
          )}

          {/* Filter Tabs (รออนุมัติ / อนุมัติแล้ว / ปฏิเสธ) */}
          <div className="p-4 pb-2">
            <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  filterStatus === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Clock size={13} />
                <span>รออนุมัติ ({pendingList.length})</span>
              </button>

              <button
                onClick={() => setFilterStatus('approved')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  filterStatus === 'approved'
                    ? 'bg-emerald-50 text-[#15803d] border border-emerald-200/60'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <CheckCircle2 size={13} />
                <span>อนุมัติแล้ว ({approvedList.length})</span>
              </button>

              <button
                onClick={() => setFilterStatus('rejected')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  filterStatus === 'rejected'
                    ? 'bg-red-50 text-red-600 border border-red-200/60'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <XCircle size={13} />
                <span>ปฏิเสธ ({rejectedList.length})</span>
              </button>
            </div>
          </div>

          {/* รายการคำขอเบิกเงิน */}
          <div className="p-4 space-y-3 pt-1">
            {loading ? (
              <div className="text-center py-10 text-xs text-gray-400">กำลังโหลดรายการ...</div>
            ) : displayedList.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">ไม่พบรายการขอเบิกเงินในหมวดนี้</div>
            ) : (
              displayedList.map((item) => {
                const user = item.users || {};
                const createdDate = new Date(item.created_at);
                const dateStr = `${createdDate.getDate()}/${createdDate.getMonth() + 1}/${createdDate.getFullYear()} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center font-bold text-base border overflow-hidden shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{user.name ? user.name.charAt(0) : 'U'}</span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{user.name || 'พนักงาน'}</h3>
                          <p className="text-[10px] text-gray-400">
                            {user.position || 'พนักงาน'} • {dateStr}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-black text-[#15803d] font-mono">
                          ฿{Number(item.amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* เหตุผลการขอเบิก */}
                    {item.reason && (
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs text-gray-600">
                        <span className="font-bold text-gray-700">เหตุผล: </span>
                        <span>{item.reason}</span>
                      </div>
                    )}

                    {/* ข้อมูลบัญชีรับเงิน */}
                    {(user.bank_name || user.bank_account_no) && (
                      <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 text-[11px] space-y-0.5">
                        <div className="flex justify-between text-gray-600">
                          <span>บัญชีรับเงิน:</span>
                          <span className="font-bold text-emerald-800">{user.bank_name} {user.bank_account_no}</span>
                        </div>
                        {user.bank_account_name && (
                          <div className="flex justify-between text-gray-600">
                            <span>ชื่อบัญชี:</span>
                            <span className="font-semibold text-gray-700">{user.bank_account_name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ปุ่มอนุมัติ / ปฏิเสธ หรือ แสดงสถานะ */}
                    {item.status === 'pending' ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'rejected')}
                          className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs flex items-center justify-center space-x-1 border border-red-200/70 transition"
                        >
                          <X size={15} />
                          <span>ปฏิเสธ</span>
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(item.id, 'approved')}
                          className="py-2.5 bg-[#15803d] hover:bg-emerald-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1 shadow-md transition active:scale-95"
                        >
                          <Check size={15} />
                          <span>อนุมัติ & โอนเงิน</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1 flex justify-between items-center text-xs">
                        <span className="text-gray-400">สถานะ:</span>
                        <span className={`font-bold px-3 py-1 rounded-full text-[11px] ${
                          item.status === 'approved' 
                            ? 'bg-emerald-100 text-[#15803d]' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {item.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== BOTTOM NAVIGATION BAR (ล็อคตำแหน่งคงที่) ==================== */}
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