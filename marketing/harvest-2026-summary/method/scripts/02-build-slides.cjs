const fs = require("fs")
const path = require("path")

const OUT = "C:/Users/Itai Munitz/.claude/projects/C--Users-Itai-Munitz/PROJECTS-MAIN/Hellow/marketing/harvest-2026-summary/v2"
fs.mkdirSync(OUT, { recursive: true })

// leaf file index -> variety (matches the generation order)
const V = {
  cs: { name: "קברנה סוביניון", leaf: 0, kg: 3287, first: "3.9" },
  sh: { name: "שיראז", leaf: 1, kg: 2525, first: "16.9" },
  cf: { name: "קברנה פרנק", leaf: 2, kg: 2257, first: "3.9" },
  me: { name: "מרלו", leaf: 3, kg: 2156, first: "19.8" },
  pv: { name: "פטי ורדו", leaf: 4, kg: 1831, first: "7.10" },
  mo: { name: "מורבדר", leaf: 5, kg: 1788, first: "3.9" },
  ar: { name: "ארגמן", leaf: 6, kg: 1342, first: "3.9" },
  ma: { name: "מלבק", leaf: 7, kg: 1212, first: "10.9" },
  co: { name: "קולומברד", leaf: 8, kg: 915, first: "26.8" },
  ch: { name: "שאנין בלאן", leaf: 9, kg: 877, first: "26.8" },
  vi: { name: "ויונייה", leaf: 10, kg: 588, first: "27.8" },
  ps: { name: "פטיט סירה", leaf: 11, kg: 1179, first: "20.8" },
  mr: { name: "מרסלן", leaf: 12, kg: 870, first: "17.9" },
  ca: { name: "קריניאן", leaf: 13, kg: 1451, first: "1.10" },
  bi: { name: "ביתוני", leaf: 14, kg: 592, first: "7.10" },
  ta: { name: "טנט", leaf: 15, kg: 1363, first: "14.10" },
  sa: { name: "סנסאו", leaf: 16, kg: 338, first: "16.9" },
}

const fmt = (n) => n.toLocaleString("en-US")
const leafSrc = (v) => `../assets/leaves/leaf_${String(v.leaf).padStart(2, "0")}.png`
// a leaf resting on a soft cream plate
const disc = (v, d) =>
  `<div class="disc" style="width:${d}px;height:${d}px"><img class="leaf" src="${leafSrc(v)}" alt="${v.name}" style="width:${Math.round(d * 0.9)}px;height:${Math.round(d * 0.9)}px"></div>`

const FOOTER = `<div class="frule"></div><div class="footer">יקב מוניץ - יקב בוטיק משפחתי</div>`

const NOISE = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .25  0 0 0 0 .15  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)

const BASE_CSS = `
@font-face{font-family:DL;font-weight:400;src:url(../assets/fonts/DavidLibre-Regular.ttf)}
@font-face{font-family:DL;font-weight:500;src:url(../assets/fonts/DavidLibre-Medium.ttf)}
@font-face{font-family:DL;font-weight:700;src:url(../assets/fonts/DavidLibre-Bold.ttf)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;background:#FBE3CB}
body{font-family:DL,"David Libre",serif;color:#000;direction:rtl;overflow:hidden}
.slide{position:relative;width:1080px;height:1350px;overflow:hidden;
  background:radial-gradient(ellipse 90% 70% at 50% 10%,#FFF5DC 0%,#FDE7CE 48%,#F8CDB2 100%)}
.slide::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.22;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,${NOISE}")}
.logo{position:absolute;top:46px;left:50%;transform:translateX(-50%);height:176px}
.leaf{display:block;object-fit:contain;mix-blend-mode:multiply;filter:url(#ink)}
.disc{border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;
  background:radial-gradient(circle at 50% 42%,#FFFBF1 0%,#FFF1DA 100%);box-shadow:0 12px 26px rgba(160,70,40,.16),inset 0 0 0 2px rgba(255,255,255,.7)}
.frule{position:absolute;left:80px;right:80px;bottom:124px;height:2px;background:rgba(196,20,63,.4)}
.footer{position:absolute;left:0;right:0;bottom:50px;text-align:center;font-size:36px;font-weight:500;letter-spacing:.01em}
.red{color:#C4143F}
.title{position:absolute;top:252px;right:80px;left:80px;font-size:78px;font-weight:700;line-height:1.05;text-align:right}
.sub{position:absolute;top:348px;right:80px;left:80px;font-size:34px;color:#6b3f35}
.it{display:flex;flex-direction:column;align-items:center;text-align:center}
.it .n{font-weight:700;line-height:1.05;margin-top:12px}
.it .k{color:#C4143F;font-weight:500;margin-top:2px}
`

