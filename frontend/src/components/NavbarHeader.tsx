'use client';

import { Menu } from 'lucide-react';
import { SidebarBrand } from '@/components/Sidebar';

interface NavbarHeaderProps {
  onMenuClick: () => void;
}

/**
 * Bar atas khusus layar kecil: logo + tombol untuk membuka laci sidebar.
 */
export default function NavbarHeader({ onMenuClick }: NavbarHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:hidden">
      <SidebarBrand />
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 active:scale-95"
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </button>
    </header>
  );
}
