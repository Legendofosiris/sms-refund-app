import crypto from 'crypto'

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

  const triggerId = new URLSearchParams(body).get('trigger_id')

  const modal = {
    type: 'modal',
    callback_id: 'sms_refund_modal',
    title: { type: 'plain_text', text: 'Remboursement SMS' },
    submit: { type: 'plain_text', text: 'Envoyer' },
    close: { type: 'plain_text', text: 'Annuler' },
    blocks: [
      {
        type: 'input', block_id: 'requester',
        label: { type: 'plain_text', text: 'Demandeur' },
        element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Prénom Nom' } }
      },
      {
        type: 'input', block_id: 'manager',
        label: { type: 'plain_text', text: 'Manager' },
        element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'Prénom Nom du manager' } }
      },
      {
        type: 'input', block_id: 'org_id',
        label: { type: 'plain_text', text: 'Organization ID du client' },
        element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'ex : 9270247' } }
      },
      {
        type: 'input', block_id: 'reason',
        label: { type: 'plain_text', text: 'Raison' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true, placeholder: { type: 'plain_text', text: 'Motif du remboursement…' } }
      },
      {
        type: 'input', block_id: 'credits',
        label: { type: 'plain_text', text: 'Crédits SMS restants' },
        element: { type: 'plain_text_input', action_id: 'value', placeholder: { type: 'plain_text', text: 'ex : 5000' } }
      },
      {
        type: 'input', block_id: 'currency',
        label: { type: 'plain_text', text: 'Devise' },
        element: {
          type: 'static_select', action_id: 'value',
          placeholder: { type: 'plain_text', text: '— Sélectionner —' },
          options: [
            { text: { type: 'plain_text', text: 'EUR — Euro' }, value: 'EUR' },
            { text: { type: 'plain_text', text: 'USD — Dollar US' }, value: 'USD' },
            { text: { type: 'plain_text', text: 'CAD — Dollar canadien' }, value: 'CAD' },
            { text: { type: 'plain_text', text: 'GBP — Livre sterling' }, value: 'GBP' },
            { text: { type: 'plain_text', text: 'INR — Roupie indienne' }, value: 'INR' },
          ]
        }
      },
      {
        type: 'input', block_id: 'date',
        label: { type: 'plain_text', text: 'Date de la demande' },
        element: { type: 'datepicker', action_id: 'value', initial_date: new Date().toISOString().split('T')[0] }
      }
    ]
  }

  const openModal = await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    body: JSON.stringify({ trigger_id: triggerId, view: modal })
  })

  const result = await openModal.json()
  if (!result.ok) console.error('Slack views.open error:', result.error)

  return res.status(200).end()
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
