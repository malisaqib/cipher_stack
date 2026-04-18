import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion, AnimatePresence } from "motion/react";
import {
  Play,
  Copy,
  FlaskConical,
  Plus,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import PipelineFlow from "./components/PipelineFlow";
import DebugPanel from "./components/DebugPanel";
import {
  NODE_META,
  NODE_TYPES,
  createNode,
  getDefaultPipeline,
  getSamplePipeline,
  loadPipelineFromStorage,
  savePipelineToStorage,
  runPipeline,
  runPipelineWithSteps,
  runReversePipeline,
  runReversePipelineWithSteps,
  validatePipeline,
} from "./utils/ciphers";

const STORAGE_KEY = "cipher-stack-v3";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildPreviewMap(steps) {
  return steps.reduce((acc, step) => {
    acc[step.id] = { input: step.input, output: step.output };
    return acc;
  }, {});
}

function moveItem(list, from, to) {
  if (to < 0 || to >= list.length) {
    return list;
  }

  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function App() {
  const [inputText, setInputText] = useState("hello");
  const [nodes, setNodes] = useState(() => loadPipelineFromStorage(STORAGE_KEY));
  const [selectedType, setSelectedType] = useState("caesar");

  const [liveMode, setLiveMode] = useState(true);
  const [showSteps, setShowSteps] = useState(true);
  const [mode, setMode] = useState("encrypt");
  const [decryptInput, setDecryptInput] = useState("");
  const [showDecryptionSteps, setShowDecryptionSteps] = useState(false);
  const [decryptionSteps, setDecryptionSteps] = useState([]);

  const [steps, setSteps] = useState([]);
  const [previewByNode, setPreviewByNode] = useState({});
  const [activeIndex, setActiveIndex] = useState(-1);
  const [phase, setPhase] = useState("idle");
  const [isRunning, setIsRunning] = useState(false);

  const [encryptedOutput, setEncryptedOutput] = useState("");
  const [decryptedOutput, setDecryptedOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const runTokenRef = useRef(0);

  useEffect(() => {
    savePipelineToStorage(STORAGE_KEY, nodes);
  }, [nodes]);

  const validation = useMemo(() => validatePipeline(nodes), [nodes]);
  const canExecute = validation.length === 0;

  const execute = useCallback(
    async ({ animated }) => {
      const token = ++runTokenRef.current;
      const issues = validatePipeline(nodes);

      if (issues.length > 0) {
        setError(issues[0]);
        setSteps([]);
        setDecryptionSteps([]);
        setPreviewByNode({});
        setEncryptedOutput("");
        setDecryptedOutput("");
        setActiveIndex(-1);
        setPhase("idle");
        setIsRunning(false);
        return;
      }

      try {
        setError("");

        const result = runPipelineWithSteps(inputText, nodes);
        const encrypted = runPipeline(inputText, nodes);
        const decrypted = runReversePipeline(encrypted, nodes);

        if (!animated) {
          setSteps(result.steps);
          setPreviewByNode(buildPreviewMap(result.steps));
          setEncryptedOutput(encrypted);
          setDecryptedOutput(decrypted);
          setDecryptionSteps([]);
          setActiveIndex(-1);
          setPhase("idle");
          setIsRunning(false);
          return;
        }

        setIsRunning(true);
        setSteps(result.steps);
        setDecryptionSteps([]);
        setPreviewByNode({});
        setEncryptedOutput("");
        setDecryptedOutput("");
        setActiveIndex(-1);
        setPhase("idle");

        const nextPreview = {};

        for (let i = 0; i < result.steps.length; i += 1) {
          if (runTokenRef.current !== token) return;

          const step = result.steps[i];

          setActiveIndex(i);
          setPhase("input");
          nextPreview[step.id] = {
            input: step.input,
            output: nextPreview[step.id]?.output || "",
          };
          setPreviewByNode({ ...nextPreview });

          await wait(180);
          if (runTokenRef.current !== token) return;

          setPhase("transform");
          await wait(220);
          if (runTokenRef.current !== token) return;

          nextPreview[step.id] = { input: step.input, output: step.output };
          setPreviewByNode({ ...nextPreview });
          setPhase("output");
          setEncryptedOutput(step.output);

          await wait(180);
          if (runTokenRef.current !== token) return;
        }

        if (runTokenRef.current !== token) return;

        setEncryptedOutput(encrypted);
        setDecryptedOutput(decrypted);
        setActiveIndex(-1);
        setPhase("idle");
        setIsRunning(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Pipeline execution failed.");
        setActiveIndex(-1);
        setPhase("idle");
        setIsRunning(false);
      }
    },
    [inputText, nodes]
  );

  useEffect(() => {
    if (!liveMode || mode !== "encrypt") return;

    const t = setTimeout(() => {
      execute({ animated: true });
    }, 300);

    return () => clearTimeout(t);
  }, [liveMode, inputText, nodes, execute, mode]);

  function executeDecryption() {
    const source = decryptInput.trim() || encryptedOutput;
    if (!source) {
      setError("Paste or generate encrypted text before decrypting.");
      setDecryptedOutput("");
      setDecryptionSteps([]);
      return;
    }

    try {
      const reverse = runReversePipelineWithSteps(source, nodes);
      setError("");
      setDecryptedOutput(reverse.final);
      setDecryptionSteps(reverse.steps);

      if (reverse.final !== inputText) {
        setError("Round-trip mismatch: decrypted text does not match original input.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decryption failed.");
      setDecryptedOutput("");
      setDecryptionSteps([]);
    }
  }

  function addNode() {
    setNodes((prev) => [...prev, createNode(selectedType)]);
  }

  function removeNode(id) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  }

  function duplicateNode(id) {
    setNodes((prev) => {
      const target = prev.find((n) => n.id === id);
      if (!target) return prev;
      return [
        ...prev,
        {
          ...target,
          id: crypto.randomUUID(),
          config: { ...target.config },
        },
      ];
    });
  }

  function moveUp(index) {
    setNodes((prev) => moveItem(prev, index, index - 1));
  }

  function moveDown(index) {
    setNodes((prev) => moveItem(prev, index, index + 1));
  }

  function changeType(id, type) {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, type, config: { ...NODE_META[type].defaults } } : n
      )
    );
  }

  function changeConfig(id, key, value) {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        return { ...n, config: { ...n.config, [key]: value } };
      })
    );
  }

  function loadSample() {
    setNodes(getSamplePipeline());
    setInputText("hackathon signal packet");
  }

  function resetPipeline() {
    setNodes(getDefaultPipeline());
    setInputText("hello");
    setDecryptInput("");
    setSteps([]);
    setDecryptionSteps([]);
    setPreviewByNode({});
    setEncryptedOutput("");
    setDecryptedOutput("");
    setError("");
    setActiveIndex(-1);
    setPhase("idle");
  }

  async function copyOutput() {
    if (!encryptedOutput) return;
    try {
      await navigator.clipboard.writeText(encryptedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Unable to copy output on this browser.");
    }
  }

  const integrityPass =
    encryptedOutput !== "" && decryptedOutput === inputText && !error;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="min-h-screen px-4 py-6 md:px-8"
        style={{
          background:
            "radial-gradient(circle at 5% 0%, rgba(34,197,94,0.15), transparent 32%), radial-gradient(circle at 100% 0%, rgba(14,165,233,0.16), transparent 40%)",
        }}
      >
        <div className="mx-auto max-w-[1500px] space-y-5">
          <header className="rounded-2xl border border-cyan-400/35 bg-slate-900/70 p-5 shadow-[0_0_50px_rgba(14,165,233,0.08)] md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">
                  Cipher Stack Visualizer
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-50 md:text-4xl">
                  Real-Time Encryption Flow
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
                  Watch text move through each cipher node with smooth, sequential
                  animation.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadSample}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 transition hover:shadow-[0_0_18px_rgba(34,197,94,0.35)]"
                >
                  <FlaskConical size={16} />
                  Load Sample Pipeline
                </button>
                <button
                  type="button"
                  onClick={resetPipeline}
                  className="rounded-xl border border-slate-500/40 bg-slate-800/70 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-300/50"
                >
                  Reset
                </button>
              </div>
            </div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_1.7fr_1.05fr]">
            <Motion.article
              layout
              className="rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-4 shadow-[0_0_30px_rgba(14,165,233,0.05)] md:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-cyan-200">Input</h2>
                {mode === "encrypt" && (
                  <label className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-slate-800/70 px-3 py-2 text-[11px] uppercase tracking-wider text-cyan-200">
                    <input
                      type="checkbox"
                      checked={liveMode}
                      onChange={(e) => setLiveMode(e.target.checked)}
                      className="accent-emerald-400"
                    />
                    Live Mode {liveMode ? "ON" : "OFF"}
                  </label>
                )}
              </div>

              <textarea
                value={mode === "encrypt" ? inputText : decryptInput}
                onChange={(e) =>
                  mode === "encrypt"
                    ? setInputText(e.target.value)
                    : setDecryptInput(e.target.value)
                }
                placeholder={
                  mode === "encrypt"
                    ? "Enter your secret message..."
                    : "Paste encrypted output to decrypt..."
                }
                className="h-44 w-full rounded-xl border border-cyan-500/25 bg-slate-950/70 p-3 text-slate-50 outline-none transition focus:border-emerald-300"
              />

              <div className="mt-4 space-y-3 rounded-xl border border-cyan-500/20 bg-slate-950/60 p-3">
                <label className="block text-xs uppercase tracking-wider text-slate-400">
                  Add node type
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-slate-900 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300"
                  >
                    {NODE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {NODE_META[type].label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={addNode}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 transition hover:shadow-[0_0_14px_rgba(34,197,94,0.35)]"
                >
                  <Plus size={16} />
                  Add Node
                </button>
              </div>
            </Motion.article>

            <Motion.article
              layout
              className="rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-4 shadow-[0_0_30px_rgba(14,165,233,0.05)] md:p-5"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-cyan-200">Pipeline</h2>
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex overflow-hidden rounded-xl border border-cyan-400/35">
                    <button
                      type="button"
                      onClick={() => setMode("encrypt")}
                      className={`px-3 py-2 text-xs uppercase tracking-wider transition ${
                        mode === "encrypt"
                          ? "bg-emerald-400/20 text-emerald-200"
                          : "bg-slate-800/70 text-slate-300"
                      }`}
                    >
                      Encrypt
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("decrypt")}
                      className={`px-3 py-2 text-xs uppercase tracking-wider transition ${
                        mode === "decrypt"
                          ? "bg-cyan-400/20 text-cyan-100"
                          : "bg-slate-800/70 text-slate-300"
                      }`}
                    >
                      Decrypt
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      mode === "encrypt"
                        ? execute({ animated: true })
                        : executeDecryption()
                    }
                    disabled={mode === "encrypt" ? !canExecute || isRunning : !canExecute}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 transition disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:shadow-[0_0_14px_rgba(34,197,94,0.35)]"
                  >
                    <Play size={16} />
                    {mode === "encrypt" ? (isRunning ? "Running..." : "Encrypt") : "Decrypt"}
                  </button>

                  <label className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-slate-800/70 px-3 py-2 text-[11px] uppercase tracking-wider text-cyan-200">
                    <input
                      type="checkbox"
                      checked={showSteps}
                      onChange={(e) => setShowSteps(e.target.checked)}
                      className="accent-emerald-400"
                    />
                    Show Steps
                  </label>
                </div>
              </div>

              {mode === "decrypt" && (
                <label className="mb-4 inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-slate-800/70 px-3 py-2 text-[11px] uppercase tracking-wider text-cyan-200">
                  <input
                    type="checkbox"
                    checked={showDecryptionSteps}
                    onChange={(e) => setShowDecryptionSteps(e.target.checked)}
                    className="accent-emerald-400"
                  />
                  Show Decryption Steps
                </label>
              )}

              {!canExecute && (
                <div className="mb-4 rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-200">
                  {validation[0]}
                </div>
              )}

              <PipelineFlow
                nodes={nodes}
                activeIndex={activeIndex}
                phase={phase}
                previewByNode={previewByNode}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                onRemove={removeNode}
                onDuplicate={duplicateNode}
                onTypeChange={changeType}
                onConfigChange={changeConfig}
              />

              <AnimatePresence>
                {showSteps && steps.length > 0 ? (
                  <DebugPanel key="debug-panel" steps={steps} />
                ) : null}
              </AnimatePresence>

              {mode === "decrypt" && showDecryptionSteps && decryptionSteps.length > 0 && (
                <div className="mt-4 rounded-xl border border-cyan-500/20 bg-slate-950/70 p-3">
                  <p className="text-xs uppercase tracking-wider text-cyan-300">Decryption Steps</p>
                  <ol className="mt-2 space-y-1">
                    {decryptionSteps.map((step, index) => (
                      <li key={step.id} className="font-mono text-xs text-slate-300">
                        Step {index + 1}: {step.label}{" -> "}{step.output || "<empty>"}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </Motion.article>

            <Motion.article
              layout
              className="rounded-2xl border border-cyan-400/25 bg-slate-900/70 p-4 shadow-[0_0_30px_rgba(14,165,233,0.05)] md:p-5"
            >
              <h2 className="text-lg font-semibold text-cyan-200">Output</h2>

              <label className="mt-3 block text-xs uppercase tracking-wider text-slate-400">
                Encrypted Output
              </label>
              <textarea
                readOnly
                value={mode === "decrypt" ? decryptInput || encryptedOutput : encryptedOutput}
                className="mt-1 h-36 w-full rounded-xl border border-cyan-500/25 bg-slate-950/70 p-3 font-mono text-sm text-emerald-200"
              />

              <div className="mt-2">
                <button
                  type="button"
                  onClick={copyOutput}
                  disabled={!encryptedOutput}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 transition disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:shadow-[0_0_14px_rgba(14,165,233,0.35)]"
                >
                  <Copy size={16} />
                  {copied ? "Copied" : "Copy Output"}
                </button>
              </div>

              <label className="mt-4 block text-xs uppercase tracking-wider text-slate-400">
                Decrypted Output
              </label>
              <textarea
                readOnly
                value={decryptedOutput}
                className="mt-1 h-28 w-full rounded-xl border border-cyan-500/25 bg-slate-950/70 p-3 font-mono text-sm text-cyan-100"
              />

              {encryptedOutput && (
                <p
                  className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                    integrityPass
                      ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                      : "border-rose-400/50 bg-rose-400/10 text-rose-200"
                  }`}
                >
                  {integrityPass ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  {integrityPass
                    ? "Integrity check passed"
                    : "Integrity check failed"}
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-lg border border-rose-400/50 bg-rose-400/10 p-2 text-sm text-rose-200">
                  {error}
                </p>
              )}
            </Motion.article>
          </section>
        </div>
      </div>
    </main>
  );
}

