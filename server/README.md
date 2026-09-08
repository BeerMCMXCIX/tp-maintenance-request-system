# TP IT Service — Server

Express 5 + TypeScript + Prisma 6 / MySQL ระบบแจ้งซ่อมและขออุปกรณ์ พร้อมข้อมูลสำหรับพิมพ์ใบขออนุมัติจัดซื้อ

## ขอบเขต

- กรอกผู้ขอ แผนก ช่องทางติดต่อ สถานที่ รหัสทรัพย์สิน อาการเสีย และรายการอุปกรณ์พร้อมราคาประมาณการ (ไม่ทราบราคาให้เว้นว่าง)
- เลขเอกสาร `TP-IT-YYYY-ID` ใช้ปี ค.ศ. ตามเวลาไทยและ ID ฐานข้อมูล ไม่ซ้ำกัน วันที่บนเอกสารแสดงภาษาไทย
- พิมพ์เอกสาร A4 เพื่อนำไปเซ็น การเปลี่ยนเป็น APPROVED คือบันทึกว่าได้รับเอกสารลงนามแล้ว ไม่ใช่ลายเซ็นดิจิทัล
- เจ้าหน้าที่ใช้รหัสร่วม `STAFF_ACCESS_KEY` บันทึกสถานะ ชื่อผู้บันทึก และหมายเหตุ รหัสในหน้าเว็บอยู่ในหน่วยความจำ ไม่เก็บใน localStorage
- ไม่มีการลบเอกสารจากหน้าเว็บ ใช้ CANCELLED เพื่อรักษาประวัติ
- การดูและสร้างคำขอเปิดให้ผู้ใช้เครือข่ายภายใน ยังไม่มีบัญชีรายบุคคลหรือสิทธิ์แยกแผนก ชื่อผู้บันทึกเป็นข้อมูลที่เจ้าหน้าที่กรอก ไม่ใช่หลักฐานยืนยันตัวบุคคล เหมาะสำหรับเครือข่ายบริษัท/VPN และควรใช้ HTTPS เมื่อนำขึ้นใช้งาน

## เริ่มใช้งาน

1. `npm install`
2. สร้าง `.env` ตาม `.env.example` ตั้ง `DATABASE_URL` เป็นฐานข้อมูล MySQL
3. ตั้ง `STAFF_ACCESS_KEY` เป็นค่าสุ่มอย่างน้อย 16 ตัวอักษรใน `.env.local` หรือ environment ของ server แล้วแจ้งรหัสให้เฉพาะเจ้าหน้าที่ IT / จัดซื้อ สร้างได้ด้วย `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
4. ตั้ง `CLIENT_ORIGINS` เป็น origin ของหน้าเว็บ คั่นหลายค่าด้วย comma
5. ใช้ขั้นตอนฐานข้อมูลด้านล่าง แล้ว `npm run db:generate`
6. `npm run dev` หรือ `npm run build` แล้ว `npm start` (พอร์ตเริ่มต้น 5000)

workspace นี้สร้างรหัสเจ้าหน้าที่ไว้ใน `.env.local` แล้ว ไฟล์นี้ถูก ignore จาก Git และโหลดโดย server อัตโนมัติ หากไม่ได้ตั้งรหัสจะรับคำขอ/พิมพ์ได้ แต่การบันทึกสถานะถูกปิด ต้อง restart server หลังเปลี่ยนค่า

## ฐานข้อมูล

ฐานข้อมูลใหม่: `npm run db:migrate` สร้างตารางทั้งหมด

ฐานข้อมูลเดิมก่อนมี migrations: ตรวจว่ามีตาราง RepairTicket ตาม schema เดิม และสำรองข้อมูลก่อนดำเนินการ ใช้ `npx prisma migrate resolve --applied 202609080001_baseline` **ครั้งเดียว** เพื่อระบุว่าตารางเดิมมีอยู่แล้ว จากนั้น `npm run db:migrate`

ฐานข้อมูลใน workspace นี้ได้ baseline และ apply migration แล้ว ไม่ต้อง resolve ซ้ำ Migration เพิ่มคอลัมน์และตารางโดยไม่ลบแถวเดิม ข้อมูลเดิมที่ไม่มีผู้ขอ/แผนกจะแสดงว่าไม่ได้ระบุ ไม่สร้างประวัติย้อนหลังขึ้นเอง

## Workflow

`PENDING → IN_REVIEW → AWAITING_APPROVAL → APPROVED → PURCHASING → COMPLETED`

ซ่อมเสร็จไม่ต้องซื้อ: `IN_REVIEW → COMPLETED` ผลไม่อนุมัติเป็น `REJECTED` งานที่ยังไม่สิ้นสุดยกเลิกได้เป็น `CANCELLED` การส่งขออนุมัติต้องมีรายการอุปกรณ์อย่างน้อยหนึ่งรายการ

การเปลี่ยนสถานะต้องมี `actor`, `note`, `version` ล่าสุด API ตรวจลำดับและป้องกันการแก้ไขชนกันภายใน transaction

## API

- `GET /api/health`
- `POST /api/staff/verify` ตรวจรหัสด้วย header `Authorization: Bearer ...`
- `GET /api/tickets?page=1&limit=10&search=...&status=PENDING&sortBy=createdAt&order=desc` ค้นหาจากข้อมูลทั้งหมด `stats` เป็นยอดรวมทุกแผนก ไม่จำกัดตามตัวกรอง
- `GET /api/tickets/:id` รายละเอียด รายการอุปกรณ์ ประวัติ และ allowedTransitions
- `POST /api/tickets` สร้างคำขอพร้อมข้อมูลผู้ขอและ items
- `PUT /api/tickets/:id` บันทึก `{status, actor, note, version}` ต้องใช้รหัสเจ้าหน้าที่

Response ใช้ `{success: true, data: ...}` หรือ `{success: false, error: ...}` รายการมี `pagination` และ `stats` เพิ่มเติม ไม่มี DELETE endpoint

## ทดสอบ

`npm test` ตรวจ input และ workflow โดยไม่เขียนฐานข้อมูล

Integration test: PowerShell ใช้ `$env:RUN_DB_TESTS='1'` แล้ว `npm test` สร้างข้อมูล QA ในฐานข้อมูล `.env` และลบเฉพาะ ID ที่ตัวทดสอบสร้างใน finally ใช้ฐานข้อมูล development/test เท่านั้น เลข auto-increment อาจมีช่องว่างหลังทดสอบ ซึ่งไม่กระทบความไม่ซ้ำ

## Git ของโครงการเดิม

พบว่า `.env` และบางไฟล์ใน `node_modules` ถูกติดตามมาก่อนแล้ว `.gitignore` ไม่เลิกติดตามไฟล์เหล่านี้โดยอัตโนมัติ รหัสเจ้าหน้าที่ที่เพิ่มอยู่เฉพาะ `.env.local` ก่อนเผยแพร่ repository ควรนำ secrets และ dependency ที่ generate ได้ออกจากการติดตาม และเปลี่ยนรหัสที่เคยเผยแพร่
