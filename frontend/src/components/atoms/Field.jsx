export default function Field({ label, error, ...props }) {
  return <label className="ui-field">{label}<input {...props} />{error && <small className="field-error">{error}</small>}</label>
}
