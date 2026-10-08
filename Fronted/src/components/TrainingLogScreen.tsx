import React, { useState } from 'react';
import { TrainingLogEntry, GymZone } from '../types';

interface TrainingLogScreenProps {
  logs: TrainingLogEntry[];
  onAddLogEntry: (entry: Omit<TrainingLogEntry, 'id'>) => void;
  currentOccupancy?: number;
}

export const TrainingLogScreen: React.FC<TrainingLogScreenProps> = ({
  logs,
  onAddLogEntry,
  currentOccupancy = 42,
}) => {
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [activeZoneFilter, setActiveZoneFilter] = useState<'ALL' | 'FREE_WEIGHTS' | 'CARDIO' | 'TURF'>('ALL');
  const [checkInForm, setCheckInForm] = useState({
    memberName: '',
    focus: 'Hypertrophy / Chest & Tris',
    durationMin: 60,
    keyMovement: 'Incline Dumbbell Press 4x8',
    zone: 'Zone C' as GymZone,
  });

  const maxCapacity = 150;
  const occupancyPercentage = Math.min(100, Math.round((currentOccupancy / maxCapacity) * 100));

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInForm.memberName.trim()) return;

    onAddLogEntry({
      memberName: checkInForm.memberName.toUpperCase(),
      memberAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
      timeAgo: 'Just now',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      focus: checkInForm.focus,
      durationMin: checkInForm.durationMin,
      durationFormatted: `${checkInForm.durationMin} Min`,
      keyMovement: checkInForm.keyMovement,
      status: 'checked_in',
      zone: checkInForm.zone,
    });

    setCheckInForm({
      memberName: '',
      focus: 'Hypertrophy / Chest & Tris',
      durationMin: 60,
      keyMovement: '',
      zone: 'Zone C',
    });
    setShowCheckInModal(false);
  };

  const handleExportLogs = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Member,Focus,Duration,Key Movement,Timestamp\n' +
      logs.map((l) => `"${l.memberName}","${l.focus}","${l.durationFormatted}","${l.keyMovement || ''}","${l.timestamp}"`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `irontrack-activity-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-8">
      {/* Top Header & Actions */}
      <div className="flex justify-between items-end border-b border-white/10 pb-6">
        <div>
          <h2 className="font-bebas text-5xl md:text-7xl text-[#FFFFFF] leading-none tracking-tight">
            LOG
          </h2>
          <p className="font-montserrat text-sm font-bold text-[#E2FF00] tracking-widest mt-1 uppercase">
            LIVE GYM ACTIVITY
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert('Filter applied: Showing real-time checked in athletes.')}
            className="text-[#c6c9ab] hover:text-[#E2FF00] transition-colors p-2.5 border border-white/10 bg-[#131313] hover:border-white/30 cursor-pointer"
            title="Filter Log"
          >
            <span className="material-symbols-outlined text-lg">filter_list</span>
          </button>
          <button
            onClick={handleExportLogs}
            className="text-[#c6c9ab] hover:text-[#E2FF00] transition-colors p-2.5 border border-white/10 bg-[#131313] hover:border-white/30 cursor-pointer"
            title="Export CSV Log"
          >
            <span className="material-symbols-outlined text-lg">download</span>
          </button>
          <button
            id="log-checkin-btn"
            onClick={() => setShowCheckInModal(true)}
            className="bg-[#E2FF00] text-[#111111] font-bebas text-2xl px-6 py-2 uppercase hover:bg-white transition-colors cursor-pointer shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-x-0.5 active:translate-y-0.5"
          >
            CHECK IN
          </button>
        </div>
      </div>

      {/* Bento Grid Layout (8 cols timeline + 4 cols sidebar stats) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Timeline Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-[#131313] border border-[#F5F5F5]/20 p-6 flex flex-col md:flex-row gap-6 relative group hover:border-[#E2FF00]/50 transition-colors"
            >
              {/* Left Yellow accent on hover */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E2FF00] opacity-0 group-hover:opacity-100 transition-opacity"></div>

              {/* Member Identification */}
              <div className="flex items-start gap-4 md:w-1/3 shrink-0">
                <div className="h-12 w-12 rounded-none overflow-hidden border border-white/10 bg-[#2a2a2a] shrink-0 flex items-center justify-center">
                  {log.memberAvatar ? (
                    <img
                      src={log.memberAvatar}
                      alt={log.memberName}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[#c6c9ab]">person</span>
                  )}
                </div>
                <div>
                  <p className="font-bebas text-2xl text-white leading-tight tracking-wider">
                    {log.memberName}
                  </p>
                  <p className="font-montserrat text-[11px] font-bold text-[#c6c9ab] mt-0.5 uppercase tracking-wide">
                    {log.timeAgo}
                  </p>
                </div>
              </div>

              {/* Workout Focus & Movement Details */}
              <div className="flex-1 grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                <div>
                  <p className="font-montserrat text-[10px] font-bold text-[#c6c9ab] uppercase tracking-wider mb-1">
                    FOCUS
                  </p>
                  <p className="font-montserrat font-semibold text-sm text-white">
                    {log.focus}
                  </p>
                </div>

                <div>
                  <p className="font-montserrat text-[10px] font-bold text-[#c6c9ab] uppercase tracking-wider mb-1">
                    DURATION
                  </p>
                  <p className="font-montserrat font-semibold text-sm text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#E2FF00] text-sm">timer</span>
                    {log.durationFormatted}
                  </p>
                </div>

                {log.keyMovement && (
                  <div className="col-span-2">
                    <p className="font-montserrat text-[10px] font-bold text-[#c6c9ab] uppercase tracking-wider mb-1">
                      KEY MOVEMENT
                    </p>
                    <div className="inline-block bg-[#111111] border border-white/10 px-3 py-1 font-montserrat text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                      {log.keyMovement}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          <button
            onClick={() => alert('All recent 24-hour facility check-in history loaded.')}
            className="w-full border border-white/10 bg-[#111111] text-[#c6c6c7] font-montserrat font-bold text-xs py-4 mt-2 hover:border-[#E2FF00] hover:text-[#E2FF00] transition-colors uppercase tracking-widest cursor-pointer"
          >
            LOAD MORE HISTORY
          </button>
        </div>

        {/* Sidebar Stats Column (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Live Capacity Card */}
          <div className="bg-[#131313] border border-[#F5F5F5]/20 p-6">
            <h3 className="font-montserrat text-xs font-bold text-[#c6c9ab] uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>CURRENT CAPACITY</span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E2FF00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E2FF00]"></span>
              </span>
            </h3>

            <div className="flex items-baseline gap-2 border-l-4 border-[#E2FF00] pl-4">
              <span className="font-bebas text-6xl text-white tracking-wider leading-none">
                {currentOccupancy}
              </span>
              <span className="font-montserrat font-semibold text-sm text-[#c6c9ab]">
                / {maxCapacity}
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="mt-4 h-1.5 w-full bg-[#111111]">
              <div
                className="h-full bg-[#E2FF00] transition-all duration-500"
                style={{ width: `${occupancyPercentage}%` }}
              ></div>
            </div>
            <p className="font-inter text-[11px] text-[#c6c9ab] mt-2 text-right">
              {occupancyPercentage}% Floor Saturation
            </p>
          </div>

          {/* Zone Activity Heatmap Graphic Card */}
          <div className="bg-[#131313] border border-[#F5F5F5]/20 relative overflow-hidden h-64 flex flex-col justify-between p-6">
            {/* Header Overlay */}
            <div className="relative z-10 flex justify-between items-start">
              <span className="font-montserrat text-[10px] font-bold text-white bg-black/70 px-2 py-1 uppercase tracking-widest border border-white/10">
                ZONE ACTIVITY
              </span>
              <span className="font-montserrat text-[10px] font-bold text-[#E2FF00] bg-black/70 px-2 py-1 uppercase tracking-widest border border-[#E2FF00]/40">
                HIGH DENSITY
              </span>
            </div>

            {/* Floor Map Schematic Vector Visual */}
            <div className="absolute inset-0 bg-[#0e0e0e] flex items-center justify-center p-4">
              <svg className="w-full h-full opacity-40" viewBox="0 0 300 200">
                <rect x="10" y="10" width="280" height="180" fill="none" stroke="#353534" strokeWidth="2" strokeDasharray="4 2" />
                {/* Zone A */}
                <rect x="20" y="20" width="100" height="70" fill="#201f1f" stroke="#454747" strokeWidth="1" />
                <text x="30" y="40" fill="#c6c6c7" fontSize="9" fontFamily="Montserrat">ZONE A: CARDIO</text>
                
                {/* Zone B */}
                <rect x="130" y="20" width="150" height="70" fill="#201f1f" stroke="#454747" strokeWidth="1" />
                <text x="140" y="40" fill="#c6c6c7" fontSize="9" fontFamily="Montserrat">ZONE B: CABLES</text>
                
                {/* Zone C: Free Weights (High Heat) */}
                <rect x="20" y="100" width="260" height="80" fill="#E2FF00" fillOpacity="0.12" stroke="#E2FF00" strokeWidth="1.5" />
                <text x="30" y="120" fill="#E2FF00" fontSize="10" fontWeight="bold" fontFamily="Montserrat">ZONE C: FREE WEIGHTS (POWER)</text>
                
                {/* Heat Pulses */}
                <circle cx="80" cy="140" r="16" fill="#E2FF00" fillOpacity="0.4" />
                <circle cx="160" cy="145" r="22" fill="#E2FF00" fillOpacity="0.4" />
                <circle cx="220" cy="135" r="14" fill="#E2FF00" fillOpacity="0.4" />
                <circle cx="50" cy="50" r="10" fill="#E2FF00" fillOpacity="0.2" />
              </svg>
            </div>

            {/* Bottom Title */}
            <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="font-bebas text-3xl text-white drop-shadow-md leading-none tracking-wider">
                  FREE WEIGHTS
                </p>
                <p className="font-inter text-[10px] text-[#c6c9ab]">
                  Peak training cycle detected
                </p>
              </div>
              <span className="font-montserrat text-xs font-bold text-[#E2FF00] bg-black/80 px-2 py-1">
                HIGH
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none"></div>
          </div>

          {/* In Use (Est.) Equipment Status List */}
          <div className="bg-[#131313] border border-[#F5F5F5]/20 p-6">
            <h3 className="font-montserrat text-xs font-bold text-[#c6c9ab] uppercase tracking-wider mb-4">
              IN USE (EST.)
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <span className="font-inter text-sm text-white">Squat Racks</span>
                <span className="font-montserrat text-xs font-bold text-[#E2FF00]">4 / 4</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <span className="font-inter text-sm text-white">Benches</span>
                <span className="font-montserrat text-xs font-bold text-[#c6c9ab]">6 / 8</span>
              </li>
              <li className="flex justify-between items-center border-b border-white/5 pb-2.5">
                <span className="font-inter text-sm text-white">Cable Stations</span>
                <span className="font-montserrat text-xs font-bold text-[#c6c9ab]">2 / 4</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="font-inter text-sm text-white">Deadlift Platforms</span>
                <span className="font-montserrat text-xs font-bold text-[#E2FF00]">3 / 3</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border-2 border-[#E2FF00] w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCheckInModal(false)}
              className="absolute top-4 right-4 text-[#c6c6c7] hover:text-white font-mono text-xl"
            >
              ✕
            </button>
            <h3 className="font-bebas text-3xl text-[#E2FF00] tracking-wider mb-1">
              ATHLETE CHECK-IN
            </h3>
            <p className="font-inter text-xs text-[#c6c9ab] mb-4">
              Log member session into live facility telemetry.
            </p>

            <form onSubmit={handleCheckInSubmit} className="flex flex-col gap-4">
              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Athlete Name / ID *
                </label>
                <input
                  required
                  type="text"
                  value={checkInForm.memberName}
                  onChange={(e) => setCheckInForm({ ...checkInForm, memberName: e.target.value })}
                  placeholder="e.g. MARCUS V."
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none uppercase"
                />
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Training Focus
                </label>
                <input
                  type="text"
                  value={checkInForm.focus}
                  onChange={(e) => setCheckInForm({ ...checkInForm, focus: e.target.value })}
                  placeholder="e.g. Hypertrophy / Back & Biceps"
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                    Est. Duration (Min)
                  </label>
                  <input
                    type="number"
                    value={checkInForm.durationMin}
                    onChange={(e) => setCheckInForm({ ...checkInForm, durationMin: Number(e.target.value) })}
                    className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                  />
                </div>
                <div>
                  <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                    Floor Zone
                  </label>
                  <select
                    value={checkInForm.zone}
                    onChange={(e) => setCheckInForm({ ...checkInForm, zone: e.target.value as GymZone })}
                    className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                  >
                    <option value="Zone C">Zone C (Free Weights)</option>
                    <option value="Zone A">Zone A (Cardio / HIIT)</option>
                    <option value="Zone B">Zone B (Cables)</option>
                    <option value="Zone D">Zone D (Turf)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Primary Movement
                </label>
                <input
                  type="text"
                  value={checkInForm.keyMovement}
                  onChange={(e) => setCheckInForm({ ...checkInForm, keyMovement: e.target.value })}
                  placeholder="e.g. Barbell Rows 4x10"
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full bg-[#E2FF00] text-[#111111] font-bebas text-2xl py-3 uppercase hover:bg-white transition-colors cursor-pointer"
              >
                CONFIRM CHECK-IN
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
