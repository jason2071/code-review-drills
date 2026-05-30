# Code Review Drills

ซ้อมจับบั๊ก / จับ AI มั่ว — static SPA ภาษาไทยสำหรับฝึก code review

ฝึก 3 แบบ:
- 🔍 **หาบั๊ก** — อ่านโค้ด หาจุดผิด
- 🤖 **ตัดสิน AI** — AI เสนอคำตอบ แยกว่า *จริง* หรือ *มั่ว*
- 💡 **ออกแบบ/อธิบาย** — โจทย์ concept / system design

วิธีใช้: วิเคราะห์เองก่อน แล้วค่อยกดดูเฉลย (active recall จำแม่นกว่า)

## หมวด

**Backend** — Go (logic/edge, concurrency, error & resource, unit test), SQL, DB design, system design
**Frontend** — TypeScript, React, CSS/layout, Playwright E2E

## รัน

เปิด `index.html` ใน browser ตรงๆ ไม่มี build step. (Fonts โหลดจาก Google Fonts CDN — ครั้งแรกต้องต่อเน็ต)

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|------|--------|
| `index.html` | skeleton markup + `<link>`/`<script>` |
| `styles.css` | CSS ทั้งหมด |
| `data.js` | `DATA` array — โจทย์ทั้งหมด |
| `app.js` | renderer + helper (`escapeHtml`, `fmt`) |

Load order: `data.js` ก่อน `app.js`

## เพิ่มโจทย์

เพิ่ม object เข้า `problems` array ใน `data.js` (หรือเพิ่ม category ใหม่ใน `DATA`). slug `cat` ใหม่จะสร้างปุ่ม sidebar อัตโนมัติ. รายละเอียด shape ดู [CLAUDE.md](CLAUDE.md).
