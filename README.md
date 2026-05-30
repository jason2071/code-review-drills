# Code Review Drills

ซ้อมจับบั๊ก / จับ AI มั่ว — static SPA ภาษาไทยสำหรับฝึก code review

ฝึก 3 แบบ:
- 🔍 **หาบั๊ก** — อ่านโค้ด หาจุดผิด
- 🤖 **ตัดสิน AI** — AI เสนอคำตอบ แยกว่า *จริง* หรือ *มั่ว*
- 💡 **ออกแบบ/อธิบาย** — โจทย์ concept / system design

วิธีใช้: วิเคราะห์เองก่อน แล้วค่อยกดดูเฉลย (active recall จำแม่นกว่า)

## หมวด

**Backend** — Go (logic/edge, concurrency, error & resource, unit test), SQL, DB design, DB ออกแบบจากโจทย์ (scenario → schema), system design
**Frontend** — TypeScript, React, CSS/layout, Playwright E2E

## รัน

เปิด `index.html` ใน browser ตรงๆ ไม่มี build step. (Fonts โหลดจาก Google Fonts CDN — ครั้งแรกต้องต่อเน็ต)

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|------|--------|
| `index.html` | skeleton markup + `<link>`/`<script>` |
| `styles.css` | CSS ทั้งหมด |
| `data.js` | ประกาศ `const DATA = []` (registry) |
| `data/NN-<cat>.js` | 1 ไฟล์ต่อ 1 หมวด — `DATA.push({...})` |
| `app.js` | renderer + helper (`escapeHtml`, `fmt`) |

Load order: `data.js` → `data/NN-*.js` (เรียงเลข) → `app.js`

## เพิ่มโจทย์

เพิ่ม object เข้า `problems` array ในไฟล์ `data/NN-*.js` ของหมวดนั้น. หมวดใหม่: สร้าง `data/NN-<cat>.js` (`DATA.push({...})`) + เพิ่ม `<script>` tag ใน `index.html`. slug `cat` ใหม่สร้างปุ่ม sidebar อัตโนมัติ. รายละเอียด shape ดู [CLAUDE.md](CLAUDE.md).
