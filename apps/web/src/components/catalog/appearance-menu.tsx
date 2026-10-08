import { RiSunLine, RiMoonLine, RiComputerLine } from '@remixicon/react'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '#/components/ui/dropdown-menu'
import { useTheme } from '#/hooks/use-theme'
import { themeMode } from '#/lib/theme/preferences'

export function AppearanceMenu() {
  const { mode, setMode } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Appearance"
          />
        }
      >
        <RiSunLine aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setMode(themeMode(value))}
        >
          <DropdownMenuRadioItem
            closeOnClick
            value="light"
            className="min-h-11"
          >
            <RiSunLine aria-hidden="true" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem closeOnClick value="dark" className="min-h-11">
            <RiMoonLine aria-hidden="true" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            closeOnClick
            value="system"
            className="min-h-11"
          >
            <RiComputerLine aria-hidden="true" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
