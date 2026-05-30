DATA.push(
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
);
