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
    if (user) {
      const unsubscribe = subscribeToGroups(user.id, (updatedGroups) => {
        setGroups(updatedGroups);

        // Auto-select group
        if (!currentGroupId && updatedGroups.length > 0) {
          // Check for last accessed group
          const lastGroupId = localStorage.getItem('lastGroupId');
          const targetGroup = updatedGroups.find(g => g.id === lastGroupId) || updatedGroups[0];
          setCurrentGroupId(targetGroup.id);
        } else if (updatedGroups.length === 0) {
          // Auto-create welcome group if absolutely no groups exist
          // FIX: Pass object with name
          createGroupInSupabase({ name: 'Welcome Group' }).then(newGroup => {
            setCurrentGroupId(newGroup.id);
          }).catch(console.error);
        }
      });
      return () => unsubscribe();
    }
  }, [user, currentGroupId]);

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
        name: group.name,
        code: group.shareCode || 'GENERATING...',
        link: window.location.origin + '/join/' + (group.shareCode || '')
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

  return (
    <div className="min-h-screen transition-colors pb-bottom-nav" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header className="glass-strong sticky top-0 z-30">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={handleLogoClick}>
                <ESplitLogo size={40} />
                <div>
                  <h1 className="text-xl font-bold" style={{ color: 'var(--accent-indigo)' }}>E-Split</h1>
                  <p className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>Split expenses easily</p>
                </div>
              </div>
              <div className="hidden lg:block pl-4 ml-2" style={{ borderLeft: '1px solid var(--border-primary)' }}>
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
            </div>
            {/* Period Selector */}
            {currentGroupId && (
              <div className="hidden lg:block pl-4 ml-2" style={{ borderLeft: '1px solid var(--border-primary)' }}>
                <PeriodSelector
                  periods={periods}
                  currentPeriod={currentPeriodId}
                  onSelectPeriod={setCurrentPeriodId}
                  onCreatePeriod={() => createPeriod(currentGroupId).catch(console.error)}
                />
              </div>
            )}

            {/* Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all hover:scale-105"
              >
                <Plus size={20} />
                <span className="hidden md:inline">Add Expense</span>
              </button>
              {/* Dark mode toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg transition-all hover:scale-110 theme-transition"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card-hover)' }}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="flex items-center gap-2 pl-2" style={{ borderLeft: '1px solid var(--border-primary)' }}>
                <span className="text-sm hidden lg:inline" style={{ color: 'var(--text-secondary)' }}>{user?.email}</span>
                <button onClick={signOut} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Logout</button>
              </div>
            </div>

            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="sm:hidden p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {isMobileMenuOpen && (
            <div className="sm:hidden py-4 space-y-3" style={{ borderTop: '1px solid var(--border-primary)' }}>
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
              <div className="flex gap-2">
                <button onClick={() => { setIsExpenseModalOpen(true); setIsMobileMenuOpen(false); }} className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
                  <Plus size={20} /> Add Expense
                </button>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-3 rounded-lg theme-transition"
                  style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              </div>
              <button onClick={signOut} className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Logout</button>
            </div>
          )}

          {/* Desktop Tab Bar */}
          <div className="hidden sm:flex gap-4 overflow-x-auto no-scrollbar" style={{ borderTop: '1px solid var(--border-primary)' }}>
            {[
              { key: 'dashboard', icon: <TrendingUp size={16} />, label: 'Dashboard' },
              { key: 'participants', icon: <Users size={16} />, label: `Participants (${participants.length})` },
              { key: 'activity', icon: <Clock size={16} />, label: 'Activity' },
              { key: 'chat', icon: <MessageSquare size={16} />, label: 'Chat' },
              { key: 'analytics', icon: <BarChart3 size={16} />, label: 'Analytics' },
              { key: 'archive', icon: <Calendar size={16} />, label: 'Archive' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-indigo-600' : 'border-transparent hover:border-gray-300'}`}
                style={{ color: activeTab === tab.key ? 'var(--accent-indigo)' : 'var(--text-muted)' }}
              >
                <div className="flex items-center gap-2">{tab.icon} {tab.label}</div>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
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
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h2>
                  <div className="flex gap-2">
                    <ExportButton expenses={periodExpenses} participants={participants} />
                    <button
                      onClick={() => setIsClosePeriodModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                    >
                      <Calendar size={16} />
                      Settle & Archive
                    </button>
                  </div>
                </div>

                <div className="themed-card rounded-xl p-4 mb-4" style={{ background: darkMode ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))' : 'linear-gradient(135deg, #eef2ff, #f5f3ff)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Expenses</div><div className="text-2xl font-bold" style={{ color: 'var(--accent-indigo)' }}>${totalExpenses.toFixed(2)}</div></div>
                    <div><div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Per Person (Avg)</div><div className="text-2xl font-bold text-purple-500">${avgPerPerson.toFixed(2)}</div><div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Based on {activeParticipants.length} active</div></div>
                    <div><div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Transactions</div><div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{periodExpenses.filter(e => !e.isSettlement).length}</div></div>
                  </div>
                </div>
              </div>

              {/* Quick Add Expense - Visible on Desktop/Tablet */}
              <div className="hidden sm:block">
                <QuickAddExpense
                  onAdd={handleAddExpense}
                  participants={participants}
                  currentUserId={user?.id}
                />
              </div>

              {/* Mobile "Add Expense" Button (Stick to button for mobile to save space) */}
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="sm:hidden w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-md mb-6 hover:bg-indigo-700 transition-colors"
              >
                <Plus size={20} /> Add Expense
              </button>
              <Dashboard totalPaid={totalPaid} balances={balances} participants={participants} currentUserId={user?.id} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <ExpenseList expenses={periodExpenses} participants={participants} onDelete={handleDeleteExpense} onEdit={handleOpenEditExpense} />
                </div>
                <div className="lg:col-span-1">
                  <div className="sticky top-24"><SettleUp balances={balances} participants={participants} onOpenSettleModal={handleOpenSettleModal} /></div>
                </div>
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

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 glass-strong" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <div className="flex justify-around items-center h-16 px-1">
          {[
            { key: 'dashboard', icon: <TrendingUp size={20} />, label: 'Home' },
            { key: 'participants', icon: <Users size={20} />, label: 'People' },
            { key: 'activity', icon: <Clock size={20} />, label: 'Activity' },
            { key: 'chat', icon: <MessageSquare size={20} />, label: 'Chat' },
            { key: 'analytics', icon: <BarChart3 size={20} />, label: 'Stats' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${activeTab === tab.key ? 'scale-110' : 'opacity-60'}`}
              style={{ color: activeTab === tab.key ? 'var(--accent-indigo)' : 'var(--text-muted)' }}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AddExpenseModal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setEditExpense(null); }} onAdd={handleAddExpense} onEdit={handleEditExpense} participants={participants} editExpense={editExpense} />
      <SettleUpModal isOpen={isSettleModalOpen} onClose={() => { setIsSettleModalOpen(false); setSettlePrefill(null); }} onSettle={handleSettle} participants={participants} prefill={settlePrefill} />
      <ShareGroupModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} groupData={shareGroupData} />
      <PinModal isOpen={isPinModalOpen} onClose={() => { setIsPinModalOpen(false); setPinModalGroupId(null); }} onSubmit={handlePinSubmit} mode={pinModalMode} groupName={groups.find(g => g.id === pinModalGroupId)?.name} />
      <InviteMemberModal isOpen={isInviteMemberModalOpen} onClose={() => setIsInviteMemberModalOpen(false)} onInvite={handleInviteMember} groupName={groups.find(g => g.id === currentGroupId)?.name || 'this group'} />
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
