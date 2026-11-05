import { useRef, useState } from 'react'
import { DataTable, type ColumnDef } from '../../components/DataTable'
import { useRemoteValue } from '../../hooks/useRemoteValue'
import { api, toErrorMessage } from '../../services/api'
import type { ApiClient } from '../../services/contracts'
import type { Referentiel } from '../../schemas/parametres'

export default function SecteurClients({ secteurs }: { secteurs: Referentiel[] }) {
  const { data, loading, error, reload } = useRemoteValue<ApiClient[]>('/clients')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  async function assign(client: ApiClient, value: string) {
    if (pending.current) return
    pending.current = true; setBusy(true); setSaveError(null)
    try { await api.put(`/clients/${client.id}`, { secteurId: value ? Number(value) : null }); reload() }
    catch (cause) { setSaveError(toErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  const columns: ColumnDef<ApiClient>[] = [
    { key: 'client', header: 'CLIENT', sortable: true, sortValue: (row) => row.nom, render: (row) => `${row.nom} ${row.prenom}` },
    { key: 'ville', header: 'VILLE', render: (row) => `${row.codePostal} ${row.ville}` },
    { key: 'secteur', header: 'SECTEUR', render: (row) => <select aria-label={`Secteur de ${row.nom} ${row.prenom}`} disabled={busy || loading} value={row.secteurId ?? ''} onChange={(event) => void assign(row, event.target.value)}><option value="">Non affecté</option>{secteurs.filter((item) => item.actif || item.id === row.secteurId).map((item) => <option key={item.id} value={item.id}>{item.libelle}{item.actif ? '' : ' (inactif)'}</option>)}</select> },
  ]
  return <section className="panel"><div className="panel-heading"><h2>Affectation des clients</h2><button type="button" className="secondary-button" disabled={loading || busy} onClick={reload}>Actualiser les clients</button></div>
    {(error || saveError) && <p className="error-banner" role="alert">{error || saveError}</p>}
    <DataTable rows={data ?? []} columns={columns} rowKey={(row) => String(row.id)} loading={loading} caption="Secteurs des clients" />
  </section>
}
