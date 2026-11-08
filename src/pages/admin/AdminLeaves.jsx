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
    setLoading(true);
    try {
      let query = supabase
        .from('leaves')
        .select(`
          *,
          users:user_id (
            name,
            position,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedBranch?.id) {
        query = query.eq('shop_id', selectedBranch.id);
      }

      const { data, error } = await query;
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
    try {
      const { error } = await supabase
        .from('leaves')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

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
    <div className="min-h-screen bg-gray-100 flex justify-center items-start p-0 sm:p-4">
      {/* กรอบมือถือล็อคขนาดคงที่ */}
      <div className="w-full max-w-sm bg-gray-50 h-screen sm:h-[720px] sm:rounded-[36px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
        
        {/* เนื้อหาภายใน Scroll ได้ */}
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
                <h1 className="font-extrabold text-base leading-tight">คำขอลางาน</h1>
                <p className="text-[11px] text-emerald-100 font-light">
                  สาขา: {selectedBranch?.shop_name || 'สาขาหลัก'}
                </p>
              </div>
            </div>
          </div>

          {/* แจ้งเตือนอัปเดตสำเร็จ */}
          {successToast && (
            <div className="m-4 mb-0 p-3.5 bg-purple-100 border border-purple-300 text-purple-800 rounded-2xl text-xs font-bold flex items-center space-x-2 shadow-sm animate-in fade-in zoom-in duration-200">
              <CheckCircle2 size={18} />
              <span>อนุมัติ/ปฏิเสธคำขอลางานเรียบร้อยแล้ว</span>
            </div>
          )}

          {/* Filter Tabs (รออนุมัติ / อนุมัติแล้ว / ปฏิเสธ) */}
          <div className="p-4 pb-2">
            <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
              <button
                onClick={() => setFilterStatus('pending')}
                className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  filterStatus === 'pending'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
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

          {/* รายการคำขอลางาน */}
          <div className="p-4 space-y-3 pt-1">
            {loading ? (
              <div className="text-center py-10 text-xs text-gray-400">กำลังโหลดรายการคำขอ...</div>
            ) : displayedList.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-400">ไม่พบรายการคำขอลางานในหมวดนี้</div>
            ) : (
              displayedList.map((item) => {
                const user = item.users || {};
                const daysCount = calculateDays(item.start_date, item.end_date);

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
                          <p className="text-[10px] text-gray-400">{user.position || 'พนักงาน'}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-[11px] rounded-xl border border-purple-100">
                        {item.leave_type || 'ลากิจ'}
                      </span>
                    </div>

                    {/* ช่วงวันที่ลา */}
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-gray-700 font-medium">
                        <Calendar size={15} className="text-purple-600" />
                        <span>{item.start_date} ถึง {item.end_date}</span>
                      </div>
                      <span className="font-extrabold text-purple-700 font-mono bg-white px-2 py-0.5 rounded-lg border border-purple-100">
                        {daysCount} วัน
                      </span>
                    </div>

                    {/* เหตุผลการลา */}
                    {item.reason && (
                      <div className="bg-gray-50/70 p-2.5 rounded-xl border border-gray-100 text-xs text-gray-600">
                        <span className="font-bold text-gray-700">เหตุผล: </span>
                        <span>{item.reason}</span>
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
                          className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1 shadow-md transition active:scale-95"
                        >
                          <Check size={15} />
                          <span>อนุมัติการลา</span>
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