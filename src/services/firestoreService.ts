import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDoc,
  query,
  where,
  WriteBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  STL,
  Member,
  Attendance,
  Transaction,
  SystemSettings,
  AttendanceStatus,
} from '../types';

export const ADMIN_PASSWORD = '212650';

const DEFAULT_SETTINGS: SystemSettings = {
  absentPenaltyAmount: 50,
  platformName: 'Unity Earning E-Learning Platform',
  updatedAt: new Date().toISOString(),
};

// Helper function to commit large batch operations in safe chunks of 400 (under Firestore limit of 500)
async function commitChunkedOperations(
  operations: Array<(batch: WriteBatch) => void>
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    chunk.forEach((op) => op(batch));
    await batch.commit();
  }
}

// Real-time listener for Settings
export function subscribeSettings(callback: (settings: SystemSettings) => void) {
  const docRef = doc(db, 'settings', 'global');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SystemSettings);
    } else {
      // Initialize default settings if not exists
      setDoc(docRef, DEFAULT_SETTINGS).catch(console.error);
      callback(DEFAULT_SETTINGS);
    }
  });
}

export async function updateSystemSettings(newSettings: Partial<SystemSettings>) {
  const docRef = doc(db, 'settings', 'global');
  await setDoc(
    docRef,
    {
      ...newSettings,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// Real-time listener for STLs
export function subscribeSTLs(callback: (stls: STL[]) => void) {
  const colRef = collection(db, 'stls');
  return onSnapshot(colRef, (snapshot) => {
    const list: STL[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as STL);
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    callback(list);
  });
}

// Real-time listener for Members
export function subscribeMembers(callback: (members: Member[]) => void) {
  const colRef = collection(db, 'members');
  return onSnapshot(colRef, (snapshot) => {
    const list: Member[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Member);
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    callback(list);
  });
}

// Real-time listener for Attendance
export function subscribeAttendance(callback: (records: Attendance[]) => void) {
  const colRef = collection(db, 'attendance');
  return onSnapshot(colRef, (snapshot) => {
    const list: Attendance[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Attendance);
    });
    callback(list);
  });
}

// Real-time listener for Transactions
export function subscribeTransactions(callback: (txs: Transaction[]) => void) {
  const colRef = collection(db, 'transactions');
  return onSnapshot(colRef, (snapshot) => {
    const list: Transaction[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Transaction);
    });
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    callback(list);
  });
}

// STL CRUD
export async function createSTL(data: { name: string; phone: string; password: string }): Promise<string> {
  const id = 'stl_' + Date.now();
  const stlDoc: STL = {
    id,
    name: data.name.trim(),
    phone: data.phone.trim(),
    password: data.password.trim(),
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'stls', id), stlDoc);
  return id;
}

