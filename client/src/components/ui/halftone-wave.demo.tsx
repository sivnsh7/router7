import HalftoneWave from "@/components/ui/halftone-wave";

export default function HalftoneWaveDemo() {
  return (
    <div className="relative w-full h-96 rounded-2xl border border-ink/20 bg-paper-2 overflow-hidden flex items-center justify-center">
      <HalftoneWave className="absolute inset-0" />
      <div className="relative z-10 text-center pointer-events-none">
        <h3 className="font-mono text-2xl font-bold text-ink">Halftone Wave</h3>
        <p className="font-mono text-xs text-ink-mute mt-1">Procedural soft noise wave with mouse ripple</p>
      </div>
    </div>
  );
}
