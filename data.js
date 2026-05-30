const DATA = [
{
  group:"Backend", cat:"go-logic", title:"Go · Logic & Edge",
  desc:"nil map/slice, off-by-one, ตัด slice ไม่ clamp, อ่าน map ไม่ comma-ok, UTF-8/rune, defer ใน loop — ส่วนใหญ่ panic ตอน runtime",
  problems:[
   {type:"find", title:"นับจำนวนตาม category",
    code:`func CountByCategory(items []Item) map[string]int {
\tvar counts map[string]int
\tfor i := 0; i <= len(items); i++ {
\t\tcounts[items[i].Category]++
\t}
\treturn counts
}`,
    answer:`**2 จุด (panic ทั้งคู่)**

1. **nil map** — \`var counts map[string]int\` เป็น nil เขียน \`counts[...]++\` → panic "assignment to entry in nil map" ต้อง \`make(map[string]int)\`

2. **off-by-one** — \`i <= len(items)\` รอบสุดท้าย \`items[len(items)]\` เกินขอบ → panic ใช้ \`i < len(items)\` หรือ \`range\`

\`\`\`
counts := make(map[string]int)
for _, it := range items { counts[it.Category]++ }
\`\`\`
**ทริค:** ใช้ \`range\` แทน \`for i :=\` ตัด off-by-one ทิ้งทั้งหมด`},
   {type:"find", title:"ดึงราคาจาก map",
    code:`func PriceOf(prices map[string]int, sku string) int {
\treturn prices[sku] * 2
}`,
    answer:`**1 จุด (logic เงียบ)**

อ่าน map โดยไม่ใช้ **comma-ok** — ถ้า \`sku\` ไม่มีใน map คืน 0 แล้วคูณ 2 = 0 โดยไม่มีสัญญาณว่า key ผิด

\`\`\`
price, ok := prices[sku]
if !ok { return 0, fmt.Errorf("unknown sku: %s", sku) }
\`\`\`
**หลัก:** อ่าน map ที่ key อาจไม่มี → \`v, ok := m[k]\` เสมอ`},
   {type:"find", title:"ตัด slice เป็นหน้า",
    code:`func Page(items []Item, page, size int) []Item {
\tstart := page * size
\tend := start + size
\treturn items[start:end]
}`,
    answer:`**2 จุด**

1. **ไม่ clamp ขอบ** — page เกินข้อมูล → \`items[start:end]\` panic out of range
2. **ไม่ validate ค่าติดลบ** → index ติดลบ → panic

\`\`\`
if page < 0 || size <= 0 { return []Item{} }
start := page * size
if start >= len(items) { return []Item{} }
end := start + size
if end > len(items) { end = len(items) }
return items[start:end]
\`\`\``},
   {type:"find", title:"หาค่าเฉลี่ย",
    code:`func Average(nums []int) int {
\tsum := 0
\tfor _, n := range nums { sum += n }
\treturn sum / len(nums)
}`,
    answer:`**1 จุด (panic)**

**หารด้วยศูนย์** — \`nums\` ว่าง → \`len = 0\` → integer divide by zero → panic (ต่างจาก float ที่ได้ NaN)

\`\`\`
if len(nums) == 0 { return 0 }
\`\`\`
**หลัก:** ตัวหารมาจาก \`len()\`/input → เช็ค 0 ก่อนเสมอ`},
   {type:"find", title:"นับจำนวนตัวอักษรชื่อ (ภาษาไทย)",
    code:`func NameLength(name string) int {
\treturn len(name)
}
// name = "สมชาย" คืนค่าได้ 15 ทำไม?`,
    answer:`**1 จุด: \`len(string)\` นับ byte ไม่ใช่ตัวอักษร**

string ใน Go เก็บเป็น UTF-8 ตัวอักษรไทย/อิโมจิใช้ 3+ byte ต่อตัว → "สมชาย" = 5 ตัว แต่ \`len()\` คืน 15 (byte)

แก้: นับเป็น rune
\`\`\`
return utf8.RuneCountInString(name)
// หรือ len([]rune(name))
\`\`\`
**หลัก:** \`len(string)\` = จำนวน byte ถ้าจะนับ "ตัวอักษร" หรือวน index ทีละตัว ต้องแปลงเป็น \`[]rune\` ก่อน (สำคัญมากกับภาษาไทย)`},
   {type:"find", title:"ปิดไฟล์ใน loop",
    code:`func ProcessFiles(paths []string) error {
\tfor _, p := range paths {
\t\tf, err := os.Open(p)
\t\tif err != nil { return err }
\t\tdefer f.Close()
\t\t// อ่าน/ประมวลผล f
\t}
\treturn nil
}`,
    answer:`**1 จุด: \`defer\` ใน loop สะสมจนจบฟังก์ชัน**

\`defer\` รันตอน **ฟังก์ชัน** จบ ไม่ใช่จบรอบ loop → ถ้ามี 10,000 ไฟล์ จะเปิดค้างพร้อมกันหมดจนจบฟังก์ชัน → file descriptor หมด

แก้: แยกการประมวลผลออกเป็นฟังก์ชันย่อย ให้ defer ทำงานต่อรอบ
\`\`\`
for _, p := range paths {
    if err := processOne(p); err != nil { return err }
}
func processOne(p string) error {
    f, err := os.Open(p)
    if err != nil { return err }
    defer f.Close()   // รันตอน processOne จบ = ต่อรอบ
    ...
}
\`\`\`
**หลัก:** เห็น \`defer\` ในloop → ระวัง resource สะสม`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`func Contains(nums []int, target int) bool {
\tfor _, n := range nums {
\t\tif n == target { return true }
\t}
\treturn false
}`,
    ai:`โค้ดนี้มีปัญหา 2 จุด:\n1. ควร sort ก่อนแล้วใช้ binary search เพื่อ performance ที่ดีกว่า\n2. มี off-by-one ใน loop ควรเริ่มจาก i := 1`,
    answer:`**AI มั่วทั้ง 2 ข้อ — โค้ดถูกแล้ว**

1. [FAKE] linear search O(n) เหมาะกับ slice ที่ไม่เรียง การ sort ก่อน (O(n log n)) **ช้ากว่า** สำหรับการค้นครั้งเดียว และยัง mutate ลำดับเดิมด้วย คำแนะนำผิดบริบท

2. [FAKE] ใช้ \`range\` อยู่แล้ว ไม่มี index \`i\` ให้ off-by-one เลย — AI พูดถึงสิ่งที่ไม่มีในโค้ด

**บทเรียน:** อย่ายอมรับ "optimization" ที่ AI เสนอโดยไม่คิด — บางทีของเดิมเหมาะสมแล้ว binary search ดีก็ต่อเมื่อ "เรียงไว้แล้ว + ค้นหลายครั้ง" เท่านั้น`}
  ]
},
{
  group:"Backend", cat:"go-concurrency", title:"Go · Concurrency",
  desc:"goroutine, WaitGroup, race condition, loop capture, channel, mutex — โดนออกบ่อยมาก",
  problems:[
   {type:"find", title:"ดึงหลาย product พร้อมกัน",
    code:`func FetchAll(ids []int) []Product {
\tvar results []Product
\tvar wg sync.WaitGroup
\tfor _, id := range ids {
\t\twg.Add(1)
\t\tgo func() {
\t\t\tdefer wg.Done()
\t\t\tp, _ := repo.Get(id)
\t\t\tresults = append(results, p)
\t\t}()
\t}
\twg.Wait()
\treturn results
}`,
    answer:`**4 จุด**

1. **Race condition** — หลาย goroutine \`append\` slice เดียวกัน → data race เขียนผ่าน index (\`results[i]\`) แทน
2. **Loop capture** — \`id\` ถูก closure จับ (Go < 1.22) → ส่งเป็น parameter
3. **กลืน error** — \`p, _ :=\` → ใช้ \`errgroup\`
4. **ไม่จำกัด goroutine** — ids เยอะ → goroutine ระเบิดรุม DB → \`g.SetLimit()\`/semaphore

\`\`\`
results := make([]Product, len(ids))
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10)
for i, id := range ids {
    i, id := i, id
    g.Go(func() error {
        p, err := repo.Get(ctx, id)
        if err != nil { return err }
        results[i] = p
        return nil
    })
}
if err := g.Wait(); err != nil { return nil, err }
\`\`\`
**ทริค:** เขียนลง \`results[i]\` คนละช่อง → ไม่ต้อง lock`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`func SumPositive(nums []int) int {
\tsum := 0
\tfor i := 0; i < len(nums); i++ {
\t\tif nums[i] > 0 { sum += nums[i] }
\t}
\treturn sum
}`,
    ai:`โค้ดนี้มีปัญหา 3 จุด:\n1. off-by-one ที่ i < len(nums) ควรเป็น i <= len(nums)\n2. มี race condition เพราะเข้าถึง slice ใน loop\n3. ควรใช้ range เพราะ index access ช้ากว่า`,
    answer:`**AI มั่วทั้ง 3 — โค้ดถูกแล้ว**

1. [FAKE] \`i < len\` ถูก เปลี่ยนเป็น \`<=\` จะ panic (AI แนะนำให้ใส่บั๊ก)
2. [FAKE] ไม่มี goroutine = ไม่มี race เป็น loop single-thread
3. [FAKE] index ไม่ได้ช้ากว่า range \`range\` แค่อ่านง่ายกว่า

**บทเรียน:** กล้าพูด "โค้ดนี้โอเคแล้ว" ถ้าไม่มีบั๊กจริง · หลักจับ race: ไม่เห็น \`go\`/channel → ไม่ต้องพูดเรื่อง race`},
   {type:"find", title:"ปิด channel",
    code:`func produce(ch chan int, nums []int) {
\tfor _, n := range nums { ch <- n }
}
func main() {
\tch := make(chan int)
\tgo produce(ch, []int{1, 2, 3})
\tfor v := range ch { fmt.Println(v) }
}`,
    answer:`**1 จุด (deadlock)**

ไม่ปิด channel — \`for v := range ch\` รอตลอดไป พอส่งครบ 3 ตัวแล้วไม่ \`close(ch)\` → block รอตัวที่ 4 ที่ไม่มา → deadlock

\`\`\`
func produce(ch chan int, nums []int) {
    defer close(ch)
    for _, n := range nums { ch <- n }
}
\`\`\`
**หลัก:** ฝั่งส่ง (sender) เป็นคนปิด channel เสมอ ฝั่งรับห้ามปิด`},
   {type:"find", title:"WaitGroup.Add ผิดที่",
    code:`func run(tasks []Task) {
\tvar wg sync.WaitGroup
\tfor _, t := range tasks {
\t\tgo func(t Task) {
\t\t\twg.Add(1)
\t\t\tdefer wg.Done()
\t\t\tt.Do()
\t\t}(t)
\t}
\twg.Wait()
}`,
    answer:`**1 จุด: \`wg.Add(1)\` อยู่ในข้าง goroutine**

\`wg.Wait()\` อาจรันก่อนที่ goroutine จะทัน \`Add\` → Wait เห็น counter = 0 → ผ่านทันทีโดยไม่รอ task เสร็จ (race ระหว่าง Add กับ Wait)

แก้: \`Add\` **นอก** goroutine ก่อน \`go\`
\`\`\`
for _, t := range tasks {
    wg.Add(1)
    go func(t Task) {
        defer wg.Done()
        t.Do()
    }(t)
}
wg.Wait()
\`\`\`
**หลัก:** \`wg.Add\` ต้องเรียกก่อน start goroutine เสมอ ไม่ใช่ข้างใน`},
   {type:"find", title:"mutex ไม่ unlock ทุกทาง",
    code:`func (c *Counter) Inc(key string) error {
\tc.mu.Lock()
\tv, ok := c.data[key]
\tif !ok { return errors.New("not found") }
\tc.data[key] = v + 1
\tc.mu.Unlock()
\treturn nil
}`,
    answer:`**1 จุด: return ก่อน Unlock → lock ค้าง (deadlock)**

ตอน \`!ok\` → \`return\` ออกเลยโดยไม่ \`Unlock\` → lock ไม่ถูกปล่อย ครั้งต่อไปที่ใครเรียกจะค้างตลอดกาล

แก้: \`defer\` ทันทีหลัง Lock
\`\`\`
c.mu.Lock()
defer c.mu.Unlock()
v, ok := c.data[key]
if !ok { return errors.New("not found") }
c.data[key] = v + 1
return nil
\`\`\`
**หลัก:** \`Lock()\` แล้ว \`defer Unlock()\` บรรทัดถัดไปเสมอ → ปลอดภัยทุก return path`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`var once sync.Once
func GetConfig() *Config {
\tonce.Do(func() { cfg = loadConfig() })
\treturn cfg
}`,
    ai:`โค้ดนี้มีปัญหา 2 จุด:\n1. sync.Once ไม่ thread-safe ต้องใส่ mutex เพิ่ม\n2. cfg เป็น global ควรมี mutex ป้องกันตอนอ่าน`,
    answer:`**ข้อ 1 มั่ว · ข้อ 2 พอมีประเด็นแต่บริบทนี้ปลอดภัย**

1. [FAKE] \`sync.Once\` **thread-safe อยู่แล้วโดยออกแบบ** — รับประกันว่า func รันครั้งเดียวแม้หลาย goroutine เรียกพร้อมกัน ไม่ต้องใส่ mutex เพิ่ม

2. ส่วนใหญ่ [FAKE] ในเคสนี้ — \`once.Do\` มี memory barrier ในตัว เขียน \`cfg\` เสร็จก่อน Do return ทุก goroutine ที่ผ่าน \`once.Do\` จะเห็นค่า \`cfg\` ที่ถูกต้อง (ตราบใดที่ไม่มีใครเขียน \`cfg\` ที่อื่นอีก)

**บทเรียน:** \`sync.Once\` เป็น primitive ที่ thread-safe ในตัว AI มั่วบ่อยว่า "ต้องใส่ mutex เพิ่ม" กับของที่ปลอดภัยอยู่แล้ว`}
  ]
},
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
**หลัก:** เปิดอะไร = \`defer Close()\` บรรทัดถัดไป (หลังเช็ค err)`},
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
**ทำไมหลอกเนียน:** "connection leak" จริงกับ \`Query\` แต่ไม่ใช่ \`QueryRow\``},
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
\`\`\``},
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

