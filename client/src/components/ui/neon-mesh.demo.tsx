import NeonMesh from "@/components/ui/neon-mesh";

export default function DemoOne() {
  return (
    <div className="w-full h-screen">
      <NeonMesh
        title="ROUTER7"
        subtitle="Verlet Cloth Simulation"
        description="Interactive 3D Verlet physics cloth reacting to spatial vector force, perspective rotators, and kinetic drag."
      />
    </div>
  );
}
