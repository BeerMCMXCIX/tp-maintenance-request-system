# TP IT Service — Server

Express 5 + TypeScript + Prisma 6 / MySQL ระบบแจ้งซ่อมและขออุปกรณ์ พร้อมข้อมูลสำหรับพิมพ์ใบขออนุมัติจัดซื้อ

## ขอบเขต

- กรอกผู้ขอ แผนก ช่องทางติดต่อ สถานที่ รหัสทรัพย์สิน อาการเสีย และรายการอุปกรณ์พร้อมราคาประมาณการ (ไม่ทราบราคาให้เว้นว่าง)
- เลขเอกสาร `TP-IT-YYYY-ID` ใช้ปี ค.ศ. ตามเวลาไทยและ ID ฐานข้อมูล ไม่ซ้ำกัน วันที่บนเอกสารแสดงภาษาไทย
- พิมพ์เอกสาร A4 เพื่อนำไปเซ็น การเปลี่ยนเป็น APPROVED คือบันทึกว่าได้รับเอกสารลงนามแล้ว ไม่ใช่ลายเซ็นดิจิทัล
- เจ้าหน้าที่ Login ด้วย Username/Password ระบบเก็บรหัสผ่านด้วย scrypt hash และออก session token อายุ 8 ชั่วโมง
- ไม่มีการลบเอกสารจากหน้าเว็บ ใช้ CANCELLED เพื่อรักษาประวัติ
- การดูและสร้างคำขอเปิดให้ผู้ใช้เครือข่ายภายใน ส่วนการเปลี่ยนสถานะใช้ Role `ADMIN`, `IT`, `PROCUREMENT` และบันทึกชื่อจากบัญชีที่ Login เหมาะสำหรับเครือข่ายบริษัท/VPN และควรใช้ HTTPS เมื่อนำขึ้นใช้งาน

## เริ่มใช้งาน

1. `npm install`
2. สร้าง `.env` ตาม `.env.example` ตั้ง `DATABASE_URL` เป็นฐานข้อมูล MySQL
3. ตั้ง `USER_BOOTSTRAP_KEY` เป็นค่าสุ่มอย่างน้อย 16 ตัวอักษรใน `.env.local` หรือ environment ของ server ใช้สำหรับสร้าง ADMIN คนแรกผ่าน Postman
4. ตั้ง `CLIENT_ORIGINS` เป็น origin ของหน้าเว็บ คั่นหลายค่าด้วย comma
5. ใช้ขั้นตอนฐานข้อมูลด้านล่าง แล้ว `npm run db:generate`
6. `npm run dev` หรือ `npm run build` แล้ว `npm start` (พอร์ตเริ่มต้น 5000)

workspace เดิมมีค่าสุ่มใน `.env.local` แล้ว และ server รองรับชื่อเดิม `STAFF_ACCESS_KEY` เป็น bootstrap key ชั่วคราว ไฟล์นี้ถูก ignore จาก Git หลังสร้าง ADMIN คนแรกให้เปลี่ยนเป็น `USER_BOOTSTRAP_KEY` ใหม่หรือเอาค่านี้ออก แล้ว restart server

## ฐานข้อมูล

ฐานข้อมูลใหม่: `npm run db:migrate` สร้างตารางทั้งหมด

ฐานข้อมูลเดิมก่อนมี migrations: ตรวจว่ามีตาราง RepairTicket ตาม schema เดิม และสำรองข้อมูลก่อนดำเนินการ ใช้ `npx prisma migrate resolve --applied 202609080001_baseline` **ครั้งเดียว** เพื่อระบุว่าตารางเดิมมีอยู่แล้ว จากนั้น `npm run db:migrate`

ฐานข้อมูลใน workspace นี้ได้ baseline และ apply migration แล้ว ไม่ต้อง resolve ซ้ำ Migration เพิ่มคอลัมน์และตารางโดยไม่ลบแถวเดิม ข้อมูลเดิมที่ไม่มีผู้ขอ/แผนกจะแสดงว่าไม่ได้ระบุ ไม่สร้างประวัติย้อนหลังขึ้นเอง

## Workflow

`PENDING → IN_REVIEW → AWAITING_APPROVAL → APPROVED → PURCHASING → COMPLETED`

ซ่อมเสร็จไม่ต้องซื้อ: `IN_REVIEW → COMPLETED` ผลไม่อนุมัติเป็น `REJECTED` งานที่ยังไม่สิ้นสุดยกเลิกได้เป็น `CANCELLED` การส่งขออนุมัติต้องมีรายการอุปกรณ์อย่างน้อยหนึ่งรายการ