export async function updateSTL(id: string, data: Partial<Omit<STL, 'id' | 'createdAt'>>) {
  const docRef = doc(db, 'stls', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteSTL(id: string, memberIdsToDelete: string[] = []): Promise<void> {
  const ops: Array<(batch: WriteBatch) => void> = [];
  ops.push((b) => b.delete(doc(db, 'stls', id)));

  for (const memId of memberIdsToDelete) {
    ops.push((b) => b.delete(doc(db, 'members', memId)));
  }

  await commitChunkedOperations(ops);
}

// Member CRUD
export async function createMember(data: Omit<Member, 'id' | 'createdAt'>): Promise<string> {
  const id = 'mem_' + Date.now();
  const newMember: Member = {
    ...data,
    id,
    name: data.name.trim(),
    phone: data.phone.trim(),
    balance: Number(data.balance) || 0,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'members', id), newMember);
  return id;
}

export async function updateMember(id: string, data: Partial<Omit<Member, 'id' | 'createdAt'>>) {
  const docRef = doc(db, 'members', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteMember(id: string): Promise<void> {
  const ops: Array<(batch: WriteBatch) => void> = [];
  ops.push((b) => b.delete(doc(db, 'members', id)));

  try {
    const attSnap = await getDocs(query(collection(db, 'attendance'), where('memberId', '==', id)));
    attSnap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));

    const txSnap = await getDocs(query(collection(db, 'transactions'), where('memberId', '==', id)));
    txSnap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
  } catch (e) {
    console.warn('Notice querying member sub-records for deletion:', e);
  }

  await commitChunkedOperations(ops);
}

// Attendance Batch Saving with Fine Deductions & Refunds (Optimized for instant execution)
export interface AttendanceInput {
  memberId: string;
  status: AttendanceStatus;
  notes?: string;
}

export async function saveBatchAttendance(
  date: string, // YYYY-MM-DD
  stlId: string,
  records: AttendanceInput[],
  penaltyAmount: number,
  existingMembers: Member[] = [],
  existingAttendance: Attendance[] = []
): Promise<{ savedCount: number; penalizedCount: number; refundedCount: number }> {
  const ops: Array<(batch: WriteBatch) => void> = [];
  let penalizedCount = 0;
  let refundedCount = 0;

  const sessionTimestamp = Date.now();
  const meetingTimeStr = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const balanceTracker = new Map<string, number>();
  existingMembers.forEach((m) => balanceTracker.set(m.id, Number(m.balance || 0)));

  for (const item of records) {
    const attendanceDocId = `${date}_${sessionTimestamp}_${item.memberId}`;
    const attendanceRef = doc(db, 'attendance', attendanceDocId);

    let currentBalance = balanceTracker.get(item.memberId);
    const memberRef = doc(db, 'members', item.memberId);

    if (currentBalance === undefined) {
      const memberSnap = await getDoc(memberRef);
      currentBalance = memberSnap.exists() ? Number(memberSnap.data().balance || 0) : 0;
      balanceTracker.set(item.memberId, currentBalance);
    }

    let penaltyToDeduct = 0;

    if (item.status === 'ABSENT') {
      penaltyToDeduct = penaltyAmount;
      const newBalance = currentBalance - penaltyToDeduct;
      balanceTracker.set(item.memberId, newBalance);

      ops.push((b) =>
        b.update(memberRef, {
          balance: newBalance,
          updatedAt: new Date().toISOString(),
        })
      );

      const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const txDoc: Transaction = {
        id: txId,
        memberId: item.memberId,
        type: 'PENALTY',
        amount: penaltyToDeduct,
        previousBalance: currentBalance,
        newBalance: newBalance,
        reason: `Absent Penalty for ${date} (Meeting: ${meetingTimeStr})`,
        date,
        createdAt: new Date().toISOString(),
      };
      ops.push((b) => b.set(doc(db, 'transactions', txId), txDoc));
      penalizedCount++;
    }

    const attendanceData: Attendance = {
      id: attendanceDocId,
      memberId: item.memberId,
      stlId,
      date,
      status: item.status,
      penaltyDeducted: penaltyToDeduct,
      notes: item.notes || '',
      markedAt: new Date().toISOString(),
    };

    ops.push((b) => b.set(attendanceRef, attendanceData));
  }

  await commitChunkedOperations(ops);

  return {
    savedCount: records.length,
    penalizedCount,
    refundedCount,
  };
}

// Delete / Clear an entire day's attendance for an STL (reverses fines if absent was marked)
export async function deleteDayAttendanceForSTL(
  date: string,
  stlId: string,
  members: Member[],
  attendance: Attendance[] = []
): Promise<{ deletedCount: number; refundedCount: number }> {
  const ops: Array<(batch: WriteBatch) => void> = [];
  let deletedCount = 0;
  let refundedCount = 0;

  const dayRecords = attendance.filter((a) => a.date === date && a.stlId === stlId);

  const balanceTracker = new Map<string, number>();
  members.forEach((m) => balanceTracker.set(m.id, Number(m.balance || 0)));

  for (const record of dayRecords) {
    const attendanceRef = doc(db, 'attendance', record.id);
    if (record.status === 'ABSENT' && (record.penaltyDeducted || 0) > 0) {
      const penalty = record.penaltyDeducted || 0;
      const currentBal = balanceTracker.get(record.memberId) ?? 0;
      const newBal = currentBal + penalty;
      balanceTracker.set(record.memberId, newBal);

      const memberRef = doc(db, 'members', record.memberId);
      ops.push((b) =>
        b.update(memberRef, {
          balance: newBal,
          updatedAt: new Date().toISOString(),
        })
      );

      const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const txDoc: Transaction = {
        id: txId,
        memberId: record.memberId,
        type: 'REFUND',
        amount: penalty,
        previousBalance: currentBal,
        newBalance: newBal,
        reason: `Fine Refund: Attendance for ${date} was reset/cleared`,
        date,
        createdAt: new Date().toISOString(),
      };
      ops.push((b) => b.set(doc(db, 'transactions', txId), txDoc));
      refundedCount++;
    }

    ops.push((b) => b.delete(attendanceRef));
    deletedCount++;
  }

  // Also support legacy doc ID `${date}_${member.id}` if any
  const stlMembers = members.filter((m) => m.stlId === stlId);
  for (const member of stlMembers) {
    const legacyDocId = `${date}_${member.id}`;
    if (!dayRecords.some((r) => r.id === legacyDocId)) {
      ops.push((b) => b.delete(doc(db, 'attendance', legacyDocId)));
    }
  }

  await commitChunkedOperations(ops);

  return { deletedCount, refundedCount };
}

// Admin manual Wallet adjustments
export async function adjustMemberBalance(
  memberId: string,
  amount: number,
  type: 'ADMIN_CREDIT' | 'ADMIN_DEBIT',
  reason: string
) {
  const memberRef = doc(db, 'members', memberId);
  const snap = await getDoc(memberRef);
  if (!snap.exists()) throw new Error('Member not found');

  const currentBalance = Number(snap.data().balance || 0);
  const diff = type === 'ADMIN_CREDIT' ? Math.abs(amount) : -Math.abs(amount);
  const newBalance = currentBalance + diff;

  await updateDoc(memberRef, {
    balance: newBalance,
    updatedAt: new Date().toISOString(),
  });

  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const txDoc: Transaction = {
    id: txId,
    memberId,
    type,
    amount: Math.abs(amount),
    previousBalance: currentBalance,
    newBalance,
    reason: reason || (type === 'ADMIN_CREDIT' ? 'Manual Credit by Admin' : 'Manual Debit by Admin'),
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'transactions', txId), txDoc);
}

