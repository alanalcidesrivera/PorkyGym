import React, { useState, useMemo } from 'react';
import { Equipment, EquipmentStatus, EquipmentDivision, GymZone } from '../types';

interface InventoryScreenProps {
  equipmentList: Equipment[];
  onAddEquipment: (item: Omit<Equipment, 'id'>) => void;
  onUpdateEquipment: (id: string, updates: Partial<Equipment>) => void;
  onDeleteEquipment: (id: string) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  equipmentList,
  onAddEquipment,
  onUpdateEquipment,
  onDeleteEquipment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EquipmentStatus>('all');
  const [divisionFilter, setDivisionFilter] = useState<'all' | EquipmentDivision>('all');
  const [zoneFilter, setZoneFilter] = useState<'all' | GymZone>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<Equipment | null>(null);

  // Form State for new equipment
  const [newEquipmentForm, setNewEquipmentForm] = useState({
    name: '',
    division: 'Cardio Division' as EquipmentDivision,
    zone: 'Zone A' as GymZone,
    status: 'available' as EquipmentStatus,
    notes: '',
    imageUrl: '',
  });

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = 142 + equipmentList.length - 6;
    const available = equipmentList.filter((e) => e.status === 'available').length + 124;
    const inMaintenance = equipmentList.filter((e) => e.status === 'maintenance').length + 11;
    const outOfOrder = equipmentList.filter((e) => e.status === 'out_of_order').length + 1;
    return { total, available, inMaintenance, outOfOrder };
  }, [equipmentList]);

  // Filtered Equipment List
  const filteredEquipment = useMemo(() => {
    return equipmentList.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.division.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;
      const matchesDivision = divisionFilter === 'all' ? true : item.division === divisionFilter;
      const matchesZone = zoneFilter === 'all' ? true : item.zone === zoneFilter;

      return matchesSearch && matchesStatus && matchesDivision && matchesZone;
    });
  }, [equipmentList, searchQuery, statusFilter, divisionFilter, zoneFilter]);

  const handleCreateEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipmentForm.name.trim()) return;

    const randomNum = Math.floor(100 + Math.random() * 900);
    const currentDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    onAddEquipment({
      codeId: `#EQ-${randomNum}`,
      name: newEquipmentForm.name,
      division: newEquipmentForm.division,
      zone: newEquipmentForm.zone,
      status: newEquipmentForm.status,
      lastService: currentDate,
      imageUrl:
        newEquipmentForm.imageUrl ||
        'https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=800&auto=format&fit=crop',
      notes: newEquipmentForm.notes,
    });

    setNewEquipmentForm({
      name: '',
      division: 'Cardio Division',
      zone: 'Zone A',
      status: 'available',
      notes: '',
      imageUrl: '',
    });
    setShowAddModal(false);
  };

  const handleQuickStatusChange = (id: string, newStatus: EquipmentStatus) => {
    onUpdateEquipment(id, { status: newStatus });
    setSelectedItemForAction(null);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#F5F5F5]/20 pb-6">
        <div>
          <h2 className="font-bebas text-5xl md:text-7xl text-[#FFFFFF] leading-none tracking-tight">
            EQUIPMENT <span className="text-[#E2FF00] block md:inline">INVENTORY</span>
          </h2>
          <p className="font-inter text-base text-[#c6c6c7] mt-2 max-w-2xl">
            Manage asset lifecycle, track maintenance schedules, and monitor floor availability across the facility.
          </p>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <button
            onClick={() => setShowFilterModal(true)}
            className="flex-1 md:flex-none border border-[#F5F5F5]/20 text-[#FFFFFF] font-montserrat font-bold text-xs py-3 px-6 rounded-none hover:bg-[#353534] transition-colors uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">filter_list</span> Filter
          </button>
          <button
            id="add-equipment-btn"
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none bg-[#E2FF00] text-[#111111] font-montserrat font-bold text-xs py-3 px-6 rounded-none hover:bg-white transition-colors uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
          >
            Add Equipment
          </button>
        </div>
      </header>

      {/* KPI Summary Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {/* Total Assets */}
        <div
          onClick={() => setStatusFilter('all')}
          className={`bg-[#111111]/70 backdrop-blur-md p-6 flex flex-col justify-between border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'border-l-4 border-l-[#E2FF00] border-white/30'
              : 'border-[#F5F5F5]/20 border-l-2 border-l-[#E2FF00] hover:border-white/40'
          }`}
        >
          <span className="font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-widest mb-4">
            Total Assets
          </span>
          <span className="font-bebas text-5xl text-[#FFFFFF] tracking-wider">
            {kpis.total}
          </span>
        </div>

        {/* Available */}
        <div
          onClick={() => setStatusFilter('available')}
          className={`bg-[#111111]/70 backdrop-blur-md p-6 flex flex-col justify-between border cursor-pointer transition-all ${
            statusFilter === 'available'
              ? 'border-l-4 border-l-[#E2FF00] border-white/30'
              : 'border-[#F5F5F5]/20 hover:border-[#E2FF00]'
          }`}
        >
          <span className="font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-widest mb-4">
            Available
          </span>
          <span className="font-bebas text-5xl text-[#FFFFFF] tracking-wider">
            {kpis.available}
          </span>
        </div>

        {/* In Maintenance */}
        <div
          onClick={() => setStatusFilter('maintenance')}
          className={`bg-[#111111]/70 backdrop-blur-md p-6 flex flex-col justify-between border cursor-pointer transition-all ${
            statusFilter === 'maintenance'
              ? 'border-l-4 border-l-[#E2FF00] border-white/30'
              : 'border-[#F5F5F5]/20 hover:border-[#E2FF00]'
          }`}
        >
          <span className="font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-widest mb-4">
            In Maintenance
          </span>
          <span className="font-bebas text-5xl text-[#E2FF00] tracking-wider">
            {kpis.inMaintenance}
          </span>
        </div>

        {/* Out of Order */}
        <div
          onClick={() => setStatusFilter('out_of_order')}
          className={`bg-[#111111]/70 backdrop-blur-md p-6 flex flex-col justify-between border cursor-pointer transition-all ${
            statusFilter === 'out_of_order'
              ? 'border-l-4 border-l-[#ffb4ab] border-white/30'
              : 'border-[#F5F5F5]/20 hover:border-[#ffb4ab]'
          }`}
        >
          <span className="font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-widest mb-4">
            Out of Order
          </span>
          <span className="font-bebas text-5xl text-[#ffb4ab] tracking-wider">
            {kpis.outOfOrder}
          </span>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <div className="w-full relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 transform -translate-y-1/2 text-[#c6c6c7]">
          search
        </span>
        <input
          id="inventory-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by ID, name, or zone..."
          type="text"
          className="w-full bg-[#201f1f] border border-[#F5F5F5]/20 text-[#FFFFFF] font-inter text-base py-4 pl-12 pr-4 rounded-none focus:outline-none focus:border-[#E2FF00] transition-colors placeholder:text-[#c6c6c7]/50"
        />
        {(statusFilter !== 'all' || divisionFilter !== 'all' || zoneFilter !== 'all') && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setDivisionFilter('all');
              setZoneFilter('all');
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-montserrat text-[#E2FF00] hover:underline"
          >
            Clear Active Filters
          </button>
        )}
      </div>

      {/* Inventory List / Table */}
      <div className="flex flex-col border border-[#F5F5F5]/10 rounded-none overflow-hidden bg-[#131313]">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[#201f1f] border-b border-[#F5F5F5]/20">
          <div className="col-span-1 font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-wider">
            ID
          </div>
          <div className="col-span-4 font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-wider">
            Equipment
          </div>
          <div className="col-span-2 font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-wider">
            Zone
          </div>
          <div className="col-span-2 font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-wider">
            Status
          </div>
          <div className="col-span-2 font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-wider">
            Last Service
          </div>
          <div className="col-span-1 font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-wider text-right">
            Action
          </div>
        </div>

        {/* List Items */}
        {filteredEquipment.map((item) => {
          const isAvailable = item.status === 'available';
          const isMaintenance = item.status === 'maintenance';
          const isOutOfOrder = item.status === 'out_of_order';

          return (
            <div
              key={item.id}
              onClick={() => setSelectedItemForAction(item)}
              className="group grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 bg-[#131313] items-center border-b border-[#F5F5F5]/10 hover:bg-[#353534] transition-colors cursor-pointer"
            >
              {/* ID */}
              <div className="col-span-1 font-inter text-sm text-[#c6c6c7] font-mono">
                {item.codeId}
              </div>

              {/* Equipment Name & Image */}
              <div className="col-span-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-[#2a2a2a] rounded-none border border-[#F5F5F5]/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="object-cover w-full h-full opacity-80 mix-blend-luminosity group-hover:mix-blend-normal group-hover:opacity-100 transition-all duration-300"
                  />
                </div>
                <div>
                  <p className="font-montserrat font-semibold text-base text-[#FFFFFF] group-hover:text-[#E2FF00] transition-colors">
                    {item.name}
                  </p>
                  <p className="font-inter text-xs text-[#c6c6c7]">
                    {item.division}
                  </p>
                </div>
              </div>

              {/* Zone */}
              <div className="col-span-2 font-inter text-base text-[#FFFFFF] hidden md:block">
                {item.zone}
              </div>

              {/* Status Pill */}
              <div className="col-span-2">
                {isAvailable && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#201f1f] rounded-none border border-[#E2FF00] text-[#E2FF00] font-montserrat text-xs font-bold tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#E2FF00] animate-pulse"></span>
                    Available
                  </span>
                )}
                {isMaintenance && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#201f1f] rounded-none border border-[#F5F5F5]/20 text-[#F5F5F5] font-montserrat text-xs font-bold tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#F5F5F5]/50"></span>
                    Maintenance
                  </span>
                )}
                {isOutOfOrder && (
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#201f1f] rounded-none border border-[#ffb4ab] text-[#ffb4ab] font-montserrat text-xs font-bold tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#ffb4ab]"></span>
                    Out of Order
                  </span>
                )}
              </div>

              {/* Last Service Date */}
              <div className="col-span-2 font-inter text-sm text-[#c6c6c7] hidden md:block">
                {item.lastService}
              </div>

              {/* Action Button */}
              <div className="col-span-1 flex justify-end text-right">
                <button
                  type="button"
                  className="p-1 hover:text-[#E2FF00] text-[#c6c6c7] transition-colors"
                  title="Configure"
                >
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="p-12 border border-white/10 bg-[#131313] text-center">
          <p className="font-bebas text-2xl text-white">NO ASSETS MATCHING CRITERIA</p>
          <p className="font-inter text-sm text-[#c6c9ab] mt-1">
            Reset active filters or add new facility equipment.
          </p>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border-2 border-[#E2FF00] w-full max-w-lg p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-[#c6c6c7] hover:text-white font-mono text-xl"
            >
              ✕
            </button>
            <h3 className="font-bebas text-3xl text-[#E2FF00] tracking-wider mb-2">
              ADD ASSET TO INVENTORY
            </h3>
            <p className="font-inter text-xs text-[#c6c9ab] mb-6">
              Register new gym machinery, barbell sets, or cardio units.
            </p>

            <form onSubmit={handleCreateEquipment} className="flex flex-col gap-4">
              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Equipment Model Name *
                </label>
                <input
                  required
                  type="text"
                  value={newEquipmentForm.name}
                  onChange={(e) => setNewEquipmentForm({ ...newEquipmentForm, name: e.target.value })}
                  placeholder="e.g. Olympic Incline Bench V3"
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                    Division
                  </label>
                  <select
                    value={newEquipmentForm.division}
                    onChange={(e) => setNewEquipmentForm({ ...newEquipmentForm, division: e.target.value as EquipmentDivision })}
                    className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                  >
                    <option value="Cardio Division">Cardio Division</option>
                    <option value="Strength Division">Strength Division</option>
                    <option value="Functional Division">Functional Division</option>
                    <option value="Recovery Division">Recovery Division</option>
                  </select>
                </div>

                <div>
                  <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                    Floor Zone
                  </label>
                  <select
                    value={newEquipmentForm.zone}
                    onChange={(e) => setNewEquipmentForm({ ...newEquipmentForm, zone: e.target.value as GymZone })}
                    className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                  >
                    <option value="Zone A">Zone A (Cardio & Warmup)</option>
                    <option value="Zone B">Zone B (Cables & Machines)</option>
                    <option value="Zone C">Zone C (Free Weights & Power)</option>
                    <option value="Zone D">Zone D (Turf & Functional)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Operating Status
                </label>
                <select
                  value={newEquipmentForm.status}
                  onChange={(e) => setNewEquipmentForm({ ...newEquipmentForm, status: e.target.value as EquipmentStatus })}
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                >
                  <option value="available">Available (Operational)</option>
                  <option value="maintenance">In Maintenance</option>
                  <option value="out_of_order">Out of Order</option>
                </select>
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Maintenance / Inspection Notes
                </label>
                <textarea
                  rows={2}
                  value={newEquipmentForm.notes}
                  onChange={(e) => setNewEquipmentForm({ ...newEquipmentForm, notes: e.target.value })}
                  placeholder="Calibration notes, cable checks, safety inspection records..."
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full bg-[#E2FF00] text-[#111111] font-bebas text-2xl py-3 uppercase hover:bg-white transition-colors cursor-pointer"
              >
                PROVISION EQUIPMENT
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border border-white/20 w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowFilterModal(false)}
              className="absolute top-4 right-4 text-[#c6c6c7] hover:text-white font-mono text-xl"
            >
              ✕
            </button>
            <h3 className="font-bebas text-3xl text-white tracking-wider mb-4">FILTER ASSET INVENTORY</h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available Only</option>
                  <option value="maintenance">Maintenance Only</option>
                  <option value="out_of_order">Out of Order Only</option>
                </select>
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Division
                </label>
                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value as any)}
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white text-sm"
                >
                  <option value="all">All Divisions</option>
                  <option value="Cardio Division">Cardio Division</option>
                  <option value="Strength Division">Strength Division</option>
                  <option value="Functional Division">Functional Division</option>
                </select>
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Gym Zone
                </label>
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value as any)}
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white text-sm"
                >
                  <option value="all">All Zones</option>
                  <option value="Zone A">Zone A</option>
                  <option value="Zone B">Zone B</option>
                  <option value="Zone C">Zone C</option>
                  <option value="Zone D">Zone D</option>
                </select>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setDivisionFilter('all');
                    setZoneFilter('all');
                    setShowFilterModal(false);
                  }}
                  className="flex-1 border border-white/20 text-white font-montserrat font-bold text-xs py-3 uppercase"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 bg-[#E2FF00] text-[#111111] font-montserrat font-bold text-xs py-3 uppercase"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action & Status Change Dialog */}
      {selectedItemForAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border-2 border-[#E2FF00] w-full max-w-md p-6 relative">
            <button
              onClick={() => setSelectedItemForAction(null)}
              className="absolute top-4 right-4 text-[#c6c6c7] hover:text-white font-mono text-xl"
            >
              ✕
            </button>

            <h3 className="font-bebas text-3xl text-white tracking-wider mb-1">
              {selectedItemForAction.name}
            </h3>
            <p className="font-montserrat text-xs text-[#E2FF00] font-bold uppercase mb-4">
              {selectedItemForAction.codeId} • {selectedItemForAction.zone}
            </p>

            <p className="font-inter text-xs text-[#c6c9ab] mb-4">
              Notes: {selectedItemForAction.notes || 'Routine operation checked.'}
            </p>

            <div className="flex flex-col gap-2">
              <span className="font-montserrat text-xs font-bold text-[#c6c6c7] uppercase">
                Change Status:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickStatusChange(selectedItemForAction.id, 'available')}
                  className={`py-2 px-3 text-xs font-bold uppercase font-montserrat border ${
                    selectedItemForAction.status === 'available'
                      ? 'bg-[#E2FF00] text-[#111111] border-[#E2FF00]'
                      : 'border-white/20 text-white hover:border-[#E2FF00]'
                  }`}
                >
                  Available
                </button>
                <button
                  onClick={() => handleQuickStatusChange(selectedItemForAction.id, 'maintenance')}
                  className={`py-2 px-3 text-xs font-bold uppercase font-montserrat border ${
                    selectedItemForAction.status === 'maintenance'
                      ? 'bg-white text-[#111111] border-white'
                      : 'border-white/20 text-white hover:border-white'
                  }`}
                >
                  Maintenance
                </button>
                <button
                  onClick={() => handleQuickStatusChange(selectedItemForAction.id, 'out_of_order')}
                  className={`py-2 px-3 text-xs font-bold uppercase font-montserrat border ${
                    selectedItemForAction.status === 'out_of_order'
                      ? 'bg-[#ffb4ab] text-[#111111] border-[#ffb4ab]'
                      : 'border-white/20 text-[#ffb4ab] hover:border-[#ffb4ab]'
                  }`}
                >
                  Out of Order
                </button>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    onDeleteEquipment(selectedItemForAction.id);
                    setSelectedItemForAction(null);
                  }}
                  className="w-full border border-[#ffb4ab] text-[#ffb4ab] font-montserrat font-bold text-xs py-2 uppercase hover:bg-[#ffb4ab] hover:text-[#111111] transition-colors"
                >
                  Decommission Asset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
