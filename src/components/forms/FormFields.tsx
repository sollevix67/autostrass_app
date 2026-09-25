interface FormInputProps {
  label: string
  name: string
  type?: string
  step?: string
  value: string
  onChange: (name: string, value: string) => void
  required?: boolean
  placeholder?: string
}

export function FormInput({ label, name, type = 'text', step, value, onChange, required, placeholder }: FormInputProps) {
  return (
    <div className="form-group">
      <label htmlFor={name}>{label}{required && <span className="required">*</span>}</label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}

interface FormSelectProps {
  label: string
  name: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (name: string, value: string) => void
  required?: boolean
}

export function FormSelect({ label, name, value, options, onChange, required }: FormSelectProps) {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name}>{label}{required && <span className="required">*</span>}</label>
      )}
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        required={required}
        aria-label={label || name}
      >
        <option value="">Sélectionner...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

interface FormTextareaProps {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  required?: boolean
  rows?: number
  placeholder?: string
}

export function FormTextarea({ label, name, value, onChange, required, rows = 3, placeholder }: FormTextareaProps) {
  return (
    <div className="form-group">
      <label htmlFor={name}>{label}{required && <span className="required">*</span>}</label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )
}
