import React from 'react';
import { ScreenView, Member, Equipment, TrainingLogEntry } from '../types';

interface DashboardScreenProps {
  onNavigate: (view: ScreenView) => void;
  members: Member[];
  equipmentList: Equipment[];
  trainingLogs: TrainingLogEntry[];
  onOpenAddMember: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigate,
  members,
  equipmentList,
  trainingLogs,
  onOpenAddMember,
}) => {
  const activeMembers = members.filter((m) => m.status === 'active').length + 979;
  const maintenanceCount = equipmentList.filter((e) => e.status === 'maintenance' || e.status === 'out_of_order').length + 13;
  const currentOccupancy = 42;

  return (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/20 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-[#E2FF00] animate-pulse"></span>
            <span className="font-montserrat text-xs font-bold text-[#E2FF00] tracking-widest uppercase">
              FACILITY STATUS: NOMINAL (99.4%)
            </span>
          </div>
          <h2 className="font-bebas text-5xl md:text-7xl text-white leading-none tracking-tight">
            COMMAND <span className="text-[#E2FF00]">CENTER</span>
          </h2>
          <p className="font-montserrat text-sm text-[#c6c9ab] mt-2 font-medium">
            Real-time telemetry, athlete check-ins, and machine lifecycle metrics.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <button
            onClick={() => onNavigate('training_log')}
            className="flex-1 md:flex-none border border-white/20 text-white font-montserrat font-bold text-xs py-3 px-5 uppercase hover:bg-[#353534] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">receipt_long</span>
            LIVE LOG
          </button>
          <button
            id="dash-add-member-cta"
            onClick={onOpenAddMember}
            className="flex-1 md:flex-none bg-[#E2FF00] text-[#111111] font-montserrat font-bold text-xs py-3 px-6 uppercase hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-bold">person_add</span>
            ADD MEMBER
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Members */}
        <div
          onClick={() => onNavigate('members')}
          className="bg-[#131313] border border-white/20 p-6 flex flex-col justify-between hover:border-[#E2FF00] cursor-pointer transition-colors group"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="font-montserrat text-xs font-bold text-[#c6c9ab] uppercase tracking-wider">
              Active Athletes
            </span>
            <span className="material-symbols-outlined text-[#E2FF00] group-hover:translate-x-1 transition-transform">
              group
            </span>
          </div>
          <div className="font-bebas text-5xl text-white tracking-wider">
            {activeMembers.toLocaleString()}
          </div>
          <span className="font-inter text-xs text-[#E2FF00] mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">trending_up</span> +14 this week
          </span>
        </div>

        {/* Live Floor Load */}
        <div
          onClick={() => onNavigate('training_log')}
          className="bg-[#131313] border border-white/20 p-6 flex flex-col justify-between hover:border-[#E2FF00] cursor-pointer transition-colors group"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="font-montserrat text-xs font-bold text-[#c6c9ab] uppercase tracking-wider">
              Live Floor Load
            </span>
            <span className="material-symbols-outlined text-[#E2FF00] group-hover:translate-x-1 transition-transform">
              speed
            </span>
          </div>
          <div className="font-bebas text-5xl text-[#E2FF00] tracking-wider">
            {currentOccupancy} <span className="text-xl text-[#c6c9ab]">/ 150</span>
          </div>
          <span className="font-inter text-xs text-[#c6c9ab] mt-2">
            Zone C: Power Peak
          </span>
        </div>

        {/* Equipment Active */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-[#131313] border border-white/20 p-6 flex flex-col justify-between hover:border-[#E2FF00] cursor-pointer transition-colors group"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="font-montserrat text-xs font-bold text-[#c6c9ab] uppercase tracking-wider">
              Total Assets
            </span>
            <span className="material-symbols-outlined text-[#E2FF00] group-hover:translate-x-1 transition-transform">
              inventory_2
            </span>
          </div>
          <div className="font-bebas text-5xl text-white tracking-wider">
            142
          </div>
          <span className="font-inter text-xs text-[#c6c9ab] mt-2">
            128 Units 100% Operational
          </span>
        </div>

        {/* Maintenance Attention */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-[#131313] border border-white/20 p-6 flex flex-col justify-between hover:border-[#ffb4ab] cursor-pointer transition-colors group"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="font-montserrat text-xs font-bold text-[#ffb4ab] uppercase tracking-wider">
              Service Flagged
            </span>
            <span className="material-symbols-outlined text-[#ffb4ab] group-hover:translate-x-1 transition-transform">
              build
            </span>
          </div>
          <div className="font-bebas text-5xl text-[#ffb4ab] tracking-wider">
            {maintenanceCount}
          </div>
          <span className="font-inter text-xs text-[#ffb4ab] mt-2">
            2 Out of Order • 12 Scheduled
          </span>
        </div>
      </div>

      {/* Main 2-Column Split: Real-time Check-ins & Quick Facility Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Check-in Feed (7 cols) */}
        <div className="lg:col-span-7 bg-[#131313] border border-white/20 p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <h3 className="font-bebas text-2xl text-white tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[#E2FF00]">history</span>
              RECENT ATHLETE CHECK-INS
            </h3>
            <button
              onClick={() => onNavigate('training_log')}
              className="font-montserrat text-xs font-bold text-[#E2FF00] uppercase hover:underline"
            >
              View All Logs
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {trainingLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-[#201f1f] border border-white/5 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#111111] border border-white/10 flex items-center justify-center overflow-hidden">
                    {log.memberAvatar ? (
                      <img src={log.memberAvatar} alt={log.memberName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-sm text-[#c6c9ab]">person</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bebas text-lg text-white leading-none">{log.memberName}</p>
                    <p className="font-inter text-[11px] text-[#c6c9ab]">{log.focus}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-montserrat text-xs font-bold text-[#E2FF00] block">{log.durationFormatted}</span>
                  <span className="font-inter text-[10px] text-[#c6c6c7]">{log.timeAgo}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Fast Facility Navigation & System Status (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Quick Subsystems Grid */}
          <div className="bg-[#131313] border border-white/20 p-6 flex flex-col gap-4">
            <h3 className="font-bebas text-2xl text-white tracking-wider">
              FACILITY MODULES
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('members')}
                className="p-4 bg-[#201f1f] border border-white/10 hover:border-[#E2FF00] text-left transition-colors cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[#E2FF00] text-2xl mb-2 group-hover:scale-110 transition-transform block">
                  group
                </span>
                <span className="font-bebas text-xl text-white block">MEMBERS ROSTER</span>
                <span className="font-inter text-[11px] text-[#c6c9ab]">1,248 athletes</span>
              </button>

              <button
                onClick={() => onNavigate('inventory')}
                className="p-4 bg-[#201f1f] border border-white/10 hover:border-[#E2FF00] text-left transition-colors cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[#E2FF00] text-2xl mb-2 group-hover:scale-110 transition-transform block">
                  inventory_2
                </span>
                <span className="font-bebas text-xl text-white block">INVENTORY</span>
                <span className="font-inter text-[11px] text-[#c6c9ab]">142 assets</span>
              </button>

              <button
                onClick={() => onNavigate('training_log')}
                className="p-4 bg-[#201f1f] border border-white/10 hover:border-[#E2FF00] text-left transition-colors cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[#E2FF00] text-2xl mb-2 group-hover:scale-110 transition-transform block">
                  receipt_long
                </span>
                <span className="font-bebas text-xl text-white block">TRAINING LOG</span>
                <span className="font-inter text-[11px] text-[#c6c9ab]">Live telemetry</span>
              </button>

              <button
                onClick={() => onNavigate('access_control')}
                className="p-4 bg-[#201f1f] border border-white/10 hover:border-[#E2FF00] text-left transition-colors cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[#E2FF00] text-2xl mb-2 group-hover:scale-110 transition-transform block">
                  admin_panel_settings
                </span>
                <span className="font-bebas text-xl text-white block">ACCESS CONTROL</span>
                <span className="font-inter text-[11px] text-[#c6c9ab]">Roles & permissions</span>
              </button>
            </div>
          </div>

          {/* Biometric Clearance Box */}
          <div className="bg-[#111111] border border-white/20 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="font-montserrat text-xs font-bold text-[#c6c9ab] uppercase tracking-wider">
                ADMIN ACCESS CLEARANCE
              </span>
              <span className="bg-[#E2FF00] text-[#111111] font-montserrat text-[10px] font-bold px-2 py-0.5 uppercase">
                TIER 1 MASTER
              </span>
            </div>
            <p className="font-inter text-xs text-white">
              Authorized operator: <strong>Admin / Chief Officer</strong>. All 4 facility divisions online with encrypted telemetry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
