export type ScreenView = 
  | 'login'
  | 'dashboard'
  | 'members'
  | 'inventory'
  | 'training_log'
  | 'access_control';

export type MemberStatus = 'active' | 'expired' | 'pending';
export type MemberPlan = 'Pro Tier' | 'Base Tier' | 'VIP Black' | 'Elite All-Access';

export interface Member {
  id: string;
  codeId: string;
  name: string;
  email: string;
  phone?: string;
  plan: MemberPlan;
  status: MemberStatus;
  renewDate: string;
  expiredDate?: string;
  avatarUrl: string;
  actionReqd?: string;
  stats?: {
    bench1RM: string;
    deadlift1RM: string;
    squat1RM: string;
    weeklyVisits: number;
    memberSince: string;
    activeStreakDays: number;
  };
}

export type EquipmentStatus = 'available' | 'maintenance' | 'out_of_order';
export type EquipmentDivision = 'Cardio Division' | 'Strength Division' | 'Functional Division' | 'Recovery Division';
export type GymZone = 'Zone A' | 'Zone B' | 'Zone C' | 'Zone D';

export interface Equipment {
  id: string;
  codeId: string;
  name: string;
  division: EquipmentDivision;
  zone: GymZone;
  status: EquipmentStatus;
  lastService: string;
  imageUrl: string;
  serialNumber?: string;
  notes?: string;
}

export interface TrainingLogEntry {
  id: string;
  memberName: string;
  memberAvatar?: string;
  timeAgo: string;
  timestamp: string;
  focus: string;
  durationMin: number;
  durationFormatted: string;
  keyMovement?: string;
  status: 'checked_in' | 'completed';
  zone?: GymZone;
}

export interface RolePermission {
  id: string;
  label: string;
  enabled: boolean;
  category: 'members' | 'financials' | 'inventory' | 'system' | 'access';
}

export interface SystemRole {
  id: string;
  name: string;
  description: string;
  userCount: number;
  isAdministrator?: boolean;
  permissions: {
    [key: string]: boolean;
  };
  activeUsersList: string[];
}
