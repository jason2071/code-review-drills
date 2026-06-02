// game.js — "Bug Hunter" arcade: judge whether the AI's critique is จริง (real) or มั่ว (fake).
// Mounts inside #main of the drills SPA. Card pool is derived from the type:"judge" drills
// (each AI claim split into one real/fake card) plus a few hand-picked basics to balance levels.
// State in localStorage ('crd-game'). No build, no deps. Exposes window.Game = { open, leave }.
(function(){

// ===== card pool: lv = level, v = 'real'/'fake' (is the AI claim correct?), e = explanation =====
const CARDS=[
// ── lv1: Go Basics ──
{lv:1,cat:"Go Basics",code:`func Contains(nums []int, target int) bool {
\tfor _, n := range nums {
\t\tif n == target { return true }
\t}
\treturn false
}`,claim:`ควร sort ก่อนแล้วใช้ binary search เพื่อ performance ที่ดีกว่า`,v:"fake",e:`linear search O(n) เหมาะกับ slice ที่ไม่เรียง การ sort ก่อน (O(n log n)) **ช้ากว่า** สำหรับค้นครั้งเดียว + mutate ลำดับเดิม — binary search ดีเฉพาะ "เรียงไว้แล้ว + ค้นหลายครั้ง"`},
{lv:1,cat:"Go Basics",code:`func Contains(nums []int, target int) bool {
\tfor _, n := range nums {
\t\tif n == target { return true }
\t}
\treturn false
}`,claim:`มี off-by-one ใน loop ควรเริ่มจาก i := 1`,v:"fake",e:`ใช้ \`range\` อยู่แล้ว ไม่มี index \`i\` ให้ off-by-one เลย — AI พูดถึงสิ่งที่ไม่มีในโค้ด`},
{lv:1,cat:"Go Basics",code:`var m map[string]int
m["a"]++`,claim:`เขียนลง map แบบนี้จะ panic เพราะเป็น nil map`,v:"real",e:`\`var\` โดยไม่ \`make\` ได้ nil map เขียนแล้ว panic "assignment to entry in nil map" ต้อง \`make(map...)\` ก่อน`},
{lv:1,cat:"Go Basics",code:`for i := 0; i <= len(s); i++ {
\t_ = s[i]
}`,claim:`loop นี้ทำงานปกติ ไม่มีปัญหาอะไร`,v:"fake",e:`\`i <= len(s)\` รอบสุดท้าย \`s[len(s)]\` เกินขอบ → panic ต้องเป็น \`i < len(s)\``},
{lv:1,cat:"Go Basics",code:`return sum / len(nums)`,claim:`ถ้า nums เป็น slice ว่าง บรรทัดนี้จะ panic หารด้วยศูนย์`,v:"real",e:`\`len=0\` → integer divide by zero → panic ต้องเช็ค len ก่อนหาร`},
{lv:1,cat:"Go Basics",code:`len("สมชาย")`,claim:`คืนค่า 5 เพราะนับจำนวนตัวอักษร`,v:"fake",e:`\`len(string)\` นับ **byte** ภาษาไทยตัวละ 3 byte → คืน 15 ถ้าจะนับตัวอักษรใช้ \`utf8.RuneCountInString\``},
{lv:1,cat:"Go Basics",code:`price := prices[sku]
return price * 2`,claim:`ควรใช้ comma-ok (v, ok :=) ไม่งั้นถ้า sku ไม่มีจะได้ 0 เงียบๆ`,v:"real",e:`อ่าน map ที่ไม่มี key คืน zero value โดยไม่มีสัญญาณ ควร \`v, ok := prices[sku]\``},
// ── lv2: Concurrency ──
{lv:2,cat:"Concurrency",code:`func SumPositive(nums []int) int {
\tsum := 0
\tfor i := 0; i < len(nums); i++ {
\t\tif nums[i] > 0 { sum += nums[i] }
\t}
\treturn sum
}`,claim:`off-by-one ที่ i < len(nums) ควรเป็น i <= len(nums)`,v:"fake",e:`\`i < len\` ถูกแล้ว เปลี่ยนเป็น \`<=\` จะ panic — AI แนะนำให้ใส่บั๊กเอง`},
{lv:2,cat:"Concurrency",code:`func SumPositive(nums []int) int {
\tsum := 0
\tfor i := 0; i < len(nums); i++ {
\t\tif nums[i] > 0 { sum += nums[i] }
\t}
\treturn sum
}`,claim:`มี race condition เพราะเข้าถึง slice ใน loop`,v:"fake",e:`ไม่มี goroutine = ไม่มี race เป็น loop single-thread — race เกิดเฉพาะตอนหลาย goroutine แตะข้อมูลร่วม`},
{lv:2,cat:"Concurrency",code:`for i := 0; i < len(nums); i++ {
\tsum += nums[i]
}`,claim:`ควรใช้ range เพราะ index access ช้ากว่า`,v:"fake",e:`index ไม่ได้ช้ากว่า \`range\` — \`range\` แค่อ่านง่ายกว่า ไม่ใช่เรื่อง performance`},
{lv:2,cat:"Concurrency",code:`var once sync.Once
func GetConfig() *Config {
\tonce.Do(func() { cfg = loadConfig() })
\treturn cfg
}`,claim:`sync.Once ไม่ thread-safe ต้องใส่ mutex เพิ่ม`,v:"fake",e:`\`sync.Once\` **thread-safe โดยออกแบบ** รับประกัน func รันครั้งเดียวแม้หลาย goroutine เรียกพร้อมกัน ไม่ต้องใส่ mutex`},
{lv:2,cat:"Concurrency",code:`var once sync.Once
func GetConfig() *Config {
\tonce.Do(func() { cfg = loadConfig() })
\treturn cfg
}`,claim:`cfg เป็น global ต้องมี mutex ป้องกันตอนอ่าน`,v:"fake",e:`\`once.Do\` มี memory barrier ในตัว เขียน \`cfg\` เสร็จก่อน Do return ทุก goroutine ที่ผ่านเห็นค่าถูก (ตราบใดไม่มีใครเขียน cfg ที่อื่น)`},
// ── lv3: Errors ──
{lv:3,cat:"Errors",code:`row := db.QueryRowContext(ctx,
\t"SELECT SUM(amount) FROM orders WHERE user_id = $1", userID)
var total int
row.Scan(&total)`,claim:`row.Scan(&total) ไม่ได้เช็ค error`,v:"real",e:`ไม่เช็ค error ของ \`Scan\` จริง — ควร \`if err := row.Scan(&total); err != nil { ... }\``},
{lv:3,cat:"Errors",code:`SELECT SUM(amount) FROM orders WHERE user_id = $1
-- scan ลง: var total int`,claim:`SUM จะคืน NULL ถ้าไม่มี order → scan ลง int พัง ควรใช้ COALESCE`,v:"real",e:`\`SUM\` คืน NULL เมื่อไม่มีแถว → scan ลง \`int\` error ใช้ \`COALESCE(SUM(amount), 0)\``},
{lv:3,cat:"Errors",code:`row := db.QueryRowContext(ctx, q, userID)
var total int
row.Scan(&total)`,claim:`ลืม defer row.Close() ทำให้ connection leak`,v:"fake",e:`\`QueryRow\` คืน \`*sql.Row\` **ไม่มี method Close()** ใส่แล้ว compile ไม่ผ่าน Scan ปิดให้เอง (\`Query\` ที่คืน \`Rows\` ต่างหากที่ต้อง Close)`},
{lv:3,cat:"Errors",code:`func mustParse(s string) int {
\tn, err := strconv.Atoi(s)
\tif err != nil { panic(err) }
\treturn n
}`,claim:`strconv.Atoi ช้า ควรใช้ ParseInt แทนเพื่อ performance`,v:"fake",e:`\`Atoi(s)\` เรียก \`ParseInt(s, 10, 0)\` ข้างในอยู่แล้ว — มันคือ wrapper ตัวเดียวกัน ไม่มีเรื่อง performance ต่างกัน`},
{lv:3,cat:"Errors",code:`f, _ := os.Open(path)
data, _ := io.ReadAll(f)`,claim:`กลืน error ตอน Open ถ้าเปิดไม่ได้ f เป็น nil อาจ panic`,v:"real",e:`เปิดไม่ได้ \`f=nil\` → \`ReadAll(nil)\` panic ต้องเช็ค err ก่อน`},
{lv:3,cat:"Errors",code:`resp, err := http.Get(url)
if err != nil { return err }
json.NewDecoder(resp.Body).Decode(&u)`,claim:`ลืม defer resp.Body.Close() จะทำให้ connection leak`,v:"real",e:`ไม่ปิด \`Body\` → connection ไม่ถูกคืน leak สะสม ควร \`defer resp.Body.Close()\``},
// ── lv4: SQL ──
{lv:4,cat:"SQL",code:`SELECT u.name, COUNT(o.id)
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id;`,claim:`ต้องมี u.name ใน GROUP BY ไม่งั้น error`,v:"fake",e:`ใน **Postgres** GROUP BY ด้วย PK (\`u.id\`) → ใช้ \`u.name\` ใน SELECT ได้ (functional dependency) — MySQL โหมดเก่าต่างหากที่ error ⇒ ขึ้นกับ DB`},
{lv:4,cat:"SQL",code:`-- เดิม: LEFT JOIN orders
-- AI: เปลี่ยนเป็น INNER JOIN`,claim:`เปลี่ยน LEFT เป็น INNER JOIN ได้ผลเหมือนเดิมแต่เร็วกว่า`,v:"fake",e:`เปลี่ยน LEFT→INNER **เปลี่ยนผลลัพธ์** ไม่ใช่แค่ speed — LEFT เก็บ user ที่ไม่มี order (COUNT=0) INNER ตัดทิ้ง เป็นคนละ requirement`},
{lv:4,cat:"SQL",code:`CREATE INDEX idx_email ON users(email);
CREATE INDEX idx_status ON users(status);
-- WHERE status = 'active' AND email = 'a@b.com'`,claim:`ดีแล้ว มี index ครบทั้งสองคอลัมน์ที่ใช้ใน WHERE`,v:"fake",e:`2 index แยกกันไม่ได้แปลว่าดีที่สุด query ที่กรอง 2 คอลัมน์พร้อมกัน **composite index** \`(status, email)\` มักดีกว่า`},
{lv:4,cat:"SQL",code:`-- query กรอง status + email พร้อมกัน
-- มี idx(email), idx(status) แยกกัน`,claim:`Postgres ใช้ทั้งสอง index พร้อมกันได้เต็มประสิทธิภาพอยู่แล้ว`,v:"fake",e:`Postgres ทำ **bitmap index scan** รวม 2 index ได้จริง แต่ "เต็มประสิทธิภาพ" เกินจริง — ช้ากว่า composite ตัวเดียวที่ตรงงานเพราะต้องรวม bitmap เพิ่มขั้น`},
{lv:4,cat:"SQL",code:`-- post มีได้หลาย tag, tag อยู่ได้หลาย post
-- posts(id, title)`,claim:`เก็บ tags เป็นคอลัมน์ TEXT comma ('go,db,web') พอ ค้นด้วย LIKE '%go%' ไม่ต้องสร้างตารางเพิ่ม`,v:"fake",e:`comma string ละเมิด **1NF** → \`LIKE '%go%'\` **index ไม่ติด** scan ทั้งตาราง + match ผิด (\`golang\` โดน \`%go%\`) ที่ถูก n-to-m = **junction table**`},
// ── lv5: Testing ──
{lv:5,cat:"Testing",code:`func TestAdd(t *testing.T) {
\tresult := Add(2, 3)
\tassert.Equal(t, result, 5)
}`,claim:`ลำดับ argument ผิด ควรเป็น assert.Equal(t, 5, result) — expected ก่อน actual`,v:"real",e:`convention คือ \`(t, expected, actual)\` สลับแล้ว error message กลับด้าน debug งง (เรื่อง message ไม่ใช่ผลเพี้ยน)`},
{lv:5,cat:"Testing",code:`assert.Equal(t, result, 5)`,claim:`assert ไม่ทำให้ test fail ต้องเปลี่ยนเป็น require เท่านั้น test ถึง fail`,v:"fake",e:`\`assert\` ทำให้ fail ปกติ (\`t.Fail\`) แค่ไม่หยุด execution — \`require\` ต่างตรงหยุดเลย (\`t.FailNow\`)`},
{lv:5,cat:"Testing",code:`u, err := svc.Get(1)
assert.NoError(t, err)
assert.Equal(t, "A", u.Name)`,claim:`ควรใช้ require.NoError ไม่งั้นถ้า err ไม่ nil บรรทัด u.Name จะ panic`,v:"real",e:`\`assert\` ไม่หยุด ถ้า err แล้ว \`u\` อาจ nil → \`u.Name\` panic ใช้ \`require\` ตรงบรรทัดที่ต้องพึ่งพาผลก่อนหน้า`},
{lv:5,cat:"Testing",code:`for _, tt := range tests {
\tt.Run(tt.name, func(t *testing.T){
\t\tt.Parallel()
\t\t// ใช้ tt
\t})
}`,claim:`ต้อง capture tt (tt := tt) ไม่งั้น parallel subtest อาจใช้ค่าสุดท้ายหมด (Go < 1.22)`,v:"real",e:`parallel รอ loop จบก่อนรัน ถ้า Go<1.22 \`tt\` ถูกแชร์ → ค่าสุดท้ายทุกตัว ต้อง \`tt := tt\``},
{lv:5,cat:"Testing",code:`var cache = map[int]string{}
func TestB(t){ assert.Equal(t,"a",cache[1]) }
// พึ่ง TestA set cache ไว้`,claim:`เทสต์แชร์ global state แบบนี้เขียนถูกต้องดีแล้ว`,v:"fake",e:`เทสต์ต้อง isolated พึ่งลำดับ/ผลของเทสต์อื่นไม่ได้ รันแยกหรือ parallel จะ flaky`},
// ── lv6: TypeScript ──
{lv:6,cat:"TypeScript",code:`function getName(user?: { name: string }) {
  return user.name.toUpperCase();
}`,claim:`user เป็น optional แต่เข้าถึง user.name โดยไม่เช็ค → runtime error ถ้า undefined`,v:"real",e:`\`user?\` optional → ไม่ส่ง = undefined → \`user.name\` พัง แก้ \`user?.name?.toUpperCase() ?? ""\``},
{lv:6,cat:"TypeScript",code:`function getName(user?: { name: string }) {
  return user.name.toUpperCase();
}`,claim:`ควรใช้ var แทน const เพื่อรองรับ hoisting`,v:"fake",e:`โค้ดนี้ไม่มี \`const\`/\`var\` สักตัว! AI พูดเรื่อง hoisting ลอยๆ ไม่เกี่ยว และ \`var\` ก็ไม่ควรกลับไปใช้`},
{lv:6,cat:"TypeScript",code:`type User = { id: number; name: string };
function format(u: User): string {
  return \`#\${u.id} \${u.name}\`;
}`,claim:`ควรใช้ interface แทน type เพราะ type ช้ากว่าตอน compile`,v:"fake",e:`\`type\` กับ \`interface\` performance compile แทบไม่ต่าง เป็นเรื่อง style/feature ไม่ใช่ความเร็ว`},
{lv:6,cat:"TypeScript",code:`function format(u: User): string {
  return \`#\${u.id} \${u.name}\`;
}`,claim:`ต้องเช็ค u เป็น null ก่อนเพราะอาจ undefined`,v:"fake",e:`\`u: User\` ไม่ได้เป็น optional (\`u?: User\`) type system รับประกันว่ามีค่าแล้ว ไม่ต้องเช็ค null`},
{lv:6,cat:"TypeScript",code:`items.forEach(async (i) => {
  await save(i);
});
console.log("done");`,claim:`forEach ไม่รอ async → "done" จะพิมพ์ก่อน save เสร็จ`,v:"real",e:`\`forEach\` ไม่สน Promise ที่ callback คืน ใช้ \`for...of\` (ทีละตัว) หรือ \`Promise.all\``},
// ── lv7: React ──
{lv:7,cat:"React",code:`useEffect(() => {
  fetchUser(userId).then(setData);
}, [userId]);`,claim:`dependency array ผิด ควรเอา userId ออกเพราะทำให้ re-fetch`,v:"fake",e:`\`[userId]\` ถูกแล้ว ต้องมีเพื่อ re-fetch เมื่อ user เปลี่ยน เอาออก = บั๊ก (โชว์คนเก่า)`},
{lv:7,cat:"React",code:`useEffect(() => {
  fetchUser(userId).then(setData);
}, [userId]);`,claim:`มี race condition ถ้า userId เปลี่ยนเร็วๆ response เก่าอาจมาทับใหม่`,v:"real",e:`race จริง — A→B เร็วๆ response A กลับช้ากว่าแล้วทับ B แก้ด้วย cleanup flag: \`let active=true; ...; return ()=>{active=false}\``},
{lv:7,cat:"React",code:`function Profile({ userId }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetchUser(userId).then(setData); }, [userId]);
  return <div>{data?.name}</div>;
}`,claim:`ควรใช้ class component แทนเพราะ hooks ช้ากว่า`,v:"fake",e:`"class เร็วกว่า hooks" ไม่จริง — performance ไม่ใช่เหตุผลในการเลือก`},
{lv:7,cat:"React",code:`const handleClick = useCallback(() => {
  console.log(name);
}, [name]);
return <button onClick={handleClick}>{name}</button>;`,claim:`ควรห่อทุก function ด้วย useCallback เสมอเพื่อ performance`,v:"fake",e:`\`useCallback\` มีต้นทุน (จำ dep, เทียบทุก render) ถ้าไม่ได้ส่งลง memoized child / ไม่ใช่ dep ของ effect = เปล่าประโยชน์ button ธรรมดาไม่ต้อง`},
{lv:7,cat:"React",code:`function Item({ name }) {
  // AI: ต้อง useMemo ครอบ name
  return <button>{name}</button>;
}`,claim:`ต้องใส่ useMemo ครอบ name ไม่งั้น re-render ทุกครั้ง`,v:"fake",e:`\`name\` เป็น string (primitive) — \`useMemo\` ครอบ primitive ไม่มีประโยชน์ มันไว้ memo "ผลคำนวณหนัก" หรือ "object/array reference"`},
// ── lv8: CSS & E2E ──
{lv:8,cat:"CSS",code:`.container { display: flex; }
.item { width: 200px; }
/* 5 item, container 600px → item ล้น */`,claim:`ใส่ flex-wrap: wrap ให้ item ขึ้นบรรทัดใหม่`,v:"real",e:`\`flex-wrap: wrap\` ให้ item ที่ล้นขึ้นบรรทัดใหม่ แก้จริง`},
{lv:8,cat:"CSS",code:`.container { display: flex; }
/* item ล้น → AI: ใส่ overflow:hidden */`,claim:`ใส่ overflow: hidden ที่ container แก้ปัญหา item ล้นได้อย่างสมบูรณ์`,v:"fake",e:`\`overflow:hidden\` **แค่ซ่อน ไม่ได้แก้** — item ที่ล้นถูกตัดหายจากตา ควร \`flex-wrap\` / \`flex-shrink\``},
{lv:8,cat:"CSS",code:`.btn { color: blue; }
#submit { color: green; }
/* <button id="submit" class="btn"> */`,claim:`ปุ่มจะเป็นสีน้ำเงิน เพราะ .btn เขียนทีหลังในไฟล์จึงชนะ`,v:"fake",e:`ออกมา **สีเขียว** — \`#submit\` เป็น id selector specificity สูงกว่า class ชนะเสมอ ไม่เกี่ยวลำดับในไฟล์ (ลำดับสำคัญเฉพาะตอน specificity เท่ากัน)`},
{lv:8,cat:"CSS",code:`.btn { color: blue; }
#submit { color: green; }`,claim:`ถ้าอยากให้เป็นเขียวต้องใส่ !important ที่ #submit`,v:"fake",e:`ไม่ต้องใช้ \`!important\` เลย id ชนะ class อยู่แล้ว — \`!important\` เป็นทางเลือกสุดท้ายที่ควรเลี่ยง`},
{lv:8,cat:"Playwright",code:`await page.click('#login');
expect(page.url()).toContain('/dashboard');`,claim:`expect(page.url()) ไม่ได้รอ navigation ก่อนเช็ค url`,v:"real",e:`หลัง click หน้ายังไม่ทันเปลี่ยน \`page.url()\` อ่านทันที = ยัง /login แก้ \`await expect(page).toHaveURL(/\\/dashboard/)\` (retry รอ url เปลี่ยนเอง)`},
{lv:8,cat:"Playwright",code:`await page.click('#login');
await page.waitForTimeout(5000);`,claim:`ต้องใส่ waitForTimeout(5000) หลัง click เพื่อให้แน่ใจว่าหน้าโหลดเสร็จ`,v:"fake",e:`\`waitForTimeout\` คือ **ต้นเหตุ flaky** (ช้าไป fail / เร็วไปเสียเวลา) anti-pattern ใช้ web-first assertion ที่ auto-wait แทน`},
{lv:8,cat:"Playwright",code:`await expect(page.locator('.toast')).toBeVisible();`,claim:`ต้องใส่ waitForSelector('.toast') ก่อน ไม่งั้น locator หา element ไม่เจอ`,v:"fake",e:`\`toBeVisible\` มี **auto-wait/retry ในตัว** รอจน element โผล่เอง ใส่ \`waitForSelector\` เพิ่ม = ซ้ำซ้อน`},
{lv:8,cat:"Playwright",code:`await expect(page.locator('.toast')).toBeVisible();`,claim:`toBeVisible ไม่มี retry ต้องใส่ timeout เองเสมอ`,v:"fake",e:`\`toBeVisible\` มี retry ตาม default timeout (5 วิ) อยู่แล้ว ไม่ต้องใส่เอง (จะ override ก็ได้แต่ไม่ "ต้อง")`},
// ── lv9: DB Design ──
{lv:9,cat:"DB Design",code:`-- เก็บราคาสินค้า / ยอดเงิน
price FLOAT`,claim:`ใช้ FLOAT เก็บเงินได้ ประหยัดที่กว่าและคำนวณเร็ว`,v:"fake",e:`\`FLOAT\` เป็น binary floating point — \`0.1+0.2≠0.3\` ปัดเศษเพี้ยน เงินหาย/เกิน ใช้ \`NUMERIC(12,2)\` (exact) หรือเก็บเป็น integer หน่วยสตางค์`},
{lv:9,cat:"DB Design",code:`-- คุณสมบัติสินค้า "ยืดหยุ่น"
product_attributes(product_id, attr_name TEXT, attr_value TEXT)
-- (1,'color','red') (1,'size','L') (1,'weight','500')`,claim:`EAV (key-value) แบบนี้ยืดหยุ่นดี ใช้ได้ทุกกรณี attribute เพิ่มไม่ต้อง migrate`,v:"fake",e:`EAV จ่ายแพง: query ต้อง pivot, \`attr_value\` TEXT หมด (ไม่มี type), ไม่มี constraint/FK, index ยาก ถ้า attribute รู้ล่วงหน้า → คอลัมน์จริง หรือ JSONB+GIN`},
{lv:9,cat:"DB Design",code:`-- ตารางโตเร็ว query ช้า
-- AI: สร้าง index ทุกคอลัมน์ไว้เลย`,claim:`สร้าง index ทุกคอลัมน์เผื่อใช้ ยังไงก็ไม่เสียหาย`,v:"fake",e:`index มีต้นทุน: ทุก \`INSERT/UPDATE/DELETE\` ต้องอัปเดต index ด้วย → write ช้าลง + กินที่ สร้างเท่าที่ query ใช้จริง (ดู WHERE/JOIN/ORDER BY)`},
{lv:9,cat:"DB Design",code:`-- event log ข้ามหลาย timezone
created_at TIMESTAMP   -- vs TIMESTAMPTZ`,claim:`ควรใช้ TIMESTAMPTZ ไม่ใช่ TIMESTAMP เพื่อเก็บเวลาที่มี timezone กำกวมน้อยกว่า`,v:"real",e:`\`TIMESTAMP\` (without tz) เก็บเวลาดิบ ไม่รู้ว่า zone ไหน → กำกวม \`TIMESTAMPTZ\` เก็บเป็น UTC แปลงตาม session ถูกต้อง — best practice เก็บเวลา`},
{lv:9,cat:"DB Design",code:`-- soft delete
users(id, email UNIQUE, deleted_at TIMESTAMPTZ)
-- ลบ = set deleted_at`,claim:`soft delete แบบนี้ทำให้ UNIQUE(email) พัง — สมัครซ้ำ email เดิมไม่ได้แม้ลบคนเก่าไปแล้ว`,v:"real",e:`row เก่ายังอยู่ (แค่ตั้ง \`deleted_at\`) → \`UNIQUE(email)\` ยังกันอยู่ สมัครใหม่ชน แก้: partial unique \`WHERE deleted_at IS NULL\` หรือ unique \`(email, deleted_at)\``},
// ── lv10: System Design ──
{lv:10,cat:"System Design",code:`// user กดจ่ายเงินรัวๆ / network retry ส่งซ้ำ
// → อย่าให้ตัดเงินซ้ำ`,claim:`กันจ่ายซ้ำด้วย idempotency key (UUID ต่อ 1 จ่าย) + unique constraint ที่ DB`,v:"real",e:`idempotency key ที่ client gen + เก็บลง DB (unique) ก่อนประมวลผล → request ซ้ำเจอ key เดิมคืนผลเก่า ไม่ตัดซ้ำ unique constraint เป็นด่านกัน race`},
{lv:10,cat:"System Design",code:`// service B ล่มชั่วคราว
// → A retry ทันทีถี่ๆ ทุก client`,claim:`B ล่มก็ retry ทันทีถี่ๆ ทุก client จะได้สำเร็จเร็วที่สุด`,v:"fake",e:`retry storm — B กำลังจะฟื้นโดนถล่มซ้ำจนล่มต่อ (cascading failure) ต้อง exponential backoff + jitter + cap จำนวน + circuit breaker`},
{lv:10,cat:"System Design",code:`// user อัปโหลดรูป/ไฟล์จำนวนมาก
// AI: เก็บไฟล์เป็น BLOB ใน DB`,claim:`เก็บไฟล์เป็น BLOB ใน DB จัดการง่าย backup พร้อมกันได้`,v:"fake",e:`ไฟล์ใหญ่ใน DB ทำ DB อืด/backup บวม ควรเก็บใน object storage (S3/OBS) เก็บแค่ metadata+URL ใน DB ให้ client อัปตรงด้วย presigned URL ไม่ผ่าน app`},
{lv:10,cat:"System Design",code:`// key ยอดฮิตใน cache หมดอายุพร้อมกัน
// → ทุก request miss พร้อมกัน → ถล่ม DB`,claim:`กัน cache stampede ด้วย single-flight (request เดียว rebuild) + jitter TTL`,v:"real",e:`single-flight ให้ตัวเดียว rebuild ที่เหลือรอผลเดียวกัน + jitter TTL สุ่มเวลาหมดอายุไม่ให้ key พร้อมกัน (เสริม stale-while-revalidate) แก้ stampede ตรงจุด`},
{lv:10,cat:"System Design",code:`// อัปเดตราคาใน DB แล้ว cache Redis ยังเก่า
// AI: เขียนทับ cache (SET) ทันทีหลัง update`,claim:`invalidate cache ด้วยการ SET ค่าใหม่ทับ ปลอดภัยกว่าการ DELETE key`,v:"fake",e:`SET ทับเสี่ยง race: 2 write สลับกัน ค่าเก่าทับใหม่ค้าง DELETE key ปลอดภัยกว่า (miss ครั้งหน้าโหลดสดจาก DB) — ลบดีกว่าเขียนทับ`},
// ── lv11: Data Modeling ──
{lv:11,cat:"Data Modeling",code:`-- จองโรงแรม: ห้ามจองห้องเดียวกันช่วงวันทับกัน
bookings(id, room_id, period DATERANGE)`,claim:`กันจองทับด้วยการ SELECT เช็คใน app ก่อน INSERT ก็พอ ไม่ต้องพึ่ง DB`,v:"fake",e:`เช็คใน app แพ้ race — 2 request พร้อมกันต่างเห็น "ว่าง" แล้ว insert ทับ ต้องบังคับที่ DB: \`EXCLUDE USING gist (room_id WITH =, period WITH &&)\` (ต้อง btree_gist)`},
{lv:11,cat:"Data Modeling",code:`-- แชตกลุ่ม: รู้ว่าใครอ่านถึงไหน
conversation_members(conversation_id, user_id, last_read_at)`,claim:`เก็บ "อ่านถึงไหน" (last_read_at) ไว้ที่ junction conversation_members ถูกต้อง`,v:"real",e:`\`last_read_at\` เป็นสถานะของ "คู่" (user+conversation) → อยู่ที่ junction พอดี unread = \`messages.sent_at > last_read_at\` ถ้าเก็บที่ users จะแยกตามห้องไม่ได้`},
{lv:11,cat:"Data Modeling",code:`-- หนัง 1 เรื่องมีหลายนักแสดง, นักแสดง 1 คนเล่นหลายเรื่อง
movies(id, title, actor_ids INT[])`,claim:`เก็บ actor_ids เป็น array ในตาราง movies พอ ไม่ต้องสร้างตารางเชื่อม`,v:"fake",e:`n-to-m ที่แท้ ใช้ junction \`movie_actors(movie_id, actor_id, ...)\` — array ทำ "หนังของนักแสดงคนนี้" ต้อง scan, ไม่มี FK บังคับ actor มีจริง, ใส่ attribute ต่อคู่ (เช่นชื่อตัวละคร) ไม่ได้`},
{lv:11,cat:"Data Modeling",code:`-- user follow user
follows(follower_id, followee_id, PRIMARY KEY(follower_id, followee_id))`,claim:`user follow user เป็น self-referential n-to-m → junction follows(follower_id, followee_id) ถูกต้อง`,v:"real",e:`follow คือ n-to-m ของ users กับตัวเอง junction 2 FK ชี้กลับ \`users(id)\` + PK รวมกันกันซ้ำ ถูกตามหลัก self-referential many-to-many`},
{lv:11,cat:"Data Modeling",code:`-- สูตรอาหาร–วัตถุดิบ (n-to-m) + ปริมาณที่ใช้
-- AI: เก็บ amount ไว้ที่ตาราง ingredients`,claim:`ปริมาณ (amount) ของวัตถุดิบในแต่ละสูตร เก็บไว้ที่ตาราง ingredients ได้เลย`,v:"fake",e:`amount เป็น attribute ของ "คู่" recipe+ingredient (สูตรเดียวกันใช้คนละปริมาณ) ต้องอยู่ที่ junction \`recipe_ingredients(recipe_id, ingredient_id, amount, unit)\` ไม่ใช่ที่ ingredients`},
// ── lv12: ecomm Unit Test ──
{lv:12,cat:"ecomm Test",code:`func (s *ProductService) ListProducts(...) (...) {
\tproducts, _ := s.productRepo.List(ctx, c)  // repo ใช้ GetLimit() clamp 100
\tpagination := c.Pagination                 // Limit ดิบจาก request เช่น 200
\tpagination.Total = total
\treturn products, pagination, nil
}`,claim:`service แค่ส่งต่อค่าจาก repo ไม่มี bug แค่ test happy path + error ก็พอ`,v:"fake",e:`มี contract bug: return \`pagination.Limit=200\` (ดิบ) แต่ repo clamp เหลือ 100 → response บอก limit=200 แต่ data 100 client คำนวณหน้าผิด test ต้อง assert \`pg.Limit==100\``},
{lv:12,cat:"ecomm Test",code:`func GetByID(...) (*Product, error) {
\tif err == gorm.ErrRecordNotFound { return nil, nil }
\t...
}
// handler: product==nil -> 404`,claim:`(nil, nil) เป็น anti-pattern เสมอ และ handler จะ panic เพราะ deref nil product`,v:"fake",e:`เกินจริง+มั่ว: \`(nil,nil)\` ยอมรับได้ถ้า caller เช็ค nil — handler ตรงนี้เช็ค \`product==nil→404\` แล้ว ไม่ deref ไม่ panic ต้องอ่าน caller ก่อนตัดสิน`},
{lv:12,cat:"ecomm Test",code:`func GetByID(...) (*Product, error) {
\tif err == gorm.ErrRecordNotFound { return nil, nil }
\t...
}`,claim:`คืน sentinel error (ErrProductNotFound) ชัดกว่า (nil, nil) — caller แยก "ไม่เจอ" กับ "พัง" ได้`,v:"real",e:`sentinel error ทำให้ caller แยก not-found ออกจาก error จริงได้ชัด ไม่ต้องเดาจาก nil — เป็นเรื่อง design ที่ดีกว่า (แต่ \`(nil,nil)\` ก็ไม่ถึงกับ crash ถ้า caller กัน nil)`},
{lv:12,cat:"ecomm Test",code:`func (p *Pagination) Offset() int {
\tif p.Page < 1 { p.Page = 1 }   // mutate ใน getter
\treturn (p.Page - 1) * p.Limit
}`,claim:`Offset() ชื่อเหมือน getter แต่แอบแก้ p.Page → response.page เพี้ยนตามลำดับการเรียก`,v:"real",e:`CQS violation: getter ไม่ควรมี side effect ถ้า client ส่ง page=0 ค่า \`p.Page\` หลังเรียก Offset() กลายเป็น 1 → test assert response.page pass/fail แล้วแต่ลำดับ (flaky-by-design)`},
{lv:12,cat:"ecomm Test",code:`type ProductService struct {
\tproductRepo domain.ProductRepository  // interface
}`,claim:`ProductService ฝัง interface → mock repo เทสต์ business logic ได้โดยไม่ต้องต่อ DB`,v:"real",e:`dependency inversion: service พึ่ง interface ไม่ใช่ struct จริง → inject mock (testify/mock) ได้เลย เทสต์เร็ว+isolated ส่วน repo จริง (GORM+SQL) เทสต์เป็น integration แยกด้วย DB จริง`},
];
const LEVELS=[
 {n:1,ic:"🌱",name:"Go Basics"},{n:2,ic:"🔀",name:"Concurrency"},
 {n:3,ic:"⚠️",name:"Errors"},{n:4,ic:"🗄️",name:"SQL"},
 {n:5,ic:"🧪",name:"Testing"},{n:6,ic:"🟦",name:"TypeScript"},
 {n:7,ic:"⚛️",name:"React"},{n:8,ic:"🎨",name:"CSS & E2E"},
 {n:9,ic:"🗃️",name:"DB Design"},{n:10,ic:"🏛️",name:"System Design"},
 {n:11,ic:"🧩",name:"Data Modeling"},{n:12,ic:"🛒",name:"ecomm Test"},
];
const MAXLV=LEVELS.length;
const LANG={1:"go",2:"go",3:"go",4:"sql",5:"go",6:"ts",7:"ts",8:"css",9:"sql",10:"go",11:"sql",12:"go"};

// ===== state =====
const SK='crd-game';
function load(){try{return JSON.parse(localStorage.getItem(SK))||{}}catch(e){return {}}}
function save(d){try{localStorage.setItem(SK,JSON.stringify(d))}catch(e){}}
let store=load(); if(!store.stars)store.stars={};

const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtE=s=>esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+?)`/g,'<code>$1</code>');
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function hl(code,lang){return (window.highlight&&window.detectLang)?window.highlight(code,window.detectLang(code,lang||'go')):esc(code)}

let main, mode,queue,idx,score,lives,streak,timeLeft,timerId,levelNum,correctCount;
const $=id=>document.getElementById(id);
function showScreen(scr){main.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));const e=$(scr);if(e)e.classList.add('on')}

// ===== mount into #main =====
function shell(){
  return `<div class="gamewrap">
  <section class="screen on" id="g-home">
    <div class="hero"><div class="g-badge">🐛</div><h1>Bug Hunter</h1>
      <p>จับโกหก AI ให้ได้ — คำวิจารณ์ของ AI เชื่อได้แค่ไหน? แตะ <b>จริง</b> ถ้า AI พูดถูก, <b>มั่ว</b> ถ้า AI ผิด</p></div>
    <div class="g-statrow">
      <div class="g-stat"><div class="v" id="hiScore">0</div><div class="l">คะแนนสูงสุด</div></div>
      <div class="g-stat"><div class="v" id="totalStars">0</div><div class="l">ดาวที่เก็บได้</div></div>
    </div>
    <button class="mode-btn" id="mbRapid"><span class="ic">⚡</span><div><h3>โหมดรัว</h3><p>60 วินาที · 3 ชีวิต · ตอบถูกติดกันยิ่งได้คะแนนคูณ</p></div></button>
    <button class="mode-btn" id="mbCampaign"><span class="ic">🗺️</span><div><h3>ไล่ด่าน</h3><p>12 ด่านตามหมวด เก็บดาว ปลดล็อกด่านถัดไป</p></div></button>
    <p class="g-tiny">ความคืบหน้าเซฟไว้ในเครื่องนี้ · เลือกหมวดจาก sidebar เพื่อกลับไปอ่าน drill</p>
  </section>
  <section class="screen" id="g-game">
    <div class="g-hud">
      <button class="g-back" id="gBack">‹</button>
      <div class="g-hudmid"><div id="hudLives" class="g-lives"></div><div id="hudTimer" class="g-timer" style="display:none"></div><div id="hudLevelName" class="g-lvname"></div></div>
      <div class="g-scorebox"><div class="s" id="hudScore">0</div><div class="mult" id="hudMult"></div></div>
    </div>
    <div class="g-progress"><div id="progBar" style="width:0%"></div></div>
    <div class="qcard">
      <span class="g-chip" id="qChip"></span>
      <pre class="code" id="qCode"></pre>
      <div class="claim"><div class="who">AI วิจารณ์ว่า:</div><div id="qClaim"></div></div>
      <div class="answers">
        <button class="ans real" id="btnReal">✓ จริง</button>
        <button class="ans fake" id="btnFake">✗ มั่ว</button>
      </div>
      <div class="feedback" id="fb"><div class="g-verdict" id="fbVerdict"></div><div id="fbText"></div></div>
      <button class="nextbtn" id="nextBtn">ต่อไป →</button>
    </div>
  </section>
  <section class="screen" id="g-campaign">
    <div class="g-hud"><button class="g-back" id="gBack2">‹</button><div class="g-hudmid"><div class="g-lvname" style="font-size:18px;font-weight:700">เลือกด่าน</div></div><div style="width:40px"></div></div>
    <div class="levels" id="levelGrid"></div>
  </section>
  <section class="screen" id="g-results">
    <div class="result">
      <div class="big" id="rEmoji">🎉</div><h2 id="rTitle">จบเกม!</h2>
      <div class="stars-big" id="rStars" style="display:none"></div>
      <div class="bigscore" id="rScore">0</div><div class="sub" id="rSub"></div>
      <div class="rbtns"><button class="rbtn ghost" id="rHome">หน้าหลัก</button><button class="rbtn primary" id="rAgain">เล่นอีก</button></div>
    </div>
  </section>
  </div>`;
}

function open(){
  main=document.getElementById('main');
  leave(); // clear any prior timer
  document.querySelectorAll('.navitem').forEach(n=>n.classList.remove('active'));
  main.innerHTML=shell();
  if(!document.getElementById('g-floater')){const f=document.createElement('div');f.id='g-floater';f.className='floater';document.body.appendChild(f);}
  // wire buttons
  $('mbRapid').onclick=startRapid;
  $('mbCampaign').onclick=showCampaign;
  $('gBack').onclick=goHome; $('gBack2').onclick=goHome;
  $('btnReal').onclick=()=>answer('real'); $('btnFake').onclick=()=>answer('fake');
  $('nextBtn').onclick=next; $('rHome').onclick=goHome;
  window.scrollTo(0,0);
  refreshHome();
}
function leave(){ clearInterval(timerId); }

function refreshHome(){
  if(!$('hiScore'))return;
  $('hiScore').textContent=store.hi||0;
  let ts=0;Object.values(store.stars).forEach(v=>ts+=v);
  $('totalStars').textContent=ts;
}

// ===== rapid =====
function startRapid(){
  mode='rapid';queue=shuffle(CARDS);idx=0;score=0;lives=3;streak=0;timeLeft=60;correctCount=0;
  $('hudTimer').style.display='';$('hudLevelName').textContent='';
  showScreen('g-game');tick();timerId=setInterval(tick,1000);renderCard();
}
function tick(){
  $('hudTimer').textContent='⏱ '+timeLeft+'s';
  $('hudTimer').classList.toggle('warn',timeLeft<=10);
  if(timeLeft<=0){endGame();return}
  timeLeft--;
}

// ===== campaign =====
function showCampaign(){
  const g=$('levelGrid');g.innerHTML='';
  LEVELS.forEach((L,i)=>{
    const unlocked = i===0 || (store.stars[LEVELS[i-1].n]>0);
    const st=store.stars[L.n]||0;
    const d=document.createElement('div');
    d.className='lvl'+(unlocked?'':' locked');
    d.innerHTML=`<div class="ic">${L.ic}</div><h4>ด่าน ${L.n}<br>${L.name}</h4>`+
      (unlocked?`<div class="stars">${'★'.repeat(st)}${'☆'.repeat(3-st)}</div>`:`<div class="lock">🔒</div>`);
    if(unlocked)d.onclick=()=>startLevel(L.n);
    g.appendChild(d);
  });
  showScreen('g-campaign');
}
function startLevel(n){
  mode='campaign';levelNum=n;
  queue=shuffle(CARDS.filter(c=>c.lv===n));idx=0;score=0;lives=99;streak=0;correctCount=0;
  $('hudTimer').style.display='none';
  $('hudLevelName').textContent='ด่าน '+n+' · '+LEVELS[n-1].name;
  showScreen('g-game');renderCard();
}

// ===== shared card =====
function multiplier(){return Math.min(1+Math.floor(streak/3),5)}
function renderCard(){
  const c=queue[idx];
  $('hudScore').textContent=score;
  $('hudMult').textContent = streak>=3 ? '🔥 ×'+multiplier() : '';
  $('hudLives').textContent = mode==='rapid' ? '❤️'.repeat(Math.max(0,lives))+'🖤'.repeat(3-Math.max(0,lives)) : '';
  $('progBar').style.width = Math.round(idx/queue.length*100)+'%';
  $('qChip').textContent=c.cat;
  $('qCode').innerHTML=hl(c.code,LANG[c.lv]);
  $('qClaim').innerHTML=fmtE(c.claim);
  $('fb').className='feedback';$('nextBtn').className='nextbtn';
  const r=$('btnReal'),f=$('btnFake');r.className='ans real';f.className='ans fake';r.disabled=false;f.disabled=false;
}
function answer(pick){
  const c=queue[idx],correct=pick===c.v;
  $('btnReal').disabled=true;$('btnFake').disabled=true;
  const picked = pick==='real'?$('btnReal'):$('btnFake');
  const other  = pick==='real'?$('btnFake'):$('btnReal');
  if(correct){
    picked.classList.add('picked-correct');
    const gain=100*multiplier();score+=gain;streak++;correctCount++;
    floatText('+'+gain,'var(--accent)');
  }else{
    picked.classList.add('picked-wrong');other.classList.add('reveal');streak=0;
    if(mode==='rapid'){lives--;floatText('−1 ❤️','#c0392b')}
  }
  const fb=$('fb');fb.className='feedback show '+(correct?'ok':'no');
  $('fbVerdict').textContent=(c.v==='real'?'✓ จริง — AI พูดถูก':'✗ มั่ว — AI ผิด')+(correct?' · ตอบถูก!':' · พลาด');
  $('fbText').innerHTML=fmtE(c.e);
  $('hudScore').textContent=score;
  $('hudMult').textContent = streak>=3 ? '🔥 ×'+multiplier() : '';
  $('hudLives').textContent = mode==='rapid' ? '❤️'.repeat(Math.max(0,lives))+'🖤'.repeat(3-Math.max(0,lives)) : '';
  if(mode==='rapid' && lives<=0){setTimeout(endGame,900);return}
  $('nextBtn').className='nextbtn show';
  $('nextBtn').textContent=(idx+1>=queue.length)?'ดูผล →':'ต่อไป →';
}
function next(){idx++;if(idx>=queue.length){endGame();return}renderCard()}
function floatText(txt,col){const f=$('g-floater');if(!f)return;f.textContent=txt;f.style.color=col;f.className='floater';void f.offsetWidth;f.className='floater go'}

// ===== results =====
function endGame(){
  clearInterval(timerId);
  if(mode==='rapid'){
    const newHi=score>(store.hi||0);
    if(newHi){store.hi=score;save(store)}
    $('rEmoji').textContent = newHi&&score>0?'🏆':'⚡';
    $('rTitle').textContent = lives<=0?'หมดชีวิต!':'หมดเวลา!';
    $('rStars').style.display='none';
    $('rScore').textContent=score;
    $('rSub').textContent=`ตอบถูก ${correctCount} ข้อ · best ${store.hi||0}`+(newHi&&score>0?' · สถิติใหม่!':'');
    $('rAgain').textContent='เล่นอีก';$('rAgain').onclick=startRapid;
  }else{
    const n=queue.length;
    const st = correctCount>=n?3 : correctCount>=n-1?2 : correctCount>=Math.ceil(n*0.6)?1:0;
    if(st>(store.stars[levelNum]||0)){store.stars[levelNum]=st;save(store)}
    $('rEmoji').textContent = st===3?'🌟':st>0?'🎉':'😵';
    $('rTitle').textContent = st>0?'ผ่านด่าน '+levelNum+'!':'ยังไม่ผ่าน';
    $('rStars').style.display='';$('rStars').textContent='★'.repeat(st)+'☆'.repeat(3-st);
    $('rScore').textContent=correctCount+'/'+n;
    $('rSub').textContent = st>0?(levelNum<MAXLV?'ปลดล็อกด่านถัดไปแล้ว!':'เก่งมาก! ครบทุกด่าน'):'ตอบถูกอย่างน้อย '+Math.ceil(n*0.6)+' ข้อเพื่อผ่าน';
    $('rAgain').textContent = (st>0&&levelNum<MAXLV)?'ด่านต่อไป →':'เล่นด่านนี้อีก';
    $('rAgain').onclick = (st>0&&levelNum<MAXLV)?()=>startLevel(levelNum+1):()=>startLevel(levelNum);
  }
  refreshHome();showScreen('g-results');
}
function goHome(){clearInterval(timerId);refreshHome();showScreen('g-home');window.scrollTo(0,0)}

window.Game={ open, leave };
})();