const page = (css, body) =>
  `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>${BASE_CSS}${css}</style></head><body><svg width="0" height="0" style="position:absolute"><filter id="ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues="0 0.02 0.05 0.10 0.17 0.27 0.40 0.57 0.78 1 1"/><feFuncG type="table" tableValues="0 0.02 0.05 0.10 0.17 0.27 0.40 0.57 0.78 1 1"/><feFuncB type="table" tableValues="0 0.02 0.05 0.10 0.17 0.27 0.40 0.57 0.78 1 1"/></feComponentTransfer></filter></svg><div class="slide">${body}${FOOTER}</div></body></html>`
const LOGO = `<img class="logo" src="../assets/logo.png" alt="MUNITZ boutique winery">`

// ---------- 1: cover ----------
const s1 = page(
  `
.kicker{position:absolute;top:250px;left:0;right:0;text-align:center;font-size:36px;color:#6b3f35}
.big{position:absolute;top:298px;left:0;right:0;text-align:center;font-size:232px;font-weight:700;line-height:1;letter-spacing:-.02em}
.rule{position:absolute;top:560px;left:50%;width:120px;height:6px;margin-left:-60px;background:#C4143F;border-radius:3px}
.stats{position:absolute;top:606px;left:80px;right:80px;display:flex;justify-content:space-between;text-align:center}
.stat b{display:block;font-size:88px;font-weight:700;line-height:1}
.stat span{display:block;margin-top:8px;font-size:32px;color:#6b3f35}
.pt{position:absolute;top:782px;width:330px;text-align:center}
.pt.first{right:96px}.pt.last{left:96px}
.pt .lbl{font-size:28px;color:#6b3f35;margin-bottom:12px}
.pt .disc{margin:0 auto}
.pt .nm{font-size:52px;font-weight:700;margin-top:14px;line-height:1}
.pt .dt{font-size:32px;color:#C4143F;font-weight:500;margin-top:4px}
.bridge{position:absolute;top:935px;left:430px;right:430px;text-align:center;font-size:30px;color:#6b3f35}
.bridge i{display:block;border-top:3px dashed #C4143F;margin-bottom:12px}
`,
  `${LOGO}
  <div class="kicker">סיכום העונה בכרמים, נכון ל-19.10</div>
  <div class="big">בציר 2026</div>
  <div class="rule"></div>
  <div class="stats">
    <div class="stat"><b>24.6</b><span>טון ענבים</span></div>
    <div class="stat"><b>17</b><span>זנים</span></div>
    <div class="stat"><b>25</b><span>משלוחים מהכרמים</span></div>
  </div>
  <div class="pt first"><div class="lbl">הזן הראשון</div>${disc(V.me, 250)}<div class="nm">${V.me.name}</div><div class="dt">19.8</div></div>
  <div class="bridge"><i></i>שמונה שבועות</div>
  <div class="pt last"><div class="lbl">הזן האחרון עד עכשיו</div>${disc(V.ta, 250)}<div class="nm">${V.ta.name}</div><div class="dt">14.10</div></div>`
)

// ---------- 2 and 3: leaves sized by quantity ----------
function flow(rows, dOf, nameSize, kgSize, gapRow, gapCol) {
  return `<div class="flow" style="gap:${gapRow}px">${rows
    .map(
      (r) =>
        `<div class="frow" style="gap:${gapCol}px">${r
          .map((v) => {
            const d = dOf(v)
            return `<div class="it" style="width:${Math.max(d, 170)}px">${disc(v, d)}<div class="n" style="font-size:${nameSize}px">${v.name}</div><div class="k" style="font-size:${kgSize}px">${fmt(v.kg)} ק״ג</div></div>`
          })
          .join("")}</div>`
    )
    .join("")}</div>`
}
const FLOW_CSS = `.flow{position:absolute;top:410px;bottom:150px;right:70px;left:70px;display:flex;flex-direction:column;justify-content:center}
.frow{display:flex;justify-content:center;align-items:flex-end}
.tot{position:absolute;left:80px;right:80px;bottom:140px;text-align:center;font-size:32px;color:#6b3f35}
.tot b{color:#000}`
const s2 = page(
  FLOW_CSS,
  `${LOGO}
  <div class="title">שמונת הזנים הגדולים</div>
  <div class="sub">גודל העלה לפי כמות הענבים שנכנסה ליקב</div>
  ${flow([[V.cs, V.sh, V.cf, V.me], [V.pv, V.mo, V.ca, V.ta]], (v) => Math.round(100 + (v.kg / 3287) * 140), 34, 30, 40, 22)}`
)
const s3 = page(
  FLOW_CSS,
  `${LOGO}
  <div class="title">ותשעה זנים נוספים</div>
  <div class="sub">גם כאן, גודל העלה לפי הכמות</div>
  ${flow([[V.ar, V.ma, V.ps], [V.co, V.ch, V.mr], [V.bi, V.vi, V.sa]], (v) => Math.round(110 + (v.kg / 1342) * 85), 32, 28, 22, 40)}`
)

