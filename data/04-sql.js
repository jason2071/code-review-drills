DATA.push(
{
  group:"Backend", cat:"sql", title:"SQL · Query & Performance",
  desc:"N+1, index ที่หาย, NULL, injection, OFFSET ช้า, transaction — เรื่องที่ backend ต้องมองออกทันที",
  problems:[
   {type:"find", title:"ดึง order ของแต่ละ user",
    code:`for _, u := range users {
\trows, _ := db.Query(
\t\t"SELECT * FROM orders WHERE user_id = " + strconv.Itoa(u.ID))
}`,
    answer:`**3 จุด**

1. **N+1 query** — loop ยิงทีละ user → รวมเป็น query เดียว: \`WHERE user_id = ANY($1)\` แล้ว group เป็น map
2. **ไม่ parameterize / injection** — ต่อ string ตรงๆ ใช้ \`$1\` เสมอ
3. **\`SELECT *\`** — ดึงทุกคอลัมน์เปลือง + พัง index-only scan เลือกเฉพาะที่ใช้

**พูด:** "ตรงนี้ N+1 ครับ ผมรวมเป็น query เดียวด้วย ANY แล้ว group เป็น map"`},
   {type:"concept", title:"query ช้าตอนข้อมูลเยอะ",
    code:`-- orders 10 ล้านแถว query นี้ช้ามาก
SELECT * FROM orders
WHERE DATE(created_at) = '2025-05-30'
ORDER BY created_at DESC;`,
    answer:`**ใช้ฟังก์ชันครอบคอลัมน์ → index ใช้ไม่ได้ (non-sargable)**

\`DATE(created_at)\` บังคับคำนวณทุกแถว → full scan แม้มี index บน \`created_at\`

\`\`\`
WHERE created_at >= '2025-05-30'
  AND created_at <  '2025-05-31'
\`\`\`
+ \`CREATE INDEX idx_orders_created ON orders(created_at);\` + เลี่ยง \`SELECT *\`

**หลัก:** เห็นฟังก์ชันครอบคอลัมน์ใน WHERE (\`DATE()\`,\`LOWER()\`) → สงสัย index พังทันที`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id;`,
    ai:`Query นี้มีปัญหา 2 จุด:\n1. ต้องมี u.name ใน GROUP BY ไม่งั้น error\n2. LEFT JOIN ช้ากว่า INNER JOIN ควรเปลี่ยนเป็น INNER JOIN เพื่อ performance`,
    answer:`**ข้อ 1 มั่ว (สำหรับ Postgres) · ข้อ 2 มั่ว**

1. [FAKE] ใน **Postgres** GROUP BY ด้วย PK (\`u.id\`) → ใช้ \`u.name\` ใน SELECT ได้เลย (functional dependency) แต่ **MySQL โหมดเก่า** error จริง ⇒ ขึ้นกับ DB ต้องถามก่อน
2. [FAKE] เปลี่ยน LEFT→INNER **เปลี่ยนผลลัพธ์** ไม่ใช่แค่ speed — LEFT เก็บ user ที่ไม่มี order (COUNT=0) ด้วย เป็นคนละ requirement

**บทเรียน:** อย่าสับสน performance กับ correctness — เปลี่ยน join type = เปลี่ยนความหมาย`},
   {type:"find", title:"โอนเงินสองขั้นตอน",
    code:`func Transfer(from, to int, amt int) error {
\t_, err := db.Exec("UPDATE accounts SET bal = bal - $1 WHERE id = $2", amt, from)
\tif err != nil { return err }
\t_, err = db.Exec("UPDATE accounts SET bal = bal + $1 WHERE id = $2", amt, to)
\treturn err
}`,
    answer:`**1 จุดร้ายแรง: ไม่มี transaction**

ถ้า UPDATE แรกสำเร็จแต่ตัวที่สองพัง (เครื่องล่ม/error) → เงินหักจาก \`from\` แต่ไม่เข้า \`to\` → **เงินหาย** ต้องห่อใน transaction ให้ atomic

\`\`\`
tx, err := db.BeginTx(ctx, nil)
if err != nil { return err }
defer tx.Rollback()   // no-op ถ้า commit แล้ว
if _, err := tx.ExecContext(ctx, "...bal - $1...", amt, from); err != nil { return err }
if _, err := tx.ExecContext(ctx, "...bal + $1...", amt, to); err != nil { return err }
return tx.Commit()
\`\`\`
**หลัก:** เขียนหลายขั้นที่ต้อง "สำเร็จทั้งหมดหรือไม่เลย" → transaction เสมอ (+ ควรเช็ค bal ไม่ติดลบด้วย)`},
   {type:"concept", title:"pagination หน้าลึกๆ ช้า",
    code:`-- หน้า 10000 ของตาราง 10 ล้านแถว ช้ามาก
SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET 200000;`,
    answer:`**OFFSET ใหญ่ = ช้า เพราะต้องสแกนทิ้งทุกแถวก่อนหน้า**

\`OFFSET 200000\` แปลว่า DB ต้องอ่าน + ข้าม 200,000 แถวก่อนถึงจะคืน 20 แถว → ยิ่งหน้าลึกยิ่งช้า

**แก้: keyset / cursor pagination** — จำค่าสุดท้ายของหน้าก่อน แล้วกรองต่อ
\`\`\`
-- ส่ง id ตัวสุดท้ายของหน้าก่อนมา (last_id)
SELECT * FROM posts
WHERE id > $1        -- last_id
ORDER BY id LIMIT 20;
\`\`\`
ใช้ index บน \`id\` กระโดดตรงจุดได้เลย เร็วคงที่ทุกหน้า

**ข้อแลกเปลี่ยน:** keyset กระโดดไปหน้าที่ N ตรงๆ ไม่ได้ (ต้องเลื่อนต่อเนื่อง) เหมาะกับ infinite scroll / "โหลดเพิ่ม" มากกว่าเลขหน้า`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_status ON users(status);
-- query: WHERE status = 'active' AND email = 'a@b.com'`,
    ai:`การออกแบบ index นี้:\n1. ดีแล้ว เพราะมี index ครบทั้งสองคอลัมน์ที่ใช้ใน WHERE\n2. Postgres จะใช้ทั้งสอง index พร้อมกันได้เต็มประสิทธิภาพอยู่แล้ว`,
    answer:`**ทั้ง 2 ข้อ มั่ว/ไม่ครบ**

1. [FAKE] มี 2 index แยกกัน ไม่ได้แปลว่าดีที่สุด สำหรับ query ที่กรอง 2 คอลัมน์พร้อมกัน **composite index** มักดีกว่า:
\`\`\`
CREATE INDEX idx_users_status_email ON users(status, email);
\`\`\`
(equality ทั้งคู่ — เรียงคอลัมน์ที่ selective สูงไว้ก่อน; email selective สูงกว่า status อาจสลับเป็น (email) อย่างเดียวก็พอ)

2. [FAKE] Postgres ทำ **bitmap index scan** รวม 2 index ได้ก็จริง แต่ "เต็มประสิทธิภาพ" เกินจริง — มันช้ากว่า composite index ตัวเดียวที่ตรงงาน เพราะต้องรวม bitmap เพิ่มขั้นตอน

**บทเรียน:** index เยอะ ≠ ดี · query หลายคอลัมน์พร้อมกัน → คิดถึง composite ก่อน · index ทุกตัวมีต้นทุนตอน write`},
   {type:"find", title:"ใส่ function บน column ใน WHERE",
    code:`-- มี index บน created_at
SELECT * FROM orders
WHERE DATE(created_at) = '2024-01-01';`,
    answer:`**function บน column → index ใช้ไม่ได้ (non-sargable)**

\`DATE(created_at)\` ต้องคำนวณทุกแถวก่อนเทียบ → planner ใช้ index บน \`created_at\` ไม่ได้ → seq scan ทั้งตาราง

เขียนเป็น **range** ให้ index ทำงาน:
\`\`\`
WHERE created_at >= '2024-01-01'
  AND created_at <  '2024-01-02';
\`\`\`
(เคสจำเป็นต้องแปลงจริง → ทำ expression index: \`CREATE INDEX ... ON orders ((created_at::date))\`)

**หลัก:** อย่าห่อ column ด้วย function/cast ใน WHERE → เขียนเป็นช่วง (range) แทน index ถึงติด`},
   {type:"find", title:"นับ order ด้วย COUNT(column)",
    code:`-- อยากนับจำนวน order ทั้งหมด
SELECT COUNT(discount_code) FROM orders;`,
    answer:`**\`COUNT(column)\` ข้ามแถวที่ column นั้นเป็น NULL**

order ที่ \`discount_code IS NULL\` (ไม่ใช้คูปอง) จะไม่ถูกนับ → ได้น้อยกว่าจำนวน order จริง

\`\`\`
SELECT COUNT(*) FROM orders;   -- นับทุกแถว (ที่ถูก)
\`\`\`
- \`COUNT(*)\` — นับทุกแถว ไม่สน NULL
- \`COUNT(col)\` — นับเฉพาะแถวที่ \`col\` ไม่ใช่ NULL
- \`COUNT(DISTINCT col)\` — นับค่าไม่ซ้ำ (ไม่รวม NULL)

**หลัก:** นับ "จำนวนแถว" → \`COUNT(*)\` เสมอ · \`COUNT(col)\` ใช้เมื่อตั้งใจข้าม NULL`}
  ]
}
);
