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
- เทสต์หลาย case ด้วย table-driven (method/path/status/body)`}
  ]
}
);
