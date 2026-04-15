import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

const RATES = { USD: 1.09, CAD: 1.37, INR: 82.84, GBP: 0.89, EUR: 1.00 }
const SYMBOLS = { USD: '$', CAD: 'CA$', INR: '₹', GBP: '£', EUR: '€' }
const CURRENCY_LABELS = {
  USD: 'Dollar américain',
  CAD: 'Dollar canadien',
  INR: 'Roupie indienne',
  GBP: 'Livre sterling',
  EUR: 'Euro'
}
const FINANCE_THRESHOLD = 300

function formatDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function Home() {
  const [requester, setRequester] = useState('')
  const [manager, setManager] = useState('')
  const [uid, setUid] = useState('')
  const [credits, setCredits] = useState('')
  const [currency, setCurrency] = useState('')
  const [date, setDate] = useState('')
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => { setDate(todayISO()) }, [])

  const rate = RATES[currency] || 0
  const amount = credits && rate ? ((parseFloat(credits) / 100) * rate) : 0
  const amountStr = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sym = SYMBOLS[currency] || ''
  const needsFinanceApproval = amount >= FINANCE_THRESHOLD

  const canSubmit = requester && manager && uid && credits && currency && date && submitStatus !== 'sending' && submitStatus !== 'sent'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitStatus('sending')
    setSubmitError('')
    try {
      const res = await fetch('/api/send-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester, manager, organizationId: uid, credits, currency, amount: amountStr, sym, date: formatDate(date), needsFinanceApproval })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSubmitStatus('sent')
    } catch (err) {
      setSubmitStatus('error')
      setSubmitError(err.message)
    }
  }

  return (
    <>
      <Head>
        <title>Remboursement crédits SMS</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <div className={styles.logo}><span className={styles.logoMark}>B</span></div>
            <h1 className={styles.title}>Remboursement<br />crédits SMS</h1>
            <p className={styles.subtitle}>Calcul et transmission automatique au canal de traitement</p>
          </header>

          {submitStatus === 'sent' ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#0F6E56" />
                  <path d="M9 16l5 5 9-9" stroke="#E1F5EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className={styles.successTitle}>Demande envoyée</h2>
              <p className={styles.successText}>
                Le remboursement de <strong>{sym}{amountStr}</strong> pour l'organization <strong>{uid}</strong> a été transmis sur Slack.
                {needsFinanceApproval && <><br /><span className={styles.financeNote}>Amal Habacha a été notifiée pour validation finance.</span></>}
              </p>
              <button className={styles.resetBtn} onClick={() => { setRequester(''); setManager(''); setUid(''); setCredits(''); setCurrency(''); setDate(todayISO()); setSubmitStatus('idle'); setSubmitError('') }}>
                Nouvelle demande
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.section}>
                <label className={styles.label}>Demandeur</label>
                <input className={styles.input} type="text" placeholder="Prénom Nom" value={requester} onChange={e => setRequester(e.target.value)} required />
              </div>
              <div className={styles.section}>
                <label className={styles.label}>Manager</label>
                <input className={styles.input} type="text" placeholder="Prénom Nom du manager" value={manager} onChange={e => setManager(e.target.value)} required />
              </div>
              <div className={styles.divider} />
              <div className={styles.section}>
                <label className={styles.label}>Organization ID du client</label>
                <input className={styles.input} type="number" placeholder="ex : 9270247" value={uid} onChange={e => setUid(e.target.value)} min="1" required />
              </div>
              <div className={styles.divider} />
              <div className={styles.row}>
                <div className={styles.section}>
                  <label className={styles.label}>Crédits SMS restants</label>
                  <input className={styles.input} type="number" placeholder="ex : 5000" value={credits} onChange={e => setCredits(e.target.value)} min="1" required />
                </div>
                <div className={styles.section}>
                  <label className={styles.label}>Devise</label>
                  <select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)} required>
                    <option value="">— Sélectionner —</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — Dollar US</option>
                    <option value="CAD">CAD — Dollar canadien</option>
                    <option value="GBP">GBP — Livre sterling</option>
                    <option value="INR">INR — Roupie indienne</option>
                  </select>
                </div>
              </div>
              <div className={styles.section}>
                <label className={styles.label}>Date de la demande</label>
                <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              {credits && currency && (
                <div className={styles.calcCard}>
                  <div className={styles.calcLabel}>Montant à rembourser</div>
                  <div className={styles.calcAmount}>{sym}{amountStr}</div>
                  <div className={styles.calcFormula}>({Number(credits).toLocaleString('fr-FR')} / 100) × {rate} = {sym}{amountStr} · {CURRENCY_LABELS[currency]}</div>
                  <div className={styles.calcDetails}><span>Org. {uid || '—'}</span><span>·</span><span>{formatDate(date)}</span></div>
                </div>
              )}
              {needsFinanceApproval && credits && currency && (
                <div className={styles.financeWarning}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0, marginTop:2}}>
                    <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#854F0B" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M8 6v3.5" stroke="#854F0B" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="8" cy="11" r="0.75" fill="#854F0B"/>
                  </svg>
                  <div>
                    <div className={styles.financeWarningTitle}>Validation finance requise</div>
                    <div className={styles.financeWarningText}>Le montant dépasse 300€. Amal Habacha sera automatiquement notifiée sur Slack lors de l'envoi.</div>
                  </div>
                </div>
              )}
              {submitStatus === 'error' && (
                <div className={styles.alertDanger}>Erreur lors de l'envoi : {submitError}</div>
              )}
              <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
                {submitStatus === 'sending' ? 'Envoi en cours…' : 'Envoyer sur Slack'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
