import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './components/Dashboard';
import { calculateBalances, findParticipantIdForUser } from './utils/splitLogic';
import ESplitLogo from './components/ESplitLogo';
import { supabase } from './supabase';

// Components
import GroupSelector from './components/GroupSelector';
import ParticipantManager from './components/ParticipantManager';
import ExpenseList from './components/ExpenseList';
import AddExpenseModal from './components/AddExpenseModal';
import SettleUp from './components/SettleUp';
import SettleUpModal from './components/SettleUpModal';
import ShareGroupModal from './components/ShareGroupModal';
import InviteMemberModal from './components/InviteMemberModal';
import PinModal from './components/PinModal';
import ActivityLog from './components/ActivityLog';
import Chat from './components/Chat';
import QuickAddExpense from './components/QuickAddExpense';
import PeriodSelector from './components/PeriodSelector';
import ClosePeriodModal from './components/ClosePeriodModal';
import PeriodArchive from './components/PeriodArchive';
import PeriodDetailsView from './components/PeriodDetailsView';
import ExportButton from './components/ExportButton';
import { AnimatePresence, motion } from 'framer-motion';

const Analytics = lazy(() => import('./components/Analytics'));

// Icons
import {
  Menu, X, LogOut, Moon, Sun, Shield, Share2,
  Plus, Settings, Receipt, TrendingUp, Users,
  MessageSquare, Activity, Lock, Check, Edit2, BarChart3, Clock, Calendar
} from 'lucide-react';

// Services
import {
  createGroupInSupabase,
  updateGroupInSupabase,
  mutateGroupData,
  deleteGroupInSupabase,
  subscribeToGroups,
  subscribeToGroupData,
  sendMessage
} from './services/supabaseService';

import {
  addGroupMember,
  removeGroupMember,
  updateMemberRole,
  getGroupMembers,
  subscribeToGroupMembers
} from './services/memberService';

import {
  createPeriod,
  closePeriod,
  subscribeToPeriods,
  ensureActivePeriod,
  deletePeriod
} from './services/periodService';

import {
  createActivity,
  formatActivityDescription
} from './utils/activityLogger';

import {
  notifyNewExpense,
  notifyPaymentRecorded,
  notifyExpenseDeleted,
  notifyPeriodClosed
} from './utils/notifications';

import {
  addExpense as addExpenseUpdate,
  replaceExpense,
  removeExpense,
  archiveActiveExpenses,
  addParticipant,
  updateParticipant,
  removeParticipant,
  removeActivity,
  compose
} from './utils/groupMutations';

import { getParticipantHue } from './utils/colors';
import { hashPin, verifyPin, isGroupUnlocked, markGroupUnlocked, lockGroup } from './utils/crypto';

