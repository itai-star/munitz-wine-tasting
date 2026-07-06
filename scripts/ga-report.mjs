import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = process.env.GA_PROPERTY_ID
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS

if (!propertyId) {
  console.error('Missing GA_PROPERTY_ID env var (set it in .env.local)')
  process.exit(1)
}
if (!keyFilePath) {
  console.error('Missing GOOGLE_APPLICATION_CREDENTIALS env var (set it in .env.local)')
  process.exit(1)
}

const daysArg = process.argv.find((arg) => arg.startsWith('--days='))
const days = daysArg ? Number(daysArg.split('=')[1]) : 11

const client = new BetaAnalyticsDataClient({ keyFilename: keyFilePath })

async function runReport({ dimensions, metrics, orderBys, limit }) {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: dimensions?.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    orderBys,
    limit,
  })
  return response
}

function printTable(title, response) {
  console.log(`\n=== ${title} ===`)
  const dimHeaders = response.dimensionHeaders?.map((h) => h.name) ?? []
  const metricHeaders = response.metricHeaders?.map((h) => h.name) ?? []
  console.log([...dimHeaders, ...metricHeaders].join(' | '))
  for (const row of response.rows ?? []) {
    const dims = row.dimensionValues?.map((v) => v.value) ?? []
    const mets = row.metricValues?.map((v) => v.value) ?? []
    console.log([...dims, ...mets].join(' | '))
  }
  if (!response.rows?.length) console.log('(no data)')
}

async function main() {
  const overview = await runReport({
    metrics: ['activeUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'bounceRate'],
  })
  printTable(`Overview - last ${days} days`, overview)

  const daily = await runReport({
    dimensions: ['date'],
    metrics: ['activeUsers', 'sessions'],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  })
  printTable('Daily breakdown', daily)

  const sources = await runReport({
    dimensions: ['sessionDefaultChannelGroup'],
    metrics: ['sessions', 'activeUsers'],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  })
  printTable('Traffic sources', sources)

  const pages = await runReport({
    dimensions: ['pagePath'],
    metrics: ['screenPageViews', 'activeUsers'],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 15,
  })
  printTable('Top pages', pages)

  const devices = await runReport({
    dimensions: ['deviceCategory'],
    metrics: ['sessions'],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  })
  printTable('Devices', devices)
}

main().catch((err) => {
  console.error('Failed to fetch GA report:', err.message)
  process.exit(1)
})
