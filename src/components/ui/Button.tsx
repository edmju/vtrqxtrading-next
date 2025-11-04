"use client";
import * as React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  asChild?: boolean;
};

export default function Button({ className, variant = "primary", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-transform active:translate-y-[1px]";

  const variants = {
    primary:
      "bg-primary text-black shadow-glow hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/40",
    ghost:
      "text-primary border border-primary/30 hover:bg-primary/10",
  } as const;

  return <button className={clsx(base, variants[variant], className)} {...props} />;
}
