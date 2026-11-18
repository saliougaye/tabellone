'use client'

import { useNow } from '@/lib/format'
import { formatTime } from '@/lib/presentation'
import { strings } from '@/strings'

/** Hours and minutes with a blinking colon; ticks every second so the colon and the minute are true. */
export function ClockFace() {
  const now = useNow(1000)
  const [hours, minutes] = formatTime(now.toISOString()).split(':')
  return (
    <span className="hd-clock" role="timer" aria-label={strings.clockAria(`${hours}:${minutes}`)}>
      {hours}
      <i>:</i>
      {minutes}
    </span>
  )
}
