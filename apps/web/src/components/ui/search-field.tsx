'use client'

import { MagnifyingGlass, X } from '@phosphor-icons/react'
import type { ReactNode, Ref } from 'react'
import { strings } from '@/strings'

/** A search field: the one shape the board, the switcher and the home all search with. */
export function SearchField({
  value,
  onChange,
  inputRef,
  label,
  placeholder,
  icon,
}: {
  value: string
  onChange: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
  label: string
  placeholder: string
  icon?: ReactNode
}) {
  return (
    <label className="hd-search">
      {icon ?? <MagnifyingGlass weight="bold" aria-hidden="true" />}
      <span className="sr-only">{label}</span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
      />
      {value && (
        <button
          type="button"
          className="hd-clear"
          aria-label={strings.clearSearch}
          onClick={() => onChange('')}
        >
          <X weight="bold" />
        </button>
      )}
    </label>
  )
}
