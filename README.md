# Ant Database

เว็บแอปสำหรับค้นหาและจัดการข้อมูลการสำรวจมด พัฒนาด้วย Next.js App Router, TypeScript, Prisma ORM 7 และ PostgreSQL

## ฟีเจอร์ปัจจุบัน

- หน้าแรกแสดงตัวอย่างสถิติและบันทึกการสำรวจ
- สมัครสมาชิกด้วยชื่อ อีเมล และรหัสผ่าน
- เข้าสู่ระบบด้วยอีเมล/รหัสผ่านผ่าน Auth.js Credentials
- เข้าสู่ระบบด้วย Google OAuth
- API สมัครสมาชิกตรวจสอบข้อมูลด้วย Zod และแฮชรหัสผ่านก่อนบันทึก
- Prisma schema สำหรับผู้ใช้ ชนิดมด สถานที่ วิธีเก็บตัวอย่าง บันทึก และรูปภาพ

## สิ่งที่ต้องเตรียม

- Node.js รุ่น 20 ขึ้นไป
- npm
- PostgreSQL ที่แอปเชื่อมต่อได้
- Google OAuth Web client หากต้องการใช้ปุ่มเข้าสู่ระบบด้วย Google

## เริ่มต้นใช้งาน

ติดตั้ง dependencies:

```bash
npm install
```

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ แล้วกำหนดค่าต่อไปนี้:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
AUTH_SECRET="ใส่ค่าสุ่มที่สร้างด้านล่าง"
GOOGLE_CLIENT_ID="Google OAuth client ID"
GOOGLE_CLIENT_SECRET="Google OAuth client secret"
```

สร้างค่า `AUTH_SECRET` ด้วย Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

คัดลอกผลลัพธ์ไปใส่ใน `.env` โดยไม่ต้องส่ง secret หรือ credentials ไปยัง Git หรือแชต

ใน Google Cloud Console ให้สร้าง OAuth Client ID ชนิด **Web application** และเพิ่ม Authorized redirect URI นี้สำหรับการพัฒนาบนเครื่อง:

```text
http://localhost:3000/api/auth/callback/google
```

สร้าง Prisma Client และเตรียมฐานข้อมูล:

```bash
npx prisma generate
npx prisma db push
```

`db push` จะปรับ schema ของฐานข้อมูลที่ระบุใน `DATABASE_URL` โดยตรง ก่อนใช้กับฐานข้อมูลที่มีข้อมูลอยู่แล้ว ให้สำรองข้อมูลและตรวจข้อความเตือนทุกครั้ง ห้ามใช้ `--force-reset` หรือ `--accept-data-loss` โดยไม่เข้าใจผลกระทบ

เริ่มเซิร์ฟเวอร์สำหรับพัฒนา:

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000)

บน Windows PowerShell หากคำสั่ง `npx` ถูกบล็อกโดย Execution Policy ให้ใช้ `npx.cmd` เช่น `npx.cmd prisma generate`

## คำสั่งที่ใช้บ่อย

```bash
npm run dev       # เริ่ม development server
npm run lint      # ตรวจด้วย ESLint
npm run build     # สร้าง production build
npm run start     # เริ่ม production server หลัง build
npx prisma studio # เปิด Prisma Studio
```

หลังแก้ `prisma/schema.prisma` ให้สร้าง client ใหม่ด้วย `npx prisma generate` และซิงก์ schema กับฐานข้อมูลตาม workflow ของโปรเจกต์

## API สำหรับ Auth

### สมัครสมาชิก

```http
POST /api/auth/register
Content-Type: application/json
```

ตัวอย่าง body:

```json
{
  "name": "Ant Explorer",
  "email": "ant@example.com",
  "password": "at-least-8-characters"
}
```

สำเร็จจะตอบ `201` พร้อมข้อมูลผู้ใช้ที่ไม่รวม password hash อีเมลที่มีบัญชีแล้วตอบ `409` และข้อมูลไม่ผ่าน validation ตอบ `400`

### Auth.js

เส้นทาง `/api/auth/*` ให้บริการโดย Auth.js สำหรับ session, Credentials และ Google OAuth

มี Postman collection สำหรับ API Auth ที่ [`postman/ant-database-auth.postman_collection.json`](postman/ant-database-auth.postman_collection.json)

## โครงสร้างโปรเจกต์

```text
app/                  หน้าเว็บ, layout และ API routes
app/(auth)/            หน้า login และ register
app/api/auth/          Auth.js handlers และ API สมัครสมาชิก
app/components/        React components
lib/                   Prisma client และข้อมูลตัวอย่างหน้าแรก
prisma/schema.prisma   Prisma data model
prisma/migrations/     Prisma migrations
services/              business logic สำหรับ auth
```

## หมายเหตุ

- ค่าใน `.env` ถูกละเว้นจาก Git ตาม `.gitignore`
- หน้าแรกยังใช้ข้อมูลตัวอย่างจาก `lib/mock-data.ts`
- ควรตรวจและปรับ migration ให้ตรงกับ Prisma schema ปัจจุบันก่อนนำ workflow migrations ไปใช้กับฐานข้อมูลจริง
