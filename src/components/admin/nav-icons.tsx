type IconProps = {
  className?: string
}

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
}

export function TastingIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M8 3h8l-1 6.5a3 3 0 0 1-6 0L8 3Z" />
      <path d="M12 12.5V19" />
      <path d="M9 21h6" />
    </svg>
  )
}

export function WineIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M10 2h4v3.8c1.4.9 2 2.4 2 4.2v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-1.8.6-3.3 2-4.2V2Z" />
      <path d="M8.5 10h7" />
    </svg>
  )
}

export function InventoryIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M3 7.5 12 4l9 3.5" />
      <path d="M3 7.5v9L12 20l9-3.5v-9" />
      <path d="M3 7.5 12 11l9-3.5" />
      <path d="M12 11v9" />
    </svg>
  )
}

export function VineyardIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M12 3c4 1 6 4.2 6 8 0 4-2.7 7.2-6 9-3.3-1.8-6-5-6-9 0-3.8 2-7 6-8Z" />
      <path d="M12 3v17" />
    </svg>
  )
}

export function IntakeIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M3 8h18l-1.5 12a1.5 1.5 0 0 1-1.5 1.3H6a1.5 1.5 0 0 1-1.5-1.3L3 8Z" />
      <path d="M7 8V6a5 5 0 0 1 10 0v2" />
      <path d="M8.5 12v6" />
      <path d="M12 12v6" />
      <path d="M15.5 12v6" />
    </svg>
  )
}

export function FermentationIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M9.5 2h5" />
      <path d="M10.5 2v6.5L5.7 17a2 2 0 0 0 1.8 2.9h9a2 2 0 0 0 1.8-2.9l-4.8-8.5V2" />
      <circle cx="11" cy="15" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="13.3" cy="17.2" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
