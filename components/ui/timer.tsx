import { useEffect, useState } from "react"

export function Timer({ isRunning }: { isRunning: boolean }) {
  const [time, setTime] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isRunning) {
      interval = setInterval(() => {
        setTime(t => t + 1)
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  const minutes = Math.floor(time / 60)
  const seconds = time % 60

  return (
    <div className="bg-black/50 text-white px-2 py-1 rounded text-sm font-mono">
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </div>
  )
} 