"use client"

import * as React from "react"
import { cn } from "../../utils/utils-home"

interface FeyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const LockIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        d="M13.5 12.8053C14.2525 12.3146 14.75 11.4654 14.75 10.5C14.75 8.98122 13.5188 7.75 12 7.75C10.4812 7.75 9.25 8.98122 9.25 10.5C9.25 11.4654 9.74745 12.3146 10.5 12.8053L10.5 14.75C10.5 15.5784 11.1716 16.25 12 16.25C12.8284 16.25 13.5 15.5784 13.5 14.75L13.5 12.8053Z"
      />
      <circle
        cx="12"
        cy="12"
        r="9.25"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export function FeyButton({
  className,
  children,
  ...props
}: FeyButtonProps) {
  return (
    <button
    className={cn(
      "group relative flex items-center justify-center gap-1",
      "h-[20px] min-w-[136px] whitespace-nowrap rounded-[28px] px-4 py-6",
      "text-[24px] font-[500] leading-tight",
      "text-white",
      // Base gradient background
      "bg-gradient-to-r from-purple-600 to-pink-600",
      // Base shadows
      "shadow-lg shadow-purple-500/50",
      "border border-purple-400/50",
      // Hover effect
      "hover:shadow-xl hover:shadow-purple-500/70",
      "hover:scale-105",
      "transition-all duration-300",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}    
      {...props}
    >
      <span className="relative z-10 flex items-center gap-1 font-[500]">
        <LockIcon />
        {children}
      </span>
    </button>
  )
}