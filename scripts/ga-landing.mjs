import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = process.env.GA_PROPERTY_ID
const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS
const client = new BetaAnalyticsDataClient({ keyFilename: keyFilePath })

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
  const [events] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '11daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 30,
  })
  printTable('All events', events)

  const [landing] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '11daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'conversions' },
      { name: 'transactions' },
      { name: 'totalRevenue' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  })
  printTable('Landing pages with ecommerce metrics', landing)

  const [pagePath] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '11daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'transactions' }, { name: 'totalRevenue' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 5,
  })
  printTable('Top pagePath with ecommerce metrics', pagePath)
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
