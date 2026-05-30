DATA.push(
{
  group:"Frontend", cat:"css", title:"CSS / Layout",
  desc:"centering, stacking context, margin collapse, responsive, specificity — ดู 'ควรเวิร์ค' แต่ไม่เวิร์ค",
  problems:[
   {type:"concept", title:"จัดกึ่งกลางทั้งแนวตั้งแนวนอน",
    code:`/* จัด .box ให้อยู่กลางจอพอดี วิธีสะอาดสุด? */`,
    answer:`**flexbox / grid**
\`\`\`
.parent { display: grid; place-items: center; min-height: 100vh; }
\`\`\`
หรือ flex:
\`\`\`
.parent { display:flex; justify-content:center; align-items:center; min-height:100vh; }
\`\`\`
**ทำไมไม่ใช้ของเก่า:** \`margin:auto\` ได้แค่แนวนอน · \`absolute+translate\` เปราะ
**พูด:** "ใช้ place-items:center บน grid ครับ สั้นและ robust สุด"`,
    note:`flex/grid จัดกึ่งกลางได้ทั้งสองแกนสะอาดสุด. แนวคิด: layout สมัยใหม่ใช้ flow ของ flex/grid แทน hack เก่า (margin auto/absolute+transform)`},
   {type:"find", title:"tooltip ไม่ขึ้นทับ modal",
    code:`.modal   { position: fixed; z-index: 10; }
.tooltip { position: relative; z-index: 9999; }
/* tooltip z-index เยอะกว่า แต่ไม่ทับ modal */`,
    answer:`**stacking context — z-index เทียบกันได้แค่ใน context เดียวกัน**

ถ้า \`.tooltip\` อยู่ใน parent ที่สร้าง stacking context ใหม่ (parent มี \`transform\`, \`opacity < 1\`, \`filter\`) → 9999 เทียบแค่ภายใน parent นั้น ไม่ได้แข่งกับ \`.modal\`

แก้: render tooltip ผ่าน portal ไปที่ \`body\` (หลุดออกจาก context ของ parent) หรือเอา transform/opacity ที่ parent ออก

**หลัก:** z-index เยอะแต่ไม่ทับ → สงสัย stacking context ของ parent (transform/opacity/filter)`,
    note:`\`z-index\` ทำงานใน stacking context — parent ที่มี \`transform\`/\`opacity\`/\`filter\` สร้าง context ใหม่ที่ขังลูกไว้. แนวคิด: z-index ไม่ใช่ค่า global; เทียบกันเฉพาะใน context เดียว`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`.container { display: flex; }
.item { width: 200px; }
/* มี 5 item, container 600px → item ล้นออก */`,
    ai:`แก้ได้ 2 วิธี:\n1. ใส่ flex-wrap: wrap ให้ item ขึ้นบรรทัดใหม่\n2. ใส่ overflow: hidden ที่ container เพื่อแก้ปัญหา layout อย่างสมบูรณ์`,
    answer:`**ข้อ 1 จริง · ข้อ 2 มั่ว (แก้ผิดที่)**

1. [REAL] \`flex-wrap: wrap\` ให้ item ล้นขึ้นบรรทัดใหม่ แก้จริง
2. [FAKE] \`overflow: hidden\` **แค่ซ่อน ไม่ได้แก้** — item ที่ล้นถูกตัดหายจากตา ผู้ใช้เห็นแค่ 3 จาก 5 เป็นการกลบปัญหา

ทางแก้จริงอื่น: \`flex-shrink\`, \`flex: 1\`, \`flex-wrap\`

**บทเรียน:** ระวังคำตอบที่ "ทำให้อาการหาย" แต่ไม่แก้เหตุ — แยก "แก้" กับ "ซ่อน"`,
    note:`อย่าเชื่อคำอธิบาย CSS ที่สับสนกฎพื้นฐาน. แนวคิด: เข้าใจ cascade + specificity + box model ก่อน — ปัญหา layout ส่วนใหญ่มาจากสามอย่างนี้`},
   {type:"concept", title:"responsive โดยไม่ใช้ media query เยอะ",
    code:`/* อยากให้ font + การ์ดยืดหดตามจอ โดยไม่เขียน @media หลายๆ breakpoint */`,
    answer:`**ใช้ intrinsic / fluid techniques สมัยใหม่**

1. **\`clamp()\`** สำหรับขนาดที่ยืดหดต่อเนื่อง:
\`\`\`
font-size: clamp(1rem, 2.5vw, 1.5rem);   /* min, ค่ายืด, max */
\`\`\`
2. **grid auto-fit + minmax** สำหรับการ์ดที่จัดคอลัมน์เองตามที่ว่าง:
\`\`\`
display: grid;
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
\`\`\`
การ์ดจะ wrap เองเมื่อจอแคบ โดยไม่ต้องเขียน breakpoint
3. **\`min()\`/\`max()\`** เช่น \`width: min(100%, 600px)\`

**ข้อดี:** โค้ดน้อย ยืดหยุ่นต่อเนื่อง ไม่ต้องเดา breakpoint
**พูด:** "ผมใช้ clamp กับ grid auto-fit minmax ครับ มัน responsive เองโดยไม่ต้องเขียน media query หลายชั้น"`,
    note:`ใช้ \`flex-wrap\`/\`grid auto-fit\`/\`clamp()\` ลด media query. แนวคิด: ออกแบบให้ layout ปรับตัวเอง (intrinsic) ดีกว่า hardcode breakpoint เป็นช่วงๆ`},
   {type:"find", title:"ช่องว่างเกินมาจากไหน",
    code:`.parent { background: red; }
.child  { margin-top: 40px; }
/* parent มีช่องว่างด้านบนโผล่มา ทั้งที่ตั้ง margin ที่ child */`,
    answer:`**1 จุด: margin collapse**

\`margin-top\` ของ child ลูกตัวแรก "ทะลุ" ออกไปนอก parent (collapse กับ margin ของ parent) → ดันทั้ง parent ลงมา แทนที่จะดัน child ในกล่อง

แก้ (อย่างใดอย่างหนึ่ง) — สร้าง BFC หรือกั้น margin:
\`\`\`
.parent { padding-top: 1px; }      /* หรือ */
.parent { overflow: hidden; }      /* สร้าง BFC */
.parent { display: flow-root; }    /* วิธีสะอาดสุด */
\`\`\`
หรือใช้ \`padding\` แทน \`margin\` ที่ child

**หลัก:** ช่องว่างโผล่เกินคาดในแนวตั้ง → สงสัย margin collapse ระหว่าง parent กับ child ตัวแรก/สุดท้าย`,
    note:`ช่องว่างแนวตั้งเกินมักมาจาก margin collapse ระหว่าง parent/child. แนวคิด: vertical margin ของ block ยุบรวมกัน — ต้องรู้จัก BFC`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`.btn { color: blue; }
#submit { color: green; }
/* <button id="submit" class="btn"> → ออกมาสีอะไร? */`,
    ai:`ปุ่มนี้:\n1. จะเป็นสีน้ำเงิน เพราะ class .btn เขียนทีหลังในไฟล์ จึงชนะ\n2. ถ้าอยากให้เป็นเขียวต้องใส่ !important ที่ #submit`,
    answer:`**ทั้ง 2 ข้อ มั่ว**

1. [FAKE] ออกมา **สีเขียว** — \`#submit\` เป็น **id selector** (specificity สูงกว่า class มาก) ชนะ \`.btn\` เสมอ ไม่เกี่ยวกับลำดับในไฟล์ (ลำดับสำคัญแค่เมื่อ specificity **เท่ากัน**)
2. [FAKE] ไม่ต้องใช้ \`!important\` เลย id ชนะ class อยู่แล้ว — \`!important\` เป็นทางเลือกสุดท้ายที่ควรเลี่ยง (ทำให้ override ยากในอนาคต)

**ลำดับ specificity:** inline > id > class/attr/pseudo-class > element
**บทเรียน:** AI สับสนกฎ specificity กับ "ลำดับในไฟล์" — ลำดับสำคัญเฉพาะตอน specificity เท่ากันเท่านั้น`,
    note:`specificity: inline > id > class > element; ลำดับในไฟล์สำคัญเฉพาะเมื่อ specificity เท่ากัน. แนวคิด: cascade ดู specificity ก่อน แล้วค่อยลำดับ — เลี่ยง \`!important\``},
   {type:"find", title:"flex item ล้น แม้ลูกมี overflow-x",
    code:`.layout  { display: flex; }
.content { flex: 1; }
.content pre { overflow-x: auto; }
/* โค้ดบรรทัดยาวใน pre ดันทั้งหน้ากว้างเกินจอ */`,
    answer:`**flex item \`min-width:auto\` → หดต่ำกว่าเนื้อหาไม่ได้ → \`overflow-x\` ไม่ทำงาน**

flex item ค่าเริ่มต้น \`min-width:auto\` = ขนาด **min-content** ของลูก (เช่น \`<pre>\` บรรทัดยาวที่ไม่ตัดคำ) → track ไม่ยอมหด → ดันทั้ง layout กว้างเกินจอ แม้ \`<pre>\` จะตั้ง \`overflow-x:auto\` ไว้

\`\`\`
.content { flex: 1; min-width: 0; }   /* ให้หดได้ → pre ถึงจะ scroll ในตัว */
\`\`\`
(grid เจอแบบเดียวกัน → ใช้ \`grid-template-columns: minmax(0, 1fr)\`)

**หลัก:** flex/grid item ที่มีลูกกว้าง (pre/table/ข้อความยาว) → \`min-width:0\` / \`minmax(0,1fr)\` ให้ scroll ภายในทำงาน`,
    note:`flex/grid item \`min-width:auto\` = min-content → ใส่ \`min-width:0\` / \`minmax(0,1fr)\` ให้ลูก scroll ได้. แนวคิด: track sizing พึ่ง min-content โดย default ทำให้เนื้อหากว้าง (pre/table) ล้น`},
   {type:"find", title:"margin-top ของลูกดัน parent ทั้งกล่อง",
    code:`.parent { background: #eee; }
.child  { margin-top: 40px; }
/* parent ขยับลงทั้งก้อน ไม่ใช่ child เลื่อนในกล่อง? */`,
    answer:`**margin collapse — margin-top ของ child แรกทะลุออกไปดัน parent**

ถ้า parent ไม่มี \`border\`/\`padding\`/\`overflow\` คั่นด้านบน → margin-top ของ child ตัวแรก "ยุบรวม" กับ parent → ทั้งกล่องเลื่อนลง 40px ไม่ใช่ระยะภายใน

แก้ (อย่างใดอย่างหนึ่ง — สร้าง BFC หรือมีตัวคั่น):
\`\`\`
.parent { display: flow-root; }   /* สะอาดสุด */
.parent { overflow: hidden; }     /* หรือสร้าง BFC */
.parent { padding-top: 1px; }     /* หรือมี border/padding คั่น */
/* หรือใช้ padding-top บน child แทน margin */
\`\`\`
**หลัก:** vertical margin ของ block ยุบรวมกัน · กั้นด้วย BFC (\`flow-root\`/\`overflow\`) หรือ padding/border`,
    note:`กั้น margin collapse ด้วย BFC (\`flow-root\`/\`overflow\`) หรือ padding/border. แนวคิด: margin collapse เป็น behavior ตั้งใจของ flow layout — ควบคุมด้วยการสร้าง BFC`}
  ]
}
);
