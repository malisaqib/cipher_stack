import { motion as Motion, AnimatePresence } from "motion/react";

function trim(value) {
  if (!value) return "<empty>";
  if (value.length <= 80) return value;
  return `${value.slice(0, 77)}...`;
}

export default function DebugPanel({ steps }) {
  return (
    <Motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="mt-4 rounded-xl border border-cyan-400/30 bg-slate-900/75 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-[0.2em] text-cyan-300">
          Debug Steps
        </h3>
        <span className="rounded-md border border-cyan-400/30 px-2 py-1 text-xs text-cyan-200">
          {steps.length} step{steps.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {steps.map((step, i) => (
            <Motion.article
              key={step.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="rounded-xl border border-cyan-500/20 bg-slate-950/70 p-3"
            >
              <p className="text-sm font-semibold text-cyan-200">
                Step {i + 1}: {step.node}
              </p>

              <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">
                Input
              </p>
              <p className="mt-1 break-all rounded-md bg-slate-900 p-2 font-mono text-xs text-emerald-200">
                {trim(step.input)}
              </p>

              <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">
                Output
              </p>
              <p className="mt-1 break-all rounded-md bg-slate-900 p-2 font-mono text-xs text-cyan-100">
                {trim(step.output)}
              </p>
            </Motion.article>
          ))}
        </AnimatePresence>
      </div>
    </Motion.section>
  );
}

