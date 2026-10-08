import React from 'react';
import { ScreenView } from '../types';

interface ScreenSwitcherProps {
  currentView: ScreenView;
  onSelectView: (view: ScreenView) => void;
}

export const ScreenSwitcher: React.FC<ScreenSwitcherProps> = ({
  currentView,
  onSelectView,
}) => {
  const screens: { id: ScreenView; label: string; badge?: string }[] = [
    { id: 'login', label: '1. Login Screen (IRON_PULSE)' },
    { id: 'members', label: '2. Members Roster' },
    { id: 'inventory', label: '3. Equipment Inventory' },
    { id: 'training_log', label: '4. Training Log' },
    { id: 'access_control', label: '5. Access Control' },
    { id: 'dashboard', label: 'Command Center' },
  ];

  return (
    <div className="bg-[#0e0e0e] border-b border-[#E2FF00]/30 px-4 py-2 flex flex-wrap items-center justify-between gap-2 z-50 text-xs font-montserrat sticky top-0 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-[#E2FF00] animate-pulse"></span>
        <span className="font-bold text-[#E2FF00] tracking-wider uppercase">SCREEN PREVIEW NAV:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
        {screens.map((s) => {
          const isActive = currentView === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectView(s.id)}
              className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition-all duration-150 cursor-pointer border ${
                isActive
                  ? 'bg-[#E2FF00] text-[#111111] border-[#E2FF00] font-bold shadow-[0_0_10px_rgba(226,255,0,0.3)]'
                  : 'bg-[#1c1b1b] text-[#c6c6c7] border-white/10 hover:border-[#E2FF00]/50 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