function App() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  // State
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [editExpense, setEditExpense] = useState(null);
  const [settlePrefill, setSettlePrefill] = useState(null);
  const [shareGroupData, setShareGroupData] = useState(null);
  const [pinModalGroupId, setPinModalGroupId] = useState(null);
  const [pinModalMode, setPinModalMode] = useState('enter');

  // Closable Period State
  const [periods, setPeriods] = useState([]);
  const [currentPeriodId, setCurrentPeriodId] = useState(null);
  const [isClosePeriodModalOpen, setIsClosePeriodModalOpen] = useState(false);
  const [viewPeriodDetails, setViewPeriodDetails] = useState(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('e-split-dark-mode') === 'true');
  const refreshGroupDataRef = useRef(null); // Store refresh function for manual sync
  const isMutatingRef = useRef(false); // Store mutation state for subscription callback

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('e-split-dark-mode', darkMode);
  }, [darkMode]);

  // Effects
  useEffect(() => {
    const joinGroupId = location.state?.joinGroupId;
    if (joinGroupId && joinGroupId !== currentGroupId) {
      setCurrentGroupId(joinGroupId);
      localStorage.setItem('lastGroupId', joinGroupId);
      if (user?.email) {
        addGroupMember(joinGroupId, user.email, 'member').catch(console.error);
      }
    }
  }, [location.state, user, currentGroupId]);

  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeToGroups(user.id, (updatedGroups) => {
        setGroups(updatedGroups);

        // Auto-select group
        if (!currentGroupId) {
          const joinGroupId = location.state?.joinGroupId;
          if (joinGroupId) {
            const targetGroup = updatedGroups.find(g => g.id === joinGroupId);
            if (targetGroup) {
              setCurrentGroupId(targetGroup.id);
              localStorage.setItem('lastGroupId', targetGroup.id);
            } else {
              setCurrentGroupId(joinGroupId);
              localStorage.setItem('lastGroupId', joinGroupId);
              if (user.email) {
                addGroupMember(joinGroupId, user.email, 'member').catch(console.error);
              }
            }
          } else if (updatedGroups.length > 0) {
            // Check for last accessed group
            const lastGroupId = localStorage.getItem('lastGroupId');
            const targetGroup = updatedGroups.find(g => g.id === lastGroupId) || updatedGroups[0];
            setCurrentGroupId(targetGroup.id);
          } else {
            // Auto-create welcome group if absolutely no groups exist
            createGroupInSupabase({ name: 'Welcome Group' }).then(newGroup => {
              setCurrentGroupId(newGroup.id);
            }).catch(console.error);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [user, currentGroupId, location.state]);

  useEffect(() => {
    if (!currentGroupId) {
      setParticipants([]);
      setExpenses([]);
      setActivityLog([]);
      setChatMessages([]);
      setPeriods([]);
      return;
    }

    // Load Group Data (Expenses, Chat, etc)
    const handleGroupDataUpdate = (data) => {
      console.log('🔄 Subscription update received. isMutating:', isMutatingRef.current, 'Expenses count:', data?.expenses?.length);
      if (data && !isMutatingRef.current) { // Check ref instead of state
        console.log('✅ Applying subscription update');
        setParticipants(data.participants || []);
        setExpenses(data.expenses || []);
        setActivityLog(data.activityLog || []);
        setChatMessages(data.chatMessages || []);
      } else {
        console.log('🚫 Blocked subscription update (mutation in progress)');
      }
    };

    // Store refresh function for manual sync after mutations
    refreshGroupDataRef.current = () => {
      supabase
        .from('groups')
        .select('data')
        .eq('group_id', currentGroupId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setParticipants(data.data.participants || []);
            setExpenses(data.data.expenses || []);
            setActivityLog(data.data.activityLog || []);
            setChatMessages(data.data.chatMessages || []);
          }
        });
    };

    const unsubscribeData = subscribeToGroupData(currentGroupId, handleGroupDataUpdate);

    // Load Periods
    ensureActivePeriod(currentGroupId).then(active => {
      if (active) setCurrentPeriodId(active.id);
    });

    // Subscribe to Periods
    console.log('DEBUG: Subscribing to periods for', currentGroupId);
    const unsubscribePeriods = subscribeToPeriods(currentGroupId, (updatedPeriods) => {
      console.log('DEBUG: Periods fetched:', updatedPeriods);
      setPeriods(updatedPeriods);

      // Ensure we are selecting the Active period if none selected
      const active = updatedPeriods.find(p => p.status === 'active');
      if (active) setCurrentPeriodId(prev => prev || active.id);
    });

    localStorage.setItem('lastGroupId', currentGroupId);

    return () => {
      unsubscribeData();
      unsubscribePeriods();
    };
  }, [currentGroupId]);

  useEffect(() => {
    if (!currentGroupId) {
      setMembers([]);
      return;
    }
    return subscribeToGroupMembers(currentGroupId, setMembers);
  }, [currentGroupId]);

  // Handlers
  const handleSelectGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group?.pinEnabled && !isGroupUnlocked(groupId)) {
      setPinModalGroupId(groupId);
      setPinModalMode('enter');
      setIsPinModalOpen(true);
    } else {
      setCurrentGroupId(groupId);
      setIsMobileMenuOpen(false);
    }
  };

  const handleCreateGroup = async (name) => {
    if (!user) return;
    try {
      // FIX: Pass object, not string
      const newGroup = await createGroupInSupabase({ name });
      setCurrentGroupId(newGroup.id);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group");
    }
  };

  const handleEditGroup = async (groupId, name) => {
    try {
      await updateGroupInSupabase(groupId, { name });
    } catch (error) {
      console.error("Error updating group:", error);
      alert("Failed to update group");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Are you sure you want to delete this group?")) return;
    try {
      await deleteGroupInSupabase(groupId);
      if (currentGroupId === groupId) setCurrentGroupId(null);
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group");
    }
  };

  const handleShareGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setShareGroupData({
        ...group,
        id: group.id,
        name: group.name,
        code: group.shareCode || group.id,
        link: window.location.origin + '/join/' + (group.id || group.shareCode || ''),
        participants,
        expenses
      });
      setIsShareModalOpen(true);
    }
  };

  const handleSetPin = (groupId) => {
    setPinModalGroupId(groupId);
    setPinModalMode('set');
    setIsPinModalOpen(true);
  };

  const handlePinSubmit = async (pin) => {
    if (pinModalMode === 'enter') {
      const group = groups.find(g => g.id === pinModalGroupId);
      const storedSecret = group?.pinHash ?? group?.pin;
      const valid = storedSecret && (await verifyPin(pin, storedSecret));
      if (valid) {
        markGroupUnlocked(pinModalGroupId);
        setCurrentGroupId(pinModalGroupId);
        setIsPinModalOpen(false);
        setPinModalGroupId(null);
        setIsMobileMenuOpen(false);
      } else {
        alert('Incorrect PIN');
      }
    } else {
      try {
        const pinHash = await hashPin(pin);
        await updateGroupInSupabase(pinModalGroupId, {
          pinHash,
          pinEnabled: true,
          pin: null,
        });
        markGroupUnlocked(pinModalGroupId);
        setIsPinModalOpen(false);
        setPinModalGroupId(null);
        alert('PIN set successfully');
      } catch (e) {
        console.error(e);
        alert('Failed to set PIN');
      }
    }
  };

  const saveGroupData = async (mutate) => {
    try {
      const saved = await mutateGroupData(currentGroupId, mutate);
      setParticipants(saved.participants || []);
      setExpenses(saved.expenses || []);
      setActivityLog(saved.activityLog || []);
      setChatMessages(saved.chatMessages || []);
      return saved;
    } catch (error) {
      console.error("Error saving group data:", error);
      throw error;
    }
  };

  const handleAddExpense = async (newExpense) => {
    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses); // Optimistic

    const actorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const description = formatActivityDescription('added', 'expense', newExpense);
    const activity = createActivity('added', actorName, 'expense', newExpense.id, description, { previousState: null });

    isMutatingRef.current = true;
    try {
      await saveGroupData(addExpenseUpdate(newExpense, activity));
      notifyNewExpense(newExpense.description, newExpense.amount, actorName);
      if (refreshGroupDataRef.current) refreshGroupDataRef.current();
    } catch (e) {
      console.error(e);
      setExpenses(expenses);
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handleEditExpense = async (updatedExpense) => {
    const oldExpense = expenses.find(e => e.id === updatedExpense.id);
    const updatedExpenses = expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e);
    setExpenses(updatedExpenses);

    const actorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const description = formatActivityDescription('edited', 'expense', updatedExpense);
    const activity = createActivity('edited', actorName, 'expense', updatedExpense.id, description, { previousState: oldExpense });

    isMutatingRef.current = true;
    try {
      await saveGroupData(replaceExpense(updatedExpense, activity));
      if (refreshGroupDataRef.current) refreshGroupDataRef.current();
    } catch (error) {
      console.error(error);
      setExpenses(expenses);
    } finally {
      isMutatingRef.current = false;
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      console.log('🗑️ DELETE START - Expense ID:', expenseId);
      console.log('📊 Current expenses count:', expenses.length);

      const deletedExpense = expenses.find(e => e.id === expenseId);
      const updatedExpenses = expenses.filter(e => e.id !== expenseId);

      console.log('📊 After deletion, expenses count:', updatedExpenses.length);

      // Optimistic update
      setExpenses(updatedExpenses);

      const actorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
      const description = formatActivityDescription('deleted', 'expense', deletedExpense);
      const activity = createActivity('deleted', actorName, 'expense', expenseId, description, { previousState: deletedExpense });

      // Set mutation lock to prevent subscription overwrites
      console.log('🔒 Setting mutation lock');
      isMutatingRef.current = true;

      try {
        console.log('💾 Saving to database...');
        await saveGroupData(removeExpense(expenseId, activity));
        console.log('✅ Save successful');

        notifyExpenseDeleted(deletedExpense?.description, actorName);

        // Manually refresh to ensure we're in sync after mutation
        console.log('🔄 Manual refresh...');
        if (refreshGroupDataRef.current) {
          refreshGroupDataRef.current();
        }
      } catch (error) {
        console.error('❌ Failed to delete expense:', error);
        // Revert optimistic update on failure
        setExpenses(expenses);
        alert('Failed to delete expense. Please try again.');
      } finally {
        // Release mutation lock
        console.log('🔓 Releasing mutation lock');
        isMutatingRef.current = false;
        console.log('🗑️ DELETE COMPLETE');
      }
    }
  };

  const handleOpenEditExpense = (expense) => {
    setEditExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleSettle = async (settlement) => {
    const updatedExpenses = [settlement, ...expenses];
    setExpenses(updatedExpenses);

    const actorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const fromPerson = participants.find(p => p.id === settlement.paidBy);
    const toPerson = participants.find(p => p.id === settlement.paidTo);
    const description = `Recorded payment: ${fromPerson?.name} paid ${toPerson?.name} $${settlement.amount.toFixed(2)}`;
    const activity = createActivity('added', actorName, 'settlement', settlement.id, description, { previousState: null });

    isMutatingRef.current = true;
    try {
      await saveGroupData(addExpenseUpdate(settlement, activity));
      notifyPaymentRecorded(fromPerson?.name || 'Someone', toPerson?.name || 'Someone', settlement.amount);
      if (refreshGroupDataRef.current) refreshGroupDataRef.current();
    } catch (e) {
      console.error(e);
      setExpenses(expenses);
    } finally {
      isMutatingRef.current = false;
    }
    setIsSettleModalOpen(false);
  };

  const handleAddParticipant = async (newParticipant) => {
    setParticipants([...participants, newParticipant]);
    try {
      await saveGroupData(addParticipant(newParticipant));
    } catch {
      setParticipants(participants);
      alert('Failed to add participant. Please try again.');
      return;
    }
    if (newParticipant.email) {
      try { await addGroupMember(currentGroupId, newParticipant.email, 'member'); } catch (e) { console.error(e); }
    }
  };

  const handleEditParticipant = async (participantId, updates) => {
    setParticipants(participants.map(p => p.id === participantId ? { ...p, ...updates } : p));
    try {
      await saveGroupData(updateParticipant(participantId, updates));
    } catch {
      setParticipants(participants);
      alert('Failed to update participant. Please try again.');
      return;
    }
    if (updates.email) {
      try { await addGroupMember(currentGroupId, updates.email, 'member'); } catch (e) { console.error(e); }
    }
  };

  const handleRemoveParticipant = async (userId) => {
    if (!confirm('Are you sure you want to remove this participant?')) return;
    setParticipants(participants.filter(p => p.id !== userId));
    try {
      await saveGroupData(removeParticipant(userId));
    } catch {
      setParticipants(participants);
      alert('Failed to remove participant. Please try again.');
    }
  };

  const handleOpenSettleModal = (prefill) => {
    setSettlePrefill(prefill);
    setIsSettleModalOpen(true);
  };

  const handleSendMessage = async (text) => {
    if (!currentGroupId || !user) return;
    const message = {
      id: crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}`,
      text,
      userId: user.id,
      userName: user.email.split('@')[0],
      timestamp: new Date().toISOString()
    };
    try { await sendMessage(currentGroupId, message); } catch (e) { console.error(e); alert('Failed to send'); }
  };

  const refreshMembers = () => getGroupMembers(currentGroupId).then(setMembers);

  const handleInviteMember = async (userEmail, role) => {
    try {
      const result = await addGroupMember(currentGroupId, userEmail, role);
      if (!result) {
        alert('No account found for that email. They need to sign up first.');
        return;
      }
      await refreshMembers();
      alert('Invited!');
    } catch (e) { console.error(e); throw e; }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove member?')) return;
    try {
      await removeGroupMember(currentGroupId, userId);
      await refreshMembers();
    } catch (e) { console.error(e); alert('Failed to remove member'); }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await updateMemberRole(currentGroupId, userId, newRole);
      await refreshMembers();
    } catch (e) { console.error(e); alert('Failed to update role'); }
  };

  // ------------------------------------------------------------------
  //  Start Helper Functions (that were potentially misplaced)
  // ------------------------------------------------------------------

  const calculateSettlements = (balances, participants) => {
    const settlements = [];
    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([userId, balance]) => {
      const participant = participants.find(p => p.id === userId);
      if (balance < -0.01) debtors.push({ id: userId, name: participant?.name || 'Unknown', amount: -balance });
      else if (balance > 0.01) creditors.push({ id: userId, name: participant?.name || 'Unknown', amount: balance });
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);
      settlements.push({ from: { id: debtor.id, name: debtor.name }, to: { id: creditor.id, name: creditor.name }, amount });
      debtor.amount -= amount;
      creditor.amount -= amount;
      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }
    return settlements;
  };

  const handleClosePeriod = async (periodName) => {
    if (!currentPeriodId) return;

    // Calculate final balances/settlements based on current active expenses
    const currentActiveExpenses = expenses.filter(e => !e.periodId);
    const { balances: finalBalances } = calculateBalances(currentActiveExpenses, participants);
    const finalSettlements = calculateSettlements(finalBalances, participants);

    const totalPeriodExpenses = currentActiveExpenses
      .filter(exp => !exp.isSettlement)
      .reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const transactionCount = currentActiveExpenses.length;
    const closedName = periodName || periods.find(p => p.id === currentPeriodId)?.name || 'Current Period';

    try {
      if (!confirm('Are you sure you want to close this period? This will archive current expenses and start fresh.')) return;

      // 1. Snapshot
      await closePeriod(currentPeriodId, finalBalances, finalSettlements, totalPeriodExpenses, transactionCount, periodName);

      // 2. Archive active expenses and log it
      const actorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
      const activity = createActivity('closed', actorName, 'period', currentPeriodId, `Closed period: ${closedName}`, { previousState: null });
      await saveGroupData(archiveActiveExpenses(currentPeriodId, activity));

      notifyPeriodClosed(closedName);

      // 5. New Period
      const newPeriod = await createPeriod(currentGroupId, `Settlement ${new Date().toLocaleDateString()}`);
      setCurrentPeriodId(newPeriod.id);
      setIsClosePeriodModalOpen(false);

    } catch (error) {
      console.error('Error closing period:', error);
      alert('Failed to close period');
    }
  };

  const handleCreatePeriod = async () => {
    if (!currentGroupId) return;
    try {
      const currentGroup = groups.find(g => g.id === currentGroupId);
      if (currentGroup?.pinEnabled) lockGroup(currentGroupId);
      const newPeriod = await createPeriod(currentGroupId);
      setCurrentPeriodId(newPeriod.id);
    } catch (error) {
      console.error('Error creating period:', error);
      alert(
        'Could not create a period. Run supabase_members_and_periods.sql in Supabase if tables are missing.'
      );
    }
  };

  const handleDeletePeriod = async (periodId) => {
    // Optimistic update: Remove from UI immediately
    setPeriods(prevPeriods => prevPeriods.filter(p => p.id !== periodId));

    try {
      await deletePeriod(periodId);
    } catch (error) {
      console.error('Failed to delete period:', error);
      alert('Failed: ' + error.message);
      // Optional: Re-fetch if failed, but for now just alerting is enough
    }
  };

  // ------------------------------------------------------------------

  // Calculations for Render
  const currentPeriod = periods.find(p => p.id === currentPeriodId);

  const periodExpenses = expenses.filter(e => {
    // If current period is closed, show only expenses from that period
    if (currentPeriod?.status === 'closed') {
      return e.periodId === currentPeriodId;
    }
    // If current period is active (or null), show only unassigned expenses (active)
    // AND exclude settlements (unless we want them? User asked for transactions)
    // Typically active view shows Unassigned expenses.
    return !e.periodId;
  });

  const { balances, totalPaid } = calculateBalances(periodExpenses, participants);
  const currentParticipantId = findParticipantIdForUser(participants, user);
  const currentUserRole = members.find(m => m.userId === user?.id)?.role || 'member';
  const totalExpenses = periodExpenses.filter(e => !e.isSettlement).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  const handleUndo = async (activity) => {
    if (!activity.details?.previousState) { alert('Cannot undo'); return; }
    if (!confirm(`Undo: ${activity.description}?`)) return;

    const { previousState } = activity.details;
    let revert = (data) => data;

    if (activity.targetType === 'expense') {
      if (activity.action === 'added') revert = removeExpense(activity.targetId);
      else if (activity.action === 'edited') revert = replaceExpense(previousState);
      else if (activity.action === 'deleted') revert = addExpenseUpdate(previousState);
    }

    try { await saveGroupData(compose(revert, removeActivity(activity.id))); }
    catch (e) { console.error("Undo failed:", e); alert('Undo failed. Please try again.'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const nav = [
    { key: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
    { key: 'participants', icon: Users, label: `People (${participants.length})` },
    { key: 'activity', icon: Clock, label: 'Activity' },
    { key: 'chat', icon: MessageSquare, label: 'Chat' },
    { key: 'analytics', icon: BarChart3, label: 'Stats' },
    { key: 'archive', icon: Calendar, label: 'Archive' },
  ];

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="shell">
        {/* ---------- desktop side ledger ---------- */}
        <aside className="side">
          <div className="side-brand">
            <div className="side-mark">e/</div>
            <div>
              <div className="side-title">E-Split</div>
              <div className="side-sub truncate max-w-[120px]">
                {groups.find(g => g.id === currentGroupId)?.name || 'No Group'}
              </div>
            </div>
          </div>
          <nav className="side-nav">
            {nav.map((n) => (
              <button
                key={n.key}
                className={`side-tab ${activeTab === n.key ? "active" : ""}`}
                onClick={() => setActiveTab(n.key)}
              >
                <n.icon size={17} />
                <span>{n.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ---------- main column ---------- */}
        <div className="main">
          <header className="topbar">
            <button className="icon-btn only-mobile" onClick={() => setIsMobileMenuOpen((v) => !v)}>
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <div className="topbar-center">
              <div>
                <span className="crumb">Group</span>
                <GroupSelector
                  groups={groups}
                  currentGroup={currentGroupId}
                  onSelectGroup={handleSelectGroup}
                  onCreateGroup={handleCreateGroup}
                  onEditGroup={handleEditGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onShareGroup={handleShareGroup}
                  onSetPin={handleSetPin}
                />
              </div>
              
              {currentGroupId && (
                <div className="hidden sm:block">
                  <span className="crumb">Period</span>
                  <PeriodSelector
                    periods={periods}
                    currentPeriod={currentPeriodId}
                    onSelectPeriod={setCurrentPeriodId}
                    onCreatePeriod={handleCreatePeriod}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
                <div className="only-desktop flex items-center gap-1 mr-2">
                    <button className="icon-btn ghost" onClick={() => setDarkMode((d) => !d)} title="Toggle Theme">
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button onClick={signOut} className="icon-btn ghost text-red-500 hover:bg-red-50" title="Logout">
                        <LogOut size={18} />
                    </button>
                </div>
                <button className="add-btn" onClick={() => setIsExpenseModalOpen(true)}>
                  <Plus size={17} /> <span className="only-desktop">Add expense</span>
                </button>
            </div>
          </header>

          {isMobileMenuOpen && (
            <div className="mobile-nav-drawer">
              {nav.map((n) => (
                <button
                  key={n.key}
                  className={`side-tab ${activeTab === n.key ? "active" : ""}`}
                  onClick={() => { setActiveTab(n.key); setIsMobileMenuOpen(false); }}
                >
                  <n.icon size={17} /> <span>{n.label}</span>
                </button>
              ))}
              <div className="mt-2 pt-2 border-t border-themed">
                <button className="theme-btn w-full" onClick={() => setDarkMode((d) => !d)}>
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  {darkMode ? "Light mode" : "Dark mode"}
                </button>
                <button onClick={signOut} className="flex justify-center items-center gap-2 mt-2 px-3 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full">
                  <LogOut size={15} /> Logout
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            <main className="content overflow-y-auto">
              <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h2>
                      <div className="flex gap-2">
                        <ExportButton expenses={periodExpenses} participants={participants} />
                        <button
                          onClick={() => setIsClosePeriodModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                          style={{ backgroundColor: 'var(--moss-soft)', color: 'var(--moss)' }}
                        >
                          <Calendar size={16} />
                          Settle & Archive
                        </button>
                      </div>
                    </div>

                    <Dashboard balances={balances} participants={participants} currentUserId={currentParticipantId} expenses={periodExpenses} onSettle={(fromId, toId, amt) => handleOpenSettleModal({ fromId, toId, amount: amt })} />
                  </div>

                  {/* Quick Add Expense - Visible on Desktop/Tablet */}
                  <div className="hidden sm:block mb-6">
                    <QuickAddExpense
                      onAdd={handleAddExpense}
                      participants={participants}
                      currentUserId={currentParticipantId}
                    />
                  </div>

                  <div className="mb-6">
                    <ExpenseList expenses={periodExpenses} participants={participants} onDelete={handleDeleteExpense} onEdit={handleOpenEditExpense} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'participants' && (
                <motion.div key="participants" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="max-w-2xl">
                  <ParticipantManager
                    participants={participants}
                    members={members}
                    currentUserRole={currentUserRole}
                    currentUserEmail={user?.email}
                    onAdd={handleAddParticipant}
                    onEdit={handleEditParticipant}
                    onRemove={handleRemoveParticipant}
                    onInviteMember={() => setIsInviteMemberModalOpen(true)}
                    onRemoveMember={handleRemoveMember}
                    onUpdateRole={handleUpdateMemberRole}
                  />
                </motion.div>
              )}
              {activeTab === 'activity' && (
                <motion.div key="activity" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="max-w-4xl">
                  <ActivityLog activities={activityLog} onUndo={handleUndo} />
                </motion.div>
              )}
              {activeTab === 'chat' && (
                <motion.div key="chat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="max-w-4xl">
                  <Chat messages={chatMessages} currentUser={{ id: user?.id, name: user?.email?.split('@')[0] }} onSendMessage={handleSendMessage} />
                </motion.div>
              )}
              {activeTab === 'analytics' && (
                <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                  <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
                    <Analytics expenses={periodExpenses} participants={participants} />
                  </Suspense>
                </motion.div>
              )}
              {activeTab === 'archive' && (
                <motion.div key="archive" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                  <PeriodArchive periods={periods} participants={participants} expenses={expenses} onViewDetails={setViewPeriodDetails} onDelete={handleDeletePeriod} />
                </motion.div>
              )}
            </AnimatePresence>
            </main>

            {/* Right Sidebar for Contributions */}
            <aside className="hidden xl:block w-72 2xl:w-80 border-l flex-shrink-0 overflow-y-auto" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--page)' }}>
                <div className="p-6">
                  <h3 className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: 'var(--muted)' }}>Member Contributions</h3>
                  <div className="space-y-5">
                    {participants.map((p, idx) => {
                       const balance = balances[p.id] || 0;
                       return (
                       <div key={p.id} className="flex flex-col gap-1.5">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                               <div className="avatar-chip" data-hue={getParticipantHue(idx)} style={{ width: 28, height: 28, fontSize: 12 }}>
                                  {p.name.charAt(0).toUpperCase()}
                               </div>
                               <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{p.name}</span>
                            </div>
                            <span className="mono text-sm font-medium" title="Total Paid">${(totalPaid[p.id] || 0).toFixed(2)}</span>
                         </div>
                         <div className="flex justify-end">
                           {balance > 0.01 ? (
                             <span className="text-xs font-medium" style={{ color: 'var(--moss)' }}>gets back ${Math.abs(balance).toFixed(2)}</span>
                           ) : balance < -0.01 ? (
                             <span className="text-xs font-medium" style={{ color: 'var(--coral)' }}>owes ${Math.abs(balance).toFixed(2)}</span>
                           ) : (
                             <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>settled</span>
                           )}
                         </div>
                       </div>
                       );
                    })}
                  </div>
                </div>
              </aside>
            </div>
        </div>

        {/* ---------- mobile bottom nav ---------- */}
        <nav className="bottom-nav only-mobile">
          {nav.map((n) => (
            <button
              key={n.key}
              className={`bottom-tab ${activeTab === n.key ? "active" : ""}`}
              onClick={() => setActiveTab(n.key)}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <AddExpenseModal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setEditExpense(null); }} onAdd={handleAddExpense} onEdit={handleEditExpense} participants={participants} editExpense={editExpense} />
      <SettleUpModal isOpen={isSettleModalOpen} onClose={() => { setIsSettleModalOpen(false); setSettlePrefill(null); }} onSettle={handleSettle} participants={participants} prefill={settlePrefill} />
      <ShareGroupModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} groupData={shareGroupData} />
      <PinModal isOpen={isPinModalOpen} onClose={() => { setIsPinModalOpen(false); setPinModalGroupId(null); }} onSubmit={handlePinSubmit} mode={pinModalMode} groupName={groups.find(g => g.id === pinModalGroupId)?.name} />
      <InviteMemberModal isOpen={isInviteMemberModalOpen} onClose={() => setIsInviteMemberModalOpen(false)} onInvite={handleInviteMember} groupName={groups.find(g => g.id === currentGroupId)?.name || 'this group'} groupId={currentGroupId} />
      {/* Close Period / Archive Modal */}
      <ClosePeriodModal
        isOpen={isClosePeriodModalOpen}
        onClose={() => setIsClosePeriodModalOpen(false)}
        balances={balances}
        settlements={calculateSettlements(balances, participants)}
        totalExpenses={totalExpenses}
        transactionCount={periodExpenses.length}
        expenses={periodExpenses}
        participants={participants}
        onConfirm={handleClosePeriod}
      />

      {viewPeriodDetails && (
        <PeriodDetailsView
          period={viewPeriodDetails}
          expenses={expenses.filter(e => e.periodId === viewPeriodDetails.id)}
          participants={participants}
          onClose={() => setViewPeriodDetails(null)}
        />
      )}
    </div>
  );
}

export default App;
