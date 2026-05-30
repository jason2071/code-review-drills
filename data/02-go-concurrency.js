DATA.push(
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
**ทริค:** เขียนลง \`results[i]\` คนละช่อง → ไม่ต้อง lock`,
    note:`งานขนานต้องตอบ 3 อย่าง: รอจบยังไง (\`WaitGroup\`/\`errgroup\`), เก็บผลปลอดภัยยังไง (channel หรือเขียนคนละ index ไม่ใช่ append ร่วม), ยกเลิกยังไง (\`context\`). แนวคิด: แชร์ memory เขียนพร้อมกัน = race เสมอ`},
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

**บทเรียน:** กล้าพูด "โค้ดนี้โอเคแล้ว" ถ้าไม่มีบั๊กจริง · หลักจับ race: ไม่เห็น \`go\`/channel → ไม่ต้องพูดเรื่อง race`,
    note:`ระวังคำแนะนำที่ "ถูกเป็นหลักการ" แต่ไม่ตรงบริบท. แนวคิด: ก่อนเพิ่ม sync primitive ต้องรู้ว่าอันที่มีอยู่ thread-safe แล้วหรือยัง — ใส่เกินทำให้ช้าและซับซ้อนเปล่า`},
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
**หลัก:** ฝั่งส่ง (sender) เป็นคนปิด channel เสมอ ฝั่งรับห้ามปิด`,
    note:`ผู้ส่งเป็นคนปิด channel ไม่ใช่ผู้รับ — ปิดซ้ำ/ส่งหลังปิด = panic. แนวคิด: \`close\` คือ broadcast ว่า "ไม่มีข้อมูลอีกแล้ว" → ออกแบบให้มี owner ชัดเจน`},
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
**หลัก:** \`wg.Add\` ต้องเรียกก่อน start goroutine เสมอ ไม่ใช่ข้างใน`,
    note:`\`wg.Add\` ต้องเรียกก่อน \`go\` ไม่ใช่ในตัว goroutine — ไม่งั้น \`Wait\` อาจผ่านก่อน Add ทัน. แนวคิด: counter ที่ใช้ synchronize ต้องไม่มี race กับตัวมันเอง`},
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
**หลัก:** \`Lock()\` แล้ว \`defer Unlock()\` บรรทัดถัดไปเสมอ → ปลอดภัยทุก return path`,
    note:`\`defer Unlock()\` ทันทีหลัง \`Lock()\` — กันลืม unlock ทุก return/panic path. แนวคิด: จับคู่ acquire/release ด้วย defer ให้เป็น scope-bound (แนวเดียวกับ RAII)`},
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

**บทเรียน:** \`sync.Once\` เป็น primitive ที่ thread-safe ในตัว AI มั่วบ่อยว่า "ต้องใส่ mutex เพิ่ม" กับของที่ปลอดภัยอยู่แล้ว`,
    note:`\`sync.Once\` thread-safe ในตัว ไม่ต้องใส่ mutex เพิ่ม. แนวคิด: รู้จัก primitive ของภาษา/ไลบรารีก่อน — หลายอย่าง (Once, atomic, sync.Map) ปลอดภัยอยู่แล้วโดยออกแบบ`},
   {type:"find", title:"เขียน map พร้อมกันหลาย goroutine",
    code:`m := map[int]int{}
var wg sync.WaitGroup
for i := 0; i < 100; i++ {
\twg.Add(1)
\tgo func(i int) { defer wg.Done(); m[i] = i }(i)
}
wg.Wait()`,
    answer:`**concurrent map writes → \`fatal error\` (กู้ไม่ได้)**

map ใน Go **ไม่** ปลอดภัยต่อการเขียนพร้อมกัน → runtime ตรวจเจอแล้ว crash ทั้ง process (\`fatal error: concurrent map writes\`) — ไม่ใช่ panic ที่ \`recover\` ได้

\`\`\`
var mu sync.Mutex
go func(i int) {
    defer wg.Done()
    mu.Lock(); m[i] = i; mu.Unlock()
}(i)
// หรือ sync.Map (เคส key กระจาย เขียนเยอะ)
\`\`\`
รันด้วย \`go test -race\` จับเจอ

**หลัก:** แชร์ map ข้าม goroutine ต้อง lock เสมอ · \`-race\` คือเพื่อน`,
    note:`map ไม่มี internal lock — runtime ตรวจเจอ concurrent write แล้ว \`fatal error\` ทั้ง process (กู้ไม่ได้). แนวคิด: data structure ส่วนใหญ่ไม่ thread-safe โดย default; ห่อด้วย lock หรือใช้ตัวที่ออกแบบมา · \`go test -race\` คือเพื่อน`},
   {type:"find", title:"goroutine leak (ไม่มีทางออก)",
    code:`func Worker(jobs <-chan int) {
\tgo func() {
\t\tfor j := range jobs {
\t\t\tprocess(j)
\t\t}
\t}()
}
// เรียกบ่อยๆ แต่สั่งหยุดไม่ได้`,
    answer:`**goroutine leak — ไม่มีทางยกเลิก**

ถ้าไม่ปิด \`jobs\` channel goroutine จะวน \`range\` ค้างตลอด ไม่ตาย → ทุกครั้งที่เรียก \`Worker\` ทิ้ง goroutine ค้างไว้สะสม

รับ \`context\` ให้ cancel ได้:
\`\`\`
func Worker(ctx context.Context, jobs <-chan int) {
    go func() {
        for {
            select {
            case <-ctx.Done():
                return
            case j, ok := <-jobs:
                if !ok { return }
                process(j)
            }
        }
    }()
}
\`\`\`
**หลัก:** goroutine อายุยาวทุกตัวต้องมีทางออก (\`ctx.Done()\` / channel ปิด) ไม่งั้น leak`,
    note:`goroutine ที่ block ค้างไม่ถูกเก็บ — leak สะสมจน memory/FD หมด. แนวคิด: ทุก goroutine ต้องมี "ทางออก" ที่กำหนดได้ (\`ctx.Done()\` / channel ปิด); ownership ของ lifecycle ต้องชัด`}
  ]
}
);