// Master reset: clears all attendance, transactions, and resets all member wallet balances to 0
export async function clearAllSystemData(): Promise<void> {
  const attSnap = await getDocs(collection(db, 'attendance'));
  const txSnap = await getDocs(collection(db, 'transactions'));
  const memSnap = await getDocs(collection(db, 'members'));

  const ops: Array<(batch: WriteBatch) => void> = [];

  attSnap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));
  txSnap.docs.forEach((d) => ops.push((b) => b.delete(d.ref)));

  memSnap.docs.forEach((d) => {
    ops.push((b) =>
      b.update(d.ref, {
        balance: 0,
        updatedAt: new Date().toISOString(),
      })
    );
  });

  await commitChunkedOperations(ops);
}

// Purge any pre-seeded demo records to ensure fresh clean database
export async function cleanupDemoData(): Promise<void> {
  try {
    const demoStlIds = ['stl_demo_1', 'stl_demo_2'];
    const demoMemIds = ['mem_tl_1', 'mem_tl_2', 'mem_tl_3', 'mem_tt_1', 'mem_tt_2', 'mem_tt_3'];

    const ops: Array<(batch: WriteBatch) => void> = [];

    for (const id of demoStlIds) {
      ops.push((b) => b.delete(doc(db, 'stls', id)));
    }
    for (const id of demoMemIds) {
      ops.push((b) => b.delete(doc(db, 'members', id)));
    }

    const pastDays = ['01', '02', '03'];
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    for (const day of pastDays) {
      const dateStr = `${y}-${m}-${day}`;
      for (const memId of demoMemIds) {
        ops.push((b) => b.delete(doc(db, 'attendance', `${dateStr}_${memId}`)));
      }
    }

    await commitChunkedOperations(ops);
    console.log('Any demo records cleaned up.');
  } catch (err) {
    console.warn('Cleanup demo notice:', err);
  }
}