**หลัก:** wrap error ด้วย \`%w\` + context ทุกชั้น, log ที่ขอบระบบที่เดียว`},
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
**หลัก:** เทียบ error ใช้ \`errors.Is\`/\`errors.As\` เสมอ ไม่ใช่ \`==\` (รองรับ wrapped error)`},
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

**บทเรียน:** ระวังคำแนะนำที่ "ถูกเป็นหลักการ" แต่ไม่ดูบริบท (ข้อ 1) และคำอ้าง performance ลอยๆ ที่ไม่จริง (ข้อ 2)`}
  ]
},
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

**บทเรียน:** index เยอะ ≠ ดี · query หลายคอลัมน์พร้อมกัน → คิดถึง composite ก่อน · index ทุกตัวมีต้นทุนตอน write`}
  ]
},
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
**ข้อยกเว้น:** ถ้า tag ไม่ต้องเป็น entity (ไม่มี metadata) บน Postgres ใช้ \`TEXT[]\` + **GIN index** ก็ได้ — แต่ comma ยัดใน \`TEXT\` เดียวผิดเสมอ`}
  ]
},
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
},
{
  group:"Backend", cat:"unit-test", title:"Go · Unit Test (testify)",
  desc:"assert vs require, ลำดับ argument, table-driven, mock, test isolation, httptest — จุดพลาดที่ทำเทสต์ crash หรือ pass ทั้งที่ควร fail",
  problems:[
   {type:"find", title:"เทสต์ที่ใช้ assert ผิดที่",
    code:`func TestGetUser(t *testing.T) {
\tu, err := svc.GetUser(1)
\tassert.NoError(t, err)
\tassert.Equal(t, "Alice", u.Name)
}`,
    answer:`**ควรใช้ \`require\` ไม่ใช่ \`assert\` ตรง error**

- \`assert.*\` — fail แล้วทำงานต่อ
- \`require.*\` — fail แล้วหยุดทันที (\`t.FailNow()\`)

ถ้า err != nil → \`u\` มักเป็น nil แต่ assert ไม่หยุด → \`u.Name\` panic/crash

\`\`\`
require.NoError(t, err)        // พังแล้วหยุด
assert.Equal(t, "Alice", u.Name)
\`\`\`
**หลัก:** ถ้าบรรทัดหลังต้องใช้ค่าที่ขึ้นกับ assertion → ใช้ \`require\``},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`func TestAdd(t *testing.T) {
\tresult := Add(2, 3)
\tassert.Equal(t, result, 5)
}`,
    ai:`เทสต์นี้มีปัญหา 2 จุด:\n1. ลำดับ argument ของ assert.Equal ผิด ควรเป็น assert.Equal(t, 5, result) เพราะ expected ต้องมาก่อน actual\n2. assert ไม่ทำให้ test fail ต้องเปลี่ยนเป็น require เท่านั้น test ถึงจะ fail`,
    answer:`**ข้อ 1 จริง · ข้อ 2 มั่ว**

1. [REAL] \`assert.Equal(t, expected, actual)\` → ควร \`(t, 5, result)\` สลับแล้ว error message กลับด้าน debug งง (เรื่อง message ไม่ใช่ผลเพี้ยน)
2. [FAKE] \`assert\` **ทำให้ fail ปกติ** (\`t.Fail()\`) แค่ไม่หยุด execution ต่างจาก require ที่หยุด (\`t.FailNow()\`) — เทสต์ยัง fail ถูกต้อง

**บทเรียน:** AI สับสน "fail" กับ "หยุด" — assert=fail แต่ไปต่อ, require=fail แล้วหยุด`},
   {type:"find", title:"table-driven + parallel subtest",
    code:`for _, tt := range tests {
\tt.Run(tt.name, func(t *testing.T) {
\t\tt.Parallel()
\t\tassert.Equal(t, tt.want, Discount(tt.price))
\t})
}`,
    answer:`**loop capture ใน parallel subtest**

\`t.Parallel()\` รอ loop จบก่อนค่อยรันพร้อมกัน ถ้า Go < 1.22 → \`tt\` ถูกแชร์ → เป็นค่าสุดท้ายทุกตัว → เทสต์เพี้ยน/ผ่านมั่ว

\`\`\`
for _, tt := range tests {
    tt := tt   // capture
    t.Run(tt.name, func(t *testing.T) { t.Parallel(); ... })
}
\`\`\`
Go 1.22+ แก้แล้ว แต่ในข้อสอบควรพูดถึง + ถามว่าใช้เวอร์ชันไหน`},
   {type:"concept", title:"จะ mock repository ด้วย testify ยังไง?",
    code:`type UserRepo interface {
\tGetUser(id int) (*User, error)
}
// อยากเทสต์ service โดยไม่ต่อ DB จริง`,
    answer:`**interface + testify/mock**

1. service รับ repo เป็น **interface** (ไม่ใช่ struct ตรงๆ)
2. mock struct ฝัง \`mock.Mock\`:
\`\`\`
type MockUserRepo struct { mock.Mock }
func (m *MockUserRepo) GetUser(id int) (*User, error) {
    args := m.Called(id)
    u, _ := args.Get(0).(*User)
    return u, args.Error(1)
}
\`\`\`
3. ในเทสต์:
\`\`\`
repo := new(MockUserRepo)
repo.On("GetUser", 1).Return(&User{Name:"Alice"}, nil)
svc := NewService(repo)
u, err := svc.GetUser(1)
require.NoError(t, err)
assert.Equal(t, "Alice", u.Name)
repo.AssertExpectations(t)   // ยืนยันถูกเรียกจริง
\`\`\`
**กุญแจ:** depend on interface → mock ได้ · เทสต์ service=mock repo, เทสต์ repo=DB จริง/sqlmock`},
   {type:"find", title:"เทสต์แชร์ state กัน",
    code:`var cache = map[int]string{}
func TestSet(t *testing.T) {
\tcache[1] = "a"
\tassert.Equal(t, "a", cache[1])
}
func TestGet(t *testing.T) {
\tassert.Equal(t, "a", cache[1]) // พึ่ง TestSet
}`,
    answer:`**1 จุด: เทสต์พึ่งพากันผ่าน global state**

\`TestGet\` พึ่งให้ \`TestSet\` รันก่อนเพื่อ set \`cache[1]\` → ถ้ารันแยก (\`-run TestGet\`) หรือสลับลำดับ/รัน \`-parallel\` จะ fail แบบ flaky

**ปัญหา:** เทสต์ต้อง **isolated** — รันลำดับไหน เดี่ยวๆ หรือพร้อมกัน ก็ต้องผ่าน

แก้: แต่ละเทสต์ setup state ของตัวเอง อย่าใช้ global ร่วม
\`\`\`
func TestGet(t *testing.T) {
    cache := map[int]string{1: "a"}  // local
    assert.Equal(t, "a", cache[1])
}
\`\`\`
หรือใช้ \`t.Cleanup()\` reset state หลังแต่ละเทสต์
**หลัก:** เทสต์ห้ามพึ่งลำดับ/ผลของเทสต์อื่น`},
   {type:"concept", title:"เทสต์ Fiber/HTTP handler ยังไง?",
    code:`// อยากเทสต์ handler GET /health ว่าคืน 200 + "OK"`,
    answer:`**ใช้ \`app.Test()\` ของ Fiber (หรือ \`httptest\` สำหรับ net/http)**

Fiber:
\`\`\`
func TestHealth(t *testing.T) {
    app := fiber.New()
    app.Get("/health", healthHandler)

    req := httptest.NewRequest("GET", "/health", nil)
    resp, err := app.Test(req)        // Fiber รัน request จริงในหน่วยความจำ
    require.NoError(t, err)

    assert.Equal(t, 200, resp.StatusCode)
    body, _ := io.ReadAll(resp.Body)
    assert.Equal(t, "OK", string(body))
}
\`\`\`
net/http มาตรฐานใช้ \`httptest.NewRecorder()\` + \`handler.ServeHTTP(w, req)\`

**กุญแจ:**
- ไม่ต้องเปิด server จริง/ใช้ port — ทดสอบในหน่วยความจำ เร็วและ isolated
- mock service/repo ที่ handler เรียกด้วย (เทสต์ handler ไม่ควรแตะ DB จริง)
- เทสต์หลาย case ด้วย table-driven (method/path/status/body)`}
  ]
},
{
  group:"Frontend", cat:"typescript", title:"TypeScript",
  desc:"any, ลืม await, narrowing, == vs ===, Promise handling — บั๊กที่ compiler ควรจับแต่บางทีหลุด",
  problems:[
   {type:"find", title:"คำนวณ total",
    code:`function calcTotal(items: any[]) {
  let total = 0;
  for (const item of items) { total += item.price; }
  return total;
}`,
    answer:`**1 ใหญ่ + 1 เสี่ยง**

1. **\`any[]\`** ทิ้ง type safety ถ้า price เป็น string → \`+=\` กลายเป็น string concat กำหนด type: \`items: { price: number }[]\`
2. **ไม่กัน undefined** → \`total += undefined\` = NaN ใช้ \`item.price ?? 0\`

**หลัก:** เห็น \`any\` ในข้อสอบ TS = ธงแดง`},
   {type:"find", title:"เรียก API",
    code:`async function getUser(id: number) {
  const res = fetch(\`/api/users/\${id}\`);
  const data = res.json();
  return data;
}`,
    answer:`**2 จุด (ลืม await)**

1. \`fetch()\` คืน Promise ลืม \`await\` → \`res\` เป็น Promise → \`res.json()\` พัง
2. \`res.json()\` ก็คืน Promise

\`\`\`
const res = await fetch(\`/api/users/\${id}\`);
if (!res.ok) throw new Error(\`status \${res.status}\`);
return res.json();
\`\`\`
**หลัก:** async function → ไล่ว่า \`await\` ครบทุก async call ไหม`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`function getName(user?: { name: string }) {
  return user.name.toUpperCase();
}`,
    ai:`โค้ดนี้มีปัญหา 2 จุด:\n1. user เป็น optional แต่เข้าถึง user.name โดยไม่เช็ค → runtime error ถ้า undefined\n2. ควรใช้ var แทน const เพื่อรองรับ hoisting`,
    answer:`**ข้อ 1 จริง · ข้อ 2 มั่ว (ไม่เกี่ยว)**

1. [REAL] \`user?\` optional → ไม่ส่ง = undefined → \`user.name\` พัง แก้: \`user?.name?.toUpperCase() ?? ""\`
2. [FAKE] โค้ดนี้ไม่มี \`const\`/\`var\` สักตัว! AI พูดเรื่อง hoisting ลอยๆ ไม่เกี่ยว และ \`var\` ก็ไม่ควรกลับไปใช้

**บทเรียน:** เช็คว่าสิ่งที่ AI พูดถึง **มีอยู่ในโค้ดจริงไหม**`},
   {type:"find", title:"กรอง array",
    code:`const ids = [1, 2, 3];
if (ids.length == "3") {
  console.log("three items");
}`,
    answer:`**2 จุด**

1. **\`==\` แทน \`===\`** — \`==\` ทำ type coercion (\`3 == "3"\` เป็น true แบบไม่ตั้งใจ) ใน TS/JS ใช้ \`===\` เสมอ
2. **เทียบ number กับ string** — \`ids.length\` เป็น number แต่เทียบกับ \`"3"\` (string) ควรเป็น \`=== 3\` (TS strict ควร error ตรงนี้)

\`\`\`
if (ids.length === 3) { ... }
\`\`\`
**หลัก:** เห็น \`==\`/\`!=\` ใน JS/TS = ธงแดงทันที เปลี่ยนเป็น \`===\`/\`!==\``},
   {type:"find", title:"loop กับ async",
    code:`async function saveAll(items: Item[]) {
  items.forEach(async (item) => {
    await save(item);
  });
  console.log("done");
}`,
    answer:`**1 จุด: \`forEach\` ไม่รอ async**

\`forEach\` ไม่สน Promise ที่ callback คืน → "done" พิมพ์ทันทีก่อน \`save\` เสร็จ และ error ใน save จับไม่ได้

แก้: ใช้ \`for...of\` (ทีละตัว) หรือ \`Promise.all\` (พร้อมกัน)
\`\`\`
// ทีละตัวตามลำดับ
for (const item of items) { await save(item); }

// หรือพร้อมกัน
await Promise.all(items.map(item => save(item)));
\`\`\`
**หลัก:** \`forEach\` + async = bug คลาสสิก มันไม่ await ให้ ใช้ for...of หรือ Promise.all`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`type User = { id: number; name: string };
function format(u: User): string {
  return \`#\${u.id} \${u.name}\`;
}`,
    ai:`โค้ดนี้มีปัญหา 2 จุด:\n1. ควรใช้ interface แทน type เพราะ type ช้ากว่าตอน compile\n2. ต้องเช็ค u เป็น null ก่อนเพราะอาจ undefined`,
    answer:`**ทั้ง 2 ข้อ มั่ว — โค้ดถูกแล้ว**

1. [FAKE] \`type\` กับ \`interface\` performance ตอน compile แทบไม่ต่าง เป็นเรื่อง style/feature (type ทำ union/intersection ได้, interface ทำ declaration merging ได้) ไม่ใช่เรื่องความเร็ว
2. [FAKE] \`u: User\` ไม่ได้เป็น optional (\`u?: User\`) type system รับประกันว่ามีค่าแล้ว ไม่ต้องเช็ค null — ถ้าจะให้รับ null ต้องเขียน type ให้ชัด

**บทเรียน:** AI ชอบยัด "best practice ทั่วไป" (ใช้ interface, เช็ค null) ที่ไม่ตรงบริบท type นี้ non-nullable อยู่แล้ว`}
  ]
},
{
  group:"Frontend", cat:"react", title:"React",
  desc:"re-render, hooks, stale state, key, memory leak, derived state, useMemo — โดนถามบ่อยสุดฝั่ง FE",
  problems:[
   {type:"find", title:"useEffect fetch",
    code:`function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  });
  return users.map(u => <li>{u.name}</li>);
}`,
    answer:`**3 จุด**

1. **ไม่มี dependency array** → fetch ทุก render เป็น loop ใส่ \`[]\`
2. **ขาด key** → \`key={u.id}\`
3. **return array ดิบ** → ห่อ \`<ul>...</ul>\`

\`\`\`
useEffect(() => { fetch('/api/users').then(r=>r.json()).then(setUsers); }, []);
return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
\`\`\`
**หลัก:** useEffect → เช็ค deps array · .map ใน JSX → เช็ค key`},
   {type:"find", title:"นับเลขใน effect",
    code:`function Timer() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setInterval(() => setCount(count + 1), 1000);
  }, []);
  return <div>{count}</div>;
}`,
    answer:`**2 จุด**

1. **Stale closure** — \`count\` จับค่าตอน mount (0) ค้างที่ 1 ใช้ functional update: \`setCount(c => c + 1)\`
2. **Memory leak** — ไม่ clear interval ตอน unmount

\`\`\`
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
\`\`\`
**หลัก:** setInterval/timeout/listener/subscribe ใน effect → return cleanup เสมอ`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`function Profile({ userId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetchUser(userId).then(setData);
  }, [userId]);
  return <div>{data?.name}</div>;
}`,
    ai:`โค้ดนี้มีปัญหา 3 จุด:\n1. dependency array ผิด ควรเอา userId ออกเพราะทำให้ re-fetch\n2. มี race condition ถ้า userId เปลี่ยนเร็วๆ response เก่าอาจมาทับใหม่\n3. ควรใช้ class component แทนเพราะ hooks ช้ากว่า`,
    answer:`**ข้อ 2 จริง · ข้อ 1, 3 มั่ว**

1. [FAKE] \`[userId]\` ถูกแล้ว ต้องมีเพื่อ re-fetch เมื่อ user เปลี่ยน เอาออก = บั๊ก (โชว์คนเก่า)
2. [REAL] race จริง — A→B เร็วๆ response A กลับช้ากว่าแล้วทับ B แก้ด้วย cleanup flag:
\`\`\`
let active = true;
fetchUser(userId).then(d => { if (active) setData(d); });
return () => { active = false; };
\`\`\`
3. [FAKE] "class เร็วกว่า hooks" ไม่จริง

**บทเรียน:** ข้อ 2 subtle มาก — อย่าปฏิเสธหมดเพราะอีก 2 ข้อมั่ว`},
   {type:"find", title:"render list กรองในตัว",
    code:`function List({ items }) {
  const sorted = items.sort((a, b) => a.val - b.val);
  return <ul>{sorted.map((x, i) => <li key={i}>{x.val}</li>)}</ul>;
}`,
    answer:`**2 จุด**

1. **\`.sort()\` mutate prop** — \`Array.sort\` เรียงในที่ → แก้ prop \`items\` ตรงๆ ก็อปก่อน: \`[...items].sort(...)\`
2. **key={i}** — index เป็น key ตอน list เรียง/เพิ่ม/ลบ → React จับคู่ผิด ใช้ \`key={x.id}\`

**หลัก:** \`.sort()\`/\`.reverse()\` mutate ต้น ก็อปก่อนใน React · key ห้ามใช้ index ถ้าลำดับเปลี่ยนได้`},
   {type:"find", title:"copy prop เข้า state",
    code:`function Price({ amount }) {
  const [display, setDisplay] = useState(amount);
  return <span>{display}</span>;
}
// parent เปลี่ยน amount แต่ display ไม่อัปเดต`,
    answer:`**1 จุด: เก็บ prop ลง state (derived state anti-pattern)**

\`useState(amount)\` ใช้ \`amount\` แค่ค่าเริ่มต้นตอน mount **ครั้งเดียว** พอ parent เปลี่ยน \`amount\` → \`display\` ไม่อัปเดตตาม (state ไม่ re-init)

แก้: ถ้าค่ามาจาก prop ตรงๆ **อย่าเก็บลง state** ใช้ prop เลย
\`\`\`
function Price({ amount }) {
  return <span>{amount}</span>;
}
\`\`\`
ถ้าต้องแปลงค่า → คำนวณตอน render หรือ \`useMemo\` ไม่ใช่เก็บ state

**หลัก:** "เก็บ prop ลง state" = ธงแดง ค่าจะค้างไม่ sync — derive จาก prop ตรงๆ`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`function Item({ name }) {
  const handleClick = useCallback(() => {
    console.log(name);
  }, [name]);
  return <button onClick={handleClick}>{name}</button>;
}`,
    ai:`โค้ดนี้มีปัญหา 2 จุด:\n1. ควรห่อทุก function ด้วย useCallback เสมอเพื่อ performance\n2. ต้องใส่ useMemo ครอบ name ด้วยไม่งั้น re-render ทุกครั้ง`,
    answer:`**ทั้ง 2 ข้อ มั่ว/over-engineer**

1. [FAKE] **ไม่ควรห่อทุก function ด้วย useCallback** — มันมีต้นทุน (จำ dependency, เทียบทุก render) ถ้าไม่ได้ส่งลง child ที่ memo ไว้ หรือไม่ใช่ dep ของ effect → useCallback เปล่าประโยชน์ ในเคสนี้ button ธรรมดาจะไม่ใช้ก็ได้
2. [FAKE] \`name\` เป็น string (primitive) — useMemo ครอบ primitive ไม่มีประโยชน์ useMemo ไว้ memo "ผลการคำนวณหนัก" หรือ "object/array reference" ไม่ใช่ string

**บทเรียน:** AI ชอบแนะนำ useCallback/useMemo พร่ำเพรื่อว่า "เพื่อ performance" จริงๆ ใส่มั่วทำให้ช้า+โค้ดรก ใช้เมื่อมีเหตุผลจริง (ส่งลง memoized child, dep ของ effect, คำนวณหนัก) เท่านั้น`}
  ]
},
{
  group:"Frontend", cat:"css", title:"CSS / Layout",
  desc:"centering, stacking context, margin collapse, responsive, specificity — ดู 'ควรเวิร์ค' แต่ไม่เวิร์ค",
  problems:[
   {type:"concept", title:"จัดกึ่งกลางทั้งแนวตั้งแนวนอน",
    code:`/* จัด .box ให้อยู่กลางจอพอดี วิธีสะอาดสุด? */`,
    answer:`**flexbox / grid**
\`\`\`
.parent { display: grid; place-items: center; min-height: 100vh; }
\`\`\`
หรือ flex:
\`\`\`
.parent { display:flex; justify-content:center; align-items:center; min-height:100vh; }
\`\`\`
**ทำไมไม่ใช้ของเก่า:** \`margin:auto\` ได้แค่แนวนอน · \`absolute+translate\` เปราะ
**พูด:** "ใช้ place-items:center บน grid ครับ สั้นและ robust สุด"`},
   {type:"find", title:"tooltip ไม่ขึ้นทับ modal",
    code:`.modal   { position: fixed; z-index: 10; }
.tooltip { position: relative; z-index: 9999; }
/* tooltip z-index เยอะกว่า แต่ไม่ทับ modal */`,
    answer:`**stacking context — z-index เทียบกันได้แค่ใน context เดียวกัน**

ถ้า \`.tooltip\` อยู่ใน parent ที่สร้าง stacking context ใหม่ (parent มี \`transform\`, \`opacity < 1\`, \`filter\`) → 9999 เทียบแค่ภายใน parent นั้น ไม่ได้แข่งกับ \`.modal\`

แก้: render tooltip ผ่าน portal ไปที่ \`body\` (หลุดออกจาก context ของ parent) หรือเอา transform/opacity ที่ parent ออก

**หลัก:** z-index เยอะแต่ไม่ทับ → สงสัย stacking context ของ parent (transform/opacity/filter)`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`.container { display: flex; }
.item { width: 200px; }
/* มี 5 item, container 600px → item ล้นออก */`,
    ai:`แก้ได้ 2 วิธี:\n1. ใส่ flex-wrap: wrap ให้ item ขึ้นบรรทัดใหม่\n2. ใส่ overflow: hidden ที่ container เพื่อแก้ปัญหา layout อย่างสมบูรณ์`,
    answer:`**ข้อ 1 จริง · ข้อ 2 มั่ว (แก้ผิดที่)**

1. [REAL] \`flex-wrap: wrap\` ให้ item ล้นขึ้นบรรทัดใหม่ แก้จริง
2. [FAKE] \`overflow: hidden\` **แค่ซ่อน ไม่ได้แก้** — item ที่ล้นถูกตัดหายจากตา ผู้ใช้เห็นแค่ 3 จาก 5 เป็นการกลบปัญหา

ทางแก้จริงอื่น: \`flex-shrink\`, \`flex: 1\`, \`flex-wrap\`

**บทเรียน:** ระวังคำตอบที่ "ทำให้อาการหาย" แต่ไม่แก้เหตุ — แยก "แก้" กับ "ซ่อน"`},
   {type:"concept", title:"responsive โดยไม่ใช้ media query เยอะ",
    code:`/* อยากให้ font + การ์ดยืดหดตามจอ โดยไม่เขียน @media หลายๆ breakpoint */`,
    answer:`**ใช้ intrinsic / fluid techniques สมัยใหม่**

1. **\`clamp()\`** สำหรับขนาดที่ยืดหดต่อเนื่อง:
\`\`\`
font-size: clamp(1rem, 2.5vw, 1.5rem);   /* min, ค่ายืด, max */
\`\`\`
2. **grid auto-fit + minmax** สำหรับการ์ดที่จัดคอลัมน์เองตามที่ว่าง:
\`\`\`
display: grid;
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
\`\`\`
การ์ดจะ wrap เองเมื่อจอแคบ โดยไม่ต้องเขียน breakpoint
3. **\`min()\`/\`max()\`** เช่น \`width: min(100%, 600px)\`

**ข้อดี:** โค้ดน้อย ยืดหยุ่นต่อเนื่อง ไม่ต้องเดา breakpoint
**พูด:** "ผมใช้ clamp กับ grid auto-fit minmax ครับ มัน responsive เองโดยไม่ต้องเขียน media query หลายชั้น"`},
   {type:"find", title:"ช่องว่างเกินมาจากไหน",
    code:`.parent { background: red; }
.child  { margin-top: 40px; }
/* parent มีช่องว่างด้านบนโผล่มา ทั้งที่ตั้ง margin ที่ child */`,
    answer:`**1 จุด: margin collapse**

\`margin-top\` ของ child ลูกตัวแรก "ทะลุ" ออกไปนอก parent (collapse กับ margin ของ parent) → ดันทั้ง parent ลงมา แทนที่จะดัน child ในกล่อง

แก้ (อย่างใดอย่างหนึ่ง) — สร้าง BFC หรือกั้น margin:
\`\`\`
.parent { padding-top: 1px; }      /* หรือ */
.parent { overflow: hidden; }      /* สร้าง BFC */
.parent { display: flow-root; }    /* วิธีสะอาดสุด */
\`\`\`
หรือใช้ \`padding\` แทน \`margin\` ที่ child

**หลัก:** ช่องว่างโผล่เกินคาดในแนวตั้ง → สงสัย margin collapse ระหว่าง parent กับ child ตัวแรก/สุดท้าย`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`.btn { color: blue; }
#submit { color: green; }
/* <button id="submit" class="btn"> → ออกมาสีอะไร? */`,
    ai:`ปุ่มนี้:\n1. จะเป็นสีน้ำเงิน เพราะ class .btn เขียนทีหลังในไฟล์ จึงชนะ\n2. ถ้าอยากให้เป็นเขียวต้องใส่ !important ที่ #submit`,
    answer:`**ทั้ง 2 ข้อ มั่ว**

1. [FAKE] ออกมา **สีเขียว** — \`#submit\` เป็น **id selector** (specificity สูงกว่า class มาก) ชนะ \`.btn\` เสมอ ไม่เกี่ยวกับลำดับในไฟล์ (ลำดับสำคัญแค่เมื่อ specificity **เท่ากัน**)
2. [FAKE] ไม่ต้องใช้ \`!important\` เลย id ชนะ class อยู่แล้ว — \`!important\` เป็นทางเลือกสุดท้ายที่ควรเลี่ยง (ทำให้ override ยากในอนาคต)

**ลำดับ specificity:** inline > id > class/attr/pseudo-class > element
**บทเรียน:** AI สับสนกฎ specificity กับ "ลำดับในไฟล์" — ลำดับสำคัญเฉพาะตอน specificity เท่ากันเท่านั้น`}
  ]
},
{
  group:"Frontend", cat:"playwright", title:"Playwright · E2E",
  desc:"flaky test, hard wait, selector เปราะ, test isolation, auth state — หัวใจของ automate test ที่เสถียร",
  problems:[
   {type:"find", title:"รอด้วย sleep",
    code:`await page.click('#submit');
await page.waitForTimeout(3000);
const text = await page.textContent('.result');
expect(text).toBe('Success');`,
    answer:`**hard wait = ต้นเหตุ flaky**

\`waitForTimeout(3000)\` เดาเวลา — เครื่องช้า → ไม่พอ fail; เร็ว → เสียเวลารอเปล่า

แก้: รอ "เงื่อนไข" ด้วย auto-waiting assertion
\`\`\`
await page.click('#submit');
await expect(page.locator('.result')).toHaveText('Success');
\`\`\`
\`toHaveText\` retry รอเองจนขึ้น (หรือ timeout)
**หลัก:** เห็น \`waitForTimeout\`/\`sleep\` ในเทสต์ = ธงแดง flaky`},
   {type:"find", title:"selector เปราะ",
    code:`await page.click('div > div:nth-child(3) > button.btn-primary');
await page.fill('input[type="text"]', 'hello');`,
    answer:`**2 จุด (เปราะ)**

1. selector ผูกโครงสร้าง DOM — dev ขยับ layout นิดเดียวพัง
2. selector กว้าง — หลาย input จะจับผิดตัว

แก้: ใช้ selector ที่สื่อความหมาย
\`\`\`
await page.getByRole('button', { name: 'Submit' }).click();
await page.getByLabel('Username').fill('hello');
// หรือ getByTestId('submit-btn')
\`\`\`
**ความทน:** role/label/text > test-id > css class > nth-child/xpath (เปราะสุด)`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`test('login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#user', 'admin');
  await page.fill('#pass', '1234');
  await page.click('#login');
  expect(page.url()).toContain('/dashboard');
});`,
    ai:`เทสต์นี้มีปัญหา 2 จุด:\n1. expect(page.url()) ไม่ได้รอ navigation ก่อนเช็ค url\n2. ต้องใส่ waitForTimeout(5000) หลัง click เพื่อให้แน่ใจว่าหน้าโหลดเสร็จ`,
    answer:`**ข้อ 1 จริง · ข้อ 2 มั่ว**

1. [REAL] หลัง click หน้ายังไม่ทันเปลี่ยน \`page.url()\` อ่านทันที = ยัง /login แก้:
\`\`\`
await expect(page).toHaveURL(/\\/dashboard/);
\`\`\`
(retry รอ url เปลี่ยนเอง)
2. [FAKE] \`waitForTimeout(5000)\` คือ **ต้นเหตุ flaky** ที่ควรเลี่ยง! anti-pattern ที่ทำเทสต์ช้า+เปราะ ใช้ web-first assertion (ข้อ 1) แทน

**บทเรียน:** AI แนะนำ \`waitForTimeout\` บ่อยเพราะ "ดูปลอดภัย" แต่สวนหลัก E2E`},
   {type:"find", title:"เทสต์ไม่ isolate",
    code:`let page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});
test('add item', async () => { await page.click('#add'); });
test('count', async () => {
  expect(await page.textContent('#count')).toBe('1');
});`,
    answer:`**1 จุด: แชร์ page เดียวข้ามเทสต์ (ไม่ isolate)**

ใช้ \`beforeAll\` + ตัวแปร \`page\` ร่วม → เทสต์ที่สองพึ่ง state ที่เทสต์แรกทิ้งไว้ (count=1 เพราะ add ไปแล้ว) → รันแยก/สลับลำดับ/parallel จะ fail

แก้: ใช้ \`page\` fixture ที่ Playwright ให้ต่อเทสต์ (สร้าง context ใหม่ทุกเทสต์อัตโนมัติ)
\`\`\`
test('add item', async ({ page }) => {
  await page.goto('/');
  await page.click('#add');
  await expect(page.locator('#count')).toHaveText('1');
});
\`\`\`
**หลัก:** แต่ละเทสต์ต้องเริ่มจาก state สะอาดของตัวเอง — ใช้ \`{ page }\` fixture อย่าแชร์ page ผ่าน beforeAll`},
   {type:"concept", title:"ไม่อยาก login ใหม่ทุกเทสต์ ทำยังไง?",
    code:`// ทุกเทสต์ต้อง login ก่อน ช้ามาก จะ reuse session ยังไง?`,
    answer:`**ใช้ storageState — login ครั้งเดียว เก็บ cookie/localStorage ไว้ใช้ซ้ำ**

1. ทำ setup login ครั้งเดียว แล้ว save state:
\`\`\`
// global setup
await page.goto('/login');
await page.fill('#user', 'admin'); ...
await page.context().storageState({ path: 'auth.json' });
\`\`\`
2. ให้เทสต์อื่นโหลด state นั้น (ใน config หรือ describe):
\`\`\`
test.use({ storageState: 'auth.json' });
\`\`\`
→ เทสต์เริ่มแบบ login แล้ว ไม่ต้องผ่านหน้า login ทุกครั้ง เร็วขึ้นมาก

**ระวัง:** ยังต้องคง isolation — แต่ละเทสต์ได้ context ใหม่ (แค่แชร์ "สถานะ login" ไม่แชร์ page) · แยกไฟล์ state ตาม role ถ้ามีหลายสิทธิ์

**กุญแจ:** คำว่า \`storageState\` — โชว์ว่ารู้วิธี reuse auth โดยไม่เสีย isolation`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`await expect(page.locator('.toast')).toBeVisible();`,
    ai:`บรรทัดนี้มีปัญหา:\n1. ต้องใส่ await page.waitForSelector('.toast') ก่อน ไม่งั้น locator หา element ไม่เจอ\n2. toBeVisible ไม่มี retry ต้องใส่ timeout เองเสมอ`,
    answer:`**ทั้ง 2 ข้อ มั่ว — บรรทัดนี้ถูกแล้ว**

1. [FAKE] **ไม่ต้อง \`waitForSelector\` ก่อน** — \`expect(locator).toBeVisible()\` มี **auto-wait/retry ในตัว** มันจะรอจน element โผล่และมองเห็น (หรือ timeout) เอง ใส่ waitForSelector เพิ่ม = ซ้ำซ้อน
2. [FAKE] \`toBeVisible\` **มี retry อยู่แล้ว** ตาม default timeout (5 วิ) ไม่ต้องใส่เอง (จะ override ก็ได้แต่ไม่ "ต้อง")

**บทเรียน:** จุดแข็งของ Playwright คือ web-first assertion ที่ auto-wait — AI ที่แนะนำให้ใส่ wait เพิ่มแสดงว่าไม่เข้าใจ retry model เทสต์ที่ดีพึ่ง auto-wait ไม่ใช่ wait มือ`}
  ]
}
];