การเปลี่ยนสถานะต้องมี `note`, `version` ล่าสุด ส่วน `actor` ดึงจากบัญชีที่ Login API ตรวจลำดับ Role และป้องกันการแก้ไขชนกันภายใน transaction

สิทธิ์ของ Role:

- `IT`: `PENDING → IN_REVIEW` และจาก `IN_REVIEW` ส่งอนุมัติ ปิดงานซ่อม หรือยกเลิก
- `PROCUREMENT`: อนุมัติ/ไม่อนุมัติ เริ่มจัดซื้อ ปิดงานจัดซื้อ หรือยกเลิกในขั้นตอนจัดซื้อ
- `ADMIN`: เปลี่ยนสถานะได้ทุกขั้นตาม workflow และสร้าง User

## API

- `GET /api/health`
- `POST /api/auth/login` รับ `{username, password}` และคืน `{token, expiresAt, user}`
- `GET /api/auth/me` ตรวจ session ปัจจุบันด้วย Bearer token
- `POST /api/auth/logout` ยกเลิก session ปัจจุบัน
- `POST /api/users` สร้าง User; บัญชีแรกใช้ `X-Bootstrap-Key` และต้องเป็น ADMIN บัญชีถัดไปใช้ Bearer token ของ ADMIN
- `GET /api/tickets?page=1&limit=10&search=...&status=PENDING&sortBy=createdAt&order=desc` ค้นหาจากข้อมูลทั้งหมด `stats` เป็นยอดรวมทุกแผนก ไม่จำกัดตามตัวกรอง
- `GET /api/tickets/:id` รายละเอียด รายการอุปกรณ์ ประวัติ และ allowedTransitions
- `POST /api/tickets` สร้างคำขอพร้อมข้อมูลผู้ขอและ items
- `PUT /api/tickets/:id` บันทึก `{status, note, version}` ต้อง Login และมี Role ที่ทำขั้นตอนนั้นได้

Response ใช้ `{success: true, data: ...}` หรือ `{success: false, error: ...}` รายการมี `pagination` และ `stats` เพิ่มเติม ไม่มี DELETE endpoint

## สร้าง User ด้วย Postman

สร้าง ADMIN คนแรก (ใช้ได้เมื่อยังไม่มี User):

```http
POST http://localhost:5000/api/users
Content-Type: application/json
X-Bootstrap-Key: <ค่าจาก USER_BOOTSTRAP_KEY หรือค่าเดิมใน .env.local>

{
  "username": "admin",
  "password": "รหัสผ่านอย่างน้อย 8 ตัว",
  "displayName": "ผู้ดูแลระบบ",
  "role": "ADMIN"
}
```

Login เพื่อรับ token:

```http
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "รหัสผ่านของคุณ"
}
```

คัดลอก `data.token` แล้วสร้าง User คนถัดไป:

```http
POST http://localhost:5000/api/users
Content-Type: application/json
Authorization: Bearer <data.token>

{
  "username": "it01",
  "password": "รหัสผ่านอย่างน้อย 8 ตัว",
  "displayName": "สมชาย ฝ่าย IT",
  "role": "IT"
}
```

เปลี่ยน `role` เป็น `PROCUREMENT` สำหรับฝ่ายจัดซื้อ Username ไม่สนตัวพิมพ์ใหญ่/เล็กและใช้เฉพาะตัวอักษรอังกฤษ ตัวเลข จุด ขีดกลาง และขีดล่าง ห้ามส่ง password จริงใน URL หรือบันทึกลง Git

## ทดสอบ

`npm test` ตรวจ input และ workflow โดยไม่เขียนฐานข้อมูล

Integration test: PowerShell ใช้ `$env:RUN_DB_TESTS='1'` แล้ว `npm test` สร้างข้อมูล QA ในฐานข้อมูล `.env` และลบเฉพาะ ID ที่ตัวทดสอบสร้างใน finally ใช้ฐานข้อมูล development/test เท่านั้น เลข auto-increment อาจมีช่องว่างหลังทดสอบ ซึ่งไม่กระทบความไม่ซ้ำ

## Git ของโครงการเดิม

พบว่า `.env` และบางไฟล์ใน `node_modules` ถูกติดตามมาก่อนแล้ว `.gitignore` ไม่เลิกติดตามไฟล์เหล่านี้โดยอัตโนมัติ Bootstrap key อยู่เฉพาะ `.env.local` ก่อนเผยแพร่ repository ควรนำ secrets และ dependency ที่ generate ได้ออกจากการติดตาม และเปลี่ยนรหัสที่เคยเผยแพร่
