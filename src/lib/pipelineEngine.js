export const STORAGE_KEY = 'cipher-stack-pipeline-v2'

export const NODE_META = {
  caesar: {
    label: 'Caesar',
    defaults: { shift: 3 },
    description: 'Character shift cipher',
    icon: 'Lock',
  },
  reverse: {
    label: 'Reverse',
    defaults: {},
    description: 'Mirror text order',
    icon: 'FlipHorizontal',
  },
  base64: {
    label: 'Base64',
    defaults: {},
    description: 'Binary-safe encoding',
    icon: 'Binary',
  },
  xor: {
    label: 'XOR',
    defaults: { key: 'hack' },
    description: 'Keyed bitwise transform',
    icon: 'KeyRound',
  },
}

export const NODE_OPTIONS = Object.keys(NODE_META)

export function createNode(type) {
  return {
    id: crypto.randomUUID(),
    type,
    config: { ...NODE_META[type].defaults },
  }
}

export function getDefaultNodes() {
  return [createNode('caesar'), createNode('reverse'), createNode('base64')]
}

function shiftCharCode(text, shift) {
  return text
    .split('')
    .map((char) => String.fromCharCode(char.charCodeAt(0) + shift))
    .join('')
}

function reverseText(text) {
  return text.split('').reverse().join('')
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

function decodeBase64(text) {
  const binary = atob(text)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function xorTransform(text, key) {
  if (!key) {
    return text
  }

  return text
    .split('')
    .map((char, index) => {
      const keyChar = key.charCodeAt(index % key.length)
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar)
    })
    .join('')
}

export function applyEncrypt(node, text) {
  switch (node.type) {
    case 'caesar':
      return shiftCharCode(text, Number(node.config.shift) || 0)
    case 'reverse':
      return reverseText(text)
    case 'base64':
      return encodeBase64(text)
    case 'xor':
      return xorTransform(text, node.config.key ?? '')
    default:
      return text
  }
}

export function applyDecrypt(node, text) {
  switch (node.type) {
    case 'caesar':
      return shiftCharCode(text, -(Number(node.config.shift) || 0))
    case 'reverse':
      return reverseText(text)
    case 'base64':
      return decodeBase64(text)
    case 'xor':
      return xorTransform(text, node.config.key ?? '')
    default:
      return text
  }
}

export function validatePipeline(nodes) {
  const errors = []

  if (nodes.length < 3) {
    errors.push('At least 3 nodes are required to run the pipeline.')
  }

  nodes.forEach((node, index) => {
    if (node.type === 'caesar' && !Number.isFinite(Number(node.config.shift))) {
      errors.push(`Node ${index + 1}: Caesar shift must be a valid number.`)
    }

    if (node.type === 'xor' && !node.config.key?.trim()) {
      errors.push(`Node ${index + 1}: XOR key cannot be empty.`)
    }
  })

  return errors
}

export function runPipelineWithSteps(text, nodes) {
  let output = text
  const steps = []

  for (const node of nodes) {
    const input = output
    output = applyEncrypt(node, output)

    steps.push({
      id: node.id,
      type: node.type,
      node: NODE_META[node.type]?.label ?? node.type,
      input,
      output,
    })
  }

  return { final: output, steps }
}

export function runPipeline(text, nodes) {
  return runPipelineWithSteps(text, nodes).final
}

export function runReversePipeline(text, nodes) {
  let output = text

  for (const node of [...nodes].reverse()) {
    output = applyDecrypt(node, output)
  }

  return output
}

export function loadSavedNodes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return getDefaultNodes()
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return getDefaultNodes()
    }

    const normalized = parsed
      .filter((node) => node && NODE_META[node.type])
      .map((node) => ({
        id: node.id || crypto.randomUUID(),
        type: node.type,
        config: {
          ...NODE_META[node.type].defaults,
          ...(node.config || {}),
        },
      }))

    return normalized.length > 0 ? normalized : getDefaultNodes()
  } catch {
    return getDefaultNodes()
  }
}
