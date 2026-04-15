import crypto from 'crypto'

const RATES = { USD: 1.09, CAD: 1.37, INR: 82.84, GBP: 0.89, EUR: 1.00 }
const SYMBOLS = { USD: '$', CAD: 'CA$', INR: '₹', GBP: '£', EUR: '€' }
const AMAL_SLACK_ID = 'U09BK2SK58A'
const FINANCE_THRESHOLD = 300

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const signingSecret = process.env.SLACK_SIGNING_SECRET
  const timestamp = req.headers['x-slack-request-timestamp']
  const slackSig = req.headers['x-slack-signature']

  const body = await getRawBody(req)
  const sigBase = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac('sha256', signingSecret).update(sigBase).digest('hex')
  const computed = `v0=${hmac}`

  if (computed !== slackSig) return res.status(401).end()

  const payload = JSON.parse(new URLSearchParams(body).get('payload'))

  if (payload.type !== 'view_submission' || payload.view.callback_id !== 'sms_refund_modal') {
    return res.status(200).end()
  }

  const v = payload.view.state.values
  const requester = v.requester.value.value
  const manager = v.manager.value.value
  const orgId = v.org_id.value.value
  const reason = v.reason.value.value
  const credits = parseFloat(v.credits.value.value)
  const currency = v.currency.value.selected_option.value
  const date = v.date.value.selected_date

  const rate = RATES[currency] || 1
  const amount = (credits / 100) * rate
  const amountStr = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sym = SYMBOLS[currency]
  const needsFinance = amount >= FINANCE_THRESHOLD

  const formatDate = (d) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }

  const financeBlock = needsFinance
    ? `\n⚠️ *Validation finance requise* — montant ≥ 300€ · <@${AMAL_SLACK_ID}> merci de valider cette demande.`
    : ''

  const text = `*Demande de remboursement crédits SMS*${financeBlock}

*Demandeur :* ${requester}
*Manager :* ${manager}
*Organization ID :* ${orgId}
*Raison :* ${reason}
*Crédits SMS restants :* ${Number(credits).toLocaleString('fr-FR')}
*Devise :* ${currency}
*Montant à rembourser :* ${sym}${amountStr}
*Date de la demande :* ${formatDate(date)}`

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  })

  return res.status(200).json({})
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export const config = { api: { bodyParser: false } }
