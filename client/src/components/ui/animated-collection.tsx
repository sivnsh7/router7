"use client";

import { useState } from "react";
import {
  motion,
  LayoutGroup,
  AnimatePresence,
  type Transition,
} from "motion/react";
import {
  List,
  LayoutGrid,
  Layers,
  Star,
  Ticket,
  Camera,
  Paintbrush,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollectionItem {
  id: string;
  title: string;
  subtitle: string;
  idNumber: string;
  image: string;
  icon: LucideIcon;
}

const DEFAULT_ITEMS: CollectionItem[] = [
  {
    id: "1",
    title: "Cinematic Horizons",
    subtitle: "Photography",
    idNumber: "209",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    icon: Camera,
  },
  {
    id: "2",
    title: "Abstract Dreams",
    subtitle: "Digital Art",
    idNumber: "808",
    image:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80",
    icon: Paintbrush,
  },
];

export type ViewMode = "list" | "card" | "pack";

const snappySpring: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 30,
  mass: 1,
};

const fastFade: Transition = {
  duration: 0.1,
  ease: "linear",
};

export interface AnimatedCollectionProps {
  items?: CollectionItem[];
  title?: string;
  className?: string;
}

export function LayoutSwitcher({
  items = DEFAULT_ITEMS,
  title = "My Collection",
  className = "",
}: AnimatedCollectionProps) {
  const [view, setView] = useState<ViewMode>("list");

  return (
    <div
      className={cn(
        "w-full max-w-xl mx-auto p-4 md:p-8 font-sans selection:bg-clay/20",
        className
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-medium text-ink">{title}</h2>

          <div className="flex p-1 bg-paper-2 rounded-xl w-fit border border-ink/20 shadow-sm">
            <Tab
              active={view === "list"}
              onClick={() => setView("list")}
              icon={List}
              label="List view"
            />
            <Tab
              active={view === "card"}
              onClick={() => setView("card")}
              icon={LayoutGrid}
              label="Card view"
            />
            <Tab
              active={view === "pack"}
              onClick={() => setView("pack")}
              icon={Layers}
              label="Pack view"
            />
          </div>
        </div>

        <div className="h-px bg-ink/10 w-full" />

        {/* Content Section */}
        <div className="relative min-h-[350px] flex flex-col items-center">
          <LayoutGroup>
            <motion.div
              layout
              transition={snappySpring}
              className={cn(
                "w-full relative",
                view === "list" && "flex flex-col gap-4",
                view === "card" && "grid grid-cols-2 gap-4",
                view === "pack" && "h-64 flex items-center justify-center mt-8"
              )}
            >
              {items.map((item, index) => {
                const ItemIcon = item.icon;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    transition={snappySpring}
                    className={cn(
                      "relative flex items-center z-10",
                      view === "list" && "flex-row gap-4 w-full",
                      view === "card" && "flex-col gap-3 w-full items-start",
                      view === "pack" &&
                        "absolute w-56 h-56 items-center justify-center"
                    )}
                    style={{
                      zIndex: view === "pack" ? items.length - index : 1,
                    }}
                    animate={
                      view === "pack"
                        ? {
                            rotate: index === 0 ? -12 : 6,
                            x: index === 0 ? -25 : 25,
                            y: index === 0 ? -5 : 5,
                          }
                        : {
                            rotate: 0,
                            x: 0,
                            y: 0,
                          }
                    }
                  >
                    <motion.div
                      layout
                      transition={snappySpring}
                      className={cn(
                        "relative overflow-hidden shrink-0 bg-paper-2",
                        view === "list" &&
                          "w-16 h-16 rounded-xl border border-ink/15 shadow-sm",
                        view === "card" &&
                          "w-full aspect-square rounded-2xl border border-ink/15 shadow-sm",
                        view === "pack" &&
                          "w-full h-full rounded-2xl border border-ink/20 shadow-xl"
                      )}
                    >
                      <motion.img
                        layout
                        transition={snappySpring}
                        src={item.image}
                        alt={item.title}
                        className={cn(
                          "w-full h-full object-cover m-0! p-0! block",
                          view === "list" && "rounded-xl",
                          view === "card" && "rounded-2xl",
                          view === "pack" && "rounded-2xl"
                        )}
                      />
                    </motion.div>

                    <AnimatePresence mode="popLayout" initial={false}>
                      {view !== "pack" && (
                        <motion.div
                          key={`${item.id}-info`}
                          layout
                          initial={{
                            opacity: 0,
                            scale: 0.9,
                            filter: "blur(4px)",
                          }}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                          transition={fastFade}
                          className={cn(
                            "flex flex-1 justify-between items-center min-w-0",
                            view === "card" ? "w-full px-1" : "px-0"
                          )}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <motion.h3
                              layout
                              className="font-medium text-sm text-ink leading-tight truncate"
                            >
                              {item.title}
                            </motion.h3>
                            <motion.div
                              layout
                              className="text-ink-mute font-mono text-xs flex items-center gap-1.5"
                            >
                              <ItemIcon className="size-3 text-clay" />
                              <span className="truncate">{item.subtitle}</span>
                            </motion.div>
                          </div>

                          <motion.div
                            layout
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-clay/10 text-clay text-[11px] font-mono shrink-0 ml-2 border border-clay/20"
                          >
                            <Star className="size-2.5 text-amber-500 fill-amber-500" />
                            <span>#{item.idNumber}</span>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {view === "list" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute -bottom-2 left-20 right-0 h-px bg-ink/10"
                      />
                    )}
                  </motion.div>
                );
              })}
            </motion.div>

            <AnimatePresence>
              {view === "pack" && (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: 5, filter: "blur(5px)" }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="mt-16 text-center space-y-3 px-4 relative z-0"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-clay/15 text-clay text-xs font-mono tracking-wide border border-clay/30">
                    <Ticket className="size-3.5" />
                    <span>Bundle unlocked</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-all rounded-lg outline-none",
        active
          ? "text-paper-3 font-medium"
          : "text-ink-soft hover:text-ink hover:bg-paper-3"
      )}
    >
      {active && (
        <motion.div
          layoutId="active-tab"
          className="absolute inset-0 bg-ink rounded-lg shadow-sm"
          transition={snappySpring}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        <Icon
          className={cn(
            "size-3.5 transition-transform duration-300",
            active && "scale-105"
          )}
        />
        {label}
      </span>
    </button>
  );
}

export default LayoutSwitcher;
