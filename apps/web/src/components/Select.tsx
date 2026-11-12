// A themed dropdown. Native <select> popups are drawn by the OS and ignore the app's colours, so this
// wraps Radix Select (keyboard, typeahead, screen readers) and styles every part with the Streak tokens.
import * as RS from "@radix-ui/react-select";
import type { ReactNode } from "react";

export type SelectOption = { value: string; label: ReactNode; disabled?: boolean };
export type SelectGroup = { label: string; options: SelectOption[] };

// Radix reserves "" for "nothing selected", but our callers use "" as a real choice ("No track").
const EMPTY = "__empty__";
const toRadix = (v: string) => (v === "" ? EMPTY : v);
const fromRadix = (v: string) => (v === EMPTY ? "" : v);

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | SelectGroup)[];
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  /** Shown in the closed trigger instead of the chosen option's label (e.g. a short "Pinned"). */
  display?: ReactNode;
};

const isGroup = (o: SelectOption | SelectGroup): o is SelectGroup => "options" in o;

export function Select({ value, onChange, options, id, className, disabled, "aria-label": ariaLabel, display }: Props) {
  return (
    <RS.Root value={toRadix(value)} onValueChange={(v) => onChange(fromRadix(v))} disabled={disabled}>
      <RS.Trigger id={id} className={`sel${className ? ` ${className}` : ""}`} aria-label={ariaLabel}>
        <span className="sel-value">{display === undefined ? <RS.Value /> : <RS.Value>{display}</RS.Value>}</span>
        <RS.Icon className="sel-chev"><Chevron /></RS.Icon>
      </RS.Trigger>
      <RS.Portal>
        <RS.Content className="sel-pop" position="popper" sideOffset={4} collisionPadding={8}>
          <RS.ScrollUpButton className="sel-scroll"><Chevron up /></RS.ScrollUpButton>
          <RS.Viewport className="sel-list">
            {options.map((o, i) =>
              isGroup(o) ? (
                <RS.Group key={`g-${o.label}`}>
                  {i > 0 && <RS.Separator className="sel-sep" />}
                  <RS.Label className="sel-group">{o.label}</RS.Label>
                  {o.options.map((opt) => <Item key={opt.value} {...opt} />)}
                </RS.Group>
              ) : (
                <Item key={o.value} {...o} />
              ),
            )}
          </RS.Viewport>
          <RS.ScrollDownButton className="sel-scroll"><Chevron /></RS.ScrollDownButton>
        </RS.Content>
      </RS.Portal>
    </RS.Root>
  );
}

function Item({ value, label, disabled }: SelectOption) {
  return (
    <RS.Item value={toRadix(value)} disabled={disabled} className="sel-item">
      <RS.ItemText>{label}</RS.ItemText>
      <RS.ItemIndicator className="sel-check">
        <svg viewBox="0 0 16 16" aria-hidden><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </RS.ItemIndicator>
    </RS.Item>
  );
}

const Chevron = ({ up }: { up?: boolean }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden style={up ? { transform: "rotate(180deg)" } : undefined}>
    <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
