import { writeFileSync } from 'fs'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = process.env.GA_PROPERTY_ID
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS
const client = new BetaAnalyticsDataClient({ keyFilename: keyFilePath })

const startArg = process.argv.find((a) => a.startsWith('--start='))
const endArg = process.argv.find((a) => a.startsWith('--end='))
const startDate = startArg ? startArg.split('=')[1] : '7daysAgo'
const endDate = endArg ? endArg.split('=')[1] : 'today'

const dateRanges = [{ startDate, endDate }]

function basePath(path) {
  return path.split('?')[0]
}

async function runReport(request) {
  const [response] = await client.runReport({ property: `properties/${propertyId}`, dateRanges, ...request })
  return response
}

function rowsOf(response) {
  const dimNames = response.dimensionHeaders?.map((h) => h.name) ?? []
  const metricNames = response.metricHeaders?.map((h) => h.name) ?? []
  return (response.rows ?? []).map((row) => {
    const dims = {}
    const mets = {}
    row.dimensionValues?.forEach((v, i) => (dims[dimNames[i]] = v.value))
    row.metricValues?.forEach((v, i) => (mets[metricNames[i]] = Number(v.value)))
    return { ...dims, ...mets }
  })
}

function bar(widthPct, label, value) {
  return `
    <div class="bar-list-row">
      <div class="bar-list-label">${label}</div>
      <div class="bar-list-track"><div class="bar-list-fill" style="width: ${widthPct}%;"></div></div>
      <div class="bar-list-value">${value}</div>
    </div>`
}

function funnelStep(label, value, maxValue, dropFromPrev) {
  const widthPct = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 2 : 0) : 0
  const dropHtml = dropFromPrev != null
    ? `<div class="funnel-drop">ירידה של ${dropFromPrev}% מהשלב הקודם</div>`
    : ''
  return `
    <div class="funnel-step">
      <div class="funnel-bar-row">
        <div class="funnel-label">${label}</div>
        <div class="funnel-bar-track">
          <div class="funnel-bar-fill" style="width: ${widthPct}%;">${value}</div>
        </div>
      </div>
      ${dropHtml}
    </div>`
}

function pct(from, to) {
  if (!from) return 0
  return Math.round((1 - to / from) * 100)
}

