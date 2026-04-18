export const NODE_META = {
  caesar: {
    label: "Caesar",
    icon: "Lock",
    description: "Character shift cipher",
    defaults: { shift: 3 },
  },
  reverse: {
    label: "Reverse",
    icon: "FlipHorizontal",
    description: "Mirror text order",
    defaults: {},
  },
  base64: {
    label: "Base64",
    icon: "Binary",
    description: "Binary-safe encoding",
    defaults: {},
  },
  xor: {
    label: "XOR",
    icon: "KeyRound",
    description: "Keyed bitwise transform",
    defaults: { key: "hack" },
  },
};

export const NODE_TYPES = Object.keys(NODE_META);

export function createNode(type) {
  return {
    id: crypto.randomUUID(),
    type,
    config: { ...NODE_META[type].defaults },
  };
}

export function getDefaultPipeline() {
  return [createNode("caesar"), createNode("reverse"), createNode("base64")];
}

export function getSamplePipeline() {
  return [
    { id: crypto.randomUUID(), type: "caesar", config: { shift: 4 } },
    { id: crypto.randomUUID(), type: "xor", config: { key: "vyro" } },
    { id: crypto.randomUUID(), type: "base64", config: {} },
  ];
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary);
}

function base64ToUtf8(base64) {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function caesar(text, shift) {
  return text
    .split("")
    .map((ch) => String.fromCharCode(ch.charCodeAt(0) + shift))
    .join("");
}

function reverse(text) {
  return text.split("").reverse().join("");
}

function xor(text, key) {
  if (!key) return text;
  return text
    .split("")
    .map((ch, i) => {
      const k = key.charCodeAt(i % key.length);
      return String.fromCharCode(ch.charCodeAt(0) ^ k);
    })
    .join("");
}

function encryptNode(node, text) {
  switch (node.type) {
    case "caesar":
      return caesar(text, Number(node.config.shift) || 0);
    case "reverse":
      return reverse(text);
    case "base64":
      return utf8ToBase64(text);
    case "xor":
      return xor(text, node.config.key ?? "");
    default:
      return text;
  }
}

function decryptNode(node, text) {
  switch (node.type) {
    case "caesar":
      return caesar(text, -(Number(node.config.shift) || 0));
    case "reverse":
      return reverse(text);
    case "base64":
      return base64ToUtf8(text);
    case "xor":
      return xor(text, node.config.key ?? "");
    default:
      return text;
  }
}

export function validatePipeline(nodes) {
  const errors = [];

  if (nodes.length < 3) {
    errors.push("At least 3 nodes are required to run the pipeline.");
  }

  nodes.forEach((node, index) => {
    if (!NODE_META[node.type]) {
      errors.push(`Node ${index + 1}: Invalid cipher type.`);
      return;
    }

    if (node.type === "caesar") {
      const n = Number(node.config.shift);
      if (!Number.isFinite(n)) {
        errors.push(`Node ${index + 1}: Caesar shift must be a valid number.`);
      }
    }

    if (node.type === "xor" && !String(node.config.key ?? "").trim()) {
      errors.push(`Node ${index + 1}: XOR key cannot be empty.`);
    }
  });

  return errors;
}

export function runPipelineWithSteps(text, nodes) {
  let output = text;
  const steps = [];

  for (const node of nodes) {
    const input = output;
    output = encryptNode(node, output);

    steps.push({
      id: node.id,
      type: node.type,
      node: NODE_META[node.type]?.label ?? node.type,
      input,
      output,
    });
  }

  return { final: output, steps };
}

export function runPipeline(text, nodes) {
  return runPipelineWithSteps(text, nodes).final;
}

export function runReversePipeline(text, nodes) {
  let output = text;
  for (const node of [...nodes].reverse()) {
    output = decryptNode(node, output);
  }
  return output;
}

function reverseStepLabel(node) {
  switch (node.type) {
    case "base64":
      return "Base64 Decode";
    case "reverse":
      return "Reverse";
    case "caesar":
      return `Caesar(-${Number(node.config.shift) || 0})`;
    case "xor":
      return `XOR(${node.config.key || ""})`;
    default:
      return NODE_META[node.type]?.label ?? node.type;
  }
}

export function runReversePipelineWithSteps(text, nodes) {
  let output = text;
  const steps = [];

  for (const node of [...nodes].reverse()) {
    output = decryptNode(node, output);
    steps.push({
      id: node.id,
      label: reverseStepLabel(node),
      output,
    });
  }

  return { final: output, steps };
}

export function loadPipelineFromStorage(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return getDefaultPipeline();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return getDefaultPipeline();

    const normalized = parsed
      .filter((n) => n && NODE_META[n.type])
      .map((n) => ({
        id: n.id || crypto.randomUUID(),
        type: n.type,
        config: { ...NODE_META[n.type].defaults, ...(n.config || {}) },
      }));

    return normalized.length > 0 ? normalized : getDefaultPipeline();
  } catch {
    return getDefaultPipeline();
  }
}

export function savePipelineToStorage(storageKey, nodes) {
  localStorage.setItem(storageKey, JSON.stringify(nodes));
}
