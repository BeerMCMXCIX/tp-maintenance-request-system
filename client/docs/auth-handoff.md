# บัญชีผู้ใช้ สิทธิ์ และ Log

## เข้าใช้งาน

ทุกหน้าของระบบและ API คำขอต้อง Login ด้วยรหัส User/Password ไม่มีสมัครสมาชิก บัญชีใหม่สร้างได้เฉพาะ ADMIN หรือผู้มี MANAGE_USERS

Session อายุ 8 ชั่วโมง เก็บใน sessionStorage ของแท็บ (ไม่ใช้ localStorage) รีเฟรชแท็บเดิมได้ แต่การเปิดแท็บใหม่ตามปกติต้อง Login ใหม่ เบราว์เซอร์ที่กู้คืนหรือทำสำเนาแท็บอาจกู้ sessionStorage ด้วย ระบบตรวจ session กับ server ก่อนแสดงข้อมูลเสมอ ใช้ HTTPS เมื่อใช้งานจริง

## บัญชีและสิทธิ์

- ข้อมูลบัญชี: รหัส User, ชื่อผู้ใช้งาน, Password, แผนก, สาขา, บทบาท และสถานะใช้งาน
- USER: สร้าง/ดูคำขอและพิมพ์เอกสาร ไม่เปลี่ยนสถานะงาน
- IT: ตรวจสอบคำขอ ปิดงานซ่อม หรือส่งขออนุมัติ
- PROCUREMENT: อนุมัติ/ไม่อนุมัติและดำเนินการจัดซื้อ
- ADMIN: จัดการทุกส่วนตาม workflow
- MANAGE_USERS: สร้าง/แก้ไข/ระงับ/ลบผู้ใช้และรีเซ็ต Password
- MANAGE_PERMISSIONS: มอบ/ถอนสิทธิ์เพิ่มเติม เปลี่ยนบทบาทผ่านการแก้บัญชีต้องมี MANAGE_USERS ด้วย
- VIEW_LOGS: ดูประวัติการใช้งาน

เฉพาะ ADMIN สร้างหรือกำหนด ADMIN ได้ ผู้ได้รับมอบสิทธิ์จัดการไม่ได้จัดการบัญชี ADMIN หรือบัญชีที่มีสิทธิ์จัดการมากกว่าตนเอง และมอบสิทธิ์ที่ตนเองไม่มีไม่ได้ ไม่ให้ลบ/ปิดบัญชีตนเอง และต้องมี ADMIN ใช้งานได้อย่างน้อยหนึ่งคน

เปลี่ยน Password ของตนผ่านเมนูบัญชีของฉันโดยยืนยัน Password เดิม ผู้มีสิทธิ์รีเซ็ตให้ได้โดยไม่ต้องรู้ Password เดิม รหัสผ่านยาว 8–128 ตัวอักษร การแก้บัญชี/สิทธิ์/รหัสผ่านจะยกเลิก session ของบัญชีนั้นทุกอุปกรณ์

การลบเป็น soft delete: บัญชี Login ไม่ได้และหายจากรายการ แต่เก็บข้อมูลเพื่อรักษาประวัติ รหัส User เดิมยังถูกสงวนไว้ ไม่สร้างซ้ำ ไม่มีหน้ากู้คืนบัญชีที่ลบ หากต้องการหยุดชั่วคราวให้เอาเครื่องหมายเปิดใช้งานออก

แผนกและสาขาเป็นข้อความในบัญชี ยังไม่ใช่ master data แยก บัญชีเดิมมีค่าเริ่มต้นว่าง ให้ผู้ดูแลแก้ข้อมูลภายหลัง ทุกบัญชีที่เข้าสู่ระบบดูคำขอภายในได้ ยังไม่มีการแยกการมองเห็นตามสาขา

## Log

บันทึกเวลา ผู้ดำเนินการ เป้าหมาย และรายละเอียดเหตุการณ์ ได้แก่ Login สำเร็จ/รหัสผิด, Logout, สร้าง/แก้/ลบบัญชี, เปลี่ยนสิทธิ์, เปลี่ยน/รีเซ็ต Password, สร้างคำขอและเปลี่ยนสถานะงาน ไม่บันทึก Password, password hash หรือ token ไม่มี API แก้หรือลบ Log

Log เริ่มเก็บหลังใช้เวอร์ชันนี้ ไม่สร้างย้อนหลัง ไม่ใช่ access log ทุก HTTP request และไม่มีระบบ retention/จัดเก็บนอกฐานข้อมูลในเวอร์ชันนี้

## API

ทุก endpoint ใช้ Authorization: Bearer token ยกเว้น Login, health และ bootstrap ADMIN คนแรกที่ต้องใช้ X-Bootstrap-Key

- POST /api/auth/login: username, password
- GET /api/auth/me
- POST /api/auth/logout
- PUT /api/auth/password: currentPassword, password
- GET /api/users?page=1&search=
- POST /api/users: username, password, displayName, department, branch, role
- PUT /api/users/:id: username, displayName, department, branch, role, active
- PUT /api/users/:id/permissions: permissions (array ของชื่อสิทธิ์)
- PUT /api/users/:id/password: password
- DELETE /api/users/:id
- GET /api/audit-logs?page=1&search=

## Postman และบัญชีแรก

Import TP-Auth.postman_collection.json แล้วตั้ง baseUrl, bootstrapKey, adminUsername, adminPassword, department และ branch ก่อนส่งรายการ 1 เฉพาะกรณียังไม่มีผู้ใช้
หากมี ADMIN แล้วให้ Login ผ่านหน้าเว็บได้เลย หรือส่งรายการ 2 ใน Postman

บัญชีแรกใช้ USER_BOOTSTRAP_KEY บน server (รองรับชื่อเดิม STAFF_ACCESS_KEY) และต้องเป็น ADMIN เท่านั้น เมื่อมีบัญชีแล้ว bootstrap ใช้สร้างบัญชีเพิ่มไม่ได้

ตั้ง username, password, displayName, department, branch, role ก่อนส่งรายการสร้างผู้ใช้ รักษาค่าลับไว้เฉพาะเครื่อง อย่าแชร์หรือ commit collection ที่มีรหัสผ่านหรือ token จริง

Migration 202609090001_user_management เพิ่มข้อมูล User และตาราง AuditLog โดยไม่ลบข้อมูลเดิม ต้อง generate Prisma Client และ restart server หลังอัปเดตโค้ด

ไม่มีการสร้างบัญชีหรือข้อมูลทดสอบให้ ผู้ใช้ทดสอบการใช้งานเอง
