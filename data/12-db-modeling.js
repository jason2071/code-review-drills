DATA.push(
{
  group:"Backend", cat:"db-modeling", title:"DB · Data Modeling",
  desc:"อ่านโจทย์ธุรกิจ → ออกแบบตาราง: แยก entity, เลือก PK/FK, 1-to-m, n-to-m (junction), เก็บ attribute ของความสัมพันธ์ — เน้นวิธีคิดเป็นขั้น",
  problems:[
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

**กับดัก:** อย่าทำ m-to-m doctors↔patients ตรงๆ — การนัดมีคุณสมบัติของตัวมันเอง → ต้องเป็นตารางที่มี PK ของตัวเอง

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| doctor → appointment | 1-to-m | FK \`appointments.doctor_id\` |
| patient → appointment | 1-to-m | FK \`appointments.patient_id\` |`},
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

**พูด:** "ตะกร้าโชว์ราคาสด แต่พอ checkout ผม freeze ราคาลง order_items ครับ"

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| user → cart / order | 1-to-m | FK |
| cart ↔ product | n-to-m | \`cart_items\` (qty) |
| order ↔ product | n-to-m | \`order_items\` (qty, unit_price snapshot) |`},
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

**กับดัก:** อย่าเก็บ \`dose1_date, dose2_date, dose3_date\` เป็นคอลัมน์ (ละเมิด 1NF, ตายตัวที่ 3 เข็ม) — แตกเป็นแถวเสมอ

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| owner → pet | 1-to-m | FK \`pets.owner_id\` |
| pet → vaccination | 1-to-m | FK \`vaccinations.pet_id\` |
| vaccine → vaccination | 1-to-m | FK \`vaccinations.vaccine_id\` |
| clinic → vaccination | 1-to-m | FK \`vaccinations.clinic_id\` |`},
   {type:"concept", title:"ออกแบบ: ภาพยนตร์–นักแสดง (n-to-m + attribute)",
    code:`โจทย์: ฐานข้อมูลหนัง
- 1 หนังมีนักแสดงหลายคน, 1 นักแสดงเล่นได้หลายหนัง
- ต้องเก็บ "ชื่อตัวละคร" ที่นักแสดงคนนั้นเล่นในหนังเรื่องนั้น
ออกแบบตารางยังไง?`,
    answer:`**n-to-m → junction table; "ชื่อตัวละคร" เป็น attribute ของความสัมพันธ์ → เก็บที่ junction**

\`\`\`
movies(id PK, title, year)
actors(id PK, name)
movie_cast(
  movie_id       FK -> movies(id),
  actor_id       FK -> actors(id),
  character_name TEXT,
  PRIMARY KEY (movie_id, actor_id)
)
\`\`\`
- composite PK (movie_id, actor_id) กันคู่ซ้ำ
- \`character_name\` อยู่ที่ junction เพราะขึ้นกับ **คู่** (หนัง+นักแสดง) ไม่ใช่ของหนังหรือนักแสดงฝ่ายเดียว
- ถ้านักแสดงเล่นได้หลายบทในหนังเดียว → PK ต้องรวม \`character_name\` หรือใช้ surrogate id แทน

**หลัก:** attribute ที่เป็นของ "ความสัมพันธ์" ใส่ junction เสมอ ไม่ยัดเข้าตารางฝั่งใดฝั่งหนึ่ง

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| movie ↔ actor | n-to-m | \`movie_cast\` (character_name) |`},
   {type:"concept", title:"ออกแบบ: สูตรอาหาร–วัตถุดิบ (n-to-m + ปริมาณ)",
    code:`โจทย์: แอปสูตรอาหาร
- 1 สูตรใช้วัตถุดิบหลายอย่าง, วัตถุดิบ 1 อย่างใช้ได้หลายสูตร
- แต่ละสูตรต้องบอก "ปริมาณ + หน่วย" ของวัตถุดิบ (เช่น แป้ง 200 กรัม)
ออกแบบตารางยังไง?`,
    answer:`**n-to-m + junction ถือ quantity/unit**

\`\`\`
recipes(id PK, name)
ingredients(id PK, name)
recipe_ingredients(
  recipe_id     FK -> recipes(id) ON DELETE CASCADE,
  ingredient_id FK -> ingredients(id),
  quantity      NUMERIC(10,2) NOT NULL,
  unit          TEXT NOT NULL,
  PRIMARY KEY (recipe_id, ingredient_id)
)
\`\`\`
- \`quantity\`/\`unit\` เป็นของคู่ (สูตร+วัตถุดิบ) → อยู่ที่ junction
- \`ON DELETE CASCADE\` ฝั่ง recipe (ลบสูตร → รายการวัตถุดิบของสูตรหายตาม) แต่ **ฝั่ง ingredient อย่า cascade** — วัตถุดิบใช้ร่วมหลายสูตร ลบไม่ได้ตามใคร

**กับดัก:** อย่าเก็บ "200 กรัม" เป็น string เดียว → แยก \`quantity\` (number) กับ \`unit\` เพื่อคำนวณ/สเกลสูตร (เช่นทำ 2 เท่า) ได้

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| recipe ↔ ingredient | n-to-m | \`recipe_ingredients\` (quantity, unit) |`},
   {type:"concept", title:"ออกแบบ: user follow user (self-referential n-to-m)",
    code:`โจทย์: โซเชียล
- user ติดตาม (follow) user คนอื่นได้หลายคน และถูกหลายคน follow ได้
- เป็นทิศทางเดียว (A follow B ไม่ได้แปลว่า B follow A)
ออกแบบตารางยังไง?`,
    answer:`**ความสัมพันธ์ entity เดียวกันเอง → junction ที่ FK ชี้กลับ users สองครั้ง**

\`\`\`
users(id PK, name)
follows(
  follower_id FK -> users(id),
  followee_id FK -> users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
)
\`\`\`
- ทั้งสอง FK ชี้ตาราง \`users\` เดียวกัน (self-referential)
- composite PK กัน follow ซ้ำคู่เดิม · \`CHECK\` กัน follow ตัวเอง
- **มีทิศทาง:** \`(A,B)\` ≠ \`(B,A)\` → one-directional โดยธรรมชาติ
- query: คนที่ A ตาม → \`WHERE follower_id = A\` · คนที่ตาม A → \`WHERE followee_id = A\` → ต้อง index **ทั้งสองคอลัมน์**

**หลัก:** self n-to-m = junction FK สองช่อง ชี้ตารางเดิม + ตั้งชื่อบทบาทให้ชัด (follower/followee)

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| user ↔ user | n-to-m (self, มีทิศ) | \`follows\` (follower_id, followee_id) |`},
   {type:"concept", title:"ออกแบบ: ระบบสิทธิ์ RBAC (n-to-m ซ้อนชั้น)",
    code:`โจทย์: ระบบสิทธิ์ (RBAC)
- user มีได้หลาย role, role มีได้หลาย user
- role มีได้หลาย permission, permission อยู่ได้หลาย role
ออกแบบตารางยังไง?`,
    answer:`**สอง n-to-m ต่อกัน → สอง junction table**

\`\`\`
users(id PK, ...)
roles(id PK, name)
permissions(id PK, code)

user_roles(
  user_id FK -> users(id),
  role_id FK -> roles(id),
  PRIMARY KEY (user_id, role_id)
)
role_permissions(
  role_id       FK -> roles(id),
  permission_id FK -> permissions(id),
  PRIMARY KEY (role_id, permission_id)
)
\`\`\`
- user ↔ role ผ่าน \`user_roles\` · role ↔ permission ผ่าน \`role_permissions\`
- สิทธิ์จริงของ user = JOIN \`users → user_roles → role_permissions → permissions\`
- **ไม่ผูก permission ตรงกับ user** (ให้ผ่าน role) → เปลี่ยนสิทธิ์ที่ role ทีเดียว กระทบทุกคนใน role

**หลัก:** n-to-m หลายชั้น = junction หลายตัวต่อกัน ห้ามยุบรวมเป็นตารางเดียว

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| user ↔ role | n-to-m | \`user_roles\` |
| role ↔ permission | n-to-m | \`role_permissions\` |`},
   {type:"concept", title:"ออกแบบ: จองห้องโรงแรม (กันช่วงวันทับ)",
    code:`โจทย์: ระบบจองโรงแรม
- โรงแรมมีหลายห้อง, 1 ห้องถูกจองได้หลายครั้ง (คนละช่วงวัน)
- ห้ามจองห้องเดียวกันในช่วงวันที่ทับกัน
ออกแบบตารางยังไง?`,
    answer:`**booking มีช่วงวัน → 1-to-m + กันช่วงทับด้วย exclusion constraint**

\`\`\`
hotels(id PK, name)
rooms(id PK, hotel_id FK -> hotels(id), number)
guests(id PK, name)
bookings(
  id       PK,
  room_id  FK -> rooms(id),
  guest_id FK -> guests(id),
  period   DATERANGE NOT NULL,
  status   TEXT CHECK (status IN ('held','confirmed','cancelled')),
  EXCLUDE USING gist (room_id WITH =, period WITH &&)
)
\`\`\`
- \`room → booking\` = 1-to-m
- **กันจองทับ:** Postgres exclusion constraint — ห้ามมี 2 booking ที่ \`room_id\` เดียวกัน + ช่วง \`period\` **ทับกัน** (\`&&\`) ต้องเปิด extension \`btree_gist\`
- เช็คฝั่ง app อย่างเดียว **ไม่พอ** — สองคนจองพร้อมกัน (race) → ต้องบังคับที่ DB

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| hotel → room | 1-to-m | FK \`rooms.hotel_id\` |
| room → booking | 1-to-m | FK + \`EXCLUDE\` กันช่วงทับ |
| guest → booking | 1-to-m | FK \`bookings.guest_id\` |

**หลัก:** กัน "ช่วงเวลาทับ" = exclusion constraint ที่ DB · ไม่ใช่เช็คใน app (race)`},
   {type:"concept", title:"ออกแบบ: แชต (ห้องกลุ่ม + อ่านถึงไหน)",
    code:`โจทย์: ระบบแชต
- user คุยกันเป็นห้อง (conversation) มีได้หลายคน (กลุ่ม)
- 1 user อยู่ได้หลาย conversation
- เก็บข้อความ + รู้ว่าใครอ่านถึงไหนแล้ว
ออกแบบตารางยังไง?`,
    answer:`**conversation ↔ user = n-to-m (members) · message = 1-to-m ของ conversation**

\`\`\`
users(id PK, name)
conversations(id PK, title, created_at)
conversation_members(
  conversation_id FK -> conversations(id),
  user_id         FK -> users(id),
  joined_at       TIMESTAMPTZ,
  last_read_at    TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
)
messages(
  id              PK,
  conversation_id FK -> conversations(id),
  sender_id       FK -> users(id),
  body            TEXT,
  sent_at         TIMESTAMPTZ
)
\`\`\`
- **อ่านถึงไหน:** \`last_read_at\` อยู่ที่ junction (เป็นของคู่ user+conversation) → unread = messages ที่ \`sent_at > last_read_at\`
- 1-to-1 chat = conversation ที่มีสมาชิก 2 คน (ไม่ต้องตารางแยก)
- index \`messages(conversation_id, sent_at)\` สำหรับดึงประวัติ

**สรุปความสัมพันธ์:**

| ความสัมพันธ์ | ชนิด | ทำด้วย |
|---|---|---|
| user ↔ conversation | n-to-m | \`conversation_members\` (last_read_at) |
| conversation → message | 1-to-m | FK \`messages.conversation_id\` |
| user → message (ผู้ส่ง) | 1-to-m | FK \`messages.sender_id\` |

**หลัก:** สถานะของ "คู่" (อ่านถึงไหน) เก็บที่ junction · message อ้าง conversation ไม่ใช่คู่ user`}
  ]
}
);
