const fs = require("fs")
const path = require("path")

const OUT = "C:/Users/Itai Munitz/.claude/projects/C--Users-Itai-Munitz/PROJECTS-MAIN/Hellow/marketing/harvest-2026-summary/video"
fs.mkdirSync(OUT, { recursive: true })

const LEAF = { me: 3, cs: 0, sh: 1, ca: 13, ta: 15 }
const leafDisc = (idx, name, d) =>
  `<div class="lv"><div class="disc" style="width:${d}px;height:${d}px"><img class="leaf" src="../assets/leaves/leaf_${String(idx).padStart(2, "0")}.png" style="width:${Math.round(d * 0.9)}px;height:${Math.round(d * 0.9)}px"></div><span>${name}</span></div>`

const INK = `<svg width="0" height="0" style="position:absolute"><filter id="ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="table" tableValues="0 0.02 0.05 0.10 0.17 0.27 0.40 0.57 0.78 1 1"/><feFuncG type="table" tableValues="0 0.02 0.05 0.10 0.17 0.27 0.40 0.57 0.78 1 1"/><feFuncB type="table" tableValues="0 0.02 0.05 0.10 0.17 0.27 0.40 0.57 0.78 1 1"/></feComponentTransfer></filter></svg>`

const CSS = `
@font-face{font-family:DL;font-weight:400;src:url(../assets/fonts/DavidLibre-Regular.ttf)}
@font-face{font-family:DL;font-weight:500;src:url(../assets/fonts/DavidLibre-Medium.ttf)}
@font-face{font-family:DL;font-weight:700;src:url(../assets/fonts/DavidLibre-Bold.ttf)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;background:transparent}
body{font-family:DL,serif;direction:rtl;color:#fff;overflow:hidden;position:relative}
.scrim{position:absolute;left:0;right:0;bottom:0;height:1000px;background:linear-gradient(to top,rgba(40,14,8,.78) 0%,rgba(40,14,8,.5) 45%,rgba(40,14,8,0) 100%)}
.top{position:absolute;left:0;right:0;top:0;height:420px;background:linear-gradient(to bottom,rgba(40,14,8,.35),rgba(40,14,8,0))}
.logo{position:absolute;top:170px;left:50%;transform:translateX(-50%);background:rgba(255,244,224,.94);border-radius:44px;padding:20px 44px 16px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.logo img{display:block;height:128px}
.blk{position:absolute;left:60px;right:60px;text-align:center;text-shadow:0 4px 22px rgba(0,0,0,.55)}
.k{font-size:80px;font-weight:700;color:#FFE38F}
.big{font-weight:700;line-height:1;color:#FFE38F}
.lab{font-weight:700;line-height:1.05}
.sub{font-size:58px;font-weight:500;margin-top:14px}
.rule{width:130px;height:7px;border-radius:4px;background:#F69A84;margin:26px auto 0}
.leaf{display:block;object-fit:contain;mix-blend-mode:multiply;filter:url(#ink)}
.disc{border-radius:50%;isolation:isolate;overflow:hidden;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 42%,#FFFBF1 0%,#FFF1DA 100%);box-shadow:0 10px 24px rgba(0,0,0,.35)}
.row{display:flex;justify-content:center;gap:26px;margin-top:40px}
.lv{display:flex;flex-direction:column;align-items:center;width:160px}
.lv span{font-size:34px;font-weight:700;margin-top:10px;line-height:1.05;text-shadow:0 3px 14px rgba(0,0,0,.6)}
`
const wrap = (body, extra = "") => `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>${CSS}${extra}</style></head><body>${INK}${body}</body></html>`
const LOGO = `<div class="logo"><img src="../assets/logo.png" alt=""></div>`

const o0 = wrap(`<div class="top"></div><div class="scrim"></div>${LOGO}
<div class="blk" style="top:1060px"><div class="k">סיכום העונה בכרמים</div><div class="big" style="font-size:270px;margin-top:6px;color:#fff">בציר 2026</div><div class="rule"></div><div class="sub">נכון ל-19.10</div></div>`)

const stat = (num, label, sub, top) =>
  wrap(`<div class="scrim"></div><div class="blk" style="top:${top}px"><div class="big" style="font-size:330px">${num}</div><div class="lab" style="font-size:96px">${label}</div><div class="rule"></div><div class="sub">${sub}</div></div>`)
const o1 = stat("24.6", "טון ענבים", "<b style=\"font-weight:700;font-size:70px\">נבצרו ונקלטו ביקב</b>", 990)
const o2 = stat("25", "משלוחים מהכרמים", "מ-19.8 ועד 14.10", 1010)

const o3 = wrap(`<div class="scrim"></div><div class="blk" style="top:880px"><div class="big" style="font-size:270px">17</div><div class="lab" style="font-size:96px">זנים</div></div>`)
const GROUPS = [
  [[3, "מרלו"], [0, "קברנה סוביניון"], [1, "שיראז"], [13, "קריניאן"], [15, "טנט"]],
  [[2, "קברנה פרנק"], [4, "פטי ורדו"], [5, "מורבדר"], [6, "ארגמן"]],
  [[7, "מלבק"], [11, "פטיט סירה"], [8, "קולומברד"], [9, "שאנין בלאן"]],
  [[12, "מרסלן"], [14, "ביתוני"], [10, "ויונייה"], [16, "סנסאו"]],
]
const groupHtml = GROUPS.map((g) => wrap(`<div class="row" style="position:absolute;top:1290px;left:60px;right:60px;margin:0">${g.map(([i, n]) => leafDisc(i, n, 150)).join("")}</div>`))

// end card, opaque
const end = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>${CSS}
html,body{background:radial-gradient(ellipse 90% 70% at 50% 25%,#FFF5DC 0%,#FDE7CE 48%,#F8CDB2 100%)}
body{color:#000}
.c{position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;text-align:center}
.c img{width:700px;display:block}
.c .r{width:140px;height:7px;border-radius:4px;background:#C4143F;margin:60px 0 50px}
.c .y{font-size:150px;font-weight:700;line-height:1}
.c .t{font-size:56px;font-weight:500;margin-top:40px}
.c .z{font-size:60px;font-weight:700;margin-top:30px}
</style></head><body><div class="c"><img src="../assets/logo.png" alt=""><div class="r"></div><div class="y">בציר 2026</div><div class="t">יקב מוניץ - יקב בוטיק משפחתי</div><div class="z">לחיי יין ישראלי 🍷</div></div></body></html>`

const files = { "ov0-cover": o0, "ov1-tons": o1, "ov2-deliveries": o2, "ov3-static": o3, "ov3g0": groupHtml[0], "ov3g1": groupHtml[1], "ov3g2": groupHtml[2], "ov3g3": groupHtml[3], "end-card": end }
for (const [n, h] of Object.entries(files)) fs.writeFileSync(path.join(OUT, n + ".html"), h, "utf8")
console.log("wrote", Object.keys(files).length)
