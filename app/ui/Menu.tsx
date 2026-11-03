import type { ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "sevenyears/src/components/DropdownMenu";
import { Button as SevenButton } from "sevenyears/src/components/Button";
import { Icon } from "./Icon";

export interface MenuAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Deletes or ends something. */
  danger?: boolean;
  /** Draws a line above this item, to set a group apart. */
  separated?: boolean;
}

/**
 * A button that opens a list of actions, sevenyears' DropdownMenu: a thread's Pause, Resume, Cancel and Mark done, or
 * the project switcher. `trigger` is what the button shows (an Icon for a "more" button, then give it `label`);
 * `heading` titles the list.
 *
 * @import import { Menu } from '../../ui/Menu'
 */
export function Menu({
  label,
  trigger,
  heading,
  items,
  variant = "quiet",
  wide,
}: {
  /** The button's accessible name, when `trigger` is only an icon. */
  label?: string;
  trigger: ReactNode;
  heading?: string;
  items: readonly MenuAction[];
  variant?: "quiet" | "default";
  /** Fills its row with the content at the start, like the project switcher. */
  wide?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        render={
          <SevenButton
            variant={variant === "quiet" ? "ghost" : "outline"}
            size={wide ? "default" : "sm"}
            style={wide ? { flex: 1, minWidth: 0, justifyContent: "space-between", paddingInline: 8 } : undefined}
          />
        }
      >
        {trigger}
        {wide && <Icon name="chevronsUpDown" size={14} />}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          {heading && <DropdownMenuLabel>{heading}</DropdownMenuLabel>}
          {items.map((item) => [
            item.separated ? <DropdownMenuSeparator key={`${item.label}:sep`} /> : null,
            <DropdownMenuItem
              key={item.label}
              disabled={item.disabled}
              variant={item.danger ? "destructive" : "default"}
              onClick={item.onSelect}
            >
              {item.label}
            </DropdownMenuItem>,
          ])}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
