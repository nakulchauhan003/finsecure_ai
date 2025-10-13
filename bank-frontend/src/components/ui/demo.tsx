import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Waves } from "./waves-background.tsx"

function WavesDemo() {
  const { theme } = useTheme()
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      setReduced(mq.matches)
      const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
      mq.addEventListener?.('change', onChange)
      return () => mq.removeEventListener?.('change', onChange)
    }
  }, [])

  if (reduced) return null

  return (
    <div className="fixed inset-0 -z-10 w-full h-full pointer-events-none">
        <Waves
          lineColor={theme === "dark" ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)"}
          backgroundColor="transparent"
          waveSpeedX={0.012}
          waveSpeedY={0.006}
          waveAmpX={28}
          waveAmpY={14}
          friction={0.92}
          tension={0.006}
          maxCursorMove={90}
          xGap={16}
          yGap={48}
          targetFPS={24}
        />
    </div>
  )
}

export { WavesDemo }
