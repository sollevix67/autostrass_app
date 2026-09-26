import { useId, type ChangeEvent, type ReactNode } from 'react'

/**
 * Champs de formulaire reutilisables.
 *
 * Deux modes de pilotage coexistent :
 * 1. **Controle** : on passe `value` + `onChange` (formulaires legacy).
 * 2. **Non controle** : on passe `register` de React Hook Form (semaine 2).
 *
 * En mode RHF, le champ porte `aria-invalid` et `aria-describedby` pointant
 * vers son message d'erreur : c'est la guideline "Error Placement" du skill
 * ui-ux-pro-max (severite High).
 */

/**
 * Contrat minimal attendu de `register`.
 *
 * On ne reprend volontairement que `name` et `ref` : les callbacks `onChange`
 * et `onBlur` de React Hook Form ont des signatures tres specifiques qu'il est
 * inutile de dupliquer ici. Un index signature laisse passer les props
 * supplementaires (`onChange`, `onBlur`, `name`, ...) telles quelles vers le
 * champ, ce qui garde ce composant generique reutilisable entre formulaires.
 */
export type FieldRegistration = {
  name: string
  ref: (instance: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => void
  [prop: string]: unknown
}

/** Options acceptees par `register`, notamment `valueAsNumber` pour les numeriques. */
export type RegisterOptions = Record<string, unknown>

/** `register` accepte en parametre n'importe quel nom de champ. */
export type FieldRegister = (name: string, options?: RegisterOptions) => FieldRegistration

type CommonProps = {
  label: string
  name: string
  required?: boolean
  placeholder?: string
  error?: string
  hint?: string
}

type InputProps = CommonProps & {
  type?: string
  step?: string
  min?: string | number
  max?: string | number
  register?: FieldRegister
  value?: string
  onChange?: (name: string, value: string) => void
}

export function FormInput({
  label,
  name,
  type = 'text',
  step,
  min,
  max,
  required,
  placeholder,
  error,
  hint,
  register,
  value,
  onChange,
}: InputProps) {
  const uid = useId()
  const errorId = `${uid}-error`
  const hintId = `${uid}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  // Les champs numeriques doivent caster la saisie en nombre pour RHF/Zod.
  const isNumeric = type === 'number'

  const shared = {
    id: name,
    name,
    placeholder,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }

  return (
    <div className="form-group">
      <label htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>

      {register ? (
        <input
          {...register(name, isNumeric ? { valueAsNumber: true } : undefined)}
          {...shared}
          type={type}
          step={step}
          min={min}
          max={max}
        />
      ) : (
        <input
          {...shared}
          type={type}
          step={step}
          min={min}
          max={max}
          value={value ?? ''}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(name, event.target.value)}
        />
      )}

      {hint && <small id={hintId} className="form-hint">{hint}</small>}
      {error && <small id={errorId} className="form-error-text" role="alert">{error}</small>}
    </div>
  )
}

/**
 * Props du `<select>`.
 *
 * `Omit<CommonProps, 'placeholder'>` est indispensable : en intersection
 * simple, `placeholder?: string` (herite de `CommonProps`) et
 * `placeholder?: string | null` se reduiraient a `string`, et `null` serait
 * refuse alors qu'il est la maniere documentee de supprimer l'option vide.
 */
type SelectProps = Omit<CommonProps, 'placeholder'> & {
  options: Array<{ value: string; label: string }>
  register?: FieldRegister
  value?: string
  onChange?: (name: string, value: string) => void
  /** Libelle de l'option vide. Passer `null` pour ne pas en proposer. */
  placeholder?: string | null
}

export function FormSelect({
  label,
  name,
  options,
  required,
  error,
  hint,
  register,
  value,
  onChange,
  placeholder = 'Selectionner...',
}: SelectProps) {
  const uid = useId()
  const errorId = `${uid}-error`
  const hintId = `${uid}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  const shared = {
    id: name,
    name,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }

  const optionList: ReactNode = (
    <>
      {placeholder !== null && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </>
  )

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name}>
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}

      {register ? (
        <select {...register(name)} {...shared} aria-label={label || name}>{optionList}</select>
      ) : (
        <select
          {...shared}
          value={value ?? ''}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange?.(name, event.target.value)}
          aria-label={label || name}
        >
          {optionList}
        </select>
      )}

      {hint && <small id={hintId} className="form-hint">{hint}</small>}
      {error && <small id={errorId} className="form-error-text" role="alert">{error}</small>}
    </div>
  )
}

type TextareaProps = Omit<CommonProps, 'rows'> & {
  rows?: number
  register?: FieldRegister
  value?: string
  onChange?: (name: string, value: string) => void
}

export function FormTextarea({
  label,
  name,
  rows = 3,
  required,
  placeholder,
  error,
  hint,
  register,
  value,
  onChange,
}: TextareaProps) {
  const uid = useId()
  const errorId = `${uid}-error`
  const hintId = `${uid}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  const shared = {
    id: name,
    name,
    rows,
    placeholder,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }

  return (
    <div className="form-group">
      <label htmlFor={name}>
        {label}
        {required && <span className="required">*</span>}
      </label>

      {register ? (
        <textarea {...register(name)} {...shared} />
      ) : (
        <textarea
          {...shared}
          value={value ?? ''}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange?.(name, event.target.value)}
        />
      )}

      {hint && <small id={hintId} className="form-hint">{hint}</small>}
      {error && <small id={errorId} className="form-error-text" role="alert">{error}</small>}
    </div>
  )
}
