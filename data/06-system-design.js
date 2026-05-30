DATA.push(
{
  group:"Backend", cat:"system-design", title:"System Design",
  desc:"คำถามปลายเปิด เน้นวิธีคิด: clarify → component → bottleneck → trade-off ไม่มีคำตอบเดียว",
  problems:[
   {type:"concept", title:"API ช้าตอน traffic เยอะ ทำยังไง?",
    code:`// GET /products ช้าตอนคนใช้พร้อมกันเยอะ จะไล่แก้ยังไง?`,
    answer:`**ไล่เป็นชั้น อย่าเดา — วัดก่อนแก้**
1. หา bottleneck จาก metrics/profiling: DB, app, หรือ network?
2. query: N+1? index ครบ? \`EXPLAIN ANALYZE\`
3. caching (Redis) ของที่อ่านบ่อยเปลี่ยนช้า
4. pagination ไม่ดึงหมื่นแถวรวด
5. connection pool เล็กไป?
6. scale: app คอขวด → horizontal + LB; DB อ่านหนัก → read replica

**กุญแจ:** โชว์ว่าวัดก่อนแก้ + รู้ว่าแต่ละวิธีแก้คนละปัญหา`},
   {type:"concept", title:"ออกแบบ rate limiting",
    code:`// จำกัด user เรียก API ไม่เกิน 100 ครั้ง/นาที`,
    answer:`**Clarify:** ต่อ user/IP? มีหลาย instance ไหม? (สำคัญสุด)

- instance เดียว → counter ใน memory ได้
- **หลาย instance (production)** → counter ต้อง shared → **Redis**

**Algorithm:** fixed window (ง่าย แต่ burst ตรงรอยต่อ) / sliding window (แม่นกว่า) / **token bucket** (นิยม รองรับ burst)

implementation: key \`ratelimit:{user}\` + \`INCR\`+\`EXPIRE\` หรือ sorted set; เกิน → \`429\` + \`Retry-After\`

**กุญแจ:** ถามเรื่อง distributed — ตอบ in-memory เลยจะดูไม่เห็นภาพ production`},
   {type:"concept", title:"ETL: import Excel ก้อนใหญ่",
    code:`// Excel 500k แถว clean แล้ว insert เข้า Postgres ให้เร็วและไม่ล่ม`,
    answer:`**stream + batch อย่าโหลดทั้งก้อนเข้า memory**
1. อ่านแบบ stream ทีละ chunk (อย่าทั้งไฟล์เข้า RAM)
2. clean/validate ระหว่าง stream เก็บแถวเสียแยกรายงาน
3. **batch insert** batch ละ 1k–5k — Postgres ใช้ \`COPY\` เร็วสุด, ห่อ transaction
4. checkpoint ว่า import ถึงไหน → resume ได้ถ้าล่ม
5. idempotent: \`ON CONFLICT\` กันข้อมูลซ้ำตอนรันใหม่

**คำสำคัญ:** stream, batch, transaction, idempotent, resume`},
   {type:"concept", title:"กันจ่ายเงินซ้ำ (idempotency)",
    code:`// user กดปุ่มจ่ายเงินรัวๆ / network retry → อย่าให้ตัดเงินซ้ำ`,
    answer:`**ใช้ idempotency key**

ปัญหา: client retry (เน็ตหลุดแล้วส่งซ้ำ) หรือกดรัว → request เดียวกันมาหลายรอบ → ตัดเงินซ้ำ

**วิธีแก้:**
1. client สร้าง **idempotency key** ไม่ซ้ำ (UUID) ต่อ 1 การจ่าย ส่งมากับ request (header)
2. server เก็บ key ลง DB (unique constraint) ก่อนประมวลผล
   - ถ้า key มีอยู่แล้ว → คืนผลลัพธ์เดิมที่เคยทำ ไม่ตัดเงินซ้ำ
   - ถ้าใหม่ → ประมวลผล + บันทึกผลผูกกับ key
3. ห่อใน transaction ให้ "เช็ค key + ตัดเงิน" atomic

เสริม: unique constraint ที่ DB เป็นด่านสุดท้ายกัน race จาก 2 request พร้อมกัน

**กุญแจ:** คำว่า idempotency key + unique constraint + atomic — โชว์ว่าเข้าใจ retry semantics ของระบบจ่ายเงิน`},
   {type:"concept", title:"cache ข้อมูลเก่า (invalidation)",
    code:`// cache product ใน Redis แต่ราคาอัปเดตแล้ว cache ยังเก่า แก้ยังไง?`,
    answer:`**Cache invalidation — เลือกกลยุทธ์ตามว่าข้อมูลเปลี่ยนบ่อยแค่ไหน + ทนข้อมูลเก่าได้ไหม**

1. **TTL (expire)** — ตั้งอายุ cache เช่น 60 วิ ง่ายสุด ยอมข้อมูลเก่าได้ชั่วคราว เหมาะกับของที่ไม่ critical
2. **Write-through / invalidate on write** — ตอนอัปเดต DB ให้ลบ/อัปเดต cache key นั้นด้วย → cache สดเสมอ แต่โค้ด write ต้องจำลบ cache ทุกที่
3. **ผสม** — invalidate on write + TTL กันพลาด (เผื่อบางจุดลืมลบ)

**ข้อควรระวัง:**
- ลบ cache (delete) ปลอดภัยกว่าเขียนทับ (set) — กัน race เขียนค่าเก่าทับใหม่
- ระวัง cache stampede: หลาย request พุ่งหา DB พร้อมกันตอน cache หมดอายุ → ใช้ lock/single-flight

**คำตอบที่ดี:** "ผมจะ invalidate ตอน write + ตั้ง TTL กันพลาดครับ และใช้ลบ key แทนเขียนทับเพื่อกัน race"`},
   {type:"concept", title:"รับอัปโหลดไฟล์จำนวนมาก",
    code:`// ระบบให้ user อัปโหลดรูป/ไฟล์เยอะมาก ออกแบบยังไงให้ scale?`,
    answer:`**อย่าให้ไฟล์วิ่งผ่าน app server / อย่าเก็บใน DB**

1. **เก็บไฟล์ใน object storage** (S3 / Huawei OBS / GCS) ไม่ใช่ใน DB หรือ disk ของ app — DB เก็บแค่ metadata + URL
2. **Presigned URL** — ให้ client อัปโหลดตรงเข้า storage ด้วย URL ที่ server เซ็นให้ → ไฟล์ไม่ต้องผ่าน app server (ลด load มหาศาล)
3. **validate** ขนาด/ชนิดไฟล์ก่อนออก presigned URL + สแกน virus ถ้าจำเป็น
4. **ประมวลผลแบบ async** — ต้อง resize/แปลงไฟล์ → โยนเข้า queue (worker ทำทีหลัง) ไม่บล็อก request
5. **CDN** หน้าไฟล์ที่อ่านบ่อย

**กุญแจ:** presigned URL + object storage + async processing — โชว์ว่ารู้ว่าไฟล์ใหญ่ไม่ควรผ่าน app/DB
(เชื่อมกับงาน OBS→Postgres ที่ทำอยู่ได้พอดี)`}
  ]
}
);
