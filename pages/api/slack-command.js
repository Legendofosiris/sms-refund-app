export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const triggerId = req.body.trigger_id

  const modal = {
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

  const openModal = await fetch('https://slack.com/api/views.open', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
    body: JSON.stringify({ trigger_id: triggerId, view: modal })
  })

  const result = await openModal.json()
  if (!result.ok) console.error('Slack views.open error:', result.error)

  return res.status(200).end()
}
