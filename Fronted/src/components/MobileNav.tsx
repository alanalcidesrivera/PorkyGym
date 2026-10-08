import React from 'react';
import { ScreenView } from '../types';

interface MobileNavProps {
  currentView: ScreenView;
  onNavigate: (view: ScreenView) => void;
  onAddMemberClick: () => void;
  onLogout: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onNavigate,
  onAddMemberClick,
}) => {
  return (
    <>
      {/* Mobile Top Navigation */}
      <header className="md:hidden flex justify-between items-center w-full px-4 h-16 bg-[#131313] border-b border-white/20 sticky top-0 z-40">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 bg-[#E2FF00] rounded-none flex items-center justify-center">
            <span className="material-symbols-outlined text-[#111111] font-bold text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              fitness_center
            </span>
          </div>
          <span className="font-bebas text-2xl text-[#E2FF00] tracking-widest leading-none">
            IRONTRACK
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('training_log')}
            className="text-[#c6c9ab] hover:text-[#E2FF00] p-1.5"
            title="Live Log"
          >
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <button 
            onClick={() => onNavigate('access_control')}
            className="text-[#c6c9ab] hover:text-[#E2FF00] p-1.5"
            title="Access Settings"
          >
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
          <div className="w-7 h-7 border border-[#E2FF00] bg-[#201f1f] flex items-center justify-center font-bebas text-xs text-[#E2FF00]">
            IT
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#131313] border-t border-white/20 z-40 flex justify-around items-center px-2 pb-safe">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 p-1 flex-1 ${
            currentView === 'dashboard' ? 'text-[#E2FF00]' : 'text-[#c6c6c7]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">dashboard</span>
          <span className="font-montserrat text-[10px] font-bold uppercase tracking-wider">Dash</span>
        </button>

        <button
          onClick={() => onNavigate('members')}
          className={`flex flex-col items-center gap-1 p-1 flex-1 ${
            currentView === 'members' ? 'text-[#E2FF00]' : 'text-[#c6c6c7]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">group</span>
          <span className="font-montserrat text-[10px] font-bold uppercase tracking-wider">Members</span>
        </button>

        {/* Center Floating Action Button */}
        <button
          onClick={onAddMemberClick}
          className="bg-[#E2FF00] text-[#111111] w-12 h-12 -mt-6 border-2 border-[#111111] flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          title="Add Member"
        >
          <span className="material-symbols-outlined text-2xl font-bold">add</span>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className={`flex flex-col items-center gap-1 p-1 flex-1 ${
            currentView === 'inventory' ? 'text-[#E2FF00]' : 'text-[#c6c6c7]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">inventory_2</span>
          <span className="font-montserrat text-[10px] font-bold uppercase tracking-wider">Stock</span>
        </button>

        <button
          onClick={() => onNavigate('training_log')}
          className={`flex flex-col items-center gap-1 p-1 flex-1 ${
            currentView === 'training_log' ? 'text-[#E2FF00]' : 'text-[#c6c6c7]'
          }`}
        >
          <span className="material-symbols-outlined text-xl">receipt_long</span>
          <span className="font-montserrat text-[10px] font-bold uppercase tracking-wider">Logs</span>
        </button>
      </nav>
    </>
  );
};
