'use client';
import { useEffect, useRef, useState } from 'react';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
export default function ProfileMenu({
  name,
  role,
  onSettings,
  onLogout,
}: {
  name: string;
  role: string;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  return (
    <div
      ref={root}
      className={'profile-menu ' + (open ? 'is-open' : '')}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!root.current?.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
          trigger.current?.focus();
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
          requestAnimationFrame(() =>
            root.current?.querySelector<HTMLButtonElement>('.profile-popover button')?.focus(),
          );
        }
      }}
    >
      <button
        ref={trigger}
        className="profile-trigger"
        aria-label="Menu profil"
        aria-expanded={open}
        aria-controls="profile-popover"
        onClick={() => setOpen(true)}
      >
        <span className="avatar small">
          {name
            .split(' ')
            .slice(0, 2)
            .map((x) => x[0])
            .join('')}
        </span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="profile-popover" id="profile-popover">
          <div>
            <strong>{name}</strong>
            <small>{role}</small>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              onSettings();
            }}
          >
            <Settings size={17} />
            Pengaturan akun
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={17} />
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
