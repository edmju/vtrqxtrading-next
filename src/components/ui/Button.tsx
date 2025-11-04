"use client";
import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function Button({ className, variant = "primary", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition-transform active:translate-y-[1px]";

  const v =
    variant === "primary"
      ? "bg-primary text-black shadow-glow hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary/40"
      : "text-primary border border-primary/30 hover:bg-primary/10";

  return <button className={cn(base, v, className)} {...props} />;
}
