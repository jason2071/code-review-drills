DATA.push(
{
  group:"Backend", cat:"ecomm-unit-test", title:"Go · Unit Test จาก ecomm-api",
  desc:"โจทย์จาก codebase จริง (ecomm-api: Gin + GORM + PostgreSQL) — Pagination logic, repository mapping, service layer, soft-delete. หา bug ที่ unit test ควรจับได้ + ออกแบบเทสต์",
  problems:[
   {type:"find", title:"Pagination.Offset() vs GetLimit() ไม่ match กัน",
    code:`type Pagination struct {
\tPage  int
\tLimit int
\tTotal int64
}

func (p *Pagination) Offset() int {
\tif p.Page < 1 {
\t\tp.Page = 1
\t}
\treturn (p.Page - 1) * p.Limit
}

func (p *Pagination) GetLimit() int {
\tif p.Limit <= 0 {
\t\treturn 10
\t}
\tif p.Limit > 100 {
\t\treturn 100
\t}
\treturn p.Limit
}

// repo ใช้: db.Offset(p.Offset()).Limit(p.GetLimit())`,
    answer:`**Offset กับ GetLimit clamp Limit ไม่เหมือนกัน → ข้ามแถว / ซ้ำแถว**

\`GetLimit()\` clamp เป็น \`[1..100]\` (default 10) แต่ \`Offset()\` ใช้ \`p.Limit\` **ดิบ** ไม่ clamp → offset กับ limit คนละฐาน

**เคสพัง:**
- \`Limit=200, Page=2\` → Offset = (2-1)×200 = **200** แต่ query Limit = **100** → page 2 ได้แถวที่ 201–300 (แถว 101–200 หายไปเลย)
- \`Limit=0, Page=3\` → Offset = (3-1)×0 = **0** ทุกหน้า แต่ GetLimit = 10 → ทุก page คืน 10 แถวแรกซ้ำ

unit test (pure function ไม่ต้องแตะ DB) ที่จับได้:
\`\`\`
p := &Pagination{Page: 2, Limit: 200}
assert.Equal(t, 100, p.GetLimit())
assert.Equal(t, 100, p.Offset())   // ต้องเท่ากับ (2-1)*GetLimit() = 100, แต่ได้ 200 → FAIL
\`\`\`
**แก้:** ให้ \`Offset()\` ใช้ \`p.GetLimit()\` ไม่ใช่ \`p.Limit\` → offset/limit ฐานเดียวกัน`,
    note:`offset ต้องคำนวณจาก limit ที่ clamp แล้ว (ตัวเดียวกับที่ query ใช้) ไม่งั้น page เพี้ยน. แนวคิด: ค่า derived 2 ตัวที่ต้องสอดคล้องกัน ห้าม clamp คนละกฎ — unit test pure logic จับได้ก่อนถึง DB`},
   {type:"find", title:"SupplierRepository.List — map product ผิด/panic",
    code:`func (r *SupplierRepository) List(ctx context.Context) ([]*domain.Supplier, error) {
\tvar suppliers []*domain.Supplier
\tr.db.WithContext(ctx).Find(&suppliers)

\tfor _, s := range suppliers {
\t\tvar allProductIDs []uuid.UUID
\t\t// Unscoped = รวม soft-deleted ด้วย
\t\tr.db.WithContext(ctx).Unscoped().Model(&domain.Product{}).
\t\t\tWhere("supplier_id = ?", s.ID).Pluck("id", &allProductIDs)

\t\tif len(allProductIDs) > 0 {
\t\t\tvar products []domain.Product
\t\t\t// Find = ตัด soft-deleted ออก (default scope)
\t\t\tr.db.WithContext(ctx).Find(&products, allProductIDs)

\t\t\ts.Products = make([]domain.Product, len(allProductIDs))
\t\t\tfor i := range allProductIDs {
\t\t\t\ts.Products[i] = products[i]   // index ตาม allProductIDs
\t\t\t}
\t\t}
\t}
\treturn suppliers, nil
}`,
    answer:`**3 จุด — bug หลักคือ length mismatch จาก soft-delete**

1. **panic: index out of range** — \`allProductIDs\` มาจาก \`Unscoped()\` (รวม soft-deleted) แต่ \`products\` มาจาก \`Find\` ปกติ (**ตัด soft-deleted ทิ้ง**) → ถ้ามี product ถูกลบ \`len(products) < len(allProductIDs)\` → วน \`i\` ถึง \`len(allProductIDs)-1\` แล้ว \`products[i]\` เกินขอบ → **panic**

2. **map ผิดตัวถึงไม่ panic** — \`Find(&products, ids)\` ไม่รับประกันลำดับตรงกับ \`ids\` → \`products[i]\` อาจไม่ใช่ product ของ \`allProductIDs[i]\` แม้ length เท่ากัน

3. **N+1 query** — loop supplier ยิง query 2 ครั้งต่อ 1 supplier → ใช้ \`Preload("Products")\` ครั้งเดียวจบ

unit test ที่จับ bug 1: seed supplier + 2 products, soft-delete 1 → เรียก \`List\` → ต้องไม่ panic และคืน product ที่เหลือ 1 ตัว (เทสต์นี้จะ panic ทันที = เจอ bug)

**แก้:** เลิก \`Unscoped()\` ตอน pluck (ให้ฐานเดียวกับ Find) หรือใช้ \`Preload\` ไปเลย:
\`\`\`
r.db.WithContext(ctx).Preload("Products").Find(&suppliers)
\`\`\``,
    note:`pluck ด้วย Unscoped แต่ fetch ด้วย scoped → length/ลำดับไม่ตรง → panic หรือ map ผิด. แนวคิด: สอง query ที่ต้อง align กัน ต้องใช้ scope/order เดียวกัน; เทสต์ที่มี soft-deleted row คือ edge case ที่ต้องมี`},
   {type:"judge", title:"ตัดสิน AI: service คืน Limit ดิบ",
    code:`func (s *ProductService) ListProducts(ctx context.Context, c *domain.ListProductCriteria) ([]*domain.Product, *domain.Pagination, error) {
\tproducts, err := s.productRepo.List(ctx, c)   // repo ข้างในใช้ GetLimit() clamp 100
\tif err != nil { return nil, nil, err }

\ttotal, err := s.productRepo.Count(ctx, c)
\tif err != nil { return nil, nil, err }

\tpagination := c.Pagination
\tif pagination == nil {
\t\tpagination = &domain.Pagination{Page: 1, Limit: 10}
\t}
\tpagination.Total = total
\treturn products, pagination, nil
}`,
    ai:`เทสต์นี้ครอบคลุมพอแล้ว แค่ mock repo.List คืน slice, mock Count คืน total, แล้ว assert ว่า pagination.Total ถูก set. ไม่มี bug อะไร เพราะ service แค่ส่งต่อค่าจาก repo. ถ้าจะเพิ่มก็แค่ test กรณี repo error คืน err กลับมา`,
    answer:`**ข้อ "ไม่มี bug" มั่ว — มี contract bug ที่เทสต์ต้องจับ**

[FAKE] "ไม่มี bug": \`pagination.Limit\` ที่ return คือค่า **ดิบจาก request** (เช่น 200) แต่ repo ข้างในใช้ \`GetLimit()\` clamp เหลือ 100 แล้วดึงมาแค่ ≤100 แถว → **response บอก limit=200 แต่ data มี 100** → client คำนวณจำนวนหน้าผิด

[REAL] "mock repo + assert Total ถูก set": จริง เป็น test ที่ควรมี
[REAL] "test repo error": จริง ควร assert ทั้ง List error และ Count error แยกกัน (โค้ดมี 2 จุด return err)

**test ที่ AI ลืม:**
\`\`\`
c := &domain.ListProductCriteria{Pagination: &domain.Pagination{Page:1, Limit:200}}
_, pg, _ := svc.ListProducts(ctx, c)
assert.Equal(t, 100, pg.Limit)   // ต้อง clamp แต่ตอนนี้ได้ 200 → เจอ bug
\`\`\`
**บทเรียน:** "service แค่ส่งต่อ" ไม่ได้แปลว่าไม่มี bug — ค่า limit ที่ตอบ client ต้องตรงกับที่ query ใช้จริง`,
    note:`อย่าเชื่อ "แค่ส่งต่อค่าเลยไม่มี bug" — เช็ค contract ของค่าที่ตอบ client ว่าตรงกับที่ query ใช้จริงไหม. แนวคิด: coverage ที่ดี = เทสต์ invariant ข้ามชั้น ไม่ใช่แค่ happy path`},
   {type:"concept", title:"จะ unit test ProductService.ListProducts โดยไม่แตะ DB ยังไง?",
    code:`type ProductRepository interface {
\tList(ctx context.Context, c *ListProductCriteria) ([]*Product, error)
\tCount(ctx context.Context, c *ListProductCriteria) (int64, error)
\t// ...
}
type ProductService struct { productRepo domain.ProductRepository }`,
    answer:`**service พึ่ง interface อยู่แล้ว → mock repo ได้เลย**

ProductService ฝัง \`domain.ProductRepository\` (interface) → inject mock ได้ ไม่ต้องต่อ Postgres

\`\`\`
type MockProductRepo struct{ mock.Mock }
func (m *MockProductRepo) List(ctx context.Context, c *domain.ListProductCriteria) ([]*domain.Product, error) {
    args := m.Called(ctx, c)
    p, _ := args.Get(0).([]*domain.Product)
    return p, args.Error(1)
}
func (m *MockProductRepo) Count(ctx context.Context, c *domain.ListProductCriteria) (int64, error) {
    args := m.Called(ctx, c)
    return args.Get(0).(int64), args.Error(1)
}
// ... (method อื่นใน interface ต้อง implement ครบ ไม่งั้น compile ไม่ผ่าน)

func TestListProducts_SetsTotal(t *testing.T) {
    repo := new(MockProductRepo)
    repo.On("List", mock.Anything, mock.Anything).Return([]*domain.Product{{}}, nil)
    repo.On("Count", mock.Anything, mock.Anything).Return(int64(42), nil)

    svc := service.NewProductService(repo)
    c := &domain.ListProductCriteria{Pagination: &domain.Pagination{Page:1, Limit:10}}
    _, pg, err := svc.ListProducts(context.Background(), c)

    require.NoError(t, err)
    assert.Equal(t, int64(42), pg.Total)
    repo.AssertExpectations(t)
}
\`\`\`
**case ที่ต้อง cover:** Total ถูก set · List error คืน err · Count error คืน err · Pagination nil → default {1,10}

**กุญแจ:** เทสต์ service = mock repo (เร็ว, isolated) · เทสต์ repo จริง (GORM+SQL) = integration test แยก ใช้ DB จริง/testcontainers`,
    note:`service พึ่ง interface → mock repo ได้, เทสต์ business logic แยกจาก DB. แนวคิด: dependency inversion ทำให้ test boundary อยู่ที่ service เพียว ๆ; repo ต้องเทสต์อีกชั้นด้วย DB จริง`},
   {type:"find", title:"Offset() เป็น getter แต่แอบแก้ state",
    code:`func (p *Pagination) Offset() int {
\tif p.Page < 1 {
\t\tp.Page = 1      // mutate field ใน method ชื่อ Offset
\t}
\treturn (p.Page - 1) * p.Limit
}

// handler:
pagination := &domain.Pagination{Page: req.Page, Limit: req.Limit}
// ... ใช้ pagination.Offset() ตอน query
// ... แล้วเอา pagination.Page ใส่ response กลับ client`,
    answer:`**side effect ใน method ที่ดูเหมือน getter → response เพี้ยนตามลำดับการเรียก**

\`Offset()\` ชื่อบอกว่า "อ่านค่า" แต่ดันแก้ \`p.Page\` → ถ้า client ส่ง \`page=0\`:
- ก่อนเรียก \`Offset()\`: \`p.Page = 0\`
- หลังเรียก: \`p.Page = 1\`

response ที่ตอบ client ขึ้นกับว่า \`Offset()\` ถูกเรียกก่อน serialize หรือยัง → **test ที่ assert response.page จะ pass/fail แล้วแต่ลำดับ** (flaky-by-design)

unit test ที่เปิดโปง:
\`\`\`
p := &Pagination{Page: 0, Limit: 10}
assert.Equal(t, 0, p.Page)   // ผ่าน
p.Offset()
assert.Equal(t, 0, p.Page)   // FAIL → Offset แอบแก้เป็น 1
\`\`\`
**แก้:** อย่าให้ getter mutate — normalize page ที่จุดเดียว (ตอนสร้าง Pagination / validate) แล้ว Offset อ่านอย่างเดียว
**หลัก:** method ที่คืนค่า ไม่ควรมี side effect (command-query separation)`,
    note:`getter ห้ามมี side-effect (CQS) — ไม่งั้นผลขึ้นกับลำดับเรียก, เทสต์ flaky. แนวคิด: normalize ครั้งเดียวที่ขอบระบบ แล้วให้ตัวอ่านบริสุทธิ์`},
   {type:"judge", title:"ตัดสิน AI: GetByID คืน (nil, nil)",
    code:`func (r *ProductRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Product, error) {
\tvar product domain.Product
\terr := r.db.WithContext(ctx).Where("id = ?", id).First(&product).Error
\tif err != nil {
\t\tif err == gorm.ErrRecordNotFound {
\t\t\treturn nil, nil          // not found = (nil, nil)
\t\t}
\t\treturn nil, fmt.Errorf("failed to get product: %w", err)
\t}
\treturn &product, nil
}
// handler: ถ้า err -> 500, ถ้า product==nil -> 404`,
    ai:`bug ชัดเจน: ควรคืน error เช่น ErrProductNotFound แทน (nil, nil) เพราะ (nil, nil) เป็น anti-pattern เสมอ และ handler จะ panic เพราะ deref nil product. test ต้อง assert ว่าได้ error กลับมา`,
    answer:`**AI ถูกครึ่ง ผิดครึ่ง**

[REAL] คืน sentinel error (\`ErrProductNotFound\`) **ดีกว่า** \`(nil, nil)\` — caller แยก "ไม่เจอ" กับ "พัง" ได้ชัด ไม่ต้องเดาจาก nil

[FAKE] "\`(nil, nil)\` เป็น anti-pattern เสมอ" — เกินจริง มันเป็น convention ที่ **ยอมรับได้** ถ้า caller จัดการ nil ถูก (handler ตรงนี้เช็ค \`product == nil → 404\` แล้ว ไม่ panic)

[FAKE] "handler จะ panic เพราะ deref nil" — มั่ว handler ไม่ได้ deref มันเช็ค nil ก่อน → ตอบ 404 ปกติ

**test ที่ถูกต้องสำหรับโค้ด "ตามที่เป็น":**
\`\`\`
// repo: not found
p, err := repo.GetByID(ctx, missingID)
require.NoError(t, err)        // ไม่ใช่ error
assert.Nil(t, p)               // คืน nil

// handler: product==nil → 404 (ไม่ใช่ 500, ไม่ panic)
\`\`\`
**บทเรียน:** AI ชอบเหมา "anti-pattern เสมอ" + เดา panic ทั้งที่ handler กัน nil แล้ว — ต้องอ่าน caller จริงก่อนตัดสิน`,
    note:`(nil,nil) ไม่ใช่ bug เสมอไป ถ้า caller เช็ค nil; sentinel error ดีกว่าแต่เป็นเรื่อง design ไม่ใช่ crash. แนวคิด: ตัดสิน contract ต้องดูทั้ง producer + consumer อย่าเดา panic`},
   {type:"find", title:"handler ตั้ง default แล้ว ทำไม service ยังเช็ค nil อีก?",
    code:`// handler
if req.Limit <= 0 { req.Limit = 10 }
if req.Page  <= 0 { req.Page  = 1 }
criteria := &domain.ListProductCriteria{
\tPagination: &domain.Pagination{Page: req.Page, Limit: req.Limit},
}

// service
pagination := c.Pagination
if pagination == nil {
\tpagination = &domain.Pagination{Page: 1, Limit: 10}   // dead code?
}`,
    answer:`**default ซ้ำ 2 ที่ + branch ที่ unit test ครอบไม่ถึงถ้าเทสต์ผ่าน handler อย่างเดียว**

1. **logic กระจาย** — handler ตั้ง default (Limit≤0→10, Page≤0→1) แล้ว service ก็เช็ค \`Pagination == nil\` อีก → กฎ default อยู่ 2 ที่ แก้ที่เดียวลืมอีกที่ได้ง่าย

2. **branch \`pagination == nil\` แทบไม่ถูกเรียกผ่าน handler** (handler สร้าง Pagination ให้เสมอ ไม่เคยส่ง nil) → ถ้าเขียนเฉพาะ integration test ผ่าน HTTP จะ **ไม่มีทาง cover branch นี้** → coverage หลอกตา

ต้องเขียน **unit test ที่เรียก service ตรง ๆ** ด้วย \`Pagination: nil\`:
\`\`\`
c := &domain.ListProductCriteria{Pagination: nil}
repo.On("List", ...).Return([]*domain.Product{}, nil)
repo.On("Count", ...).Return(int64(0), nil)
_, pg, _ := svc.ListProducts(ctx, c)
assert.Equal(t, 1, pg.Page)
assert.Equal(t, 10, pg.Limit)   // default ของ service
\`\`\`
**หลัก:** branch ที่ entry point ปกติเข้าไม่ถึง ต้องเทสต์ที่ระดับ unit ตรง ๆ ไม่งั้นเป็น dead-ish code ที่ไม่มีใครพิสูจน์ว่าทำงาน · และควรรวม default ไว้ที่เดียว`,
    note:`default logic ซ้ำหลายชั้น + branch ที่ integration test เข้าไม่ถึง = ต้อง unit test ระดับ service ตรง ๆ. แนวคิด: coverage ต้องมาจากการเรียกฟังก์ชันที่จุดที่ branch นั้นเข้าถึงได้จริง`},
   {type:"concept", title:"repo (GORM+SQL) ควรเทสต์ระดับไหน — mock DB หรือ DB จริง?",
    code:`func (r *ProductRepository) List(ctx context.Context, c *domain.ListProductCriteria) ([]*domain.Product, error) {
\tdb := r.db.WithContext(ctx)
\tif c != nil && c.Search != "" {
\t\tpat := fmt.Sprintf("%%%s%%", c.Search)
\t\tdb = db.Where("name ILIKE ? OR description ILIKE ? OR category ILIKE ?", pat, pat, pat)
\t}
\tif c != nil && c.Pagination != nil {
\t\tdb = db.Offset(c.Pagination.Offset()).Limit(c.Pagination.GetLimit())
\t}
\treturn products, db.Order("price DESC").Order("name ASC").Find(&products).Error
}`,
    answer:`**repo logic อยู่ใน SQL/GORM เกือบหมด → เทสต์กับ DB จริง (integration) ไม่ใช่ mock**

สิ่งที่อยากพิสูจน์: ILIKE search match จริงไหม, offset/limit ตัดหน้าถูกไหม, \`ORDER BY price DESC, name ASC\` เรียงถูกไหม — ทั้งหมด**ทำงานในฐานข้อมูล** mock \`*gorm.DB\` แล้ว assert ก็ได้แค่ว่า "เรียก method ครบ" ไม่ได้พิสูจน์ว่า SQL ถูก

**ทางเลือก:**
1. **testcontainers-go + Postgres จริง** (แนะนำ) — schema/ILIKE/ordering ตรงกับ prod เป๊ะ
2. **sqlmock** — assert SQL string + คืน rows ปลอม; เปราะ (ผูกกับ string ที่ GORM gen) และไม่พิสูจน์พฤติกรรม DB จริง
3. **SQLite in-memory** — เร็วแต่ dialect ต่าง (ไม่มี ILIKE, uuid, soft-delete behavior ต่าง) → false confidence

\`\`\`
// integration test (build tag แยก, ใช้ testcontainers)
func TestProductRepo_List_Search(t *testing.T) {
    db := setupTestDB(t)               // ต่อ container, run migration, t.Cleanup ปิด
    repo := pgrepo.NewProductRepository(db)
    seed(t, db, /* ... */)
    got, err := repo.List(ctx, &domain.ListProductCriteria{Search: "phone"})
    require.NoError(t, err)
    assert.Len(t, got, 2)
    // assert เรียงตาม price DESC ด้วย
}
\`\`\`
**กุญแจ:** logic อยู่ใน SQL → ต้องรันกับ engine จริง · แบ่ง pyramid: service=mock(เยอะ,เร็ว), repo=integration(น้อยกว่า,ช้ากว่าแต่จริง)`,
    note:`โค้ดที่ logic อยู่ใน SQL/ORM เทสต์กับ DB จริง (testcontainers) ไม่ใช่ mock; SQLite dialect ต่างให้ false confidence. แนวคิด: เทสต์ที่ boundary ที่ logic อยู่จริง — mock ได้แค่ "เรียกถูก" ไม่ใช่ "ผลถูก"`}
  ]
}
);
