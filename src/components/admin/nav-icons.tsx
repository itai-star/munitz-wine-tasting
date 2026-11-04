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

export function RemoteMonitorIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8" />
      <path d="M12 16v4" />
      <path d="M7 9.5c1.5-1.3 3-2 5-2s3.5.7 5 2" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function VineyardMonitorIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M12 21v-9" />
      <path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5Z" />
      <path d="M12 15c0-2.5-1.8-4.5-4.5-4.5 0 2.5 1.8 4.5 4.5 4.5Z" />
      <path d="M6 21h12" />
      <path d="M7 5.5c1.4-1.2 3-1.8 5-1.8s3.6.6 5 1.8" />
    </svg>
  )
}

export function CreditIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  )
}

export function SeasonSummaryIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M4 20V11" />
      <path d="M10 20V6" />
      <path d="M16 20v-8" />
      <path d="M3 20h18" />
    </svg>
  )
}

export function FinishedWineIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M6 21h6" />
      <path d="M9 15v6" />
      <path d="M4 4h10l-1.2 8.4a3.8 3.8 0 0 1-3.8 3.6c-2 0-3.6-1.6-3.8-3.6L4 4Z" />
      <path d="M4 4h10" />
      <path d="M18 8v9a2 2 0 0 1-2 2" />
      <path d="M16 4h4l-.8 4.5a1.6 1.6 0 0 1-1.6 1.5 1.6 1.6 0 0 1-1.6-1.5L16 4Z" />
    </svg>
  )
}

export function GrapesIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M12 3c0 2-1 3-3 3" />
      <path d="M12 3c1 1.5 2.5 2 4 1.5" />
      <circle cx="8.5" cy="10" r="2.2" />
      <circle cx="13.5" cy="10" r="2.2" />
      <circle cx="11" cy="14.2" r="2.2" />
      <circle cx="16" cy="14.2" r="2.2" />
      <circle cx="13.5" cy="18.4" r="2.2" />
    </svg>
  )
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6 10.5V19h12v-8.5" />
      <path d="M10 19v-5h4v5" />
    </svg>
  )
}

export function MoreIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function CellarControllerIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z" />
      <path d="M12 9v7" />
      <circle cx="12" cy="17.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M17 7h3M17 10h2" />
    </svg>
  )
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16 5.8a3 3 0 0 1 0 5.4" />
      <path d="M18 14.3c1.8.7 3 2.4 3 5.2" />
    </svg>
  )
}

export function AccountIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  )
}

export function MonthlySummaryIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5v3M16 3.5v3" />
      <path d="M8 17v-3M12 17v-5M16 17v-2" />
    </svg>
  )
}

export function GrowerPaymentsIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <circle cx="9" cy="9" r="3" />
      <circle cx="15" cy="13" r="3" />
      <path d="M12 7a3 3 0 0 1 5-1.5" />
      <path d="M6 18c0-1.7 1.3-3 3-3" />
      <path d="M13 18.5c.6.4 1.4.5 2 .5 2 0 3.5-1 3.5-2.5" />
    </svg>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M8 14h2" />
      <path d="M14 14h2" />
      <path d="M8 17.5h2" />
    </svg>
  )
}

export function BarrelIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M6.5 3.5h11c1.2 2.4 1.8 5 1.8 8.5s-.6 6.1-1.8 8.5h-11C5.3 18.1 4.7 15.5 4.7 12s.6-6.1 1.8-8.5Z" />
      <path d="M5.2 8h13.6" />
      <path d="M5.2 16h13.6" />
    </svg>
  )
}

export function BlendIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M7 3h10l-1 5a4 4 0 0 1-8 0L7 3Z" />
      <path d="M12 12v4" />
      <path d="M8 21l4-5 4 5" />
      <path d="M8.5 6h7" />
    </svg>
  )
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M3 4h2l2.4 11h10.2L20 7H6.2" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  )
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg className={className} {...iconProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
