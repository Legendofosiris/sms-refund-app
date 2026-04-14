export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { organizationId } = req.body
  if (!organizationId) return res.status(400).json({ error: 'organizationId requis' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a data lookup assistant. Always respond with valid JSON only, no markdown, no preamble. Return exactly: {"found": true, "name": "...", "email": "..."} or {"found": false}',
        messages: [{
          role: 'user',
          content: `Using Omni MCP with model ID 92d12e4f-30d5-481b-9b82-8d1df827a534 and topic clients_accounts, look up the client with Organization ID = ${organizationId}. Return their Organization Name and Organization Email as JSON.`
        }],
        mcp_servers: [{
          type: 'url',
          url: 'https://callbacks.omniapp.co/callback/mcp',
          name: 'omni-mcp'
        }]
      })
    })

    const data = await response.json()
    const textBlock = data.content?.find(b => b.type === 'text')
    const raw = (textBlock?.text || '').replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const nm = raw.match(/"name"\s*:\s*"([^"]+)"/)
      const em = raw.match(/"email"\s*:\s*"([^"]+)"/)
      parsed = (nm || em)
        ? { found: true, name: nm?.[1] || organizationId, email: em?.[1] || '' }
        : { found: false }
    }

    return res.status(200).json(parsed)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
