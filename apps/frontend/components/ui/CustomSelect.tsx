"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  searchable = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => { setMounted(true); }, []);

  const selected = options.find((o) => o.value === value);

  const filteredOptions = useMemo(
    () =>
      searchable && search
        ? options.filter((o) =>
            o.label.toLowerCase().includes(search.toLowerCase())
          )
        : options,
    [options, search, searchable],
  );

  useEffect(() => {
    if (!open) {
      setSearch("");
    } else if (searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, searchable]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle() {
    if (disabled) return;
    if (!open) {
      const rect = buttonRef.current!.getBoundingClientRect();
      setStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen((p) => !p);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors duration-200 ${
          open
            ? "bg-card/70 border-primary/40"
            : "glass border-white/5 hover:border-white/20"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground shrink-0"
        >
          <path d="M4 6l4 4 4-4" />
        </motion.svg>
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              style={style}
              className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-card p-1 shadow-2xl custom-scrollbar"
            >
              {searchable && (
                <li className="px-2 pt-1 pb-2 sticky top-0 bg-card z-10">
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full p-2 rounded-lg border border-white/10 bg-secondary text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const first = filteredOptions.find((o) => o.value !== "");
                        if (first) {
                          onChange(first.value);
                          setOpen(false);
                        }
                      }
                      if (e.key === "Escape") {
                        setOpen(false);
                      }
                    }}
                  />
                </li>
              )}
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground text-center">
                  {search ? "No matches found" : "No options"}
                </li>
              ) : (
                filteredOptions.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                        opt.value === value
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))
              )}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
