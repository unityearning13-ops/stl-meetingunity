export type UserRole = 'ADMIN' | 'STL';

export type MemberRole = 'TEAM_LEADER' | 'TEAM_TRAINER';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE';

export interface STL {
  id: string;
  name: string;
  phone: string;
  password: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  role: MemberRole;
  stlId: string;
  balance: number; // in BDT (Taka)
  createdAt: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string; // usually `date_memberId` for idempotency
  memberId: string;
  stlId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  penaltyDeducted: number;
  notes?: string;
  markedAt: string;
}

export type TransactionType = 'PENALTY' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT' | 'REFUND';

export interface Transaction {
  id: string;
  memberId: string;
  type: TransactionType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  date: string;
  createdAt: string;
}

export interface SystemSettings {
  absentPenaltyAmount: number; // fine per absence in BDT, default 50
  platformName: string;
  updatedAt?: string;
}

export interface AuthSession {
  role: UserRole;
  stl?: STL;
}
