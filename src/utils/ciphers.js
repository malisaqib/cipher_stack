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
  vigenere: {
    label: "Vigenere",
    icon: "KeyRound",
    description: "Alphabetic keyed substitution",
    defaults: { key: "secret" },
  },
  railFence: {
    label: "Rail Fence",
    icon: "KeyRound",
    description: "Zig-zag transposition cipher",
    defaults: { rails: 3 },
  },
  columnar: {
    label: "Columnar",
    icon: "KeyRound",
    description: "Columnar transposition cipher",
    defaults: { key: "ZEBRA" },
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

function shiftAlphaChar(char, shift) {
  const code = char.charCodeAt(0);
  const isUpper = code >= 65 && code <= 90;
  const isLower = code >= 97 && code <= 122;
  if (!isUpper && !isLower) {
    return char;
  }

  const base = isUpper ? 65 : 97;
  const normalized = code - base;
  const shifted = (normalized + shift + 26) % 26;
  return String.fromCharCode(base + shifted);
}

function vigenereEncrypt(text, key) {
  if (!key) return text;

  const shifts = key
    .toLowerCase()
    .split("")
    .filter((ch) => ch >= "a" && ch <= "z")
    .map((ch) => ch.charCodeAt(0) - 97);

  if (shifts.length === 0) return text;

  let keyIndex = 0;
  return text
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      const isAlpha =
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122);
      if (!isAlpha) return ch;

      const shift = shifts[keyIndex % shifts.length];
      keyIndex += 1;
      return shiftAlphaChar(ch, shift);
    })
    .join("");
}

function vigenereDecrypt(text, key) {
  if (!key) return text;

  const shifts = key
    .toLowerCase()
    .split("")
    .filter((ch) => ch >= "a" && ch <= "z")
    .map((ch) => ch.charCodeAt(0) - 97);

  if (shifts.length === 0) return text;

  let keyIndex = 0;
  return text
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      const isAlpha =
        (code >= 65 && code <= 90) ||
        (code >= 97 && code <= 122);
      if (!isAlpha) return ch;

      const shift = shifts[keyIndex % shifts.length];
      keyIndex += 1;
      return shiftAlphaChar(ch, -shift);
    })
    .join("");
}

function railFenceEncrypt(text, rails) {
  const railCount = Number(rails) || 2;
  if (railCount < 2 || text.length <= 1) {
    return text;
  }

  const fence = Array.from({ length: railCount }, () => []);
  let row = 0;
  let direction = 1;

  for (const char of text) {
    fence[row].push(char);
    if (row === 0) direction = 1;
    if (row === railCount - 1) direction = -1;
    row += direction;
  }

  return fence.flat().join("");
}

function railFenceDecrypt(text, rails) {
  const railCount = Number(rails) || 2;
  if (railCount < 2 || text.length <= 1) {
    return text;
  }

  const pattern = [];
  let row = 0;
  let direction = 1;
  for (let i = 0; i < text.length; i += 1) {
    pattern.push(row);
    if (row === 0) direction = 1;
    if (row === railCount - 1) direction = -1;
    row += direction;
  }

  const counts = Array(railCount).fill(0);
  pattern.forEach((r) => {
    counts[r] += 1;
  });

  const railsData = Array.from({ length: railCount }, () => []);
  let index = 0;
  for (let r = 0; r < railCount; r += 1) {
    railsData[r] = text.slice(index, index + counts[r]).split("");
    index += counts[r];
  }

  const railPointers = Array(railCount).fill(0);
  return pattern
    .map((r) => {
      const char = railsData[r][railPointers[r]];
      railPointers[r] += 1;
      return char;
    })
    .join("");
}

function getColumnOrder(key) {
  return key
    .split("")
    .map((char, index) => ({ char, index }))
    .sort((a, b) => {
      if (a.char < b.char) return -1;
      if (a.char > b.char) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.index);
}

function columnarEncrypt(text, key) {
  if (!key) return text;
  const cleanKey = String(key);
  const columns = cleanKey.length;
  if (columns < 2) return text;

  const rows = Math.ceil(text.length / columns);
  const grid = Array.from({ length: rows }, () => Array(columns).fill(""));

  let pointer = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      grid[r][c] = text[pointer] ?? "";
      pointer += 1;
    }
  }

  const order = getColumnOrder(cleanKey);
  let output = "";
  for (const col of order) {
    for (let r = 0; r < rows; r += 1) {
      output += grid[r][col];
    }
  }

  return output;
}

function columnarDecrypt(text, key) {
  if (!key) return text;
  const cleanKey = String(key);
  const columns = cleanKey.length;
  if (columns < 2 || text.length === 0) return text;

  const rows = Math.ceil(text.length / columns);
  const fullCells = text.length;
  const colLengths = Array(columns).fill(rows);

  const remainder = fullCells % columns;
  if (remainder !== 0) {
    for (let c = remainder; c < columns; c += 1) {
      colLengths[c] -= 1;
    }
  }

  const order = getColumnOrder(cleanKey);
  const columnsData = Array(columns).fill("");
  let pointer = 0;
  for (const col of order) {
    const len = colLengths[col];
    columnsData[col] = text.slice(pointer, pointer + len);
    pointer += len;
  }

  const colPointers = Array(columns).fill(0);
  let output = "";
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const columnText = columnsData[c];
      const p = colPointers[c];
      if (p < columnText.length) {
        output += columnText[p];
        colPointers[c] += 1;
      }
    }
  }

  return output;
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
    case "vigenere":
      return vigenereEncrypt(text, String(node.config.key ?? ""));
    case "railFence":
      return railFenceEncrypt(text, Number(node.config.rails) || 2);
    case "columnar":
      return columnarEncrypt(text, String(node.config.key ?? ""));
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
    case "vigenere":
      return vigenereDecrypt(text, String(node.config.key ?? ""));
    case "railFence":
      return railFenceDecrypt(text, Number(node.config.rails) || 2);
    case "columnar":
      return columnarDecrypt(text, String(node.config.key ?? ""));
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

    if (node.type === "vigenere" && !String(node.config.key ?? "").trim()) {
      errors.push(`Node ${index + 1}: Vigenere key cannot be empty.`);
    }

    if (node.type === "railFence") {
      const rails = Number(node.config.rails);
      if (!Number.isInteger(rails) || rails < 2) {
        errors.push(`Node ${index + 1}: Rail Fence rails must be an integer >= 2.`);
      }
    }

    if (node.type === "columnar" && !String(node.config.key ?? "").trim()) {
      errors.push(`Node ${index + 1}: Columnar key cannot be empty.`);
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
    case "vigenere":
      return `Vigenere(${node.config.key || ""})`;
    case "railFence":
      return `Rail Fence(${Number(node.config.rails) || 2})`;
    case "columnar":
      return `Columnar(${node.config.key || ""})`;
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
