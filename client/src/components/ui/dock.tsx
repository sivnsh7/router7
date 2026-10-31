"use client";

import React, { useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;

const dockVariants = cva(
  "mx-auto flex h-[58px] w-max items-center justify-center gap-2 rounded-2xl border border-ink/20 bg-paper-2/80 p-2 backdrop-blur-md shadow-sm"
);

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string;
  magnification?: number;
  distance?: number;
  direction?: "top" | "middle" | "bottom";
  children: React.ReactNode;
}

export function Dock({
  className,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  direction = "bottom",
  children,
  ...props
}: DockProps) {
  const mouseX = useMotionValue(Infinity);

  const renderChildren = () => {
    return React.Children.map(children, (child) => {
      if (React.isValidElement<DockIconProps>(child) && child.type === DockIcon) {
        return React.cloneElement(child, {
          ...(child.props as Record<string, unknown>),
          mouseX,
          magnification,
          distance,
        });
      }
      return child;
    });
  };

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(dockVariants({ className }), {
        "items-start": direction === "top",
        "items-center": direction === "middle",
        "items-end": direction === "bottom",
      })}
      {...props}
    >
      {renderChildren()}
    </motion.div>
  );
}

export interface DockIconProps {
  size?: number;
  magnification?: number;
  distance?: number;
  mouseX?: MotionValue<number>;
  className?: string;
  children?: React.ReactNode;
}

export function DockIcon({
  size = 40,
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  ...props
}: DockIconProps) {
  const ref = useRef<HTMLDivElement>(null);

  const padding = Math.max(6, size * 0.2);
  const defaultMouseX = useMotionValue(Infinity);
  const activeMouseX = mouseX || defaultMouseX;

  const distanceCalc = useTransform(activeMouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(
    distanceCalc,
    [-distance, 0, distance],
    [size, magnification, size]
  );

  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <motion.div
      ref={ref}
      style={{ width, height: width, padding }}
      className={cn(
        "flex aspect-square cursor-pointer items-center justify-center rounded-xl bg-paper-3 text-ink-soft hover:text-ink transition-colors border border-ink/15 shadow-xs",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export { dockVariants };
export default Dock;
