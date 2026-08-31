import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './components/Dashboard';
import { calculateBalances, getActiveParticipants } from './utils/splitLogic';
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
import UserProfileModal from './components/UserProfileModal';
import DevDashboard from './components/DevDashboard';
import Analytics from './components/Analytics';
import QuickAddExpense from './components/QuickAddExpense';
import PeriodSelector from './components/PeriodSelector';
import ClosePeriodModal from './components/ClosePeriodModal';
import PeriodArchive from './components/PeriodArchive';
import PeriodDetailsView from './components/PeriodDetailsView';
import ExportButton from './components/ExportButton';
import { AnimatePresence, motion } from 'framer-motion';

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
  deleteGroupInSupabase,
  subscribeToGroups,
  subscribeToGroupData,
  sendMessage
} from './services/supabaseService';

import {
  addGroupMember,
  removeGroupMember,
  updateMemberRole
} from './services/memberService';

import {
  createPeriod,
  closePeriod,
  getPeriodsForGroup,
  getActivePeriod,
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

import { lockGroup } from './utils/crypto';

import { getParticipantHue } from './utils/colors';

function App() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  // State
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false); // Prevent subscription overwrites during mutations

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
  let logoClickTimer;

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
      if (!currentPeriodId) {
        const active = updatedPeriods.find(p => p.status === 'active');
        if (active) setCurrentPeriodId(active.id);
      }
    });

    localStorage.setItem('lastGroupId', currentGroupId);

    return () => {
      unsubscribeData();
      unsubscribePeriods();
    };
  }, [currentGroupId]);

  // Handlers
  const handleSelectGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group?.pinEnabled) {
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
      if (group && group.pin === pin) {
        setCurrentGroupId(pinModalGroupId);
        setIsPinModalOpen(false);
        setPinModalGroupId(null);
      } else {
        alert('Incorrect PIN');
      }
    } else {
      // Set PIN
      try {
        await updateGroupInSupabase(pinModalGroupId, { pin, pinEnabled: true });
        setIsPinModalOpen(false);
        setPinModalGroupId(null);
        alert('PIN set successfully');
      } catch (e) {
        console.error(e);
        alert('Failed to set PIN');
      }
    }
  };

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (logoClickTimer) clearTimeout(logoClickTimer);

    if (newCount >= 5) {
      setIsDevModalOpen(true);
      setLogoClickCount(0);
    } else {
      logoClickTimer = setTimeout(() => {
        setLogoClickCount(0);
      }, 2000);
    }
  };

  const saveGroupData = async (updatedParticipants, updatedExpenses, newActivity = null) => {
    let updatedActivityLog = activityLog;
    if (newActivity) {
      updatedActivityLog = [newActivity, ...activityLog].slice(0, 50);
      setActivityLog(updatedActivityLog);
    }

    try {
      await updateGroupInSupabase(currentGroupId, {
        participants: updatedParticipants,
        expenses: updatedExpenses,
        activityLog: updatedActivityLog
      });
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

    setIsMutating(true);
    isMutatingRef.current = true;
    try {
      await saveGroupData(participants, updatedExpenses, activity);
      notifyNewExpense(newExpense.description, newExpense.amount, actorName);
      if (refreshGroupDataRef.current) refreshGroupDataRef.current();
    } catch (e) {
      console.error(e);
      setExpenses(expenses);
    } finally {
      setIsMutating(false);
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

    setIsMutating(true);
    isMutatingRef.current = true;
    try {
      await saveGroupData(participants, updatedExpenses, activity);
      if (refreshGroupDataRef.current) refreshGroupDataRef.current();
    } catch (error) {
      console.error(error);
      setExpenses(expenses);
    } finally {
      setIsMutating(false);
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
      setIsMutating(true);
      isMutatingRef.current = true;

      try {
        console.log('💾 Saving to database...');
        await saveGroupData(participants, updatedExpenses, activity);
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
        setIsMutating(false);
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

    setIsMutating(true);
    isMutatingRef.current = true;
    try {
      await saveGroupData(participants, updatedExpenses, activity);
      notifyPaymentRecorded(fromPerson?.name || 'Someone', toPerson?.name || 'Someone', settlement.amount);
      if (refreshGroupDataRef.current) refreshGroupDataRef.current();
    } catch (e) {
      console.error(e);
      setExpenses(expenses);
    } finally {
      setIsMutating(false);
      isMutatingRef.current = false;
    }
    setIsSettleModalOpen(false);
  };

  const handleAddParticipant = async (newParticipant) => {
    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    await saveGroupData(updatedParticipants, expenses);
    if (newParticipant.email) {
      try { await addGroupMember(currentGroupId, newParticipant.email, 'member'); } catch (e) { console.error(e); }
    }
  };

  const handleEditParticipant = async (participantId, updates) => {
    const updatedParticipants = participants.map(p => p.id === participantId ? { ...p, ...updates } : p);
    setParticipants(updatedParticipants);
    await saveGroupData(updatedParticipants, expenses);
    if (updates.email) {
      try { await addGroupMember(currentGroupId, updates.email, 'member'); } catch (e) { console.error(e); }
    }
  };

  const handleRemoveParticipant = (userId) => {
    // Check balance
    // For simplicity, we are checking logic later in calculateBalances, but here we need rudimentary check
    // Let's verify via 'balances' which is calculated in render
    if (confirm('Are you sure you want to remove this participant?')) {
      const updatedParticipants = participants.filter(p => p.id !== userId);
      setParticipants(updatedParticipants);
      saveGroupData(updatedParticipants, expenses);
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

  const handleInviteMember = async (userEmail, role) => {
    try { await addGroupMember(currentGroupId, userEmail, role); alert('Invited!'); } catch (e) { console.error(e); throw e; }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove member?')) return;
    try { await removeGroupMember(currentGroupId, userId); } catch (e) { console.error(e); alert('Failed'); }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try { await updateMemberRole(currentGroupId, userId, newRole); } catch (e) { console.error(e); alert('Failed'); }
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

    const totalPeriodExpenses = currentActiveExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    const transactionCount = currentActiveExpenses.length;

    try {
      if (!confirm('Are you sure you want to close this period? This will archive current expenses and start fresh.')) return;

      // 1. Snapshot
      await closePeriod(currentPeriodId, finalBalances, finalSettlements, totalPeriodExpenses, transactionCount);

      // 2. Archive Expenses
      const updatedAllExpenses = expenses.map(e => {
        if (!e.periodId) return { ...e, periodId: currentPeriodId };
        return e;
      });

      // 3. Log
      const actorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
      const activity = createActivity('closed', actorName, 'period', currentPeriodId, `Closed period: ${periods.find(p => p.id === currentPeriodId)?.name}`, { previousState: null });
      const updatedActivityLog = [activity, ...activityLog].slice(0, 100);

      // 4. Update Group
      await updateGroupInSupabase(currentGroupId, { expenses: updatedAllExpenses, activityLog: updatedActivityLog });

      notifyPeriodClosed(periods.find(p => p.id === currentPeriodId)?.name || 'Current Period');

      // 5. New Period
      const newPeriod = await createPeriod(currentGroupId, `Settlement ${new Date().toLocaleDateString()}`);
      setCurrentPeriodId(newPeriod.id);
      setIsClosePeriodModalOpen(false);

    } catch (error) {
      console.error('Error closing period:', error);
      alert('Failed to close period');
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

  const handleCreatePeriod = async () => {
    const currentGroup = groups.find(g => g.id === currentGroupId);
    if (currentGroup && currentGroup.pinEnabled) lockGroup(currentGroupId);
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
  const activeParticipants = getActiveParticipants(periodExpenses, participants);
  const totalExpenses = periodExpenses.filter(e => !e.isSettlement).reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const avgPerPerson = activeParticipants.length > 0 ? totalExpenses / activeParticipants.length : 0;

  const handleUndo = async (activity) => {
    if (!activity.details?.previousState) { alert('Cannot undo'); return; }
    if (!confirm(`Undo: ${activity.description}?`)) return;

    const { previousState } = activity.details;
    let updatedExpenses = [...expenses];

    if (activity.targetType === 'expense') {
      if (activity.action === 'added') updatedExpenses = expenses.filter(e => e.id !== activity.targetId);
      else if (activity.action === 'edited') updatedExpenses = expenses.map(e => e.id === activity.targetId ? previousState : e);
      else if (activity.action === 'deleted') updatedExpenses = [previousState, ...expenses];
    }
    const updatedActivityLog = activityLog.filter(a => a.id !== activity.id);
    setExpenses(updatedExpenses);
    setActivityLog(updatedActivityLog);

    try { await updateGroupInSupabase(currentGroupId, { expenses: updatedExpenses, activityLog: updatedActivityLog }); }
    catch (e) { console.error("Undo failed:", e); }
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
          <div className="side-brand cursor-pointer" onClick={handleLogoClick}>
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
                    onCreatePeriod={() => createPeriod(currentGroupId).catch(console.error)}
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

                    <Dashboard totalPaid={totalPaid} balances={balances} participants={participants} currentUserId={user?.id} expenses={periodExpenses} onSettle={(fromId, toId, amt) => handleOpenSettleModal({ fromId, toId, amount: amt })} />
                  </div>

                  {/* Quick Add Expense - Visible on Desktop/Tablet */}
                  <div className="hidden sm:block mb-6">
                    <QuickAddExpense
                      onAdd={handleAddExpense}
                      participants={participants}
                      currentUserId={user?.id}
                    />
                  </div>

                  <div className="mb-6">
                    <ExpenseList expenses={periodExpenses} participants={participants} onDelete={handleDeleteExpense} onEdit={handleOpenEditExpense} />
                  </div>
                </motion.div>
              )}

              {activeTab === 'participants' && (
                <motion.div key="participants" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="max-w-2xl">
                  <ParticipantManager participants={participants} currentUserEmail={user?.email} onAdd={handleAddParticipant} onEdit={handleEditParticipant} onRemove={handleRemoveParticipant} />
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
                  <Analytics expenses={periodExpenses} participants={participants} />
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
      <DevDashboard isOpen={isDevModalOpen} onClose={() => setIsDevModalOpen(false)} />

      {/* Close Period / Archive Modal */}
      <ClosePeriodModal
        isOpen={isClosePeriodModalOpen}
        onClose={() => setIsClosePeriodModalOpen(false)}
        period={periods.find(p => p.id === currentPeriodId)}
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
