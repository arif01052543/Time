export default async function handler(req, res) {
    try {
      const appId = (process.env.ONESIGNAL_APP_ID || '').trim();
      const apiKey = (process.env.ONESIGNAL_REST_API_KEY || '').trim();
      const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
      const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  
      if (!appId || !apiKey) {
        console.error('Missing OneSignal Env Vars');
        return res.status(500).json({ error: 'Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY' });
      }
  
      // รองรับทั้ง API Key แบบใหม่ (os_v2_...) และแบบเก่า
      const authHeader = apiKey.startsWith('os_v2_') ? `Key ${apiKey}` : `Basic ${apiKey}`;
  
      let title = '';
      let message = '';
  
      // ลิงก์ทดสอบด่วนผ่านเบราว์เซอร์ (?test=1)
      if (req.method === 'GET' && req.query?.test === '1') {
        title = '🔔 ทดสอบระบบแจ้งเตือน';
        message = 'เชื่อมต่อ Vercel และ OneSignal สำเร็จแล้ว!';
      } else if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { table, type, record, old_record } = body || {};
  
        console.log('Webhook received:', { table, type, recordId: record?.id });
  
        if (!record) {
          return res.status(200).json({ message: 'No record' });
        }
  
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
  
        // 1. แจ้งเตือนเข้างาน / ออกงาน (ตาราง time_entries)
        if (table === 'time_entries') {
          const hadOut = old_record?.clock_out || old_record?.check_out;
          const hasOut = record.clock_out || record.check_out;
  
          if (type === 'INSERT') {
            title = '🟢 ลงเวลาเข้างาน';
            message = `${empName} บันทึกเวลาเข้างานเรียบร้อยแล้ว`;
          } else if (type === 'UPDATE' && !hadOut && hasOut) {
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
      } else {
        return res.status(405).json({ error: 'Method Not Allowed' });
      }
  
      // ส่งแจ้งเตือนผ่าน OneSignal API ไปยังเครื่องที่มี Tag role = admin
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          app_id: appId,
          headings: { en: title, th: title },
          contents: { en: message, th: message },
          url: 'https://timetrack-rust-nu.vercel.app',
          filters: [
            { field: 'tag', key: 'role', relation: '=', value: 'admin' },
          ],
        }),
      });
  
      const result = await response.json();
      console.log('OneSignal response:', response.status, JSON.stringify(result));
  
      if (!response.ok) {
        return res.status(response.status).json({ success: false, result });
      }
  
      return res.status(200).json({ success: true, result });
    } catch (error) {
      console.error('Notification Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }