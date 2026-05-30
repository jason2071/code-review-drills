DATA.push(
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
- เทสต์หลาย case ด้วย table-driven (method/path/status/body)`},
   {type:"find", title:"assert error ด้วย string",
    code:`func TestFetch(t *testing.T) {
\t_, err := Fetch(badURL)
\tassert.Equal(t, "not found", err.Error())
}`,
    answer:`**เทียบ error ด้วย string เปราะ + พลาด wrapped error**

ถ้า error ถูก wrap (\`fmt.Errorf("fetch: %w", ErrNotFound)\`) → \`err.Error()\` = "fetch: not found" ไม่ตรง → fail. ข้อความเปลี่ยนนิดเดียวก็พัง

ใช้ \`ErrorIs\` กับ sentinel (ทะลุ wrap ด้วย \`errors.Is\`):
\`\`\`
require.ErrorIs(t, err, ErrNotFound)
\`\`\`
- \`assert.Error(t, err)\` — แค่เช็คว่ามี error
- \`assert.ErrorIs(t, err, target)\` — เช็ค sentinel ทะลุ wrap (ที่ถูก)
- \`assert.ErrorAs(t, err, &target)\` — ดึง custom error type ออกมาเช็ค field
- \`assert.ErrorContains(t, err, "...")\` — เช็ค substring (ยังดีกว่า Equal ทั้งสตริง)

**หลัก:** อย่า assert error ด้วยข้อความตรงตัว → \`ErrorIs\` sentinel`},
   {type:"find", title:"assert.Equal กับ float",
    code:`func TestAvg(t *testing.T) {
\tgot := Sum([]float64{0.1, 0.2})
\tassert.Equal(t, 0.3, got)
}`,
    answer:`**1 จุด: เทียบ float ด้วย Equal**

\`0.1 + 0.2 = 0.30000000000000004\` (binary float ปัดเศษ) → ไม่เท่ากับ \`0.3\` เป๊ะ → \`assert.Equal\` fail ทั้งที่ logic ถูก

ใช้ระยะคลาดเคลื่อน:
\`\`\`
assert.InDelta(t, 0.3, got, 1e-9)     // ต่างได้ไม่เกิน delta
assert.InEpsilon(t, 0.3, got, 1e-9)   // ต่างได้ไม่เกินสัดส่วน (relative)
\`\`\`
**หลัก:** เทียบ float ห้าม \`Equal\` ตรงๆ → \`InDelta\` (ค่าสัมบูรณ์) หรือ \`InEpsilon\` (สัดส่วน เหมาะกับเลขใหญ่)`},
   {type:"find", title:"เทียบ slice ที่ลำดับไม่แน่",
    code:`func TestTags(t *testing.T) {
\tgot := GetTags() // []string สร้างจากการวน map → ลำดับไม่แน่
\tassert.Equal(t, []string{"go", "db"}, got)
}`,
    answer:`**1 จุด: Equal เทียบ slice ตามลำดับ → flaky**

map iteration ใน Go ลำดับ **ไม่แน่นอน** → \`got\` อาจเป็น \`["db","go"]\` บางรอบ → \`assert.Equal\` fail แบบสุ่ม (flaky)

ถ้าไม่สนลำดับ ใช้:
\`\`\`
assert.ElementsMatch(t, []string{"go", "db"}, got)
\`\`\`
เช็คว่ามีสมาชิกชุดเดียวกัน (นับ duplicate ด้วย) ไม่สนลำดับ

**หลัก:** เทียบ collection ที่ลำดับไม่สำคัญ → \`ElementsMatch\` · ถ้าต้องสนลำดับค่อย \`Equal\` (หรือ sort ก่อนเทียบ)`},
   {type:"find", title:"assertion helper ไม่เรียก t.Helper()",
    code:`func checkUser(t *testing.T, u *User) {
\tassert.Equal(t, "Alice", u.Name)
\tassert.True(t, u.Active)
}
func TestProfile(t *testing.T) {
\tcheckUser(t, got)
}`,
    answer:`**1 จุด: helper ขาด \`t.Helper()\` → fail ชี้ผิดบรรทัด**

เวลา assert ใน \`checkUser\` fail รายงานจะชี้บรรทัด **ในตัว helper** ไม่ใช่บรรทัดที่เรียก (\`checkUser(t, got)\`) → มีหลาย caller ยิ่ง debug ยากว่าเคสไหนพัง

เพิ่ม \`t.Helper()\` บรรทัดแรก:
\`\`\`
func checkUser(t *testing.T, u *User) {
    t.Helper()                       // failure ชี้ตำแหน่งที่เรียก
    assert.Equal(t, "Alice", u.Name)
    assert.True(t, u.Active)
}
\`\`\`
**หลัก:** ฟังก์ชันที่รับ \`*testing.T\` แล้ว assert เอง → ใส่ \`t.Helper()\` เสมอ`}
  ]
}
);
