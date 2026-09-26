import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { PageLayout } from '../components/PageLayout'
import { DataTable, type ColumnDef } from '../components/DataTable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useConfirm } from '../components/useConfirm'
import { useToast } from '../components/useToast'
import { Icon } from '../components/Icon'
import { FormInput, FormSelect, type FieldRegister } from '../components/forms/FormFields'
import { receptionSchema, type ReceptionFormValues } from '../schemas'
import type { Reception } from '../types'

const fournisseurs = [
  { value: 'Auto Pieces Nord', label: 'Auto Pieces Nord' },
  { value: 'Frein Plus', label: 'Frein Plus' },
  { value: 'Filtre Pro', label: 'Filtre Pro' },
  { value: 'Batterie Express', label: 'Batterie Express' },
  { value: 'Huile Max', label: 'Huile Max' },
]

const currency = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().split('T')[0]

const SEED_HISTORY: Reception[] = [
  {
    id: 'R-001',
    fournisseur: 'Auto Pieces Nord',
    dateReception: '2026-09-19',
    articles: [
      { lineId: 'seed-1', reference: 'BRK-0428', designation: 'Plaquettes frein', quantiteRecue: 50, prixUnitaire: 15.5 },
    ],
    totalHT: 775,
  },
]

export default function ReceptionsView() {
  const toast = useToast()
  const { dialogProps, confirm } = useConfirm()
  const [history, setHistory] = useState<Reception[]>(SEED_HISTORY)
  const [savingReception, setSavingReception] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ReceptionFormValues>({
    resolver: zodResolver(receptionSchema),
    mode: 'onBlur',
    defaultValues: {
      fournisseur: '',
      dateReception: today(),
      articles: [{ reference: '', designation: '', quantiteRecue: 0, prixUnitaire: 0 }],
    },
  })

  /**
   * `useFieldArray` gere les cles de ligne et l'insertion/suppression.
   * On garde un `lineId` dans les donnees pour lier chaque ligne a la table
   * d'historique apres enregistrement.
   */
  const { fields, append, remove } = useFieldArray({ control, name: 'articles' })

  // `register` est type sur les noms de champs du formulaire ; on l'elargit
  // pour nos composants generiques (le nom reste identique a l'attribut name).
  const reg = register as unknown as FieldRegister

  const watchedArticles = watch('articles')
  const totalHT = (watchedArticles ?? []).reduce(
    (sum, line) => sum + (line.quantiteRecue || 0) * (line.prixUnitaire || 0),
    0,
  )

  const onSubmit = handleSubmit(async (values) => {
    setSavingReception(true)
    try {
      const reception: Reception = {
        id: `R-${String(history.length + 1).padStart(3, '0')}`,
        fournisseur: values.fournisseur,
        dateReception: values.dateReception,
        articles: values.articles.map((line, index) => ({
          lineId: `rec-${Date.now()}-${index}`,
          reference: line.reference,
          designation: line.designation,
          quantiteRecue: line.quantiteRecue,
          prixUnitaire: line.prixUnitaire,
        })),
        totalHT,
      }

      setHistory((prev) => [reception, ...prev])
      toast.success(`Reception ${reception.id} enregistree (${reception.articles.length} ligne(s), ${currency.format(totalHT)} €).`)
      reset({ fournisseur: '', dateReception: today(), articles: [{ reference: '', designation: '', quantiteRecue: 0, prixUnitaire: 0 }] })
    } finally {
      setSavingReception(false)
    }
  })

  const handleDeleteHistory = (reception: Reception) => {
    confirm(
      `Supprimer la reception ${reception.id} ?`,
      <>
        La reception du <strong>{reception.dateReception}</strong> chez{' '}
        <strong>{reception.fournisseur}</strong> sera retirees de l'historique
        ({currency.format(reception.totalHT)} €).
      </>,
      () => {
        setHistory((prev) => prev.filter((item) => item.id !== reception.id))
        toast.success(`Reception ${reception.id} supprimee de l'historique.`)
      },
    )
  }

  const columns: ColumnDef<Reception>[] = [
    { key: 'id', header: 'N°', width: '70px', render: (row) => row.id ?? '—' },
    { key: 'fournisseur', header: 'FOURNISSEUR', sortable: true, sortValue: (row) => row.fournisseur, render: (row) => row.fournisseur },
    { key: 'dateReception', header: 'DATE', sortable: true, sortValue: (row) => row.dateReception, render: (row) => row.dateReception },
    {
      key: 'articles',
      header: 'ARTICLES',
      align: 'right',
      render: (row) => `${row.articles.length} ligne(s)`,
    },
    {
      key: 'totalHT',
      header: 'TOTAL HT',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.totalHT,
      render: (row) => <b>{currency.format(row.totalHT)} €</b>,
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '60px',
      render: (row) => (
        <div className="actions-cell">
          <button
            type="button"
            className="action-btn delete"
            onClick={() => handleDeleteHistory(row)}
            title="Supprimer"
            aria-label={`Supprimer la reception ${row.id}`}
          >
            <Icon name="trash" size="sm" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageLayout
      eyebrow="RECEPTIONS"
      title="Enregistrer une réception"
      description="Ajoutez les articles reçus de vos fournisseurs."
    >
      <form className="form-card" onSubmit={onSubmit} noValidate>
        <h2>Nouvelle réception</h2>

        {/*
          Erreur de collection : Zod la place sur `articles.root` (ou `articles`).
          On affiche un resume global au-dessus des lignes ; chaque ligne garde
          son erreur inline, qui est la source la plus utile pour l'utilisateur.
        */}
        {errors.articles && (
          <p className="error-banner" role="alert">
            {typeof errors.articles.message === 'string' && errors.articles.message !== 'Invalid input: expected array, received undefined'
              ? errors.articles.message
              : 'Completez chaque ligne d\'article avant d\'enregistrer la reception.'}
          </p>
        )}

        <div className="form-grid-2">
          <FormSelect
            label="Fournisseur"
            name="fournisseur"
            options={fournisseurs}
            register={reg}
            error={errors.fournisseur?.message}
            required
          />
          <FormInput
            label="Date de réception"
            name="dateReception"
            type="date"
            register={reg}
            error={errors.dateReception?.message}
            required
          />
        </div>

        <h3 className="sub-heading">Articles reçus</h3>

        {fields.map((field, index) => {
          const lineErrors = errors.articles?.[index]
          return (
            <div key={field.id} className="reception-article">
              <div className="form-grid-2">
                <FormInput
                  label="Référence"
                  name={`articles.${index}.reference`}
                  register={reg}
                  error={lineErrors?.reference?.message}
                  required
                  placeholder="ex: BRK-0428"
                />
                <FormInput
                  label="Désignation"
                  name={`articles.${index}.designation`}
                  register={reg}
                  error={lineErrors?.designation?.message}
                  required
                />
                <FormInput
                  label="Quantité reçue"
                  name={`articles.${index}.quantiteRecue`}
                  type="number"
                  min="1"
                  register={reg}
                  error={lineErrors?.quantiteRecue?.message}
                  required
                />
                <FormInput
                  label="Prix unitaire (€)"
                  name={`articles.${index}.prixUnitaire`}
                  type="number"
                  step="0.01"
                  min="0"
                  register={reg}
                  error={lineErrors?.prixUnitaire?.message}
                  required
                />
              </div>
              <button
                type="button"
                className="action-btn delete"
                onClick={() => remove(index)}
                aria-label={`Retirer la ligne ${index + 1}`}
                disabled={fields.length === 1}
                title={fields.length === 1 ? 'Une ligne minimum est requise' : 'Retirer cette ligne'}
              >
                <Icon name="close" size="sm" />
              </button>
            </div>
          )
        })}

        <button
          type="button"
          className="secondary-button"
          onClick={() => append({ reference: '', designation: '', quantiteRecue: 0, prixUnitaire: 0 })}
        >
          <Icon name="plus" size="sm" /> Ajouter un article
        </button>

        <div className="reception-total">
          <strong>Total HT : {currency.format(totalHT)} €</strong>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={savingReception}>
            <Icon name="check" size="sm" /> {savingReception ? 'Enregistrement...' : 'Enregistrer la réception'}
          </button>
        </div>
      </form>

      <div className="form-card">
        <h2>Historique des réceptions</h2>
        <DataTable
          columns={columns}
          rows={history}
          rowKey={(row) => row.id ?? row.dateReception}
          emptyMessage="Aucune réception enregistrée."
          defaultSort={{ key: 'dateReception', direction: 'desc' }}
          caption="Historique des réceptions fournisseurs"
        />
      </div>

      <ConfirmDialog {...dialogProps} confirmLabel="Supprimer" destructive />
    </PageLayout>
  )
}
