import { motion as Motion, AnimatePresence } from "motion/react";
import {
  Binary,
  ChevronDown,
  ChevronUp,
  CopyPlus,
  FlipHorizontal,
  KeyRound,
  Lock,
  Trash2,
} from "lucide-react";
import { NODE_META, NODE_TYPES } from "../utils/ciphers";

const ICONS = {
  Lock,
  FlipHorizontal,
  Binary,
  KeyRound,
};

function preview(value) {
  if (!value) return "<empty>";
  if (value.length <= 30) return value;
  return `${value.slice(0, 27)}...`;
}

export default function NodeCard({
  node,
  index,
  isActive,
  phase,
  nodePreview,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDuplicate,
  onTypeChange,
  onConfigChange,
}) {
  const Icon = ICONS[NODE_META[node.type]?.icon] ?? Lock;

  return (
    <Motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isActive ? 1.05 : 1,
      }}
      transition={{ duration: 0.28, ease: "easeInOut" }}
      className={`rounded-xl border bg-slate-900/85 p-4 transition ${
        isActive
          ? "border-emerald-400 shadow-[0_0_22px_rgba(34,197,94,0.42)]"
          : "border-cyan-400/30 shadow-[0_0_14px_rgba(14,165,233,0.12)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-200">
            <Icon size={16} />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">
              Node {index + 1}
            </p>
            <p className="text-sm font-semibold text-slate-100">
              {NODE_META[node.type].label}
            </p>
          </div>
        </div>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            className="rounded-lg border border-cyan-400/30 bg-slate-800/70 p-1.5 text-cyan-200 transition hover:border-cyan-300"
            aria-label="Move node up"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="rounded-lg border border-cyan-400/30 bg-slate-800/70 p-1.5 text-cyan-200 transition hover:border-cyan-300"
            aria-label="Move node down"
          >
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-lg border border-cyan-400/30 bg-slate-800/70 p-1.5 text-cyan-200 transition hover:border-cyan-300"
            aria-label="Duplicate node"
          >
            <CopyPlus size={14} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-rose-400/40 bg-rose-400/10 p-1.5 text-rose-200 transition hover:border-rose-300"
            aria-label="Remove node"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-400">{NODE_META[node.type].description}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] uppercase tracking-wider text-slate-400">
          Cipher
          <select
            value={node.type}
            onChange={(e) => onTypeChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300"
          >
            {NODE_TYPES.map((type) => (
              <option key={type} value={type}>
                {NODE_META[type].label}
              </option>
            ))}
          </select>
        </label>

        {node.type === "caesar" && (
          <label className="text-[11px] uppercase tracking-wider text-slate-400">
            Shift
            <input
              type="number"
              value={node.config.shift ?? 0}
              onChange={(e) => onConfigChange("shift", e.target.value)}
              className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300"
            />
          </label>
        )}

        {node.type === "xor" && (
          <label className="text-[11px] uppercase tracking-wider text-slate-400">
            Key
            <input
              type="text"
              value={node.config.key ?? ""}
              onChange={(e) => onConfigChange("key", e.target.value)}
              placeholder="Enter key"
              className="mt-1 w-full rounded-lg border border-cyan-500/30 bg-slate-950 px-2 py-2 text-sm text-slate-100 outline-none focus:border-emerald-300"
            />
          </label>
        )}
      </div>

      <Motion.div
        className="mt-3 rounded-lg border border-cyan-400/25 bg-slate-950/70 p-2"
        animate={{ opacity: isActive ? 1 : 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatePresence mode="wait">
          <Motion.div
            key={`${node.id}-${phase}`}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="space-y-1"
          >
            <p className="font-mono text-xs text-emerald-200">In: {preview(nodePreview?.input)}</p>
            <p className="font-mono text-xs text-cyan-100">Out: {preview(nodePreview?.output)}</p>
          </Motion.div>
        </AnimatePresence>
      </Motion.div>
    </Motion.article>
  );
}

