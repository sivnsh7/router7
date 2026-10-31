import { Dock, DockIcon } from "@/components/ui/dock";
import { MessageSquare, GitFork, Cpu, KeyRound, Activity, BarChart2 } from "lucide-react";

export default function DockDemo() {
  return (
    <div className="flex items-center justify-center p-8">
      <Dock>
        <DockIcon>
          <MessageSquare className="size-5" />
        </DockIcon>
        <DockIcon>
          <GitFork className="size-5" />
        </DockIcon>
        <DockIcon>
          <Cpu className="size-5" />
        </DockIcon>
        <DockIcon>
          <KeyRound className="size-5" />
        </DockIcon>
        <DockIcon>
          <Activity className="size-5" />
        </DockIcon>
        <DockIcon>
          <BarChart2 className="size-5" />
        </DockIcon>
      </Dock>
    </div>
  );
}
