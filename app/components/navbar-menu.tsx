"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import NavLinks from "./nav-links";

type NavItem = { href: string; label: string };

export default function NavbarMenu({
  items,
  children,
}: {
  items: NavItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="navbar-menu" ref={menuRef}>
      <button
        ref={buttonRef}
        className="navbar-toggle"
        type="button"
        aria-label={open ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"}
        aria-expanded={open}
        aria-controls="primary-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          {open ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      <div
        className={`navbar-panel${open ? " is-open" : ""}`}
        id="primary-navigation"
      >
        <NavLinks items={items} onNavigate={closeMenu} />
        <div className="nav-actions" onClick={closeMenu}>
          {children}
        </div>
      </div>
    </div>
  );
}
