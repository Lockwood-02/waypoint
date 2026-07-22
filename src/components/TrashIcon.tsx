type TrashIconProps = {
  className?: string
}

export function TrashIcon({ className = 'h-4 w-4' }: TrashIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m7 6 1 14h8l1-14" />
      <path d="M10 10v6M14 10v6" />
    </svg>
  )
}
