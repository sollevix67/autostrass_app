type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function isFormControl(target: EventTarget | null): target is FormControl {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement
}

function validationMessage(control: FormControl): string {
  const validity = control.validity
  if (validity.badInput) return control instanceof HTMLInputElement && control.type === 'number'
    ? 'Veuillez saisir un nombre valide.'
    : 'Veuillez saisir une valeur valide.'
  if (validity.valueMissing) {
    if (control instanceof HTMLSelectElement) return 'Veuillez sélectionner un élément dans la liste.'
    if (control instanceof HTMLInputElement) {
      if (control.type === 'checkbox') return 'Veuillez cocher cette case.'
      if (control.type === 'radio') return 'Veuillez sélectionner une option.'
      if (control.type === 'file') return 'Veuillez sélectionner un fichier.'
    }
    return 'Veuillez renseigner ce champ.'
  }
  if (validity.typeMismatch && control instanceof HTMLInputElement) {
    if (control.type === 'email') return 'Veuillez saisir une adresse e-mail valide.'
    if (control.type === 'url') return 'Veuillez saisir une adresse URL valide.'
  }
  if (validity.tooShort && !(control instanceof HTMLSelectElement)) return `Veuillez saisir au moins ${control.minLength} caractères.`
  if (validity.tooLong && !(control instanceof HTMLSelectElement)) return `Veuillez saisir au maximum ${control.maxLength} caractères.`
  if (validity.patternMismatch) return 'Veuillez respecter le format demandé.'
  if (control instanceof HTMLInputElement) {
    if (validity.rangeUnderflow) return `Veuillez saisir une valeur supérieure ou égale à ${control.min}.`
    if (validity.rangeOverflow) return `Veuillez saisir une valeur inférieure ou égale à ${control.max}.`
    if (validity.stepMismatch) return `Veuillez saisir une valeur respectant le pas de ${control.step || '1'}.`
  }
  return 'Veuillez vérifier la valeur saisie.'
}

/** La langue des bulles natives dépend du navigateur, même avec <html lang="fr">. */
export function installFrenchValidation(): () => void {
  const translated = new Map<FormControl, string>()

  function clear(control: FormControl) {
    const message = translated.get(control)
    // Une validation métier ajoutée depuis la traduction reste prioritaire.
    if (message && control.validationMessage === message) control.setCustomValidity('')
    translated.delete(control)
  }

  function translate(event: Event) {
    const control = event.target
    if (!isFormControl(control)) return
    clear(control)
    if (control.validity.valid || control.validity.customError) return
    const message = validationMessage(control)
    control.setCustomValidity(message)
    translated.set(control, message)
  }

  function clearForm(event: Event) {
    const target = event.target
    if (event.type === 'focusout') {
      if (isFormControl(target)) clear(target)
      return
    }
    const form = target instanceof HTMLFormElement ? target : isFormControl(target) ? target.form : null
    // Une saisie peut aussi corriger un autre champ (groupe radio, champ dépendant).
    for (const control of translated.keys()) {
      if (control === target || (form && control.form === form) || !control.isConnected) clear(control)
    }
  }

  // invalid ne remonte pas : la capture couvre aussi les formulaires des dialogues.
  document.addEventListener('invalid', translate, true)
  const clearEvents = ['input', 'change', 'reset', 'focusout'] as const
  for (const event of clearEvents) document.addEventListener(event, clearForm, true)

  return () => {
    document.removeEventListener('invalid', translate, true)
    for (const event of clearEvents) document.removeEventListener(event, clearForm, true)
    for (const control of translated.keys()) clear(control)
  }
}
