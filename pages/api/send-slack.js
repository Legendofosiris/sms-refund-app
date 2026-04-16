import { JWT } from 'google-auth-library'

const AMAL_SLACK_ID = 'U09BK2SK58A'
const FINANCE_THRESHOLD = 300

async function appendToSheet(data) {
  const client = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const token = await client.getAccessToken()
  const sheetId = process.env.GOOGLE_SHEET_ID

  const values = [[
    data.date,
    data.requester,
    data.manager,
    data.organizationId,
    data.reason,
    String(data.credits),
    data.currency,
    `${data.sym}${data.amount}`,
    data.needsFinanceApproval ? 'Oui' : 'Non'
  ]]

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:I:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.token}` },
      body: JSON.stringify({ values })
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('Sheets error:', err)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { requester, manager, organizationId, reason, credits, currency, amount, sym, date, needsFinanceApproval } = req.body

  const numericAmount = parseFloat(String(amount).replace(',', '.'))
  const needsFinance = needsFinanceApproval || numericAmount >= FINANCE_THRESHOLD

  const financeBlock = needsFinance
    ? `\n⚠️ *Validation finance requise* — montant ≥ 300€ · <@${AMAL_SLACK_ID}> merci de valider cette demande.`
    : ''

  const text = `*Demande de remboursement crédits SMS*${financeBlock}

*Demandeur :* ${requester}
*Manager :* ${manager}
*Organization ID :* ${organizationId}
*Raison :* ${reason}
*Crédits SMS restants :* ${Number(credits).toLocaleString('fr-FR')}
*Devise :* ${currency}
*Montant à rembourser :* ${sym}${amount}
*Date de la demande :* ${date}`

  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })

    await appendToSheet({ requester, manager, organizationId, reason, credits, currency, amount, sym, date, needsFinanceApproval: needsFinance })

    return res.status(200).json({ success: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message })
  }
}
