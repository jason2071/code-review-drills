DATA.push(
{
  group:"Backend", cat:"go-error", title:"Go · Error & Resource",
  desc:"กลืน error, ไม่ปิด resource, ไม่ใช้ ctx, error wrapping, เทียบ error ผิดวิธี — จุดที่ระบบรั่วเงียบๆ",
  problems:[
   {type:"find", title:"อ่านไฟล์",
    code:`func ReadConfig(path string) ([]byte, error) {
\tf, _ := os.Open(path)
\tdata, err := io.ReadAll(f)
\treturn data, err
}`,
    answer:`**2 จุด**

1. **กลืน error ตอน Open** — \`f, _ :=\` ถ้าเปิดไม่ได้ \`f\` = nil → \`io.ReadAll(nil)\` panic
2. **ไม่ปิดไฟล์** — ลืม \`defer f.Close()\` → fd leak

\`\`\`
f, err := os.Open(path)
if err != nil { return nil, fmt.Errorf("open config: %w", err) }
defer f.Close()
return io.ReadAll(f)
\`\`\`
**หลัก:** เปิดอะไร = \`defer Close()\` บรรทัดถัดไป (หลังเช็ค err)`,
    note:`ตรวจ \`err\` ทุกครั้งที่ฟังก์ชันคืนมา — ละเลยตัวเดียวทำ bug เงียบลึก. แนวคิด: Go ไม่มี exception; error เป็นค่าปกติที่ต้อง handle ตรงจุด ไม่ใช่ปล่อยลอย`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`func GetTotal(ctx context.Context, userID int) (int, error) {
\trow := db.QueryRowContext(ctx,
\t\t"SELECT SUM(amount) FROM orders WHERE user_id = $1", userID)
\tvar total int
\trow.Scan(&total)
\treturn total, nil
}`,
    ai:`โค้ดนี้มีปัญหา 3 จุด:\n1. row.Scan(&total) ไม่ได้เช็ค error\n2. SUM(amount) จะคืน NULL ถ้าไม่มี order → scan ลง int จะ error ควรใช้ COALESCE\n3. ลืม defer row.Close() ทำให้ connection leak`,
    answer:`**ข้อ 1, 2 จริง · ข้อ 3 มั่ว (เนียนสุด)**

1. [REAL] ไม่เช็ค error ของ Scan
2. [REAL] \`SUM\` คืน NULL เมื่อไม่มีแถว → ใช้ \`COALESCE(SUM(amount), 0)\`
3. [FAKE] \`QueryRowContext\` คืน \`*sql.Row\` **ไม่มี method \`Close()\`** ใส่แล้ว compile ไม่ผ่าน Scan ปิดให้เอง

\`\`\`
db.Query()    → *sql.Rows → ต้อง defer rows.Close()
db.QueryRow() → *sql.Row  → ไม่ต้อง (Scan ปิดให้)
\`\`\`
**ทำไมหลอกเนียน:** "connection leak" จริงกับ \`Query\` แต่ไม่ใช่ \`QueryRow\``,
    note:`ระวังคำแนะนำ "ถูกเป็นหลักการ" ที่ไม่ดูบริบท และคำอ้าง performance ลอยๆ. แนวคิด: ตรวจสอบ claim ที่ตัวจริง (เช่น \`Atoi\` เรียก \`ParseInt\` ข้างใน) ก่อนเชื่อ`},
   {type:"find", title:"เรียก HTTP API",
    code:`func fetchUser(id int) (*User, error) {
\tresp, err := http.Get(fmt.Sprintf(url, id))
\tif err != nil { return nil, err }
\tvar u User
\tjson.NewDecoder(resp.Body).Decode(&u)
\treturn &u, nil
}`,
    answer:`**2 จุด**

1. **ไม่ปิด resp.Body** → \`defer resp.Body.Close()\` (connection leak)
2. **ไม่เช็ค decode error + status code** → API คืน 500/HTML จะ decode พังเงียบ

\`\`\`
resp, err := http.Get(url)
if err != nil { return nil, err }
defer resp.Body.Close()
if resp.StatusCode != http.StatusOK { return nil, fmt.Errorf("status %d", resp.StatusCode) }
var u User
if err := json.NewDecoder(resp.Body).Decode(&u); err != nil { return nil, err }
\`\`\``,
    note:`\`defer resp.Body.Close()\` + เช็ค \`StatusCode\` เอง — \`err == nil\` ไม่ได้แปลว่า 2xx. แนวคิด: แยก transport error (ต่อไม่ติด) ออกจาก application error (ต่อติดแต่ผลไม่โอเค)`},
   {type:"find", title:"wrap error หาย context",
    code:`func saveOrder(o Order) error {
\tif err := db.Insert(o); err != nil {
\t\tlog.Println("insert failed")
\t\treturn err
\t}
\treturn nil
}`,
    answer:`**2 จุดเชิงคุณภาพ**

1. **error ไม่มี context** — \`return err\` ดิบๆ คนเรียกไม่รู้ว่าพังที่ขั้นไหน wrap ด้วย \`%w\`:
\`\`\`
return fmt.Errorf("save order %d: %w", o.ID, err)
\`\`\`
(\`%w\` ทำให้ \`errors.Is/As\` ยังเช็ค error ต้นทางได้)

2. **log + return error ซ้ำซ้อน** — log ตรงนี้แล้ว return ด้วย → ชั้นบนอาจ log อีก กลายเป็น log ซ้ำหลายรอบ เลือกอย่างใดอย่างหนึ่ง (ปกติ: ไม่ log ชั้นล่าง wrap แล้วส่งขึ้นไป log ที่ชั้นบนสุดที่เดียว)

**หลัก:** wrap error ด้วย \`%w\` + context ทุกชั้น, log ที่ขอบระบบที่เดียว`,
    note:`ห่อ error ด้วย \`%w\` เพื่อคง chain ให้ \`errors.Is\`/\`As\` ตามได้ — \`%v\` ทำให้เหลือแค่ string. แนวคิด: error คือ chain ของเหตุ; เพิ่มบริบทโดยไม่ทำลายต้นตอ`},
   {type:"find", title:"เทียบ error ด้วย ==",
    code:`if err == sql.ErrNoRows {
\treturn nil, nil
}`,
    answer:`**1 จุด: เทียบ error ด้วย \`==\` ตรงๆ เปราะ**

ถ้า error ถูก wrap (\`fmt.Errorf("...: %w", sql.ErrNoRows)\`) ที่ชั้นไหนสักชั้น → \`==\` จะ false → เช็คพลาด

แก้: ใช้ \`errors.Is\`
\`\`\`
if errors.Is(err, sql.ErrNoRows) {
    return nil, nil
}
\`\`\`
สำหรับ custom error type ที่ต้องดึงค่าออกมา ใช้ \`errors.As\`
**หลัก:** เทียบ error ใช้ \`errors.Is\`/\`errors.As\` เสมอ ไม่ใช่ \`==\` (รองรับ wrapped error)`,
    note:`เทียบ error ด้วย \`==\` ใช้ได้แค่ sentinel ที่ไม่ถูก wrap — ใช้ \`errors.Is\` ทะลุ wrap. แนวคิด: identity ของ error อยู่ที่ค่า/ชนิด ไม่ใช่ข้อความ (string compare เปราะ)`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`func mustParse(s string) int {
\tn, err := strconv.Atoi(s)
\tif err != nil { panic(err) }
\treturn n
}`,
    ai:`โค้ดนี้มีปัญหา 2 จุด:\n1. ไม่ควร panic ใน library code ควร return error เสมอ\n2. strconv.Atoi ช้า ควรใช้ strconv.ParseInt แทนเพื่อ performance`,
    answer:`**ข้อ 1 มีประเด็น (ขึ้นกับบริบท) · ข้อ 2 มั่ว**

1. กึ่ง [REAL] — เป็น guideline ที่ถูก *ถ้า* นี่เป็น library code ที่คนอื่นเรียก ควร return error แต่ pattern \`mustXxx\` ที่ panic เป็นที่ยอมรับสำหรับ **ค่าคงที่ตอน init / test** ที่ถ้าพังคือ bug ของ programmer เอง ⇒ ต้องดูว่าใช้ที่ไหน ไม่ใช่ผิดเสมอ

2. [FAKE] \`strconv.Atoi(s)\` จริงๆ **เรียก \`ParseInt(s, 10, 0)\` ข้างใน** — มันคือ wrapper ตัวเดียวกัน ไม่มีเรื่อง performance ต่างกัน AI มั่ว

**บทเรียน:** ระวังคำแนะนำที่ "ถูกเป็นหลักการ" แต่ไม่ดูบริบท (ข้อ 1) และคำอ้าง performance ลอยๆ ที่ไม่จริง (ข้อ 2)`,
    note:`ระวัง pattern \`mustXxx\` ที่ panic — โอเคสำหรับ init/test ที่พังคือ bug ของ dev เอง แต่ไม่ใช่สำหรับ library path. แนวคิด: เลือก return error vs panic ตามว่าใครเรียกและกู้ได้ไหม`},
   {type:"find", title:"loop rows แต่ไม่เช็ค rows.Err()",
    code:`rows, _ := db.Query("SELECT id FROM users")
defer rows.Close()
var ids []int
for rows.Next() {
\tvar id int
\trows.Scan(&id)
\tids = append(ids, id)
}
return ids, nil`,
    answer:`**2 จุด (ข้อมูลขาดแบบเงียบ)**

1. **ไม่เช็ค \`rows.Err()\` หลัง loop** — \`rows.Next()\` คืน \`false\` ทั้งตอนจบปกติ **และ** ตอนเกิด error กลางทาง (network/decode) → ได้ผลไม่ครบโดยไม่มีสัญญาณ
2. ทิ้ง error จาก \`Query\` และ \`Scan\`

\`\`\`
rows, err := db.Query(...)
if err != nil { return nil, err }
defer rows.Close()
for rows.Next() {
    var id int
    if err := rows.Scan(&id); err != nil { return nil, err }
    ids = append(ids, id)
}
if err := rows.Err(); err != nil { return nil, err }  // สำคัญ
\`\`\`
**หลัก:** \`for rows.Next()\` ต้องตามด้วย \`rows.Err()\` เสมอ · loop จบ ≠ สำเร็จ`,
    note:`\`rows.Next()\` คืน false ทั้งตอนจบและตอน error — ต้อง \`rows.Err()\` ยืนยัน. แนวคิด: loop ที่จบ ≠ loop ที่สำเร็จ; iteration ที่มี I/O ต้องเช็ค error หลังจบเสมอ`},
   {type:"find", title:"recover panic ใน goroutine",
    code:`func Safe() {
\tdefer func() { recover() }()
\tgo func() {
\t\tpanic("boom")   // กู้ได้ไหม?
\t}()
\ttime.Sleep(time.Second)
}`,
    answer:`**\`recover\` ไม่ข้าม goroutine → panic ใน goroutine ลูกทำ crash ทั้ง process**

\`defer recover()\` ของ \`Safe\` กู้ได้แค่ panic ที่เกิดใน **goroutine เดียวกัน** · panic ใน \`go func()\` ไม่ผ่าน defer ตัวนั้น → โปรแกรมตายทั้งโปรเซส

\`recover\` ต้องอยู่ใน goroutine ที่ panic เกิดเอง:
\`\`\`
go func() {
    defer func() {
        if r := recover(); r != nil { log.Println("recovered:", r) }
    }()
    panic("boom")
}()
\`\`\`
**หลัก:** ทุก goroutine ที่รับงานภายนอก → ใส่ defer recover ของตัวเอง · panic ข้าม goroutine กู้ไม่ได้`,
    note:`\`recover\` ทำงานเฉพาะใน goroutine ที่ panic เกิด — panic ใน goroutine อื่นล้มทั้งโปรเซส. แนวคิด: error/panic boundary ไม่ข้าม goroutine; แต่ละ goroutine ต้องป้องกันตัวเอง`}
  ]
}
);
