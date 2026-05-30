DATA.push(
{
  group:"Backend", cat:"db-design", title:"DB Design",
  desc:"key, index, normalize, data type, soft delete, timestamp, enum vs lookup — ฝึกอธิบายเหตุผล ไม่ใช่ท่อง",
  problems:[
   {type:"concept", title:"เก็บเงิน (amount) ใช้ type อะไร?",
    code:`amount FLOAT     -- ?
amount NUMERIC   -- ?
amount BIGINT    -- ?`,
    answer:`**อย่าใช้ FLOAT/DOUBLE กับเงินเด็ดขาด** — binary float ปัดเศษเพี้ยน (\`0.1+0.2 != 0.3\`)

ที่ถูก:
- \`NUMERIC(12,2)\`/\`DECIMAL\` — แม่นยำ เหมาะที่สุด (default)
- \`BIGINT\` เก็บเป็นสตางค์/cents — เร็ว+แม่น แต่ต้องคูณ/หาร 100 เองในโค้ด

**พูด:** "เงินห้าม float ครับ เพราะปัดเศษเพี้ยน ผมใช้ NUMERIC(12,2)"`},
   {type:"concept", title:"ควร index คอลัมน์ไหน?",
    code:`-- orders: id, user_id, status, created_at, total
SELECT * FROM orders
WHERE user_id = $1 AND status = 'paid'
ORDER BY created_at DESC;`,
    answer:`**composite index ตามลำดับการใช้**
\`\`\`
CREATE INDEX idx_orders_user_status_created
ON orders (user_id, status, created_at DESC);
\`\`\`
เหตุผล: \`user_id\`(equality,selective) → \`status\`(equality) → \`created_at\`(order, ใส่ DESC ให้ตรง → ไม่ต้อง sort เพิ่ม)

**ESR rule:** Equality → Sort → Range · อย่าแยก index ทีละคอลัมน์ถ้าใช้พร้อมกัน`},
   {type:"concept", title:"ความสัมพันธ์ many-to-many",
    code:`-- นักเรียนลงได้หลายวิชา วิชามีได้หลายนักเรียน
-- students(id,name)  courses(id,title)`,
    answer:`**ต้องมีตารางกลาง (junction table)**
\`\`\`
CREATE TABLE enrollments (
    student_id INT REFERENCES students(id),
    course_id  INT REFERENCES courses(id),
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (student_id, course_id)
);
\`\`\`
- composite PK กันลงซ้ำอัตโนมัติ
- FK ทั้งสองฝั่ง
- field เพิ่มที่เป็นของ "ความสัมพันธ์" (เช่น grade) ใส่ที่นี่
- index เพิ่มบน \`course_id\` (PK ครอบ student_id แล้ว)

**หลัก:** m-to-m = แตกตารางกลางเสมอ ห้ามยัด array/comma ในคอลัมน์เดียว`},
   {type:"concept", title:"ลบข้อมูล: soft delete หรือ hard delete?",
    code:`-- ลูกค้ากดลบ order ควรลบจริง หรือ mark ว่าลบ?`,
    answer:`**ขึ้นกับ requirement — ต้องถามก่อนตอบ**

**Soft delete** (เพิ่มคอลัมน์ \`deleted_at TIMESTAMPTZ NULL\`):
- ข้อดี: กู้คืนได้, เก็บ audit/history, FK ไม่พังทันที
- ข้อเสีย: ทุก query ต้องเติม \`WHERE deleted_at IS NULL\` (ลืมแล้วข้อมูล leak), ตารางบวมขึ้น, unique constraint ซับซ้อน (ลบแล้วสร้างซ้ำชื่อเดิม)

**Hard delete** (\`DELETE\` จริง):
- ข้อดี: สะอาด, ตารางเล็ก, query ตรงไปตรงมา
- ข้อเสีย: กู้ไม่ได้, เสีย history

**คำตอบที่ดี:** "ถ้าเป็นข้อมูลธุรกรรม/ต้อง audit (order, payment) ผมใช้ soft delete + index partial บน deleted_at ครับ ถ้าเป็น log ชั่วคราว/PII ที่กฎหมายบังคับให้ลบ ก็ hard delete" — โชว์ว่าเลือกตามบริบท ไม่ใช่มีคำตอบเดียว`},
   {type:"concept", title:"เก็บเวลา ใช้ timestamp แบบไหน?",
    code:`created_at TIMESTAMP      -- ?
created_at TIMESTAMPTZ    -- ?`,
    answer:`**ใช้ \`TIMESTAMPTZ\` (timestamp with time zone) เสมอเป็น default**

- \`TIMESTAMP\` (ไม่มี tz) — เก็บค่าดิบไม่รู้ว่า zone ไหน พอมี user/server หลาย timezone จะมั่ว แปลงผิด
- \`TIMESTAMPTZ\` — Postgres เก็บเป็น UTC ภายใน + แปลงตาม session timezone ตอนอ่าน → เทียบเวลาข้ามโซนถูกต้อง

**หลักปฏิบัติ:**
- เก็บเป็น UTC (\`TIMESTAMPTZ\`) ใน DB เสมอ
- แปลงเป็น local time ที่ชั้น app/UI ตอนแสดงผล (เช่น Asia/Bangkok)
- อย่าเก็บ local time ดิบๆ

**พูด:** "ผมใช้ TIMESTAMPTZ เก็บ UTC ครับ แล้วแปลงเป็นเวลาไทยตอนแสดงผล กันปัญหา timezone"`},
   {type:"concept", title:"สถานะ order: ENUM หรือ lookup table?",
    code:`-- status: pending / paid / shipped / cancelled
status ??? `,
    answer:`**มีหลายทาง — ตอบพร้อมข้อแลกเปลี่ยน**

1. **VARCHAR + CHECK constraint** (นิยม, ยืดหยุ่น):
\`\`\`
status TEXT NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled'))
\`\`\`
ง่าย อ่านออก เพิ่มค่าใหม่ = แก้ constraint

2. **Postgres ENUM type** — ประหยัด storage, บังคับค่า แต่เพิ่ม/ลบ/เรียงค่าใหม่ยุ่งยาก (ALTER TYPE)

3. **Lookup table** (\`order_statuses\` + FK) — ยืดหยุ่นสุด เพิ่ม metadata ได้ (label, สี, ลำดับ) เหมาะถ้าสถานะมีข้อมูลพ่วงหรือเปลี่ยนบ่อย แต่ต้อง JOIN

**คำตอบที่ดี:** "ถ้าค่าคงที่ไม่ค่อยเปลี่ยน ผมใช้ VARCHAR + CHECK ครับ อ่านง่ายและ flexible สุด ถ้าสถานะต้องมี metadata (label/ลำดับ/แปลภาษา) ค่อยแยกเป็น lookup table" — โชว์ trade-off`},
   {type:"find", title:"normalize ให้ถึง 3NF",
    code:`-- ตารางนี้ผิดหลัก normalize ตรงไหน?
orders (
  id, customer_id, customer_name, customer_email,
  product_id, product_name, product_price, qty
)`,
    answer:`**ละเมิด 3NF + ปนหลาย entity**

1. **transitive dependency** — \`customer_name\`/\`customer_email\` ขึ้นกับ \`customer_id\` ไม่ใช่ PK (\`id\`) → ข้อมูลลูกค้าซ้ำทุกแถว, **update anomaly** (เปลี่ยนชื่อต้องแก้หลายที่)
2. \`product_name\`/\`product_price\` ขึ้นกับ \`product_id\` เช่นกัน
3. 1 order มีได้หลาย product → ตารางนี้ยัดรวมกัน ต้องแตก \`order_items\`

แก้ — แยกตาม entity:
\`\`\`
customers(id, name, email)
products(id, name, price)
orders(id, customer_id, created_at)
order_items(order_id, product_id, qty, unit_price)
\`\`\`
**ทริค:** non-key ทุกคอลัมน์ต้องขึ้นกับ "the key, the whole key, nothing but the key"

**ข้อยกเว้นจงใจ:** \`order_items.unit_price\` เก็บ **snapshot ราคา ณ เวลาสั่ง** (denormalize ตั้งใจ) — ไม่ใช่ดึงจาก \`products.price\` สด เพราะราคาเปลี่ยนทีหลังจะทำให้ยอดเก่าเพี้ยน`},
   {type:"concept", title:"primary key: natural, surrogate, หรือ composite?",
    code:`-- users มี email (unique) อยู่แล้ว
-- ใช้ email เป็น PK เลยดีไหม? หรือต้องมี id แยก?`,
    answer:`**default: surrogate key** (\`id BIGINT GENERATED ALWAYS AS IDENTITY\` หรือ UUID) + \`UNIQUE\` บน email แยก

- **natural key (email) เป็น PK** ปัญหา: ค่าเปลี่ยนได้ → ต้อง cascade FK ทุกตารางที่อ้าง, PK กว้าง index ใหญ่ join ช้า, leak email ไปอยู่ในทุก FK
- **surrogate**: คงที่ตลอด แคบ join เร็ว — ส่วน uniqueness ของ email ยัง enforce ด้วย \`UNIQUE\` ได้
- **composite PK**: เหมาะกับ junction table (\`student_id, course_id\`) ที่ไม่มี identity ของตัวเอง

UUID vs BIGINT: UUID ดีตอน distributed / กันเดา id แต่ใหญ่กว่า + random ทำ index fragment → ใช้ **UUIDv7/ULID** (เรียงตามเวลา) ลดปัญหาได้

**พูด:** "ผมใช้ surrogate id เป็น PK ครับ แล้ว UNIQUE บน email — กัน PK เปลี่ยนค่าและ join เร็ว"`},
   {type:"find", title:"วาง foreign key ผิดฝั่ง (1-to-many)",
    code:`-- 1 user มีได้หลาย post
CREATE TABLE users (
  id      BIGINT PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id)
);
CREATE TABLE posts (
  id    BIGINT PRIMARY KEY,
  title TEXT
);`,
    answer:`**1 จุด: FK วางผิดฝั่ง → กลายเป็น 1-to-1**

\`users.post_id\` ทำให้ user อ้างได้แค่ **1 post เดียว** = บังคับเป็น 1-to-1 ผิด requirement (1 user หลาย post)

**1-to-many: FK อยู่ฝั่ง "many" (ลูก) เสมอ** → ย้ายไป \`posts.user_id\`
\`\`\`
CREATE TABLE posts (
  id      BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  title   TEXT
);
-- users ไม่เก็บอะไรเพิ่ม
CREATE INDEX idx_posts_user ON posts(user_id);
\`\`\`
**หลัก:** FK อยู่ฝั่ง many เสมอ · ฝั่ง one ไม่ถือ key ของอีกฝั่ง`},
   {type:"find", title:"foreign key ไม่ตั้ง ON DELETE + ไม่ index",
    code:`CREATE TABLE order_items (
  id       BIGINT PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id),
  sku      TEXT
);`,
    answer:`**2 จุด**

1. **ไม่กำหนด ON DELETE** → default \`NO ACTION\` (RESTRICT) → ลบ \`orders\` ที่ยังมี item ไม่ได้ (error). ตั้งใจให้ item ตายตาม → \`ON DELETE CASCADE\`; ห้ามลบ parent ที่มีลูก → \`RESTRICT\` (ระบุชัดดีกว่าปล่อย default ให้คนอ่านงง)
2. **ไม่ index FK column** — Postgres **ไม่** สร้าง index ให้ FK อัตโนมัติ → ลบ/อัปเดต parent ต้อง scan child ทั้งตาราง, JOIN ช้า

\`\`\`
CREATE TABLE order_items (
  id       BIGINT PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku      TEXT
);
CREATE INDEX idx_order_items_order ON order_items(order_id);
\`\`\`
**หลัก:** ทุก FK → ตั้ง ON DELETE ให้ชัด + index คอลัมน์ FK เอง (Postgres ไม่ทำให้)`},
   {type:"judge", title:"เก็บ tags ของ post (n-to-m)",
    code:`-- post มีได้หลาย tag, tag อยู่ได้หลาย post
-- posts(id, title)   tags ???`,
    ai:`เก็บง่ายๆ เพิ่มคอลัมน์ tags TEXT ใน posts เก็บเป็น comma เช่น 'go,db,web' พอ ไม่ต้องสร้างตารางเพิ่มให้ยุ่งยาก เวลาค้นก็ WHERE tags LIKE '%go%' เอา`,
    answer:`**[FAKE] ทั้งหมด — classic anti-pattern**

- comma string ละเมิด **1NF** (ค่าต้อง atomic) → \`LIKE '%go%'\` **index ไม่ติด** scan ทั้งตาราง และ **match ผิด** (tag \`'golang'\` โดน \`'%go%'\` ด้วย)
- นับ/กรอง/JOIN ตาม tag ทำไม่สะอาด, ไม่มี FK บังคับว่า tag มีจริง, แก้ชื่อ tag ต้องไล่ string ทุกแถว

**ที่ถูก (n-to-m) = junction table:**
\`\`\`
tags(id, name TEXT UNIQUE)
post_tags(
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  tag_id  INT REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
)
\`\`\`
**ข้อยกเว้น:** ถ้า tag ไม่ต้องเป็น entity (ไม่มี metadata) บน Postgres ใช้ \`TEXT[]\` + **GIN index** ก็ได้ — แต่ comma ยัดใน \`TEXT\` เดียวผิดเสมอ`},
   {type:"concept", title:"ออกแบบ: หมอ–คนไข้–นัดตรวจ",
    code:`โจทย์: คลินิกมีหมอหลายคน คนไข้หลายคน
- คนไข้จองนัดกับหมอตามวันเวลา
- 1 หมอรับได้หลายนัด, 1 คนไข้มีได้หลายนัด
- ห้ามจองหมอคนเดียวกันซ้อนเวลาเดียวกัน
ออกแบบตารางยังไง?`,
    answer:`**appointment เป็น entity ของตัวเอง ไม่ใช่ junction เปล่าๆ** (มี เวลา/สถานะ/โน้ต)

\`\`\`
doctors(id PK, name, specialty)
patients(id PK, name, dob DATE, phone)
appointments(
  id            PK,
  doctor_id     FK -> doctors(id),
  patient_id    FK -> patients(id),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration_min  INT NOT NULL DEFAULT 30,
  status        TEXT CHECK (status IN ('booked','done','cancelled')),
  note          TEXT
)
\`\`\`
- **doctor↔appointment, patient↔appointment = 1-to-many** (FK อยู่ฝั่ง appointment ทั้งคู่)
- **กันจองซ้อน:** ขั้นต่ำ \`UNIQUE(doctor_id, scheduled_at)\`. ถ้าต้องกัน "ช่วงเวลาทับ" จริงๆ ใช้ Postgres **exclusion constraint** (\`EXCLUDE USING gist\`) บน \`(doctor_id WITH =, tstzrange(...) WITH &&)\`
- index: \`(doctor_id, scheduled_at)\`, \`(patient_id, scheduled_at)\`

**กับดัก:** อย่าทำ m-to-m doctors↔patients ตรงๆ — การนัดมีคุณสมบัติของตัวมันเอง → ต้องเป็นตารางที่มี PK ของตัวเอง`},
   {type:"concept", title:"ออกแบบ: ตะกร้าสินค้า → คำสั่งซื้อ",
    code:`โจทย์: ร้านออนไลน์
- user ใส่สินค้าหลายชิ้นลงตะกร้า ปรับจำนวนได้
- กด checkout → กลายเป็น order
- ราคาสินค้าเปลี่ยนได้ตลอด
ออกแบบตารางยังไง?`,
    answer:`**แยก cart (ชั่วคราว, live) ออกจาก order (ถาวร, snapshot)**

\`\`\`
products(id PK, name, price NUMERIC(12,2))

carts(id PK, user_id FK, updated_at)
cart_items(
  cart_id    FK -> carts(id) ON DELETE CASCADE,
  product_id FK -> products(id),
  qty        INT NOT NULL CHECK (qty > 0),
  PRIMARY KEY (cart_id, product_id)
)

orders(id PK, user_id FK, total NUMERIC(12,2), placed_at TIMESTAMPTZ)
order_items(
  order_id   FK -> orders(id) ON DELETE CASCADE,
  product_id FK -> products(id),
  qty        INT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  PRIMARY KEY (order_id, product_id)
)
\`\`\`
- cart_items / order_items = junction (m-to-m user-product ผ่าน qty)
- **composite PK (cart_id, product_id)** → เพิ่มของซ้ำ = UPSERT บวก qty ไม่เกิดแถวซ้ำ
- **จุดสำคัญ:** \`cart_items\` **ไม่เก็บราคา** (โชว์ราคาสดจาก products) แต่ \`order_items\` **เก็บ unit_price snapshot** — ราคาขึ้นทีหลังยอดเก่าต้องไม่เพี้ยน

**พูด:** "ตะกร้าโชว์ราคาสด แต่พอ checkout ผม freeze ราคาลง order_items ครับ"`},
   {type:"concept", title:"ออกแบบ: ประวัติฉีดวัคซีนสัตว์เลี้ยง",
    code:`โจทย์: ระบบคลินิกสัตว์
- เจ้าของมีสัตว์เลี้ยงได้หลายตัว
- วัคซีนแต่ละชนิดต้องฉีดหลายเข็ม (เช่น 3 เข็ม)
- ต้องรู้: สัตว์ตัวนี้ฉีดวัคซีนอะไร เข็มที่เท่าไร เมื่อไร ที่คลินิกไหน
ออกแบบตารางยังไง?`,
    answer:`**vaccination = เหตุการณ์ 1 ครั้ง (1 เข็ม) → 1 pet มีได้หลายแถว**

\`\`\`
owners(id PK, name, phone)
pets(id PK, owner_id FK -> owners(id), name, species)
clinics(id PK, name, location)
vaccines(id PK, name, doses_required INT)

vaccinations(
  id          PK,
  pet_id      FK -> pets(id),
  vaccine_id  FK -> vaccines(id),
  clinic_id   FK -> clinics(id),
  dose_number INT NOT NULL,
  given_at    TIMESTAMPTZ NOT NULL,
  UNIQUE (pet_id, vaccine_id, dose_number)
)
\`\`\`
- owner→pet, pet→vaccination = **1-to-many** (FK ฝั่ง many)
- **"กี่เข็ม":** \`COUNT(*)\` group by (pet_id, vaccine_id) เทียบ \`vaccines.doses_required\` → ครบหรือยัง
- **"ที่ไหน":** \`clinic_id\` ต่อแถว (แต่ละเข็มฉีดคนละที่ได้)
- \`dose_number\` + \`UNIQUE(pet, vaccine, dose)\` → ลำดับเข็มชัด ไม่ซ้ำ

**กับดัก:** อย่าเก็บ \`dose1_date, dose2_date, dose3_date\` เป็นคอลัมน์ (ละเมิด 1NF, ตายตัวที่ 3 เข็ม) — แตกเป็นแถวเสมอ`}
  ]
}
);
