import { motion as Motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import NodeCard from "./NodeCard";

function Connector({ active }) {
  return (
    <div className="relative mx-auto my-2 h-8 w-full max-w-20">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-cyan-400/35" />
      <ArrowRight className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/80" />

      <AnimatePresence>
        {active ? (
          <Motion.div
            key="flow-dot"
            initial={{ x: -6, opacity: 0 }}
            animate={{ x: 70, opacity: [0, 1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(34,197,94,0.95)]"
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function PipelineFlow({
  nodes,
  activeIndex,
  phase,
  previewByNode,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDuplicate,
  onTypeChange,
  onConfigChange,
}) {
  return (
    <section className="space-y-1">
      {nodes.map((node, index) => (
        <div key={node.id}>
          <NodeCard
            node={node}
            index={index}
            isActive={activeIndex === index}
            phase={phase}
            nodePreview={previewByNode[node.id]}
            onMoveUp={() => onMoveUp(index)}
            onMoveDown={() => onMoveDown(index)}
            onRemove={() => onRemove(node.id)}
            onDuplicate={() => onDuplicate(node.id)}
            onTypeChange={(nextType) => onTypeChange(node.id, nextType)}
            onConfigChange={(key, value) => onConfigChange(node.id, key, value)}
          />

          {index < nodes.length - 1 && (
            <Connector active={activeIndex === index && phase !== "input"} />
          )}
        </div>
      ))}
    </section>
  );
}

