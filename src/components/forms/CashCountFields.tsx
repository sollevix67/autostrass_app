import type { FieldErrors } from 'react-hook-form'
import { formatDenomination, formatEuros } from '../../options'
import { comptageLineSchema, type CaisseClotureFormValues } from '../../schemas'
import type { CashCountLine } from '../../utils/cashCounting'
import { FormInput, type FieldRegister } from './FormFields'

type CashCountFieldsProps = {
  fields: readonly { id: string; denomination: number }[]
  count: readonly CashCountLine[]
  register: FieldRegister
  errors?: FieldErrors<CaisseClotureFormValues>['comptage']
}

export function CashCountFields({ fields, count, register, errors }: CashCountFieldsProps) {
  return (
    <div className="comptage-grid">
      {fields.map((field, index) => {
        const line = comptageLineSchema.safeParse(count[index])
        return (
          <div key={field.id} className="comptage-row">
            <FormInput
              label={`${formatDenomination(field.denomination)} — quantité`}
              name={`comptage.${index}.quantite`}
              type="number"
              min="0"
              max="10000"
              step="1"
              inputMode="numeric"
              register={register}
              error={errors?.[index]?.quantite?.message}
              required
            />
            <output className="comptage-line-total" aria-label={`Montant en ${formatDenomination(field.denomination)}`}>
              {line.success ? formatEuros(Math.round(line.data.denomination * 100) * line.data.quantite / 100) : '—'}
            </output>
          </div>
        )
      })}
    </div>
  )
}
