DATA.push(
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
}
);
