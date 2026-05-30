DATA.push(
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
**ทริค:** ใช้ \`range\` แทน \`for i :=\` ตัด off-by-one ทิ้งทั้งหมด`,
    note:`nil map อ่านได้แต่เขียนไม่ได้ — zero value ของ \`map\`/\`chan\` ใช้ทันทีไม่ได้ ต้อง \`make\` ก่อน (ต่างจาก slice ที่ \`append\` ลง nil ได้). การวน index เสี่ยง off-by-one เสมอ → ใช้ \`range\` ตัดปัญหาทั้งคลาส`},
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
**หลัก:** อ่าน map ที่ key อาจไม่มี → \`v, ok := m[k]\` เสมอ`,
    note:`comma-ok แยก "ไม่มี key" ออกจาก "ค่าเป็น zero value" — เพราะ map คืน zero value เมื่อ key หาย ทำให้ \`0\`/\`""\`/\`nil\` กลืนกับค่าจริง. หลักทั่วไป: เมื่อ absence กับ zero ปนกันได้ ต้องมี signal แยก (ok bool / pointer / error)`},
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
\`\`\``,
    note:`slice ไม่ตรวจขอบให้ — index เกินคือ panic ทันที. แนวคิด: input ที่มาจากภายนอก (page, size) ต้อง validate + clamp ก่อนเอาไปคำนวณ index เสมอ (defensive bounds)`},
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
**หลัก:** ตัวหารมาจาก \`len()\`/input → เช็ค 0 ก่อนเสมอ`,
    note:`integer divide by zero = panic (ต่าง float ที่ได้ Inf/NaN). แนวคิด: ตัวหารที่มาจาก \`len()\`/input ต้องถือว่าอาจเป็น 0 — empty input คือ edge case ที่ลืมบ่อยสุด`},
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
**หลัก:** \`len(string)\` = จำนวน byte ถ้าจะนับ "ตัวอักษร" หรือวน index ทีละตัว ต้องแปลงเป็น \`[]rune\` ก่อน (สำคัญมากกับภาษาไทย)`,
    note:`string ใน Go = ลำดับ byte (UTF-8) ไม่ใช่ลำดับตัวอักษร. แนวคิด: "ความยาว" มีหลายความหมาย — byte / rune (code point) / grapheme; ภาษาไทย-อิโมจิทำให้ต่างกัน เลือกให้ตรงเจตนา`},
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
**หลัก:** เห็น \`defer\` ในloop → ระวัง resource สะสม`,
    note:`\`defer\` ผูกกับ "จบฟังก์ชัน" ไม่ใช่ "จบ block". แนวคิด: defer ใน loop = สะสม resource จนจบฟังก์ชัน → แตก loop body เป็นฟังก์ชันย่อย หรือปิดเองในแต่ละรอบ`},
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

**บทเรียน:** อย่ายอมรับ "optimization" ที่ AI เสนอโดยไม่คิด — บางทีของเดิมเหมาะสมแล้ว binary search ดีก็ต่อเมื่อ "เรียงไว้แล้ว + ค้นหลายครั้ง" เท่านั้น`,
    note:`อย่ารับ optimization โดยไม่ดูบริบท — binary search เร็วก็ต่อเมื่อ "เรียงไว้แล้ว + ค้นซ้ำหลายครั้ง". แนวคิด: คิด Big-O รวมต้นทุนเตรียมข้อมูล (sort O(n log n)) และจำนวนครั้งที่ใช้จริง`},
   {type:"find", title:"แปลง % ด้วย integer division",
    code:`func Percent(done, total int) int {
\treturn done / total * 100
}
// done=1 total=4 → ได้ 0 ทำไม?`,
    answer:`**integer division ตัดเศษ + ลำดับผิด**

\`1 / 4\` ใน int = 0 (ตัดเศษทิ้ง) → \`0 * 100\` = 0 หารก่อนคูณทำให้เศษหายหมด

\`\`\`
return done * 100 / total      // 1*100/4 = 25 (คูณก่อนหาร)
// ต้องการทศนิยม: float64(done) / float64(total) * 100
\`\`\`
+ ระวัง \`total == 0\` → integer divide by zero → panic

**หลัก:** int division ตัดเศษ — คูณก่อนหาร หรือแปลง \`float64\` ก่อน + เช็คตัวหาร 0`,
    note:`ลำดับ operation สำคัญกับ integer math — หารก่อนทำเศษหายหมด. แนวคิด: integer arithmetic คูณก่อนหารรักษาความแม่น (ระวัง overflow); ต้องการเศษจริงต้องขึ้น \`float\``},
   {type:"find", title:"append แชร์ backing array",
    code:`a := []int{1, 2, 3}
b := append(a[:1], 99)
fmt.Println(a)   // [1 99 3] ?!
_ = b`,
    answer:`**append เขียนทับ backing array เดิม**

\`a[:1]\` ยังชี้ array เดียวกับ \`a\` (len=1 แต่ cap ยังเหลือ) → \`append\` เขียน \`99\` ลง index 1 ของ array เดิม → \`a\` กลายเป็น \`[1 99 3]\`

slice = (pointer, len, cap) · การ slice \`[:n]\` ไม่ copy ข้อมูล แค่ขยับ len

\`\`\`
b := append(a[:1:1], 99)   // a[:1:1] จำกัด cap=1 → append สร้าง array ใหม่
// หรือ b := append(slices.Clone(a[:1]), 99)
\`\`\`
**หลัก:** sub-slice แชร์ backing array · \`append\` อาจเขียนทับของเดิมถ้า cap เหลือ → จำกัด cap (\`[:n:n]\`) หรือ clone`,
    note:`slice เป็น view \`(ptr, len, cap)\` ไม่ใช่เจ้าของข้อมูล — \`append\` เขียนทับ backing array ที่แชร์กันได้. แนวคิด: mutation ผ่าน alias เป็น bug เงียบ; จำกัด cap (\`a[:n:n]\`) หรือ clone เมื่อต้องการ slice อิสระ`}
  ]
}
);