async function main() {
  const overviewRows = rowsOf(await runReport({
    metrics: [
      { name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' },
      { name: 'averageSessionDuration' }, { name: 'bounceRate' },
    ],
  }))
  const ov = overviewRows[0] ?? {}
  const avgDurationMin = Math.floor((ov.averageSessionDuration ?? 0) / 60)
  const avgDurationSec = Math.round((ov.averageSessionDuration ?? 0) % 60)

  const sourceRows = rowsOf(await runReport({
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  }))
  const maxSource = Math.max(...sourceRows.map((r) => r.sessions), 1)

  const deviceRows = rowsOf(await runReport({
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  }))
  const maxDevice = Math.max(...deviceRows.map((r) => r.sessions), 1)

  const pageRows = rowsOf(await runReport({
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 200,
  }))

  const productPages = new Map()
  for (const row of pageRows) {
    const path = basePath(row.pagePath)
    if (!path.startsWith('/product/')) continue
    const existing = productPages.get(path) ?? { sessions: 0, activeUsers: 0 }
    existing.sessions += row.sessions
    existing.activeUsers += row.activeUsers
    productPages.set(path, existing)
  }

  const funnelEventRows = rowsOf(await runReport({
    dimensions: [{ name: 'landingPagePlusQueryString' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: { fieldName: 'eventName', inListFilter: { values: ['add_to_cart', 'begin_checkout', 'purchase'] } },
    },
    limit: 500,
  }))

  const funnelByPage = new Map()
  for (const row of funnelEventRows) {
    const path = basePath(row.landingPagePlusQueryString)
    if (!productPages.has(path)) continue
    const existing = funnelByPage.get(path) ?? { add_to_cart: 0, begin_checkout: 0, purchase: 0 }
    existing[row.eventName] = (existing[row.eventName] ?? 0) + row.eventCount
    funnelByPage.set(path, existing)
  }

  const activePages = [...productPages.entries()].sort((a, b) => b[1].sessions - a[1].sessions)
  const FEATURED_COUNT = 5
  const featuredPages = activePages.slice(0, FEATURED_COUNT)
  const otherPages = activePages.slice(FEATURED_COUNT)

  const funnelSectionsHtml = featuredPages.map(([path, stats]) => {
    const funnel = funnelByPage.get(path) ?? { add_to_cart: 0, begin_checkout: 0, purchase: 0 }
    const visits = stats.activeUsers
    return `
    <div class="card">
      <h2>משפך המרה — ${path}</h2>
      ${funnelStep('נכנסו לעמוד', visits, visits)}
      ${funnelStep('הוסיפו לעגלה', funnel.add_to_cart, visits, pct(visits, funnel.add_to_cart))}
      ${funnelStep('התחילו תשלום', funnel.begin_checkout, visits, pct(funnel.add_to_cart, funnel.begin_checkout))}
      ${funnelStep('השלימו רכישה', funnel.purchase, visits, pct(funnel.begin_checkout, funnel.purchase))}
    </div>`
  }).join('\n')

  const otherPagesHtml = otherPages.length === 0 ? '' : `
  <div class="card">
    <h2>עמודי מוצר נוספים עם תנועה מצומצמת</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <tr style="text-align: right; color: #7a6f6a;">
        <th style="padding: 6px 0;">עמוד</th><th>ביקורים</th><th>הוספה לעגלה</th><th>תחילת תשלום</th><th>רכישה</th>
      </tr>
      ${otherPages.map(([path, stats]) => {
        const f = funnelByPage.get(path) ?? { add_to_cart: 0, begin_checkout: 0, purchase: 0 }
        return `<tr style="border-top: 1px solid #eee;"><td style="padding: 6px 0;">${path}</td><td>${stats.activeUsers}</td><td>${f.add_to_cart}</td><td>${f.begin_checkout}</td><td>${f.purchase}</td></tr>`
      }).join('\n')}
    </table>
  </div>`

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<title>דשבורד אנליטיקס — ${startDate} עד ${endDate}</title>
<style>
  :root { --wine-dark: #4a1024; --wine: #6d1a35; --gold: #c9a04a; --gold-light: #e0c27a; --stone: #f7f4f0; --text: #2c2220; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; background: var(--stone); color: var(--text); margin: 0; padding: 32px 16px; }
  .wrap { max-width: 960px; margin: 0 auto; }
  h1 { font-size: 26px; color: var(--wine-dark); margin-bottom: 4px; }
  .subtitle { color: #7a6f6a; margin-bottom: 32px; font-size: 14px; }
  .card { background: #fff; border-radius: 14px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .card h2 { margin-top: 0; font-size: 18px; color: var(--wine-dark); border-bottom: 2px solid var(--gold-light); padding-bottom: 10px; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
  .stat { background: var(--stone); border-radius: 10px; padding: 16px; text-align: center; }
  .stat .num { font-size: 26px; font-weight: bold; color: var(--wine); }
  .stat .label { font-size: 13px; color: #7a6f6a; margin-top: 4px; }
  .funnel-step { margin-bottom: 18px; }
  .funnel-bar-row { display: flex; align-items: center; gap: 12px; }
  .funnel-label { width: 150px; font-size: 14px; font-weight: 600; flex-shrink: 0; }
  .funnel-bar-track { flex: 1; background: #eee; border-radius: 8px; overflow: hidden; height: 34px; }
  .funnel-bar-fill { height: 100%; background: linear-gradient(90deg, var(--wine), var(--gold)); display: flex; align-items: center; padding-inline-start: 12px; color: #fff; font-weight: bold; font-size: 14px; border-radius: 8px 0 0 8px; white-space: nowrap; }
  .funnel-drop { font-size: 12px; color: #b23; margin-top: 4px; margin-inline-start: 162px; }
  .bar-list-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .bar-list-label { width: 130px; font-size: 13px; flex-shrink: 0; }
  .bar-list-track { flex: 1; background: #eee; border-radius: 6px; overflow: hidden; height: 22px; }
  .bar-list-fill { height: 100%; background: var(--wine); border-radius: 6px 0 0 6px; }
  .bar-list-value { width: 70px; font-size: 13px; text-align: left; flex-shrink: 0; }
  .footer-note { font-size: 12px; color: #9a8f8a; margin-top: 24px; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
  <h1>דשבורד אנליטיקס — יקב מוניץ</h1>
  <div class="subtitle">טווח נתונים: ${startDate} עד ${endDate}</div>

  <div class="card">
    <h2>סיכום כללי — כלל האתר</h2>
    <div class="stat-grid">
      <div class="stat"><div class="num">${ov.activeUsers ?? 0}</div><div class="label">משתמשים ייחודיים</div></div>
      <div class="stat"><div class="num">${ov.sessions ?? 0}</div><div class="label">ביקורים</div></div>
      <div class="stat"><div class="num">${ov.screenPageViews ?? 0}</div><div class="label">צפיות בדפים</div></div>
      <div class="stat"><div class="num">${avgDurationMin}:${String(avgDurationSec).padStart(2, '0')}</div><div class="label">משך ביקור ממוצע</div></div>
      <div class="stat"><div class="num">${Math.round((ov.bounceRate ?? 0) * 100)}%</div><div class="label">אחוז נטישה</div></div>
    </div>
  </div>

  ${funnelSectionsHtml || '<div class="card"><h2>משפכי המרה</h2><p>לא נמצאו עמודי מוצר עם תנועה בטווח התאריכים הזה.</p></div>'}
  ${otherPagesHtml}

  <div class="card">
    <h2>מקורות התנועה — כלל האתר</h2>
    ${sourceRows.map((r) => bar((r.sessions / maxSource) * 100, r.sessionDefaultChannelGroup, r.sessions)).join('\n')}
  </div>

  <div class="card">
    <h2>סוגי מכשירים — כלל האתר</h2>
    ${deviceRows.map((r) => bar((r.sessions / maxDevice) * 100, r.deviceCategory, r.sessions)).join('\n')}
  </div>

  <div class="footer-note">נוצר מנתוני Google Analytics Data API, יקב מוניץ</div>
</div>
</body>
</html>
`

  const fileName = `ga-dashboard-${startDate}-to-${endDate}.html`.replace(/\s+/g, '')
  writeFileSync(fileName, html, 'utf-8')
  console.log(`Dashboard written to ${fileName}`)
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
