import React, { useState } from 'react';
import { SystemRole } from '../types';

interface AccessControlScreenProps {
  roles: SystemRole[];
  onAddRole: (role: Omit<SystemRole, 'id'>) => void;
  onUpdateRole: (id: string, updates: Partial<SystemRole>) => void;
  onDeleteRole: (id: string) => void;
}

export const AccessControlScreen: React.FC<AccessControlScreenProps> = ({
  roles,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
}) => {
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<SystemRole | null>(null);
  const [roleToRevoke, setRoleToRevoke] = useState<SystemRole | null>(null);

  // New role form state
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    description: '',
    userCount: 1,
    permissions: {
      viewLogs: true,
      memberCheckIn: true,
      editSchedules: false,
      accessBilling: false,
      overrideAccess: false,
    },
  });

  const handleTogglePermission = (roleId: string, permKey: string) => {
    const targetRole = roles.find((r) => r.id === roleId);
    if (!targetRole) return;

    const currentVal = targetRole.permissions[permKey] ?? false;
    const updatedPermissions = {
      ...targetRole.permissions,
      [permKey]: !currentVal,
    };

    onUpdateRole(roleId, { permissions: updatedPermissions });
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.name.trim()) return;

    onAddRole({
      name: newRoleForm.name,
      description: newRoleForm.description || 'Custom designated operational role.',
      userCount: Number(newRoleForm.userCount) || 1,
      permissions: newRoleForm.permissions,
      activeUsersList: ['Assigned Staff Member'],
    });

    setNewRoleForm({
      name: '',
      description: '',
      userCount: 1,
      permissions: {
        viewLogs: true,
        memberCheckIn: true,
        editSchedules: false,
        accessBilling: false,
        overrideAccess: false,
      },
    });
    setShowAddRoleModal(false);
  };

  const handleSaveRoleConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleForEdit) return;
    onUpdateRole(selectedRoleForEdit.id, selectedRoleForEdit);
    setSelectedRoleForEdit(null);
  };

  const confirmRevoke = () => {
    if (roleToRevoke) {
      onDeleteRole(roleToRevoke.id);
      setRoleToRevoke(null);
    }
  };

  const adminRole = roles.find((r) => r.isAdministrator || r.name.toLowerCase().includes('admin')) || roles[0];
  const otherRoles = roles.filter((r) => r.id !== adminRole?.id);

  return (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col gap-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[#F5F5F5]/20 pb-6 gap-6">
        <div>
          <h2 className="font-bebas text-4xl md:text-5xl uppercase tracking-wider text-white m-0 flex items-center gap-3">
            <span className="w-2 h-10 bg-[#E2FF00] inline-block"></span>
            ACCESS CONTROL
          </h2>
          <p className="font-montserrat text-sm text-[#c6c6c7] mt-2 max-w-2xl font-medium">
            Manage system roles and granular permissions. Define operational boundaries for staff to ensure protocol integrity.
          </p>
        </div>

        <button
          id="add-role-top-btn"
          onClick={() => setShowAddRoleModal(true)}
          className="bg-[#E2FF00] text-[#111111] font-montserrat font-bold text-xs uppercase py-4 px-8 hover:bg-white hover:scale-95 transition-all duration-200 ease-out flex items-center justify-center gap-2 whitespace-nowrap self-start md:self-auto border border-[#E2FF00] rounded-none cursor-pointer tracking-wider shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
        >
          <span className="material-symbols-outlined text-xl font-bold">add_box</span>
          ADD ROLE
        </button>
      </div>

      {/* Bento Grid Layout for Roles */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Administrator Role Card (Spans 8 cols) */}
        {adminRole && (
          <div className="md:col-span-8 bg-[#201f1f] border border-white/20 p-6 flex flex-col hover:border-[#E2FF00]/50 transition-colors duration-300 relative group overflow-hidden">
            {/* Decorative background accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E2FF00]/5 rounded-bl-full -z-10 group-hover:scale-150 transition-transform duration-700 ease-out"></div>

            <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="material-symbols-outlined text-[#E2FF00] text-3xl">
                    shield_person
                  </span>
                  <h3 className="font-bebas text-3xl text-white uppercase tracking-wider m-0">
                    {adminRole.name}
                  </h3>
                </div>
                <p className="font-inter text-xs text-[#c6c6c7]">
                  {adminRole.description}
                </p>
              </div>

              <div className="bg-[#111111] border border-white/20 px-3 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#E2FF00] rounded-none animate-pulse"></div>
                <span className="font-montserrat text-xs font-bold text-white uppercase tracking-wider">
                  {adminRole.userCount} USERS
                </span>
              </div>
            </div>

            {/* Checklist of 4 Core Capabilities */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 flex-1">
              <div className="flex items-center gap-2 text-[#c6c9ab]">
                <span className="material-symbols-outlined text-[#E2FF00] text-lg">check_circle</span>
                <span className="font-inter text-xs font-medium text-white">Member Mgmt</span>
              </div>
              <div className="flex items-center gap-2 text-[#c6c9ab]">
                <span className="material-symbols-outlined text-[#E2FF00] text-lg">check_circle</span>
                <span className="font-inter text-xs font-medium text-white">Financials</span>
              </div>
              <div className="flex items-center gap-2 text-[#c6c9ab]">
                <span className="material-symbols-outlined text-[#E2FF00] text-lg">check_circle</span>
                <span className="font-inter text-xs font-medium text-white">Inventory Control</span>
              </div>
              <div className="flex items-center gap-2 text-[#c6c9ab]">
                <span className="material-symbols-outlined text-[#E2FF00] text-lg">check_circle</span>
                <span className="font-inter text-xs font-medium text-white">System Config</span>
              </div>
            </div>

            <div className="flex justify-end mt-auto pt-4 border-t border-white/10">
              <button
                onClick={() => setSelectedRoleForEdit(adminRole)}
                className="font-montserrat text-xs font-bold text-[#E2FF00] uppercase hover:text-white transition-colors flex items-center gap-1 cursor-pointer tracking-wider"
              >
                EDIT PERMISSIONS <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Total Roles Metric Card (Spans 4 cols) */}
        <div className="md:col-span-4 bg-[#111111] border border-white/20 p-6 flex flex-col justify-center items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E2FF00]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          <h4 className="font-montserrat text-xs font-bold text-[#c6c6c7] uppercase tracking-widest mb-2">
            TOTAL DEFINED ROLES
          </h4>
          <div className="font-bebas text-7xl md:text-8xl text-white leading-none tracking-wider">
            {String(roles.length).padStart(2, '0')}
          </div>
          <div className="mt-4 flex gap-2">
            <span className="w-8 h-1 bg-[#E2FF00]"></span>
            <span className="w-2 h-1 bg-white/20"></span>
            <span className="w-2 h-1 bg-white/20"></span>
          </div>
        </div>

        {/* Staff Roles (Spanning 6 cols each) */}
        {otherRoles.map((role) => {
          const isTrainer = role.name.toLowerCase().includes('trainer');
          const iconName = isTrainer ? 'sports_martial_arts' : 'badge';

          return (
            <div
              key={role.id}
              className="md:col-span-6 bg-[#201f1f] border border-white/20 p-6 flex flex-col hover:border-white/50 transition-colors duration-300"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="material-symbols-outlined text-white text-3xl">
                      {iconName}
                    </span>
                    <h3 className="font-montserrat font-bold text-lg text-white uppercase tracking-wider m-0">
                      {role.name}
                    </h3>
                  </div>
                  <p className="font-inter text-xs text-[#c6c6c7]">
                    {role.description}
                  </p>
                </div>
                <span className="font-montserrat text-xs font-bold text-[#c6c6c7] uppercase border border-white/20 px-2.5 py-1">
                  {role.userCount} Users
                </span>
              </div>

              {/* Permission Switches */}
              <div className="space-y-3 mb-6">
                {/* Specific toggles depending on role or generic */}
                {isTrainer ? (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="font-inter text-xs text-[#c6c9ab]">View Training Logs</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(role.id, 'viewLogs')}
                        className={`w-8 h-4 flex p-0.5 cursor-pointer transition-colors ${
                          role.permissions.viewLogs ? 'bg-[#E2FF00] justify-end' : 'bg-[#353534] justify-start border border-white/20'
                        }`}
                      >
                        <div className={`w-3 h-3 ${role.permissions.viewLogs ? 'bg-[#111111]' : 'bg-[#c6c6c7]'}`}></div>
                      </button>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="font-inter text-xs text-[#c6c9ab]">Edit Schedules</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(role.id, 'editSchedules')}
                        className={`w-8 h-4 flex p-0.5 cursor-pointer transition-colors ${
                          role.permissions.editSchedules ? 'bg-[#E2FF00] justify-end' : 'bg-[#353534] justify-start border border-white/20'
                        }`}
                      >
                        <div className={`w-3 h-3 ${role.permissions.editSchedules ? 'bg-[#111111]' : 'bg-[#c6c6c7]'}`}></div>
                      </button>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="font-inter text-xs text-[#c6c9ab]">Access Billing</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(role.id, 'accessBilling')}
                        className={`w-8 h-4 flex p-0.5 cursor-pointer transition-colors ${
                          role.permissions.accessBilling ? 'bg-[#E2FF00] justify-end' : 'bg-[#353534] justify-start border border-white/20'
                        }`}
                      >
                        <div className={`w-3 h-3 ${role.permissions.accessBilling ? 'bg-[#111111]' : 'bg-[#c6c6c7]'}`}></div>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="font-inter text-xs text-[#c6c9ab]">Member Check-in</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(role.id, 'memberCheckIn')}
                        className={`w-8 h-4 flex p-0.5 cursor-pointer transition-colors ${
                          role.permissions.memberCheckIn ? 'bg-[#E2FF00] justify-end' : 'bg-[#353534] justify-start border border-white/20'
                        }`}
                      >
                        <div className={`w-3 h-3 ${role.permissions.memberCheckIn ? 'bg-[#111111]' : 'bg-[#c6c6c7]'}`}></div>
                      </button>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="font-inter text-xs text-[#c6c9ab]">Process Retail POS</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(role.id, 'processPOS')}
                        className={`w-8 h-4 flex p-0.5 cursor-pointer transition-colors ${
                          role.permissions.processPOS ? 'bg-[#E2FF00] justify-end' : 'bg-[#353534] justify-start border border-white/20'
                        }`}
                      >
                        <div className={`w-3 h-3 ${role.permissions.processPOS ? 'bg-[#111111]' : 'bg-[#c6c6c7]'}`}></div>
                      </button>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="font-inter text-xs text-[#c6c9ab]">Override Access</span>
                      <button
                        type="button"
                        onClick={() => handleTogglePermission(role.id, 'overrideAccess')}
                        className={`w-8 h-4 flex p-0.5 cursor-pointer transition-colors ${
                          role.permissions.overrideAccess ? 'bg-[#E2FF00] justify-end' : 'bg-[#353534] justify-start border border-white/20'
                        }`}
                      >
                        <div className={`w-3 h-3 ${role.permissions.overrideAccess ? 'bg-[#111111]' : 'bg-[#c6c6c7]'}`}></div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setRoleToRevoke(role)}
                  className="font-montserrat font-bold text-xs text-[#ffb4ab] uppercase hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">delete</span> REVOKE
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRoleForEdit(role)}
                  className="font-montserrat font-bold text-xs text-white uppercase hover:text-[#E2FF00] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  CONFIGURE <span className="material-symbols-outlined text-sm">settings</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border-2 border-[#E2FF00] w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowAddRoleModal(false)}
              className="absolute top-4 right-4 text-[#c6c6c7] hover:text-white font-mono text-xl"
            >
              ✕
            </button>
            <h3 className="font-bebas text-3xl text-[#E2FF00] tracking-wider mb-1">
              DEFINE NEW STAFF ROLE
            </h3>
            <p className="font-inter text-xs text-[#c6c9ab] mb-4">
              Configure boundaries and security clearance.
            </p>

            <form onSubmit={handleCreateRole} className="flex flex-col gap-4">
              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Role Title *
                </label>
                <input
                  required
                  type="text"
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  placeholder="e.g. Strength & Conditioning Specialist"
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                />
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Scope Description
                </label>
                <input
                  type="text"
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  placeholder="e.g. Programming oversight and athlete bio-analytics."
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                />
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Assigned Personnel Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={newRoleForm.userCount}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, userCount: Number(e.target.value) })}
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full bg-[#E2FF00] text-[#111111] font-bebas text-2xl py-3 uppercase hover:bg-white transition-colors cursor-pointer"
              >
                DEPLOY ROLE PERMISSION
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Configure Role Modal */}
      {selectedRoleForEdit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border border-white/20 w-full max-w-md p-6 relative">
            <button
              onClick={() => setSelectedRoleForEdit(null)}
              className="absolute top-4 right-4 text-[#c6c6c7] hover:text-white font-mono text-xl"
            >
              ✕
            </button>
            <h3 className="font-bebas text-3xl text-white tracking-wider mb-1">
              CONFIGURE {selectedRoleForEdit.name}
            </h3>
            <p className="font-inter text-xs text-[#c6c9ab] mb-4">
              Update scope parameters and personnel assignments.
            </p>

            <form onSubmit={handleSaveRoleConfig} className="flex flex-col gap-4">
              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Role Title
                </label>
                <input
                  type="text"
                  value={selectedRoleForEdit.name}
                  onChange={(e) => setSelectedRoleForEdit({ ...selectedRoleForEdit, name: e.target.value })}
                  className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                />
              </div>

              <div>
                <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">
                  Active Users List
                </label>
                <div className="p-3 bg-[#201f1f] border border-white/10 max-h-32 overflow-y-auto flex flex-col gap-1.5 text-xs text-[#c6c9ab]">
                  {selectedRoleForEdit.activeUsersList.map((user, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-[#E2FF00]"></span>
                      <span>{user}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full bg-[#E2FF00] text-[#111111] font-bebas text-2xl py-3 uppercase hover:bg-white transition-colors"
              >
                SAVE PROTOCOL
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Role Confirmation Modal */}
      {roleToRevoke && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border-2 border-[#ffb4ab] w-full max-w-md p-6 relative">
            <h3 className="font-bebas text-3xl text-[#ffb4ab] tracking-wider mb-2">
              CONFIRM ROLE REVOCATION
            </h3>
            <p className="font-inter text-sm text-white mb-4">
              Are you certain you wish to revoke the <strong>{roleToRevoke.name}</strong> role? All {roleToRevoke.userCount} assigned personnel will lose system access immediately.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRoleToRevoke(null)}
                className="flex-1 border border-white/20 text-white font-montserrat font-bold text-xs py-3 uppercase"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevoke}
                className="flex-1 bg-[#93000a] text-white font-montserrat font-bold text-xs py-3 uppercase hover:bg-[#ffb4ab] hover:text-[#111111] transition-colors"
              >
                Revoke Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
