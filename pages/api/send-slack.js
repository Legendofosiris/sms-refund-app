const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const AMAL_SLACK_ID = 'U09BK2SK58A'
const FINANCE_THRESHOLD = 300

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    requester, manager, clientName, clientEmail,
    organizationId, credits, currency, amount, sym, date
  } = req.body

  const numericAmount = parseFloat(amount.replace(',', '.'))
  const needsFinance = numericAmount >= FINANCE_THRESHOLD

  const financeBlock = needsFinance
    ? `\n⚠️ *Validation finance requise* — montant ≥ 300€ · <@${AMAL_SLACK_ID}> merci de valider cette demande.`
    : ''

  const text = `*Demande de remboursement crédits SMS*${financeBlock}

*Demandeur :* ${requester}
*Manager :* ${manager}
*Client :* ${clientName} (${clientEmail})
*Organization ID :* ${organizationId}
*Crédits SMS restants :* ${Number(credits).toLocaleString('fr-FR')}
*Devise :* ${currency}
*Montant à rembourser :* ${sym}${amount}
*Date de la demande :* ${date}`

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(500).json({ error: err || 'Erreur Slack' })
    }

    return res.status(200).json({ success: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
