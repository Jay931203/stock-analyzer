"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

interface DropdownContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("Dropdown components must be used within <DropdownMenu>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* DropdownMenu (root)                                                 */
/* ------------------------------------------------------------------ */

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Use a timeout to avoid closing immediately on the same click
    const id = setTimeout(() => {
      document.addEventListener("click", handler);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", handler);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* DropdownTrigger                                                     */
/* ------------------------------------------------------------------ */

interface DropdownTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const DropdownTrigger = React.forwardRef<HTMLButtonElement, DropdownTriggerProps>(
  ({ children, className, onClick, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef } = useDropdown();

    const ref = React.useCallback(
      (node: HTMLButtonElement | null) => {
        (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef, triggerRef],
    );

    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn("outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg", className)}
        onClick={(e) => {
          setOpen((prev) => !prev);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DropdownTrigger.displayName = "DropdownTrigger";

/* ------------------------------------------------------------------ */
/* DropdownContent                                                     */
/* ------------------------------------------------------------------ */

interface DropdownContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end";
}

const DropdownContent = React.forwardRef<HTMLDivElement, DropdownContentProps>(
  ({ children, className, align = "end", ...props }, ref) => {
    const { open } = useDropdown();

    if (!open) return null;

    return (
      <div
        ref={ref}
        role="menu"
        className={cn(
          "absolute z-50 mt-1 min-w-[180px] overflow-hidden",
          "rounded-xl border border-border bg-card shadow-xl shadow-black/30",
          "py-1",
          "animate-in fade-in-0 zoom-in-95",
          "transition-all duration-150",
          align === "end" ? "right-0" : "left-0",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
DropdownContent.displayName = "DropdownContent";

/* ------------------------------------------------------------------ */
/* DropdownItem                                                        */
/* ------------------------------------------------------------------ */

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

const DropdownItem = React.forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ children, className, destructive, onClick, ...props }, ref) => {
    const { setOpen, triggerRef } = useDropdown();

    return (
      <button
        ref={ref}
        role="menuitem"
        type="button"
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-sm outline-none",
          "transition-colors cursor-pointer",
          "focus-visible:bg-muted hover:bg-muted",
          destructive
            ? "text-destructive hover:text-destructive focus-visible:text-destructive"
            : "text-foreground",
          className,
        )}
        onClick={(e) => {
          onClick?.(e);
          setOpen(false);
          triggerRef.current?.focus();
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DropdownItem.displayName = "DropdownItem";

/* ------------------------------------------------------------------ */
/* DropdownSeparator                                                   */
/* ------------------------------------------------------------------ */

function DropdownSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={cn("my-1 h-px bg-border", className)}
    />
  );
}

export {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
};
