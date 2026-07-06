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
  const [byLandingEvent] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '11daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'landingPagePlusQueryString' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['add_to_cart', 'begin_checkout', 'purchase'] },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 20,
  })
  printTable('Add to cart / begin checkout / purchase, by landing page', byLandingEvent)
}

main().catch((err) => {
  console.error('Failed:', err.message)
  process.exit(1)
})
