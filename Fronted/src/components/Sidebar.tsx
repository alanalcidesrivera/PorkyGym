import React from 'react';
import { ScreenView } from '../types';

interface SidebarProps {
  currentView: ScreenView;
  onNavigate: (view: ScreenView) => void;
  onAddMemberClick: () => void;
  onLogout: () => void;
  unreadAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  onAddMemberClick,
  onLogout,
}) => {
  const navItems: { view: ScreenView; label: string; icon: string }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { view: 'inventory', label: 'Inventory', icon: 'inventory_2' },
    { view: 'members', label: 'Members', icon: 'group' },
    { view: 'training_log', label: 'Training Log', icon: 'receipt_long' },
    { view: 'access_control', label: 'Access Control', icon: 'admin_panel_settings' },
  ];

  return (
    <aside
      id="desktop-sidebar"
      className="hidden md:flex flex-col h-screen w-64 bg-[#111111] border-r border-white/10 fixed left-0 top-0 py-3 z-40 select-none"
    >
      {/* Brand Header */}
      <div 
        onClick={() => onNavigate('dashboard')}
        className="px-6 py-4 mb-4 flex items-center gap-3 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="w-10 h-10 bg-[#E2FF00] rounded-none flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">
          <span className="material-symbols-outlined text-[#111111] font-bold text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            fitness_center
          </span>
        </div>
        <div>
          <h1 className="font-bebas text-3xl tracking-widest text-[#E2FF00] m-0 leading-none">
            IRONTRACK
          </h1>
          <p className="font-montserrat text-[11px] tracking-widest uppercase text-[#c6c6c7] m-0 mt-0.5">
            Elite Management
          </p>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="px-6 mb-4">
        <button
          id="sidebar-add-member-btn"
          onClick={onAddMemberClick}
          className="w-full bg-[#E2FF00] text-[#111111] font-montserrat font-bold text-xs uppercase tracking-widest py-3 px-4 rounded-none hover:bg-white transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-x-0.5 active:translate-y-0.5"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add Member
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              id={`nav-link-${item.view}`}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 text-left font-montserrat text-xs font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'text-[#E2FF00] border-l-4 border-[#E2FF00] bg-[#2a2a2a] pl-3'
                  : 'text-[#c6c9ab] hover:bg-[#353534] hover:text-white border-l-4 border-transparent'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="px-6 pt-4 border-t border-white/10 mt-auto flex flex-col gap-3">
        <div className="flex items-center gap-3 py-1">
          <div className="w-8 h-8 rounded-none border border-[#E2FF00] bg-[#201f1f] flex items-center justify-center font-bebas text-sm text-[#E2FF00]">
            IT
          </div>
          <div className="overflow-hidden">
            <p className="font-montserrat text-xs font-bold text-white truncate">ADMIN / CHIEF</p>
            <p className="font-inter text-[10px] text-[#c6c9ab] truncate">admin@irontrack.sys</p>
          </div>
        </div>

        <button
          id="sidebar-logout-btn"
          onClick={onLogout}
          className="flex items-center gap-3 text-[#c6c6c7] hover:text-[#E2FF00] font-montserrat text-xs font-semibold uppercase tracking-wider py-2 transition-colors cursor-pointer text-left"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
