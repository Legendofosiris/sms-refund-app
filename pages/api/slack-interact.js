import { JWT } from 'google-auth-library'

const RATES = { USD: 1.09, CAD: 1.37, INR: 82.84, GBP: 0.89, EUR: 1.00 }
const SYMBOLS = { USD: '$', CAD: 'CA$', INR: '₹', GBP: '£', EUR: '€' }
const AMAL_SLACK_ID = 'U09BK2SK58A'
const FINANCE_THRESHOLD = 300

const MODAL = {
  type: 'modal',
  callback_id: 'sms_refund_modal',
  title: { type: 'plain_text', text: 'Remboursement SMS' },
  submit: { type: 'plain_text', text: 'Envoyer' },
  close: { type: 'plain_text', text: 'Annuler' },
  blocks: [
    { type: 'input', block_id: 'requester', label: { type: 'plain_text', text: 'Demandeur' }, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Prénom Nom' } } },
    { type: 'input', block_id: 'manager', label: { type: 'plain_text', text: 'Manager' }, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Prénom Nom du manager' } } },
    { type: 'input', block_id: 'org_id', label: { type: 'plain_text', text: 'Organization ID du client' }, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'ex : 9270247' } } },
    { type: 'input', block_id: 'reason', label: { type: 'plain_text', text: 'Raison' }, element: { type: 'plain_text_input', action_id: 'value', multiline: true, placeholder: { type: 'plain_text', text: 'Motif du remboursement…' } } },
    { type: 'input', block_id: 'credits', label: { type: 'plain_text', text: 'Crédits SMS restants' }, element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'ex : 5000' } } },
    { type: 'input', block_id: 'currency', label: { type: 'plain_text', text: 'Devise' }, element: { type: 'static_select', action_id: 'value', placeholder: { type: 'plain_text', text: '— Sélectionner —' }, options: [ { text: { type: 'plain_text', text: 'EUR — Euro' }, value: 'EUR' }, { text: { type: 'plain_text', text: 'USD — Dollar US' }, value: 'USD' }, { text: { type: 'plain_text', text: 'CAD — Dollar canadien' }, value: 'CAD' }, { text: { type: 'plain_text', text: 'GBP — Livre sterling' }, value: 'GBP' }, { text: { type: 'plain_text', text: 'INR — Roupie indienne' }, value: 'INR' } ] } },
    { type: 'input', block_id: 'date', label: { type: 'plain_text', text: 'Date de la demande' }, element: { type: 'datepicker', action_id: 'value', initial_date: new Date().toISOString().split('T')[0] } }
  ]
}

async function appendToSheet(data) {
  const client = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const token = await client.getAccessToken()
  const sheetId = process.env.GOOGLE_SHEET_ID
  const values = [[ data.date, data.requester, data.manager, data.orgId, data.reason, String(data.credits), data.currency, `${data.sym}${data.amountStr}`, data.needsFinance ? 'Oui' : 'Non' ]]
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:I:append?valueInputOption=USER_ENTERED`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.token}` }, body: JSON.stringify({ values }) }
  )
  if (!res.ok) console.error('Sheets error:', await res.text())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const payload = JSON.parse(req.body.payload)

  if (payload.type === 'shortcut' && payload.callback_id === 'sms_refund_shortcut') {
    await fetch('https://slack.com/api/views.open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
      body: JSON.stringify({ trigger_id: payload.trigger_id, view: MODAL })
    })
    return res.status(200).end()
  }

  if (payload.type === 'view_submission' && payload.view.callback_id === 'sms_refund_modal') {
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
    const dateFormatted = formatDate(date)

    const financeBlock = needsFinance ? `\n⚠️ *Validation finance requise* — montant ≥ 300€ · <@${AMAL_SLACK_ID}> merci de valider cette demande.` : ''

    const text = `*Demande de remboursement crédits SMS*${financeBlock}

*Demandeur :* ${requester}
*Manager :* ${manager}
*Organization ID :* ${orgId}
*Raison :* ${reason}
*Crédits SMS restants :* ${Number(credits).toLocaleString('fr-FR')}
*Devise :* ${currency}
*Montant à rembourser :* ${sym}${amountStr}
*Date de la demande :* ${dateFormatted}`

    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })

    await appendToSheet({ date: dateFormatted, requester, manager, orgId, reason, credits, currency, amountStr, sym, needsFinance })

    return res.status(200).json({})
  }

  return res.status(200).end()
}