// ---------- 4: months ----------
const months = [
  { m: "אוגוסט", kg: 5715, n: 6, vs: [V.me, V.ps, V.ch, V.co, V.vi], range: "19.8 - 27.8" },
  { m: "ספטמבר", kg: 11137, n: 13, vs: [V.cs, V.cf, V.mo, V.ar, V.ma, V.sh, V.mr, V.sa], range: "3.9 - 22.9" },
  { m: "אוקטובר", kg: 7719, n: 6, vs: [V.sh, V.ca, V.bi, V.pv, V.ta], range: "1.10 - 14.10" },
]
const bands = months
  .map(
    (b) => `<div class="card">
    <div class="mb"><div class="mn">${b.m}</div><div class="mk">${fmt(b.kg)} <small>ק״ג</small></div><div class="md">${b.n} משלוחים, ${b.range}</div></div>
    <div class="vl" style="max-width:${b.vs.length > 5 ? 480 : 640}px">${b.vs.map((v) => `<div class="vi">${disc(v, 96)}<span>${v.name}</span></div>`).join("")}</div>
  </div>`
  )
  .join("")
const s4 = page(
  `
.cards{position:absolute;top:410px;right:70px;left:70px;display:flex;flex-direction:column;gap:18px}
.card{display:flex;align-items:center;background:rgba(255,255,255,.5);border-radius:38px;padding:18px 26px;box-shadow:0 8px 20px rgba(160,70,40,.1)}
.mb{width:250px;flex:none}
.mn{font-size:58px;font-weight:700;line-height:1}
.mk{font-size:46px;font-weight:700;color:#C4143F;margin-top:6px;line-height:1.1}
.mk small{font-size:26px;font-weight:400;color:#6b3f35}
.md{font-size:25px;color:#6b3f35;margin-top:6px;line-height:1.2}
.vl{flex:1;display:flex;flex-wrap:wrap;gap:6px 4px}
.vi{width:114px;text-align:center;display:flex;flex-direction:column;align-items:center}
.vi span{font-size:23px;font-weight:500;line-height:1.05;margin-top:6px}
`,
  `${LOGO}
  <div class="title">הבציר חודש אחר חודש</div>
  <div class="sub">ב-3.9 נכנסו 5,066 ק״ג, היום העמוס של העונה</div>
  <div class="cards">${bands}</div>`
)

// ---------- 5: all seventeen ----------
const chron = [V.me, V.ps, V.ch, V.co, V.vi, V.cs, V.cf, V.mo, V.ar, V.ma, V.sh, V.sa, V.mr, V.ca, V.bi, V.pv, V.ta]
const cells = chron
  .map((v) => `<div class="cell">${disc(v, 138)}<div class="cn">${v.name}</div><div class="cd">${v.first}</div></div>`)
  .join("")
const s5 = page(
  `
.grid{position:absolute;top:410px;right:46px;left:46px;display:grid;grid-template-columns:repeat(6,1fr);row-gap:22px}
.cell{display:flex;flex-direction:column;align-items:center;text-align:center}
.cn{font-size:25px;font-weight:700;line-height:1.1;white-space:nowrap;margin-top:8px}
.cd{font-size:25px;color:#C4143F;font-weight:500;margin-top:2px}
.disc.u img{height:92px;width:auto;mix-blend-mode:normal}
.close{position:absolute;left:80px;right:80px;bottom:160px;text-align:center;font-size:36px;line-height:1.3}
.close b{display:block;margin-top:6px;font-weight:700}
`,
  `${LOGO}
  <div class="title">כל זני הבציר</div>
  <div class="sub">לפי סדר ההגעה לכרם, עם תאריך המשלוח הראשון</div>
  <div class="grid">${cells}<div class="cell"><div class="disc u" style="width:138px;height:138px"><img src="../assets/icon-u.png" alt=""></div></div></div>
  <div class="close">מה לדעתכם, איזה זן יפתיע אותנו בחבית?<b>לחיי יין ישראלי 🍷</b></div>`
)

const files = { "slide-1-cover": s1, "slide-2-top-varieties": s2, "slide-3-other-varieties": s3, "slide-4-by-month": s4, "slide-5-all-varieties": s5 }
for (const [name, html] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name + ".html"), html, "utf8")
console.log("wrote", Object.keys(files).length)
