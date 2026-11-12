import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  ArrowLeft, Calendar, CheckCircle2, XCircle, 
  Clock, Check, X, FileText, User,
  Home, Users, Calculator, Settings 
} from 'lucide-react';

export default function AdminLeaves({ selectedBranch, onBack, onTabChange }) {
  const [leaves, setLeaves] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending'); // 'pending', 'approved', 'rejected'
  const [loading, setLoading] = useState(true);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    fetchLeaves();
  }, [selectedBranch]);

  const fetchLeaves = async () => {
    if (!selectedBranch?.id) {
      setLeaves([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('leaves')
        .select(`
          *,
          users:user_id (
            name,
            position,
            avatar_url
          )
        `)
        .eq('shop_id', selectedBranch.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeaves(data || []);
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  // อัปเดตสถานะ (อนุมัติ / ปฏิเสธ)
  const handleUpdateStatus = async (id, newStatus) => {
    if (!selectedBranch?.id) return;
    try {
      const { error } = await supabase
        .from('leaves')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('shop_id', selectedBranch.id);

      if (error) throw error;

      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
      fetchLeaves();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + (err.message || 'โปรดตรวจสอบสิทธิ์ Supabase'));
    }
  };

  // คำนวณจำนวนวันลา
  const calculateDays = (start, end) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const pendingList = leaves.filter(l => l.status === 'pending');
  const approvedList = leaves.filter(l => l.status === 'approved');
  const rejectedList = leaves.filter(l => l.status === 'rejected');

  const displayedList = 
    filterStatus === 'pending' ? pendingList :
    filterStatus === 'approved' ? approvedList : rejectedList;

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col relative overflow-x-hidden">
      
      {/* ส่วนเนื้อหาหลัก สามารถ Scroll ได้ */}
      <div className="flex-1 pb-24 w-full">
        
        {/* Header สีเขียวทรงโค้ง ขยายเต็มความกว้าง */}
        <div className="bg-[#15803d] p-5 sm:p-6 text-white rounded-b-[32px] sm:rounded-b-[40px] shadow-md sticky top-0 z-20 w-full">
          <div className="max-w-3xl mx-auto flex items-center space-x-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition backdrop-blur-sm cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg leading-tight">คำขอลางาน</h1>
              <p className="text-[11px] sm:text-xs text-emerald-100 font-light">
                สาขา: {selectedBranch?.shop_name || 'สาขาหลัก'}
              </p>
            </div>
          </div>
        </div>

        {/* คอนเทนเนอร์หลักตรงกลาง */}
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">

          {/* แจ้งเตือนอัปเดตสำเร็จ */}
          {successToast && (
            <div className="p-3.5 bg-purple-100 border border-purple-300 text-purple-800 rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-sm animate-in fade-in zoom-in duration-200">
              <CheckCircle2 size={18} />
              <span>อนุมัติ/ปฏิเสธคำขอลางานเรียบร้อยแล้ว</span>
            </div>
          )}

          {/* Filter Tabs (รออนุมัติ / อนุมัติแล้ว / ปฏิเสธ) */}
          <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                filterStatus === 'pending'
                  ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Clock size={14} />
              <span>รออนุมัติ ({pendingList.length})</span>
            </button>

            <button
              onClick={() => setFilterStatus('approved')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                filterStatus === 'approved'
                  ? 'bg-emerald-50 text-[#15803d] border border-emerald-200/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>อนุมัติแล้ว ({approvedList.length})</span>
            </button>

            <button
              onClick={() => setFilterStatus('rejected')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                filterStatus === 'rejected'
                  ? 'bg-red-50 text-red-600 border border-red-200/60'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <XCircle size={14} />
              <span>ปฏิเสธ ({rejectedList.length})</span>
            </button>
          </div>

          {/* รายการคำขอลางาน */}
          <div className="space-y-3 pt-1">
            {loading ? (
              <div className="text-center py-12 text-xs sm:text-sm text-gray-400">กำลังโหลดรายการคำขอ...</div>
            ) : displayedList.length === 0 ? (
              <div className="text-center py-16 text-xs sm:text-sm text-gray-400 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                ไม่พบรายการคำขอลางานในหมวดนี้
              </div>
            ) : (
              displayedList.map((item) => {
                const user = item.users || {};
                const daysCount = calculateDays(item.start_date, item.end_date);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-gray-100 space-y-3 relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-11 h-11 sm:w-13 sm:h-13 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center font-bold text-base sm:text-lg border overflow-hidden shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{user.name ? user.name.charAt(0) : 'U'}</span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold text-gray-800 text-sm sm:text-base">{user.name || 'พนักงาน'}</h3>
                          <p className="text-[10px] sm:text-xs text-gray-400">{user.position || 'พนักงาน'}</p>
                        </div>
                      </div>

                      <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl border border-purple-100">
                        {item.leave_type || 'ลากิจ'}
                      </span>
                    </div>

                    {/* ช่วงวันที่ลา */}
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center space-x-2 text-gray-700 font-medium">
                        <Calendar size={16} className="text-purple-600" />
                        <span>{item.start_date} ถึง {item.end_date}</span>
                      </div>
                      <span className="font-extrabold text-purple-700 font-mono bg-white px-2.5 py-0.5 rounded-lg border border-purple-100">
                        {daysCount} วัน
                      </span>
                    </div>

                    {/* เหตุผลการลา */}
                    {item.reason && (
                      <div className="bg-gray-50/70 p-3 rounded-2xl border border-gray-100 text-xs sm:text-sm text-gray-600">
                        <span className="font-bold text-gray-700">เหตุผล: </span>
                        <span>{item.reason}</span>
                      </div>
                    )}

                    {/* ปุ่มอนุมัติ / ปฏิเสธ หรือ แสดงสถานะ */}
                    {item.status === 'pending' ? (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'rejected')}
                          className="py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-1 border border-red-200/70 transition cursor-pointer"
                        >
                          <X size={16} />
                          <span>ปฏิเสธ</span>
                        </button>

                        <button
                          onClick={() => handleUpdateStatus(item.id, 'approved')}
                          className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center justify-center space-x-1 shadow-md transition active:scale-95 cursor-pointer"
                        >
                          <Check size={16} />
                          <span>อนุมัติการลา</span>
                        </button>
                      </div>
                    ) : (
                      <div className="pt-1 flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-gray-400">สถานะ:</span>
                        <span className={`font-bold px-3 py-1 rounded-full text-xs ${
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
      </div>

      {/* BOTTOM NAVIGATION BAR จัดกลางตามทุกขนาดหน้าจอ */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-white/95 backdrop-blur-md rounded-[28px] shadow-xl border border-gray-100 p-1.5 flex justify-around items-center z-30">
        <button
          onClick={() => onTabChange ? onTabChange('home') : onBack()}
          className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Home size={20} className="text-gray-400" />
          <span className="text-[10px] mt-0.5">หน้าแรก</span>
        </button>

        <button
          onClick={() => onTabChange ? onTabChange('employees') : onBack()}
          className="flex flex-col items-center py-1.5 px-3 rounded-2xl transition text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Users size={20} className="text-gray-400" />
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