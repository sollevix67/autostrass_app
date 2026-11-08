// Read-only verification executed by the official Figma MCP server.
// Figma adds font variation metadata and stores numeric values as float32.
async function validateFoundations(expected) {
  const [collections, variables, textStyles, effectStyles] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync(),
  ])
  function matches(actual, wanted) {
    if (typeof wanted === 'number') return Math.abs(actual - wanted) <= 0.00001
    if (wanted && typeof wanted === 'object') {
      return actual && Object.keys(wanted).every(key => matches(actual[key], wanted[key]))
    }
    return actual === wanted
  }
  for (const d of expected.variables) {
    const c = collections.find(c => c.name === d.collection)
    if (!c || c.modes.length !== 1) throw new Error('Collection incompatible : ' + d.collection)
    const v = variables.find(v => v.variableCollectionId === c.id && v.name === d.name)
    if (!v || v.resolvedType !== d.type || v.codeSyntax.WEB !== d.codeSyntax) {
      throw new Error('Contrat de variable incorrect : ' + d.name)
    }
    if (JSON.stringify(v.scopes.slice().sort()) !== JSON.stringify(d.scopes.slice().sort())) {
      throw new Error('Scopes incorrects : ' + d.name)
    }
    const actual = v.valuesByMode[c.modes[0].modeId]
    if (d.alias) {
      const target = variables.find(t => t.variableCollectionId === c.id && t.name === d.alias)
      if (!target || actual.type !== 'VARIABLE_ALIAS' || actual.id !== target.id) {
        throw new Error('Alias incorrect : ' + d.name)
      }
    } else if (!matches(actual, d.value)) throw new Error('Valeur incorrecte : ' + d.name)
  }
  for (const d of expected.textStyles) {
    const s = textStyles.find(s => s.name === d.name)
    if (!s || !matches(s.fontName, d.fontName) || !matches(s.fontSize, d.fontSize)
      || !matches(s.lineHeight, d.lineHeight) || !matches(s.letterSpacing, d.letterSpacing)) {
      throw new Error('Typographie incorrecte : ' + d.name)
    }
  }
  for (const d of expected.effectStyles) {
    const s = effectStyles.find(s => s.name === d.name)
    if (!s || s.effects.length !== d.effects.length || !matches(s.effects, d.effects)) {
      throw new Error('Ombre incorrecte : ' + d.name)
    }
  }
  return {
    validation: {
      kind: 'foundations',
      variables: expected.variables.length,
      aliases: expected.variables.filter(d => d.alias).length,
      collections: collections.map(c => ({ name: c.name, variableCount: c.variableIds.length, modes: c.modes.length })),
      textStyles: expected.textStyles.length,
      effectStyles: expected.effectStyles.length,
      passed: true,
    },
  }
}
