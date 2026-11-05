import { useEffect, useRef, useState } from 'react'

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global { interface Window { turnstile?: Turnstile } }
let scriptPromise: Promise<Turnstile> | null = null

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script')
    const timer = window.setTimeout(() => fail(), 15000)
    const fail = () => { clearTimeout(timer); script.remove(); scriptPromise = null; reject(new Error('Le service de vérification ne répond pas.')) }
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => { clearTimeout(timer); if (window.turnstile) resolve(window.turnstile); else fail() }
    script.onerror = fail
    document.head.append(script)
  })
  return scriptPromise
}

export function TurnstileWidget({ siteKey, action, onToken, onError, revision = 0 }: {
  siteKey: string; action: 'login' | 'settings'; onToken: (token: string) => void; onError: (error: string | null) => void; revision?: number
}) {
  const container = useRef<HTMLDivElement>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let disposed = false
    let widget: string | undefined
    onToken('')
    onError(null)
    void loadTurnstile().then((turnstile) => {
      if (disposed || !container.current) return
      widget = turnstile.render(container.current, {
        sitekey: siteKey, action, size: 'flexible',
        callback: (token: string) => { if (!disposed) { onToken(token); onError(null) } },
        'expired-callback': () => { if (!disposed) { onToken(''); onError('La vérification a expiré. Recommencez.') } },
        'error-callback': () => { if (!disposed) { onToken(''); onError('La vérification a échoué. Réessayez.') } },
      })
    }).catch(() => { if (!disposed) onError('Impossible de charger la vérification de sécurité. Réessayez.') })
    return () => { disposed = true; if (widget) window.turnstile?.remove(widget) }
  }, [siteKey, action, onToken, onError, revision, retry])
  return <div className="turnstile-widget"><div ref={container} /><button type="button" className="link-button" onClick={() => setRetry((value) => value + 1)}>Recommencer la vérification</button></div>
}
