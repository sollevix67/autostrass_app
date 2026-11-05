import { useCallback, useEffect, useRef, useState } from 'react'
import { DataTable, type ColumnDef } from './DataTable'
import { FormInput } from './forms/FormFields'
import { ConfirmDialog } from './ConfirmDialog'
import { useConfirm } from './useConfirm'
import { canWrite, useAuth } from './useAuth'
import { useToast } from './useToast'
import { api, toErrorMessage } from '../services/api'
import type { ApiStockEmplacement } from '../services/contracts'
import { emplacementSchema } from '../schemas/parametres'

const levels = { allee: 'Allée', etagere: 'Étagère', place: 'Place' } as const
const initial = { code: '', libelle: '', niveau: 'allee' as ApiStockEmplacement['niveau'], parent_id: null as number | null, capacite: 0, actif: true }

export function EmplacementsManager({ emplacements, loading, error, reload }: { emplacements: ApiStockEmplacement[]; loading: boolean; error: string | null; reload: () => void }) {
  const { user } = useAuth()
  const editable = canWrite(user?.role, 'depot')
  const [values, setValues] = useState(initial)
  const [editing, setEditing] = useState<number | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  const pending = useRef(false)
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const close = useCallback(() => { if (!pending.current) setOpen(false) }, [])
  useEffect(() => {
    if (!open || !dialog.current) return
    const element = dialog.current
    const trigger = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    element.showModal()
    document.getElementById('emplacement-code')?.focus()
    document.body.style.overflow = 'hidden'
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() } }
    document.addEventListener('keydown', escape, true)
    return () => { element.close(); document.body.style.overflow = overflow; document.removeEventListener('keydown', escape, true); if (trigger?.isConnected) trigger.focus() }
  }, [open, close])

  async function save() {
    if (pending.current || !editable || error) return
    const parsed = emplacementSchema.safeParse(values)
    if (!parsed.success) { setFormError(parsed.error.issues.map((issue) => issue.message).join(' ')); return }
    pending.current = true; setBusy(true); setFormError(null)
    try {
      if (editing) await api.put(`/emplacements/${editing}`, { code: values.code.trim(), libelle: values.libelle.trim(), capacite: values.capacite, actif: values.actif })
      else await api.post('/emplacements', parsed.data)
      setOpen(false); reload(); toast.success('Emplacement enregistré.')
    } catch (cause) { setFormError(toErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  async function remove(item: ApiStockEmplacement) {
    if (pending.current || !editable) return
    pending.current = true; setBusy(true)
    try { await api.delete(`/emplacements/${item.id}`); reload(); toast.success('Emplacement supprimé.') }
    catch (cause) { toast.error(toErrorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }
  const columns: ColumnDef<ApiStockEmplacement>[] = [
    { key: 'chemin', header: 'EMPLACEMENT', sortable: true, sortValue: (row) => row.chemin, render: (row) => <strong>{row.chemin}</strong> },
    { key: 'niveau', header: 'NIVEAU', render: (row) => levels[row.niveau] },
    { key: 'quantite', header: 'STOCK CUMULÉ', align: 'right', render: (row) => row.quantite },
    { key: 'capacite', header: 'CAPACITÉ', align: 'right', render: (row) => row.capacite },
    { key: 'actif', header: 'ÉTAT', render: (row) => <span className={`status-badge ${row.actif ? 'status-disponible' : ''}`}>{row.actif ? 'Actif' : 'Inactif'}</span> },
    { key: 'actions', header: 'ACTIONS', render: (row) => <div className="actions-cell">
      <button className="link-button" type="button" disabled={!editable || busy || loading || Boolean(error)} aria-label={`Modifier ${row.chemin}`} onClick={() => { setEditing(row.id); setValues({ code: row.code, libelle: row.libelle ?? '', niveau: row.niveau, parent_id: row.parentId, capacite: row.capacite, actif: row.actif }); setFormError(null); setOpen(true) }}>Modifier</button>
      <button className="link-button" type="button" disabled={!editable || busy || loading || Boolean(error)} aria-label={`Supprimer ${row.chemin}`} onClick={() => confirm(`Supprimer ${row.chemin} ?`, 'Un emplacement contenant des enfants ou du stock ne peut pas être supprimé.', () => void remove(row))}>Supprimer</button>
    </div> },
  ]
  const search = query.trim().toLocaleLowerCase('fr-FR')
  return (
    <section className="stock-panel">
      <div className="panel-header"><h3>Emplacements</h3><div className="panel-controls">
        <input type="search" className="search-input" aria-label="Rechercher un emplacement" placeholder="Chemin ou libellé…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button className="secondary-button" type="button" disabled={loading || busy} onClick={reload}>Actualiser les emplacements</button>
        <button className="primary-button" type="button" disabled={!editable || loading || busy || Boolean(error)} onClick={() => { setEditing(null); setValues(initial); setFormError(null); setOpen(true) }}>Nouvel emplacement</button>
      </div></div>
      {error ? <p className="error-banner" role="alert">{error}</p> : <DataTable columns={columns} rows={emplacements.filter((row) => `${row.chemin} ${row.libelle ?? ''}`.toLocaleLowerCase('fr-FR').includes(search))} rowKey={(row) => String(row.id)} loading={loading} caption="Emplacements de stockage" defaultSort={{ key: 'chemin', direction: 'asc' }} emptyMessage="Aucun emplacement à afficher." />}
      <dialog ref={dialog} className="modal emplacement-dialog" aria-labelledby="emplacement-title" onCancel={(event) => { event.preventDefault(); close() }} onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) close() }}>
        <h2 id="emplacement-title">{editing ? 'Modifier l’emplacement' : 'Nouvel emplacement'}</h2>
        <form onSubmit={(event) => { event.preventDefault(); void save() }}>
          {formError && <p className="error-banner" role="alert">{formError}</p>}
          <fieldset className="parametre-fieldset" disabled={busy}>
            <FormInput label="Code" name="emplacement-code" required value={values.code} onChange={(_, code) => setValues({ ...values, code })} />
            <FormInput label="Libellé" name="emplacement-libelle" value={values.libelle} onChange={(_, libelle) => setValues({ ...values, libelle })} />
            <fieldset className="parametre-fieldset" disabled={editing !== null}>
              <div className="form-group"><label htmlFor="emplacement-niveau">Niveau</label><select id="emplacement-niveau" value={values.niveau} onChange={(event) => setValues({ ...values, niveau: event.target.value as typeof values.niveau, parent_id: null })}>{Object.entries(levels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              {values.niveau !== 'allee' && <div className="form-group"><label htmlFor="emplacement-parent">Emplacement parent</label><select id="emplacement-parent" required value={values.parent_id ?? ''} onChange={(event) => setValues({ ...values, parent_id: event.target.value ? Number(event.target.value) : null })}><option value="">Choisir un parent</option>{emplacements.filter((item) => item.niveau === (values.niveau === 'etagere' ? 'allee' : 'etagere') && (item.actif || item.id === values.parent_id)).map((item) => <option key={item.id} value={item.id}>{item.chemin}</option>)}</select></div>}
            </fieldset>
            <FormInput label="Capacité (unités)" name="emplacement-capacite" type="number" min={0} step="1" value={String(values.capacite)} onChange={(_, value) => setValues({ ...values, capacite: Number(value) })} />
            {editing && <label className="parametre-checkbox"><input type="checkbox" checked={values.actif} onChange={(event) => setValues({ ...values, actif: event.target.checked })} />Emplacement actif</label>}
            <div className="form-actions"><button type="button" className="secondary-button" onClick={close}>Annuler</button><button type="submit" className="primary-button">{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
          </fieldset>
        </form>
      </dialog>
      <ConfirmDialog {...dialogProps} />
    </section>
  )
}
