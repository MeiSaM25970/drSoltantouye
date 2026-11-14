"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { toLatinDigits } from "@clinic/shared";
import { control } from "./control-style";
import { Icon } from "./icons";

/* ───────── text input ───────── */

/**
 * Phone and number fields (`inputMode` tel / numeric) turn Persian and Arabic digits
 * into Latin digits as the user types or pastes, so the API always receives Latin digits.
 */
export function TextInput({ ltr, onChange, ...props }: InputHTMLAttributes<HTMLInputElement> & { ltr?: boolean }) {
  const digits = props.inputMode === "tel" || props.inputMode === "numeric";
  return (
    <input
      {...props}
      onChange={(event) => {
        if (digits) {
          const next = toLatinDigits(event.target.value);
          if (next !== event.target.value) event.target.value = next;
        }
        onChange?.(event);
      }}
      className={`${control} ${ltr ? "ltr-field" : ""} ${props.className ?? ""}`}
    />
  );
}

/** Amount input: Latin digits only, grouped by thousands ("1,500,000") while typing; caret stays on the same digit. */
export function MoneyInput({ onChange, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode">) {
  return (
    <input
      {...props}
      inputMode="numeric"
      autoComplete="off"
      dir="ltr"
      onChange={(event) => {
        const el = event.target;
        const caret = el.selectionStart ?? el.value.length;
        const digitsBefore = toLatinDigits(el.value.slice(0, caret)).replace(/\D/g, "").length;
        const digits = toLatinDigits(el.value).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
        const next = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        if (next !== el.value) {
          el.value = next;
          let seen = 0;
          let pos = 0;
          while (pos < next.length && seen < digitsBefore) {
            if (next[pos] !== ",") seen++;
            pos++;
          }
          el.setSelectionRange(pos, pos);
        }
        onChange?.(event);
      }}
      className={`${control} ltr-field ${props.className ?? ""}`}
    />
  );
}

/* ───────── select (listbox dropdown) ───────── */

export type SelectOption = { value: string; label: ReactNode; text?: string; hint?: string; disabled?: boolean };

type SelectProps = {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  name?: string;
  disabled?: boolean;
  /** "auto" shows the search box once there are more than 8 options. */
  searchable?: boolean | "auto";
  allowClear?: boolean;
  align?: "start" | "center";
  className?: string;
  "aria-label"?: string;
};

type Box = { left: number; width: number; maxHeight: number; up: boolean; top?: number; bottom?: number };

const optionText = (option: SelectOption) => option.text ?? (typeof option.label === "string" ? option.label : option.value);
const fold = (value: string) => toLatinDigits(value).toLowerCase();

export function Select({
  options,
  value,
  defaultValue = "",
  onChange,
  placeholder = "انتخاب کنید",
  name,
  disabled,
  searchable = "auto",
  allowClear,
  align = "start",
  className = "",
  ...aria
}: SelectProps) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const current = controlled ? value : inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState<Box | null>(null);
  const trigger = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  const showSearch = searchable === true || (searchable === "auto" && options.length > 8);
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return q ? options.filter((option) => fold(optionText(option)).includes(q)) : options;
  }, [options, query]);
  const selected = options.find((option) => option.value === current);

  const place = useCallback(() => {
    const el = trigger.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 168);
    // a popup wider than a narrow trigger (day/year) is centred on it, otherwise it hugs the trigger
    const anchor = rect.width < width ? rect.left + rect.width / 2 - width / 2 : rect.right - width;
    const left = Math.min(Math.max(8, anchor), Math.max(8, window.innerWidth - width - 8));
    const below = window.innerHeight - rect.bottom - 14;
    const above = rect.top - 14;
    const up = below < 230 && above > below;
    setBox({
      left,
      width,
      up,
      maxHeight: Math.max(150, Math.min(340, up ? above : below)),
      ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  }, []);

  function firstEnabled(items: readonly SelectOption[]) {
    return items.findIndex((option) => !option.disabled);
  }

  function openList() {
    if (disabled) return;
    setQuery("");
    const index = options.findIndex((option) => option.value === current);
    setActive(index >= 0 ? index : firstEnabled(options));
    setOpen(true);
  }

  function closeList(refocus = false) {
    setOpen(false);
    setQuery("");
    if (refocus) trigger.current?.focus({ preventScroll: true });
  }

  function choose(option: SelectOption | undefined) {
    if (!option || option.disabled) return;
    if (!controlled) setInner(option.value);
    onChange?.(option.value);
    closeList(true);
  }

  function clear() {
    if (!controlled) setInner("");
    onChange?.("");
  }

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => place();
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || popup.current?.contains(target)) return;
      closeList();
    };
    // Escape closes the list first; a surrounding dialog stays open.
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeList(true);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("keydown", escape, true);
    document.addEventListener("mousedown", outside);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("keydown", escape, true);
      document.removeEventListener("mousedown", outside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, place]);

  useEffect(() => {
    if (open && showSearch && box) search.current?.focus({ preventScroll: true });
  }, [open, showSearch, box === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the highlighted row visible inside the list
  useEffect(() => {
    if (!open) return;
    const el = list.current;
    const row = el?.querySelector<HTMLElement>('[data-active="true"]');
    if (!el || !row) return;
    if (row.offsetTop < el.scrollTop) el.scrollTop = row.offsetTop - 6;
    else if (row.offsetTop + row.offsetHeight > el.scrollTop + el.clientHeight) el.scrollTop = row.offsetTop + row.offsetHeight - el.clientHeight + 6;
  }, [active, open, box === null]); // eslint-disable-line react-hooks/exhaustive-deps

  // first open: put the selected row in the middle
  useEffect(() => {
    if (!open || !box) return;
    const el = list.current;
    const row = el?.querySelector<HTMLElement>('[data-selected="true"]');
    if (el && row) el.scrollTop = Math.max(0, row.offsetTop - el.clientHeight / 2 + row.offsetHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, box === null]);

  function move(direction: 1 | -1) {
    if (!visible.length) return;
    let index = active;
    for (let step = 0; step < visible.length; step += 1) {
      index = (index + direction + visible.length) % visible.length;
      if (!visible[index]?.disabled) break;
    }
    setActive(index);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (disabled) return;
    const inSearch = event.target === search.current;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        open ? move(1) : openList();
        return;
      case "ArrowUp":
        event.preventDefault();
        open ? move(-1) : openList();
        return;
      case "Home":
      case "End":
        if (open && !inSearch) {
          event.preventDefault();
          setActive(event.key === "Home" ? firstEnabled(visible) : visible.length - 1);
        }
        return;
      case "Enter":
        event.preventDefault();
        open ? choose(visible[active]) : openList();
        return;
      case " ":
        if (inSearch) return;
        event.preventDefault();
        open ? choose(visible[active]) : openList();
        return;
      case "Tab":
        if (open) closeList();
        return;
      default:
        if (!showSearch && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = Date.now();
          typed.current.text = now - typed.current.at > 700 ? event.key : typed.current.text + event.key;
          typed.current.at = now;
          const needle = fold(typed.current.text);
          const index = options.findIndex((option) => !option.disabled && fold(optionText(option)).startsWith(needle));
          if (index >= 0) {
            if (!open) {
              setQuery("");
              setOpen(true);
            }
            setActive(index);
          }
        }
    }
  }

  const clearable = allowClear && !disabled && current !== "";
  return (
    <>
      {name ? <input type="hidden" name={name} value={current} /> : null}
      <div
        ref={trigger}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-disabled={disabled}
        aria-label={aria["aria-label"]}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onKeyDown}
        className={`${control} group flex select-none items-center gap-2 ${align === "center" ? "justify-center px-3 text-center" : "justify-between text-start"} ${
          disabled ? "cursor-not-allowed bg-sunk text-muted hover:border-line" : "cursor-pointer"
        } ${open ? "!border-accent shadow-[0_0_0_4px_rgb(180_105_58/0.14)]" : ""} ${className}`}
      >
        <span className={`min-w-0 flex-1 truncate ${align === "center" ? "text-center" : ""} ${selected ? "" : "text-muted/70"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="relative grid h-5 w-4 shrink-0 place-items-center text-muted">
          <Icon
            name="chevronDown"
            size={16}
            className={`transition-all duration-300 ${open ? "rotate-180 text-accent" : ""} ${clearable ? "group-hover:scale-50 group-hover:opacity-0" : ""}`}
          />
          {clearable ? (
            <span
              role="button"
              aria-label="پاک کردن"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                clear();
              }}
              className="absolute inset-0 grid scale-50 place-items-center rounded-full bg-sunk text-ink opacity-0 transition-all hover:bg-line group-hover:scale-100 group-hover:opacity-100"
            >
              <Icon name="x" size={11} />
            </span>
          ) : null}
        </span>
      </div>

      {open && box
        ? createPortal(
            <div
              ref={popup}
              dir="rtl"
              style={{ position: "fixed", left: box.left, width: box.width, top: box.top, bottom: box.bottom, zIndex: 120 }}
              className={`select-pop overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-lift ${box.up ? "origin-bottom" : "origin-top"}`}
            >
              {showSearch ? (
                <div className="relative px-0.5 pb-1.5 pt-0.5">
                  <Icon name="search" size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-[calc(50%+1px)] text-muted" />
                  <input
                    ref={search}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActive(0);
                    }}
                    onKeyDown={onKeyDown}
                    placeholder="جستجو"
                    aria-label="جستجو"
                    className="w-full rounded-xl border border-line bg-paper py-2 pe-3 ps-9 text-sm outline-none transition focus:border-accent"
                  />
                </div>
              ) : null}
              <ul
                ref={list}
                id={listId}
                role="listbox"
                style={{ maxHeight: box.maxHeight - (showSearch ? 52 : 12) }}
                className="scroll-thin relative overflow-y-auto overscroll-contain"
              >
                {visible.length ? (
                  visible.map((option, index) => {
                    const isSelected = option.value === current;
                    const isActive = index === active;
                    return (
                      <li
                        key={option.value}
                        role="option"
                        aria-selected={isSelected}
                        aria-disabled={option.disabled}
                        data-active={isActive}
                        data-selected={isSelected}
                        onMouseEnter={() => !option.disabled && setActive(index)}
                        onClick={() => choose(option)}
                        className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[14.5px] transition-colors duration-150 ${
                          option.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
                        } ${isSelected ? "bg-accent-soft font-semibold text-accent-deep" : isActive ? "bg-sunk text-ink" : "text-ink-2"}`}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {option.label}
                          {option.hint ? <span className="ms-2 text-xs font-normal text-muted">{option.hint}</span> : null}
                        </span>
                        {isSelected ? <Icon name="check" size={16} /> : null}
                      </li>
                    );
                  })
                ) : (
                  <li className="px-3 py-6 text-center text-sm text-muted">موردی پیدا نشد</li>
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
