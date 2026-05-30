DATA.push(
{
  group:"Frontend", cat:"react", title:"React",
  desc:"re-render, hooks, stale state, key, memory leak, derived state, useMemo — โดนถามบ่อยสุดฝั่ง FE",
  problems:[
   {type:"find", title:"useEffect fetch",
    code:`function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  });
  return users.map(u => <li>{u.name}</li>);
}`,
    answer:`**3 จุด**

1. **ไม่มี dependency array** → fetch ทุก render เป็น loop ใส่ \`[]\`
2. **ขาด key** → \`key={u.id}\`
3. **return array ดิบ** → ห่อ \`<ul>...</ul>\`

\`\`\`
useEffect(() => { fetch('/api/users').then(r=>r.json()).then(setUsers); }, []);
return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
\`\`\`
**หลัก:** useEffect → เช็ค deps array · .map ใน JSX → เช็ค key`,
    note:`ใส่ dependency + cleanup กัน race + \`key\` ใน list. แนวคิด: effect คือการ sync กับภายนอก → ต้องบอก React ว่าขึ้นกับอะไร และเก็บกวาดเมื่อเปลี่ยน/unmount`},
   {type:"find", title:"นับเลขใน effect",
    code:`function Timer() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setInterval(() => setCount(count + 1), 1000);
  }, []);
  return <div>{count}</div>;
}`,
    answer:`**2 จุด**

1. **Stale closure** — \`count\` จับค่าตอน mount (0) ค้างที่ 1 ใช้ functional update: \`setCount(c => c + 1)\`
2. **Memory leak** — ไม่ clear interval ตอน unmount

\`\`\`
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
\`\`\`
**หลัก:** setInterval/timeout/listener/subscribe ใน effect → return cleanup เสมอ`,
    note:`stale closure — ใช้ functional update \`setCount(c => c+1)\` + clear interval ตอน cleanup. แนวคิด: closure จับค่า ณ render นั้น; state update ที่พึ่งค่าเดิมต้องใช้ updater form`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`function Profile({ userId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetchUser(userId).then(setData);
  }, [userId]);
  return <div>{data?.name}</div>;
}`,
    ai:`โค้ดนี้มีปัญหา 3 จุด:\n1. dependency array ผิด ควรเอา userId ออกเพราะทำให้ re-fetch\n2. มี race condition ถ้า userId เปลี่ยนเร็วๆ response เก่าอาจมาทับใหม่\n3. ควรใช้ class component แทนเพราะ hooks ช้ากว่า`,
    answer:`**ข้อ 2 จริง · ข้อ 1, 3 มั่ว**

1. [FAKE] \`[userId]\` ถูกแล้ว ต้องมีเพื่อ re-fetch เมื่อ user เปลี่ยน เอาออก = บั๊ก (โชว์คนเก่า)
2. [REAL] race จริง — A→B เร็วๆ response A กลับช้ากว่าแล้วทับ B แก้ด้วย cleanup flag:
\`\`\`
let active = true;
fetchUser(userId).then(d => { if (active) setData(d); });
return () => { active = false; };
\`\`\`
3. [FAKE] "class เร็วกว่า hooks" ไม่จริง

**บทเรียน:** ข้อ 2 subtle มาก — อย่าปฏิเสธหมดเพราะอีก 2 ข้อมั่ว`,
    note:`อย่ายอมรับคำแนะนำ React โดยไม่คิด. แนวคิด: เข้าใจ render/commit model ก่อน — หลายคำแนะนำ "เพื่อ performance" ทำให้แย่ลง`},
   {type:"find", title:"render list กรองในตัว",
    code:`function List({ items }) {
  const sorted = items.sort((a, b) => a.val - b.val);
  return <ul>{sorted.map((x, i) => <li key={i}>{x.val}</li>)}</ul>;
}`,
    answer:`**2 จุด**

1. **\`.sort()\` mutate prop** — \`Array.sort\` เรียงในที่ → แก้ prop \`items\` ตรงๆ ก็อปก่อน: \`[...items].sort(...)\`
2. **key={i}** — index เป็น key ตอน list เรียง/เพิ่ม/ลบ → React จับคู่ผิด ใช้ \`key={x.id}\`

**หลัก:** \`.sort()\`/\`.reverse()\` mutate ต้น ก็อปก่อนใน React · key ห้ามใช้ index ถ้าลำดับเปลี่ยนได้`,
    note:`อย่า mutate/\`sort\` ของเดิมใน render (\`sort\` mutate array) + key เสถียร. แนวคิด: render ต้อง pure — ห้ามมี side effect ต่อ props/state`},
   {type:"find", title:"copy prop เข้า state",
    code:`function Price({ amount }) {
  const [display, setDisplay] = useState(amount);
  return <span>{display}</span>;
}
// parent เปลี่ยน amount แต่ display ไม่อัปเดต`,
    answer:`**1 จุด: เก็บ prop ลง state (derived state anti-pattern)**

\`useState(amount)\` ใช้ \`amount\` แค่ค่าเริ่มต้นตอน mount **ครั้งเดียว** พอ parent เปลี่ยน \`amount\` → \`display\` ไม่อัปเดตตาม (state ไม่ re-init)

แก้: ถ้าค่ามาจาก prop ตรงๆ **อย่าเก็บลง state** ใช้ prop เลย
\`\`\`
function Price({ amount }) {
  return <span>{amount}</span>;
}
\`\`\`
ถ้าต้องแปลงค่า → คำนวณตอน render หรือ \`useMemo\` ไม่ใช่เก็บ state

**หลัก:** "เก็บ prop ลง state" = ธงแดง ค่าจะค้างไม่ sync — derive จาก prop ตรงๆ`,
    note:`อย่า copy prop เข้า state — derive ตรงๆ ไม่งั้นค่าค้างไม่ sync. แนวคิด: single source of truth; state ที่ derive ได้ไม่ควรเก็บซ้ำ`},
   {type:"judge", title:"ตัดสินคำตอบ AI",
    code:`function Item({ name }) {
  const handleClick = useCallback(() => {
    console.log(name);
  }, [name]);
  return <button onClick={handleClick}>{name}</button>;
}`,
    ai:`โค้ดนี้มีปัญหา 2 จุด:\n1. ควรห่อทุก function ด้วย useCallback เสมอเพื่อ performance\n2. ต้องใส่ useMemo ครอบ name ด้วยไม่งั้น re-render ทุกครั้ง`,
    answer:`**ทั้ง 2 ข้อ มั่ว/over-engineer**

1. [FAKE] **ไม่ควรห่อทุก function ด้วย useCallback** — มันมีต้นทุน (จำ dependency, เทียบทุก render) ถ้าไม่ได้ส่งลง child ที่ memo ไว้ หรือไม่ใช่ dep ของ effect → useCallback เปล่าประโยชน์ ในเคสนี้ button ธรรมดาจะไม่ใช้ก็ได้
2. [FAKE] \`name\` เป็น string (primitive) — useMemo ครอบ primitive ไม่มีประโยชน์ useMemo ไว้ memo "ผลการคำนวณหนัก" หรือ "object/array reference" ไม่ใช่ string

**บทเรียน:** AI ชอบแนะนำ useCallback/useMemo พร่ำเพรื่อว่า "เพื่อ performance" จริงๆ ใส่มั่วทำให้ช้า+โค้ดรก ใช้เมื่อมีเหตุผลจริง (ส่งลง memoized child, dep ของ effect, คำนวณหนัก) เท่านั้น`,
    note:`\`useCallback\`/\`useMemo\` ใช้เมื่อมีเหตุผล (ส่งลง memoized child, เป็น dep, คำนวณหนัก) ไม่ใช่พร่ำเพรื่อ. แนวคิด: optimization มีต้นทุน — วัดก่อนใส่`},
   {type:"find", title:"key={index} ใน list ที่ลบ/เรียงได้",
    code:`{items.map((item, i) => (
  <input key={i} defaultValue={item.name} />
))}
// ลบ item ตัวแรก → ค่าใน input เลื่อนผิดตัว`,
    answer:`**\`key={index}\` กับ list ที่ลบ/แทรก/เรียง → state ผูกผิด element**

React ใช้ key จับคู่ element ข้าม render · index ไม่ใช่ identity ของข้อมูล — ลบตัวแรก index ทุกตัวเลื่อน → React reuse DOM/state เดิมผิดตัว (ค่าใน \`<input>\`, focus, component state เพี้ยน)

\`\`\`
{items.map(item => (
  <input key={item.id} defaultValue={item.name} />
))}
\`\`\`
\`index\` พอใช้ได้เฉพาะ list ที่ static — ไม่ลบ/ไม่เรียง/ไม่แทรก

**หลัก:** \`key\` = identity ของข้อมูล (id ที่เสถียร) ไม่ใช่ตำแหน่ง (index)`,
    note:`\`key\` = identity ของข้อมูล (id) ไม่ใช่ตำแหน่ง (index). แนวคิด: React reconcile ด้วย key; key ที่เลื่อนตามตำแหน่งทำให้ state/DOM ผูกผิด element`},
   {type:"find", title:"useEffect ขาด dependency",
    code:`function Search({ query }) {
  const [results, setResults] = useState([]);
  useEffect(() => {
    fetchResults(query).then(setResults);
  }, []);   // []
  return <List items={results} />;
}`,
    answer:`**\`[]\` → effect รันครั้งเดียวตอน mount ไม่ตามเมื่อ \`query\` เปลี่ยน**

ค้นด้วย \`query\` แรกแล้วค้าง · พิมพ์ค้นใหม่ก็ไม่ re-fetch → ผลลัพธ์ไม่อัปเดต (stale)

\`\`\`
useEffect(() => {
  let active = true;
  fetchResults(query).then(r => { if (active) setResults(r); });
  return () => { active = false; };   // กัน race ของ response เก่า
}, [query]);
\`\`\`
**หลัก:** ใส่ทุกค่าที่ effect อ่านลง dep array (lint \`react-hooks/exhaustive-deps\`) + cleanup กัน response มาสลับลำดับ`,
    note:`ใส่ทุกค่าที่ effect อ่านลง dep array + cleanup. แนวคิด: dep array คือ contract บอกว่าเมื่อไรต้อง sync ใหม่ — ขาด = stale, ผิด = re-run/ race`}
  ]
}
);
