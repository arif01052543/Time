export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
  
    try {
      const { table, type, record, old_record } = req.body;
      if (!record) return res.status(200).json({ message: 'No record' });
  
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  
      // ดึงชื่อพนักงานจากตาราง users
      let empName = 'พนักงาน';
      if (record.user_id && supabaseUrl && supabaseKey) {
        const userRes = await fetch(
          `${supabaseUrl}/rest/v1/users?id=eq.${record.user_id}&select=name`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        const users = await userRes.json();
        if (users?.[0]?.name) empName = users[0].name;
      }
  
      let title = '';
      let message = '';
  
      // 1. แจ้งเตือนเข้างาน / ออกงาน (ตาราง time_entries)
      if (table === 'time_entries') {
        if (type === 'INSERT') {
          title = '🟢 ลงเวลาเข้างาน';
          message = `${empName} บันทึกเวลาเข้างานเรียบร้อยแล้ว`;
        } else if (type === 'UPDATE' && !old_record?.clock_out && record.clock_out) {
          title = '🔴 ลงเวลาออกงาน';
          message = `${empName} บันทึกเวลาออกงานเรียบร้อยแล้ว`;
        } else {
          return res.status(200).json({ message: 'Ignored update' });
        }
      }
  
      // 2. แจ้งเตือนคำขอลา (ตาราง leaves)
      else if (table === 'leaves' && type === 'INSERT') {
        title = '📄 มีคำขอลางานใหม่';
        message = `${empName} ยื่นขอ${record.leave_type || 'ลางาน'} (${record.start_date} ถึง ${record.end_date})`;
      }
  
      // 3. แจ้งเตือนคำขอเบิกเงิน (ตาราง advances)
      else if (table === 'advances' && type === 'INSERT') {
        title = '💸 มีคำขอเบิกเงินใหม่';
        message = `${empName} ขอเบิกเงินจำนวน ${Number(record.amount || 0).toLocaleString()} บาท`;
      } else {
        return res.status(200).json({ message: 'Event not handled' });
      }
  
      // ส่งแจ้งเตือนผ่าน OneSignal API ไปยังเครื่องที่มี Tag role = admin
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.ONESIGNAL_APP_ID,
          headings: { en: title, th: title },
          contents: { en: message, th: message },
          url: 'https://timetrack-rust-nu.vercel.app',
          filters: [
            { field: 'tag', key: 'role', relation: '=', value: 'admin' },
          ],
        }),
      });
  
      const result = await response.json();
      return res.status(200).json({ success: true, result });
    } catch (error) {
      console.error('Notification Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }