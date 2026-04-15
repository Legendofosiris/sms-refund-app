import { useState, useEffect } from 'react'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

const RATES = { USD: 1.09, CAD: 1.37, INR: 82.84, GBP: 0.89, EUR: 1.00 }
const SYMBOLS = { USD: '$', CAD: 'CA$', INR: '₹', GBP: '£', EUR: '€' }
const CURRENCY_LABELS = {
  USD: 'Dollar américain / US Dollar',
  CAD: 'Dollar canadien / Canadian Dollar',
  INR: 'Roupie indienne / Indian Rupee',
  GBP: 'Livre sterling / British Pound',
  EUR: 'Euro'
}
const FINANCE_THRESHOLD = 300

const T = {
  fr: {
    title: 'Remboursement\ncrédits SMS',
    subtitle: 'Calcul et transmission automatique au canal de traitement',
    requester: 'Demandeur',
    requesterPlaceholder: 'Prénom Nom',
    manager: 'Manager',
    managerPlaceholder: 'Prénom Nom du manager',
    orgId: 'Organization ID du client',
    orgIdPlaceholder: 'ex : 9270247',
    reason: 'Raison',
    reasonPlaceholder: 'Motif du remboursement…',
    credits: 'Crédits SMS restants',
    creditsPlaceholder: 'ex : 5000',
    currency: 'Devise',
    currencyDefault: '— Sélectionner —',
    date: 'Date de la demande',
    amountLabel: 'Montant à rembourser',
    financeTitle: 'Validation finance requise',
    financeText: 'Le montant dépasse 300€. Amal Habacha sera automatiquement notifiée sur Slack lors de l\'envoi.',
    submit: 'Envoyer sur Slack',
    sending: 'Envoi en cours…',
    successTitle: 'Demande envoyée',
    successText: (sym, amt, uid) => `Le remboursement de ${sym}${amt} pour l'organization ${uid} a été transmis sur Slack.`,
    financeNote: 'Amal Habacha a été notifiée pour validation finance.',
    newRequest: 'Nouvelle demande',
    error: 'Erreur lors de l\'envoi : ',
  },
  en: {
    title: 'SMS Credit\nRefund',
    subtitle: 'Automatic calculation and transmission to the processing channel',
    requester: 'Requester',
    requesterPlaceholder: 'First Last name',
    manager: 'Manager',
    managerPlaceholder: 'Manager\'s first and last name',
    orgId: 'Client Organization ID',
    orgIdPlaceholder: 'e.g. 9270247',
    reason: 'Reason',
    reasonPlaceholder: 'Reason for the refund…',
    credits: 'Remaining SMS credits',
    creditsPlaceholder: 'e.g. 5000',
    currency: 'Currency',
    currencyDefault: '— Select —',
    date: 'Request date',
    amountLabel: 'Amount to refund',
    financeTitle: 'Finance approval required',
    financeText: 'The amount exceeds €300. Amal Habacha will automatically be notified on Slack upon submission.',
    submit: 'Send to Slack',
    sending: 'Sending…',
    successTitle: 'Request sent',
    successText: (sym, amt, uid) => `The refund of ${sym}${amt} for organization ${uid} has been submitted on Slack.`,
    financeNote: 'Amal Habacha has been notified for finance approval.',
    newRequest: 'New request',
    error: 'Error sending: ',
  }
}

function formatDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function Home() {
  const [lang, setLang] = useState('fr')
  const [requester, setRequester] = useState('')
  const [manager, setManager] = useState('')
  const [uid, setUid] = useState('')
  const [reason, setReason] = useState('')
  const [credits, setCredits] = useState('')
  const [currency, setCurrency] = useState('')
  const [date, setDate] = useState('')
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => { setDate(todayISO()) }, [])

  const t = T[lang]
  const rate = RATES[currency] || 0
  const amount = credits && rate ? ((parseFloat(credits) / 100) * rate) : 0
  const amountStr = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const sym = SYMBOLS[currency] || ''
  const needsFinanceApproval = amount >= FINANCE_THRESHOLD

  const canSubmit = requester && manager && uid && reason && credits && currency && date && submitStatus !== 'sending' && submitStatus !== 'sent'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitStatus('sending')
    setSubmitError('')
    try {
      const res = await fetch('/api/send-slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requester, manager, organizationId: uid, reason, credits, currency, amount: amountStr, sym, date: formatDate(date), needsFinanceApproval })
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
            <div className={styles.topRow}>
              <div className={styles.logo}><span className={styles.logoMark}>B</span></div>
              <div className={styles.langSwitch}>
                <button className={lang === 'fr' ? styles.langActive : styles.langBtn} onClick={() => setLang('fr')}>FR</button>
                <button className={lang === 'en' ? styles.langActive : styles.langBtn} onClick={() => setLang('en')}>EN</button>
              </div>
            </div>
            <h1 className={styles.title}>{t.title.split('\n').map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</h1>
            <p className={styles.subtitle}>{t.subtitle}</p>
          </header>

          {submitStatus === 'sent' ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="16" fill="#0F6E56" />
                  <path d="M9 16l5 5 9-9" stroke="#E1F5EE" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className={styles.successTitle}>{t.successTitle}</h2>
              <p className={styles.successText}>
                {t.successText(sym, amountStr, uid)}
                {needsFinanceApproval && <><br /><span className={styles.financeNote}>{t.financeNote}</span></>}
              </p>
              <button className={styles.resetBtn} onClick={() => { setRequester(''); setManager(''); setUid(''); setReason(''); setCredits(''); setCurrency(''); setDate(todayISO()); setSubmitStatus('idle'); setSubmitError('') }}>
                {t.newRequest}
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.section}>
                <label className={styles.label}>{t.requester}</label>
                <input className={styles.input} type="text" placeholder={t.requesterPlaceholder} value={requester} onChange={e => setRequester(e.target.value)} required />
              </div>
              <div className={styles.section}>
                <label className={styles.label}>{t.manager}</label>
                <input className={styles.input} type="text" placeholder={t.managerPlaceholder} value={manager} onChange={e => setManager(e.target.value)} required />
              </div>
              <div className={styles.divider} />
              <div className={styles.section}>
                <label className={styles.label}>{t.orgId}</label>
                <input className={styles.input} type="number" placeholder={t.orgIdPlaceholder} value={uid} onChange={e => setUid(e.target.value)} min="1" required />
              </div>
              <div className={styles.divider} />
              <div className={styles.section}>
                <label className={styles.label}>{t.reason}</label>
                <textarea className={styles.textarea} placeholder={t.reasonPlaceholder} value={reason} onChange={e => setReason(e.target.value)} required rows={3} />
              </div>
              <div className={styles.row}>
                <div className={styles.section}>
                  <label className={styles.label}>{t.credits}</label>
                  <input className={styles.input} type="number" placeholder={t.creditsPlaceholder} value={credits} onChange={e => setCredits(e.target.value)} min="1" required />
                </div>
                <div className={styles.section}>
                  <label className={styles.label}>{t.currency}</label>
                  <select className={styles.input} value={currency} onChange={e => setCurrency(e.target.value)} required>
                    <option value="">{t.currencyDefault}</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="USD">USD — Dollar US</option>
                    <option value="CAD">CAD — Dollar canadien</option>
                    <option value="GBP">GBP — Livre sterling</option>
                    <option value="INR">INR — Roupie indienne</option>
                  </select>
                </div>
              </div>
              <div className={styles.section}>
                <label className={styles.label}>{t.date}</label>
                <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              {credits && currency && (
                <div className={styles.calcCard}>
                  <div className={styles.calcLabel}>{t.amountLabel}</div>
                  <div className={styles.calcAmount}>{sym}{amountStr}</div>
                  <div className={styles.calcFormula}>({Number(credits).toLocaleString('fr-FR')} / 100) × {rate} = {sym}{amountStr}</div>
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
                    <div className={styles.financeWarningTitle}>{t.financeTitle}</div>
                    <div className={styles.financeWarningText}>{t.financeText}</div>
                  </div>
                </div>
              )}
              {submitStatus === 'error' && (
                <div className={styles.alertDanger}>{t.error}{submitError}</div>
              )}
              <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
                {submitStatus === 'sending' ? t.sending : t.submit}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
