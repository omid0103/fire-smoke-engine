export default function Field({ label, unit, value, onChange, type = 'number', min, max, step = 'any', placeholder, required = false }: {
  label: string
  unit?: string
  value: string | number
  onChange: (value: string) => void
  type?: 'number' | 'text'
  min?: number
  max?: number
  step?: string | number
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="eng-field">
      <span className="eng-field__label">{label}{required && <b> *</b>}</span>
      <div className="eng-field__control">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          required={required}
        />
        {unit && <span className="eng-field__unit">{unit}</span>}
      </div>
    </label>
  )
}
