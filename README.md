# Ant Database

เว็บแอปสำหรับบันทึก ค้นหา และดูแลข้อมูลการสำรวจมด พร้อมตำแหน่งที่เก็บตัวอย่าง รูปภาพ และกระบวนการตรวจสอบข้อมูลก่อนเผยแพร่ พัฒนาด้วย Next.js App Router, TypeScript, Prisma ORM และ PostgreSQL

## สารบัญ

- [ความสามารถ](#ความสามารถ)
- [เทคโนโลยี](#เทคโนโลยี)
- [ติดตั้งระบบตั้งแต่ต้น](#ติดตั้งระบบตั้งแต่ต้น)
- [ตั้งค่าบริการเสริม](#ตั้งค่าบริการเสริม)
- [คำสั่งพัฒนาและดูแลระบบ](#คำสั่งพัฒนาและดูแลระบบ)
- [การ deploy](#การ-deploy)
- [ภาพรวม API](#ภาพรวม-api)
- [โครงสร้างโปรเจกต์](#โครงสร้างโปรเจกต์)
- [การแก้ปัญหา](#การแก้ปัญหา)
- [ความปลอดภัยและข้อมูล](#ความปลอดภัยและข้อมูล)

## ความสามารถ

- สมัครสมาชิกและเข้าสู่ระบบด้วยอีเมล/รหัสผ่าน หรือ Google
- บันทึกข้อมูลตัวอย่าง ได้แก่ ชนิดมด จำนวน วันที่และเวลา สถานที่ วิธีเก็บ รายละเอียด และรูปภาพ
- เลือกสถานที่จากรายการ ค้นหาสถานที่บนแผนที่ หรือระบุพิกัดปัจจุบัน
- ค้นหาและเรียกดูข้อมูลตัวอย่าง รวมถึงรายละเอียดชนิดมดและตำแหน่งบนแผนที่
- จัดการรายการของตนเอง และบันทึกเป็นฉบับร่างหรือส่งตรวจสอบ
- ให้ผู้ดูแลตรวจสอบ อนุมัติ หรือปฏิเสธข้อมูล พร้อมจัดการข้อมูลอ้างอิง เช่น ชนิดมด สถานที่ และวิธีเก็บ
- อัปโหลดรูปผ่าน signed upload ไปยัง Cloudinary
- เก็บงานลบรูป Cloudinary ที่ยังไม่สำเร็จไว้ในฐานข้อมูล และลองใหม่ผ่าน scheduled endpoint

ข้อมูลสถานที่ในระบบปัจจุบันใช้ชื่อสถานที่และพิกัดตาม schema หลัก ไม่มีฟิลด์สถานที่เฉพาะแยกต่างหาก

## เทคโนโลยี

- Node.js 20.9 ขึ้นไป และ npm
- Next.js 16, React 19 และ TypeScript
- Prisma ORM 7 และ PostgreSQL
- Auth.js สำหรับ session และผู้ให้บริการเข้าสู่ระบบ
- Cloudinary สำหรับจัดเก็บรูป
- OpenStreetMap/Nominatim สำหรับแผนที่และค้นหาพิกัด

## ติดตั้งระบบตั้งแต่ต้น

หัวข้อนี้เป็นคู่มือตั้งค่าเครื่องพัฒนาใหม่ โดยมีตัวอย่างคำสั่งสำหรับ Windows PowerShell

### 1. ติดตั้งเครื่องมือที่ต้องใช้

ติดตั้ง Node.js 20.9 ขึ้นไป (แนะนำ LTS) ซึ่งมาพร้อม npm และเตรียม PostgreSQL ที่แอปเข้าถึงได้ จะใช้ PostgreSQL ในเครื่องหรือ managed database ก็ได้

ตรวจสอบการติดตั้ง:

```powershell
node --version
npm --version
git --version
```

### 2. ดาวน์โหลดโปรเจกต์

```powershell
git clone https://github.com/sonpasavee/ant-database.git
Set-Location ant-database
```

หากเปิด repository ใน VS Code อยู่แล้ว ให้เปิด Terminal ที่ root ของโปรเจกต์ ซึ่งเป็นโฟลเดอร์เดียวกับ `package.json`

### 3. ติดตั้ง dependencies

```powershell
npm ci
```

`npm ci` ติดตั้ง dependencies ตาม `package-lock.json` หากไม่มี lockfile หรือกำลังแก้ dependencies ให้ใช้ `npm install` แทน

### 4. สร้าง PostgreSQL database และ connection string

สร้าง database เปล่าใน PostgreSQL หรือสร้าง project บนผู้ให้บริการ managed PostgreSQL เช่น Supabase จากนั้นคัดลอก connection string จากหน้าตั้งค่าฐานข้อมูล

ตัวอย่างรูปแบบ connection string:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

แทน `USER`, `PASSWORD`, `HOST`, `PORT` และ `DATABASE` ด้วยค่าจริงของฐานข้อมูล หากรหัสผ่านมีอักขระพิเศษ เช่น `@`, `#`, `/` หรือ `:` ต้อง URL-encode ค่านั้นก่อนนำมาใส่ใน URL

สำหรับ Supabase โดยทั่วไป:

1. สร้าง project และตั้งรหัสผ่านฐานข้อมูล
2. เปิด **Connect** แล้วเลือก connection string สำหรับแอป ใส่เป็น `DATABASE_URL`
3. ถ้ามี connection string สำหรับ direct connection หรือ session pooler แยกต่างหาก ให้ใส่เป็น `DIRECT_URL` เพื่อให้ Prisma CLI ใช้กับ migration
4. อย่าใช้ transaction pooler เป็น URL สำหรับ migration; การตั้งค่า Prisma ใน repository จะเลือก `DATABASE_URL` แทนเมื่อ `DIRECT_URL` ใช้พอร์ต `6543`

### 5. สร้างไฟล์ environment

สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ แล้วกำหนดค่าจำเป็น:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
AUTH_SECRET="แทนด้วยค่าสุ่มที่สร้างในขั้นตอนถัดไป"

# ไม่บังคับ: URL สำหรับ Prisma CLI/migrations
DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_HOST:5432/DATABASE?schema=public"
```

สร้าง `AUTH_SECRET` ใหม่ด้วย Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

คัดลอกผลลัพธ์ไปแทนข้อความตัวอย่างใน `AUTH_SECRET` ไฟล์ `.env` ต้องอยู่ระดับเดียวกับ `package.json` และไม่ควร commit ไฟล์นี้ (ถูกละเว้นโดย `.gitignore` อยู่แล้ว)

`DIRECT_URL` เป็น optional: หากไม่กำหนด Prisma CLI จะใช้ `DATABASE_URL` หาก `DIRECT_URL` ระบุพอร์ต `6543` และมี `DATABASE_URL` ระบบจะเลือก `DATABASE_URL` แทน ตรวจให้แน่ใจว่า URL ที่ถูกเลือกเหมาะกับการรัน migration และไม่ใช่ transaction pooler ตรวจวิธีเลือก URL ใน [`prisma.config.ts`](prisma.config.ts)

ตัวแปรสำหรับ Google และ Cloudinary เป็น optional แต่ต้องกำหนดก่อนใช้ความสามารถของบริการนั้น ดูรายละเอียดใน [ตั้งค่าบริการเสริม](#ตั้งค่าบริการเสริม)

### 6. สร้าง Prisma Client และติดตั้ง schema ลงฐานข้อมูล

ตรวจ environment และ apply migrations จาก repository:

```powershell
npx.cmd prisma generate
npx.cmd prisma migrate status
npx.cmd prisma migrate deploy
```

ตรวจผลคำสั่ง `migrate status` ให้แน่ใจว่าชี้ไปยัง database ที่ตั้งใจใช้ก่อน apply migration `migrate deploy` จะ apply migration ที่ยังค้างตามลำดับและไม่ reset ฐานข้อมูล

> ถ้า `npx` ใช้งานได้ใน PowerShell จะใช้ `npx` แทน `npx.cmd` ก็ได้ การใช้ `.cmd` ช่วยกรณี Windows Execution Policy บล็อก `npx.ps1`

### 7. เริ่มแอปและตรวจการทำงาน

```powershell
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) แล้วทำ smoke test:

1. สมัครสมาชิกที่หน้า `/register` — ชื่อ 2–100 ตัวอักษร และรหัสผ่าน 8–72 ตัวอักษร
2. เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
3. เปิดหน้าสร้างข้อมูล บันทึกตัวอย่างเป็นฉบับร่าง และตรวจหน้า “ข้อมูลของฉัน”
4. ตั้งค่า Cloudinary ก่อนทดสอบอัปโหลดรูป
5. ดู terminal ที่รัน Next.js หาก API ตอบ error และตรวจว่า migration ใช้กับ database เดียวกับที่แอปเชื่อมต่ออยู่

`npm run dev` เรียก `prisma generate` ให้อัตโนมัติผ่าน `predev`

### 8. กำหนดผู้ดูแลระบบ (ถ้าต้องใช้หน้า Admin)

บัญชีที่สมัครใหม่มี role `USER` โดยค่าเริ่มต้น การเปลี่ยน role ควรทำโดยผู้ที่ได้รับอนุญาตผ่านช่องทางจัดการฐานข้อมูลที่ปลอดภัยเท่านั้น ตัวอย่าง SQL สำหรับเลื่อนบัญชีที่มีอยู่เป็นผู้ดูแล:

```sql
UPDATE "User"
SET role = 'ADMIN'
WHERE email = lower('admin@example.com')
RETURNING id, email, role;
```

เปลี่ยนอีเมลตัวอย่างเป็นอีเมลบัญชีจริง ตรวจแถวที่ `RETURNING` แสดงว่าตรงบัญชีก่อนใช้งาน ผู้ใช้ที่เข้าสู่ระบบอยู่ควร sign out แล้ว sign in ใหม่เพื่อโหลด role ลง session อีกครั้ง อย่าเปิดเผยสิทธิ์ฐานข้อมูลหรือให้ผู้ใช้ทั่วไปแก้ role เอง

## ตั้งค่าบริการเสริม

### Google OAuth

หากต้องการเข้าสู่ระบบด้วย Google:

1. สร้าง OAuth Client ID ชนิด **Web application** ใน Google Cloud Console
2. ตั้ง Authorized redirect URI สำหรับ local:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

3. เพิ่ม Client ID และ Client Secret ลงใน `.env`:

   ```dotenv
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

4. เพิ่ม redirect URI ของ production domain ใน Google Cloud Console เมื่อนำขึ้น production
5. restart development server เพื่อโหลด environment ใหม่

### Cloudinary (อัปโหลดและจัดการรูป)

สร้าง Cloudinary account แล้วกำหนดค่าต่อไปนี้ใน `.env`:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
NEXT_PUBLIC_CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

`CLOUDINARY_API_SECRET` ใช้เฉพาะฝั่ง server ห้ามตั้งชื่อเป็น `NEXT_PUBLIC_*` หรือส่งค่านี้ไปยัง client หลังตั้งค่าให้ restart server และทดสอบอัปโหลดหลังเข้าสู่ระบบ

### Cloudinary cleanup scheduler

เมื่อลบหรือแทนที่รูป แอปจะบันทึกงานลบลง PostgreSQL และลองใหม่หาก Cloudinary ไม่พร้อม ตั้ง `CRON_SECRET` ใน environment ฝั่ง server:

```dotenv
CRON_SECRET="ค่าสุ่มที่ยาวและคาดเดายาก"
```

ตั้ง scheduler ที่เชื่อถือได้เรียก endpoint นี้เป็นระยะ (เช่น ทุก 1 นาที):

```http
POST /api/cron/cloudinary-cleanup
Authorization: Bearer <ค่า CRON_SECRET>
```

ทดสอบใน PowerShell โดยแทน placeholder ด้วยค่าที่ตั้งไว้:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/cron/cloudinary-cleanup" `
  -Headers @{ Authorization = "Bearer <ค่า CRON_SECRET>" }
```

ห้ามใส่ `CRON_SECRET` ใน URL, source code หรือ Git หากไม่ตั้ง scheduler งาน cleanup ที่ค้างจะยังอยู่ในฐานข้อมูลแต่จะไม่ถูกประมวลผลโดยอัตโนมัติ

### แผนที่และค้นหาพิกัด

แผนที่ใช้ tile จาก OpenStreetMap ส่วนค้นหาสถานที่และ reverse geocoding ใช้ Nominatim ผ่าน server routes ความสามารถเหล่านี้ต้องเชื่อมต่ออินเทอร์เน็ต และควรปฏิบัติตาม attribution และ usage policy ของ OpenStreetMap/Nominatim

## คำสั่งพัฒนาและดูแลระบบ

```powershell
npm run dev                   # เริ่ม development server
npm run lint                  # ตรวจด้วย ESLint
npm run build                 # สร้าง production build
npm run start                 # เริ่ม production server หลัง build
npx.cmd prisma generate       # สร้าง Prisma Client
npx.cmd prisma validate       # ตรวจสอบ Prisma schema
npx.cmd prisma migrate status # ตรวจสถานะ migration
npx.cmd prisma migrate deploy # apply migrations ที่ยังค้าง
npx.cmd prisma studio         # เปิด Prisma Studio
```

### เพิ่มหรือเปลี่ยน schema

1. แก้ `prisma/schema.prisma`
2. ใช้ฐานข้อมูลสำหรับพัฒนาและสร้าง migration:

   ```powershell
   npx.cmd prisma migrate dev --name describe_the_change
   ```

3. อ่าน SQL ที่สร้างใน `prisma/migrations/` และทดสอบกับข้อมูลจำลอง
4. commit schema และ migration พร้อมกัน
5. ใน production ใช้ `prisma migrate deploy` เพื่อ apply migration ที่ผ่านการ review แล้ว

อย่าแก้ migration ที่ apply ไปแล้วใน environment ใด ๆ ให้เพิ่ม migration ใหม่เพื่อเปลี่ยนหรือย้อน schema แทน หลีกเลี่ยง `prisma db push` ใน production เพราะไม่เก็บประวัติการเปลี่ยน schema ผ่าน migration

## การ deploy

ก่อน release production:

1. ตั้ง environment variables ในระบบจัดการ secrets ของ hosting provider โดยใช้ค่าคนละชุดกับ local
2. ตั้งค่า PostgreSQL production ที่มี backup และจำกัดสิทธิ์เข้าถึง
3. ตั้ง `AUTH_SECRET`, Cloudinary และ Google OAuth ตามบริการที่เปิดใช้
4. เพิ่ม production callback URL ใน Google OAuth หากใช้ Google sign-in
5. ตรวจ `DATABASE_URL`/`DIRECT_URL` และยืนยัน environment เป้าหมายก่อน migration
6. apply migration ที่อยู่ใน version control:

   ```bash
   npx prisma migrate deploy
   ```

7. build และเริ่มแอป:

   ```bash
   npm run build
   npm run start
   ```

   `npm run build` เรียก `prisma generate` ให้อัตโนมัติผ่าน `prebuild`

8. ตั้ง scheduler สำหรับ `/api/cron/cloudinary-cleanup` หากเปิดใช้การลบรูปอัตโนมัติ
9. หลัง deploy ให้ลองสมัคร/เข้าสู่ระบบ สร้าง record ตรวจรายการ และอัปโหลดรูป แล้วตรวจ server logs

อย่ารัน migration กับ production โดยไม่ตรวจ connection string และไม่ใช้ production database สำหรับการพัฒนาโดยไม่ตั้งใจ

## ภาพรวม API

Route handlers อยู่ใต้ `app/api/` endpoint ที่ต้องมี session จะตรวจสอบผู้ใช้ และการเปลี่ยนแปลงข้อมูลอ้างอิงบางประเภทจำกัดเฉพาะ role `ADMIN`

| กลุ่ม | Endpoint | การใช้งาน |
| --- | --- | --- |
| Auth | `/api/auth/*` | Auth.js session และ provider |
| สมัครสมาชิก | `POST /api/auth/register` | สร้างบัญชีด้วยอีเมลและรหัสผ่าน |
| ข้อมูลตัวอย่าง | `/api/ants` | อ่านรายการและสร้าง record |
| ข้อมูลรายรายการ | `/api/ants/[id]` | อ่าน แก้ไข หรือลบ record ตามสิทธิ์ |
| สถานะ record | `PATCH /api/ants/[id]/status` | เปลี่ยนสถานะตาม workflow และสิทธิ์ |
| ชนิดมด | `/api/species`, `/api/species/[id]` | อ่านและจัดการข้อมูลชนิดมด |
| บันทึกชนิดมด | `POST /api/species/resolve` | บันทึกหรือค้นคืนชนิดมดจากข้อมูลที่ส่งมา |
| สถานที่ | `/api/locations`, `/api/locations/[id]` | อ่านและจัดการรายการสถานที่ |
| วิธีเก็บ | `/api/collection-methods`, `/api/collection-methods/[id]` | อ่านและจัดการวิธีเก็บ |
| Geocoding | `/api/geocode/search`, `/api/geocode/reverse` | ค้นหาสถานที่และแปลงพิกัดเป็นชื่อ |
| Cloudinary | `/api/sign-cloudinary-params` | ขอ upload signature หลังยืนยันตัวตน |
| งานเบื้องหลัง | `POST /api/cron/cloudinary-cleanup` | ประมวลผลคิวลบรูปโดยใช้ `CRON_SECRET` |

ดู request/response schema และ authorization ล่าสุดได้จาก route handler และ validator ของแต่ละ endpoint Postman collection สำหรับ Auth API อยู่ที่ [`postman/ant-database-auth.postman_collection.json`](postman/ant-database-auth.postman_collection.json)

## โครงสร้างโปรเจกต์

```text
app/
  (auth)/                 หน้าเข้าสู่ระบบและสมัครสมาชิก
  admin/                  หน้าสำหรับผู้ดูแล
  api/                    API route handlers
  components/             React components
  my-records/             รายการของผู้ใช้และหน้าแก้ไข
  records/                หน้ารายการและรายละเอียดสาธารณะ
  species/                หน้ารายละเอียดชนิดมด
lib/                      Prisma client, auth helpers และ utilities
prisma/
  schema.prisma           Prisma data model
  migrations/             ประวัติการเปลี่ยน schema
services/                 Business logic และงานเบื้องหลัง
validators/               Validation schemas
postman/                  Postman collections
```

โมเดลหลักในฐานข้อมูล ได้แก่ `User`, `AntSpecies`, `AntSpeciesAlias`, `Location`, `CollectionMethod`, `AntRecord`, `AntImage` และ `CloudinaryCleanupJob` ดู relation และ index ได้ที่ [`prisma/schema.prisma`](prisma/schema.prisma)

## การแก้ปัญหา

### Prisma เชื่อมต่อฐานข้อมูลไม่ได้

- ตรวจว่า PostgreSQL พร้อมรับ connection และอนุญาต network จากเครื่องหรือ hosting
- ตรวจ host, port, database, username และ password ใน `DATABASE_URL`
- ถ้ากำหนด `DIRECT_URL` ให้ตรวจ URL นั้นด้วย เพราะ Prisma CLI อาจเลือกใช้ตอน migration
- URL-encode อักขระพิเศษใน password

### Prisma แจ้งว่า table/column ไม่มี หรือ client ไม่ตรง schema

```powershell
npx.cmd prisma migrate status
npx.cmd prisma generate
```

ตรวจว่าตัวแปรแวดล้อมชี้ไปยังฐานข้อมูลเดียวกันทั้งแอปและ migration อย่า reset ฐานข้อมูลที่มีข้อมูลจริงเพื่อแก้ปัญหานี้ หาก migration ล้มเหลวให้ตรวจ SQL และ error ก่อนดำเนินการต่อ

### เข้าสู่ระบบด้วย Google ไม่สำเร็จ

- ตรวจ `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET`
- ตรวจ redirect URI ให้ตรง host, protocol และ port ที่กำลังใช้
- restart server หลังเปลี่ยน `.env`
- ตรวจว่าตั้ง `AUTH_SECRET` ใน environment ที่รันแอป

### บันทึกชนิดมดหรือ record ไม่สำเร็จ

- ตรวจ browser Network ว่า request ใดตอบ error
- ตรวจ server log ของ API route ที่เกี่ยวข้องเพื่อดู Prisma error code และข้อมูลประกอบ
- ตรวจว่า migration ถูก apply กับ database environment เดียวกับที่แอปใช้
- อย่าโพสต์ database URL, OAuth secret หรือ Cloudinary secret ลง issue หรือ log สาธารณะ

### รูปไม่แสดงหรือ cleanup ไม่ทำงาน

- ตรวจ Cloud name, API key และ API secret; API secret ต้องอยู่ฝั่ง server
- ตรวจ response จาก `/api/sign-cloudinary-params`
- สำหรับ cleanup ให้ตรวจ `CRON_SECRET`, authorization header, scheduler และ response ของ endpoint

## ความปลอดภัยและข้อมูล

- `.env*` ถูกละเว้นจาก Git ห้าม commit credentials หรือ secrets
- รหัสผ่านถูกแฮชก่อนจัดเก็บ และ API ตรวจข้อมูลด้วย validation schemas
- API ตรวจ session และสิทธิ์ก่อนแก้ไขข้อมูล การกำหนดสิทธิ์ Admin ต้องทำผ่านช่องทางที่เชื่อถือได้
- ก่อน migration ที่เปลี่ยนหรือลบข้อมูล ให้สำรองฐานข้อมูล ทบทวน SQL และทดสอบบน staging
- ปฏิบัติตาม attribution และ usage policy ของ OpenStreetMap/Nominatim
