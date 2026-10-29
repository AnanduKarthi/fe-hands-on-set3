interface Props {
  id: string
  message?: string
}

export function FieldError({ id, message }: Props) {
  if (!message) return null
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  )
}
