import { RiSunLine, RiMoonLine, RiComputerLine } from '@remixicon/react'
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '#/components/ui/dropdown-menu'
import { useTheme } from '#/lib/theme/provider'
import { themeMode } from '#/lib/theme/preferences'

const modes = [
  { value: 'light', label: 'Light', Icon: RiSunLine },
  { value: 'dark', label: 'Dark', Icon: RiMoonLine },
  { value: 'system', label: 'System', Icon: RiComputerLine },
] as const
export function ThemeMenu() {
  const theme = useTheme()
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme.mode}
          onValueChange={(value) => theme.setMode(themeMode(value))}
        >
          {modes.map(({ value, label, Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className="min-h-11 gap-3"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuGroup>
    </>
  )
}
