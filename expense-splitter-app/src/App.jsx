import React, { useState, useEffect } from 'react';
import { Plus, Menu, X, TrendingUp, Users as UsersIcon, Clock, MessageSquare, BarChart3 } from 'lucide-react';

import { useAuth } from './contexts/AuthContext';
import AuthPage from './components/auth/AuthPage';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import AddExpenseModal from './components/AddExpenseModal';
import SettleUp from './components/SettleUp';
import SettleUpModal from './components/SettleUpModal';
import Analytics from './components/Analytics';
import ParticipantManager from './components/ParticipantManager';
import QuickAddExpense from './components/QuickAddExpense';
import GroupSelector from './components/GroupSelector';
import ShareGroupModal from './components/ShareGroupModal';
import ActivityLog from './components/ActivityLog';
import PinModal from './components/PinModal';
import DevDashboard from './components/DevDashboard';
import InviteMemberModal from './components/InviteMemberModal';
import UserProfile from './components/UserProfile';
import Chat from './components/Chat';
import ESplitLogo from './components/ESplitLogo';
import { calculateBalances, getActiveParticipants } from './utils/splitLogic';
import { createActivity, formatActivityDescription, getActorName } from './utils/activityLogger';
import { hashPin, verifyPin, isGroupUnlocked, markGroupUnlocked, lockGroup, lockAllGroups } from './utils/crypto';
import { requestNotificationPermission, notifyNewExpense, notifyPaymentRecorded, notifyExpenseEdited, notifyExpenseDeleted } from './utils/notifications';
import {
  createGroupInSupabase,
  updateGroupInSupabase,
  deleteGroupInSupabase,
  subscribeToGroups,
  subscribeToGroupData,
  importGroupToSupabase,
  logDeviceAccess,
  sendMessage
} from './services/supabaseService';
import {
  addGroupMember,
  removeGroupMember,
  updateMemberRole,
  getGroupMembers,
  subscribeToGroupMembers
} from './services/memberService';

function App() {
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareGroupData, setShareGroupData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState('enter'); // 'enter' or 'set'
  const [pinModalGroupId, setPinModalGroupId] = useState(null);
  const [inactivityTimer, setInactivityTimer] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [chatMessages, setChatMessages] = useState([]);

  // Group Members State
  const [groupMembers, setGroupMembers] = useState([]);
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('member');

  // User Profile State
  const [displayName, setDisplayName] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Dev Dashboard State
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [logoClickTimer, setLogoClickTimer] = useState(null);

  // Authentication - must be before useEffects that use user
  const { user, loading, signOut } = useAuth();

  // Load groups from Firestore
  // Load groups from Supabase
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToGroups((fetchedGroups) => {
      setGroups(fetchedGroups);
    });

    return () => unsubscribe();
  }, [user]);

  // Load user display name
  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.display_name || user.user_metadata?.name || '';
      setDisplayName(name);
    }
  }, [user]);

  // Load and subscribe to group members
  useEffect(() => {
    if (!currentGroupId || !user) {
      setGroupMembers([]);
      setCurrentUserRole('member');
      return;
    }

    // Fetch members for current group
    const loadMembers = async () => {
      try {
        const members = await getGroupMembers(currentGroupId);
        setGroupMembers(members);

        // Find current user's role
        const currentMember = members.find(m => m.userId === user.id);
        setCurrentUserRole(currentMember?.role || 'member');
      } catch (error) {
        console.error('Error loading members:', error);
      }
    };

    loadMembers();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToGroupMembers(currentGroupId, (updatedMembers) => {
      setGroupMembers(updatedMembers);

      // Update current user's role
      const currentMember = updatedMembers.find(m => m.userId === user.id);
      setCurrentUserRole(currentMember?.role || 'member');
    });

    return () => unsubscribe();
  }, [currentGroupId, user]);

  // Log device access on load
  useEffect(() => {
    logDeviceAccess(currentGroupId);
  }, [currentGroupId]);

  // Request notification permission on load
  useEffect(() => {
    const timer = setTimeout(() => {
      requestNotificationPermission();
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Handle default group selection
  useEffect(() => {
    if (groups.length > 0 && !currentGroupId) {
      // Prefer "Welcome Group" (g_default001)
      const defaultGroup = groups.find(g => g.id === 'g_default001');

      // if (defaultGroup) {
      //   setCurrentGroupId(defaultGroup.id);
      // } else {
      //   // If Welcome Group doesn't exist, create it!
      //   const createWelcomeGroup = async () => {
      //     try {
      //       const newGroupData = {
      //         name: 'Welcome Group',
      //         participants: [],
      //         expenses: [],
      //         activityLog: [],
      //         pinHash: null,
      //         pinEnabled: false
      //       };
      //       // Pass custom ID 'g_default001'
      //       await createGroupInSupabase(newGroupData, 'g_default001');
      //       // Selection will happen on next render when groups update
      //     } catch (e) {
      //       console.error("Error creating default group:", e);
      //       // Fallback to first available
      //       setCurrentGroupId(groups[0].id);
      //     }
      //   };
      //   createWelcomeGroup();
      // }
      // Just select first group
      setCurrentGroupId(groups[0].id);
      // } else if (groups.length === 0 && !currentGroupId) {
      //   // If absolutely no groups, create Welcome Group
      //   const createWelcomeGroup = async () => {
      //     try {
      //       const newGroupData = {
      //         name: 'Welcome Group',
      //         participants: [],
      //         expenses: [],
      //         activityLog: [],
      //         pinHash: null,
      //         pinEnabled: false
      //       };
      //       await createGroupInSupabase(newGroupData, 'g_default001');
      //     } catch (e) {
      //       console.error("Error creating initial group:", e);
      //     }
      //   };
      //   // Only try once to avoid loops
      //   const hasInit = localStorage.getItem('hasInitWelcome');
      //   if (!hasInit) {
      //     createWelcomeGroup();
      //     localStorage.setItem('hasInitWelcome', 'true');
      //   }
    }
  }, [groups, currentGroupId]);

  // Load current group data from Firestore

  // Load current group data from Firestore
  useEffect(() => {
    if (!currentGroupId) return;

    const unsubscribe = subscribeToGroupData(currentGroupId, (groupData) => {
      if (groupData) {
        setParticipants(groupData.participants || []);
        setExpenses(groupData.expenses || []);
        setActivityLog(groupData.activityLog || []);
        setChatMessages(groupData.chatMessages || []);
      }
    });

    return () => unsubscribe();
  }, [currentGroupId, groups]);

  // Auto-lock timer - lock all groups after 10 minutes of inactivity (security feature #4)
  const AUTO_LOCK_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    const newTimer = setTimeout(() => {
      // Lock all PIN-protected groups
      const hasProtectedGroups = groups.some(g => g.pinEnabled);
      if (hasProtectedGroups) {
        lockAllGroups();
        alert('Groups have been locked due to inactivity.');
        // Optionally reload to show lock state
        window.location.reload();
      }
    }, AUTO_LOCK_TIMEOUT);

    setInactivityTimer(newTimer);
  };

  // Set up inactivity timer on mount and reset on any interaction
  useEffect(() => {
    resetInactivityTimer();

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Listen for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [groups]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Secret Dev Dashboard Trigger (5 clicks on logo)
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (logoClickTimer) clearTimeout(logoClickTimer);

    if (newCount >= 5) {
      setIsDevModalOpen(true);
      setLogoClickCount(0);
    } else {
      // Reset count if no click within 2 seconds
      const timer = setTimeout(() => {
        setLogoClickCount(0);
      }, 2000);
      setLogoClickTimer(timer);
    }
  };

  // --- Group Handlers --- // Save group data to Firestore
  const saveGroupData = async (updatedParticipants, updatedExpenses, newActivity = null) => {
    if (!currentGroupId) return;

    try {
      const updatedActivityLog = newActivity
        ? [newActivity, ...activityLog] // Prepend new activity
        : activityLog;

      await updateGroupInSupabase(currentGroupId, {
        participants: updatedParticipants,
        expenses: updatedExpenses,
        activityLog: updatedActivityLog
      });
    } catch (error) {
      console.error("Error saving group data:", error);
      alert("Failed to save changes. Please check your connection.");
    }
  };

  const handleCreateGroup = async (groupName, pin) => {
    try {
      let pinHash = null;
      if (pin && pin.length === 4) {
        pinHash = await hashPin(pin);
      }

      // Auto-add current user as first participant
      const userName = displayName || user?.email?.split('@')[0] || 'You';
      const userParticipant = {
        id: user?.id || `user_${Date.now()}`,
        name: userName,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
      };

      const newGroupData = {
        name: groupName,
        participants: [userParticipant],
        expenses: [],
        activityLog: [],
        pinHash: pinHash,
        pinEnabled: Boolean(pinHash)
      };
      const newGroup = await createGroupInSupabase(newGroupData);
      setCurrentGroupId(newGroup.id);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group.");
    }
  };

  const handleSelectGroup = (groupId) => {
    // Lock the current group if it's PIN-protected (security feature #1)
    const currentGroup = groups.find(g => g.id === currentGroupId);
    if (currentGroup && currentGroup.pinEnabled) {
      lockGroup(currentGroupId);
    }

    // Check if new group requires PIN
    const group = groups.find(g => g.id === groupId);
    if (group && group.pinEnabled && !isGroupUnlocked(groupId)) {
      // Group is PIN protected and not unlocked
      setPinModalGroupId(groupId);
      setPinModalMode('enter');
      setIsPinModalOpen(true);
    } else {
      // No PIN or already unlocked
      setCurrentGroupId(groupId);
    }

    // Reset inactivity timer
    resetInactivityTimer();
  };

  const handleEditGroup = async (groupId, newName) => {
    try {
      await updateGroupInSupabase(groupId, { name: newName });
    } catch (error) {
      console.error("Error updating group:", error);
      alert("Failed to update group name.");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (confirm('Are you sure you want to delete this group? This cannot be undone.')) {
      try {
        await deleteGroupInSupabase(groupId);
        // Selection update is handled by the group listener
      } catch (error) {
        console.error("Error deleting group:", error);
        alert("Failed to delete group.");
      }
    }
  };

  const handleShareGroup = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setShareGroupData(group);
      setIsShareModalOpen(true);
    }
  };

  const handleSetPin = (groupId) => {
    setPinModalGroupId(groupId);
    setPinModalMode('set');
    setIsPinModalOpen(true);
  };

  const handlePinSubmit = async (pin) => {
    try {
      if (pinModalMode === 'set') {
        // Setting/changing PIN
        const pinHash = await hashPin(pin);
        const group = groups.find(g => g.id === pinModalGroupId);
        if (group) {
          await updateGroupInSupabase(pinModalGroupId, {
            pinHash: pinHash,
            pinEnabled: true
          });
          markGroupUnlocked(pinModalGroupId);
          alert('PIN set successfully!');
        }
      } else {
        // Verifying PIN
        const group = groups.find(g => g.id === pinModalGroupId);
        if (group && group.pinHash) {
          const isValid = await verifyPin(pin, group.pinHash);
          if (isValid) {
            markGroupUnlocked(pinModalGroupId);
            setCurrentGroupId(pinModalGroupId);
          } else {
            alert('Incorrect PIN!');
            return; // Don't close modal
          }
        }
      }
      setIsPinModalOpen(false);
      setPinModalGroupId(null);
    } catch (error) {
      console.error('Error handling PIN:', error);
      alert('Failed to process PIN.');
    }
  };

  // --- Expense & Participant Handlers (Now saving to Firestore) ---

  const handleAddExpense = async (newExpense) => {
    const updatedExpenses = [newExpense, ...expenses];
    // Optimistic update
    setExpenses(updatedExpenses);

    // Create activity
    const actorName = displayName || user?.email?.split('@')[0] || 'User';
    const description = formatActivityDescription('added', 'expense', newExpense);
    const activity = createActivity('added', actorName, 'expense', newExpense.id, description, {
      previousState: null
    });

    try {
      await saveGroupData(participants, updatedExpenses, activity);
      notifyNewExpense(newExpense, participants);
    } catch (error) {
      console.error('Error in notifications:', error);
      // Don't throw - expense was saved successfully
    }
  };

  const handleEditExpense = async (updatedExpense) => {
    const oldExpense = expenses.find(e => e.id === updatedExpense.id);
    const updatedExpenses = expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e);
    setExpenses(updatedExpenses);

    // Create activity
    const actorName = getActorName(participants);
    const description = formatActivityDescription('edited', 'expense', updatedExpense);
    const activity = createActivity('edited', actorName, 'expense', updatedExpense.id, description, {
      previousState: oldExpense // Store old expense for undo
    });

    await saveGroupData(participants, updatedExpenses, activity);
    notifyExpenseEdited(updatedExpense, participants);
  };

  const handleDeleteExpense = (expenseId) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      const deletedExpense = expenses.find(e => e.id === expenseId);
      const updatedExpenses = expenses.filter(e => e.id !== expenseId);
      setExpenses(updatedExpenses);

      // Create activity
      const actorName = getActorName(participants);
      const description = formatActivityDescription('deleted', 'expense', deletedExpense);
      const activity = createActivity('deleted', actorName, 'expense', expenseId, description, {
        previousState: deletedExpense // Store deleted expense for undo
      });

      saveGroupData(participants, updatedExpenses, activity);
      notifyExpenseDeleted(deletedExpense, participants);
    }
  };

  const handleOpenEditExpense = (expense) => {
    setEditExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleSettle = (settlement) => {
    const updatedExpenses = [settlement, ...expenses];
    setExpenses(updatedExpenses);

    // Create activity for settlement
    const actorName = displayName || user?.email?.split('@')[0] || 'User';
    const fromPerson = participants.find(p => p.id === settlement.paidBy);
    const toPerson = participants.find(p => p.id === settlement.paidTo);
    const description = `Recorded payment: ${fromPerson?.name} paid ${toPerson?.name} $${settlement.amount.toFixed(2)}`;
    const activity = createActivity('added', actorName, 'settlement', settlement.id, description, {
      previousState: null
    });

    // Don't await - let it save in background
    saveGroupData(participants, updatedExpenses, activity).catch(err => {
      console.error('Error saving settlement:', err);
    });

    try {
      notifyPaymentRecorded(settlement, participants);
    } catch (error) {
      console.error('Error notifying:', error);
    }
  };

  const handleAddParticipant = async (newParticipant) => {
    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    await saveGroupData(updatedParticipants, expenses);

    // If participant has an email, try to add them as a member for access
    if (newParticipant.email) {
      try {
        // This grants them access to see the group
        await addGroupMember(currentGroupId, newParticipant.email, 'member');
      } catch (error) {
        console.error("Error adding group member access:", error);
        // We don't block the UI update if this fails, but we log it
      }
    }
  };

  const handleRemoveParticipant = (userId) => {
    // Check if participant has outstanding balance (not just if they have expenses)
    const balance = balances[userId] || 0;

    if (Math.abs(balance) > 0.01) {  // Allow for small rounding errors
      const participant = participants.find(p => p.id === userId);
      const owesOrOwed = balance > 0 ? 'is owed' : 'owes';
      alert(`Cannot remove ${participant?.name}: they still ${owesOrOwed} $${Math.abs(balance).toFixed(2)}. Please settle up first.`);
      return;
    }

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

  // Chat handler
  const handleSendMessage = async (text) => {
    if (!currentGroupId || !user) return;

    const message = {
      id: crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}`,
      text,
      userId: user.id,
      userName: displayName || user.email.split('@')[0],
      timestamp: new Date().toISOString()
    };

    try {
      await sendMessage(currentGroupId, message);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  // Member management handlers
  const handleInviteMember = async (userEmail, role) => {
    try {
      await addGroupMember(currentGroupId, userEmail, role);
      alert('Member invited successfully!');
    } catch (error) {
      console.error('Error inviting member:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the group?')) return;

    try {
      await removeGroupMember(currentGroupId, userId);
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleUpdateMemberRole = async (userId, newRole) => {
    try {
      await updateMemberRole(currentGroupId, userId, newRole);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const { balances, totalPaid, totalShare } = calculateBalances(expenses, participants);

  // Get only participants who are actually involved in expenses
  const activeParticipants = getActiveParticipants(expenses, participants);

  const totalExpenses = expenses
    .filter(e => !e.isSettlement)
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate average based on ACTIVE participants only (not all participants)
  const avgPerPerson = activeParticipants.length > 0 ? totalExpenses / activeParticipants.length : 0;

  // Undo handler
  const handleUndo = async (activity) => {
    if (!activity.details?.previousState) {
      alert('Cannot undo this action');
      return;
    }

    if (!confirm(`Undo: ${activity.description}?`)) return;

    const { previousState } = activity.details;
    let updatedExpenses = [...expenses];

    // Undo based on action type
    if (activity.targetType === 'expense') {
      if (activity.action === 'added') {
        // Remove the added expense
        updatedExpenses = expenses.filter(e => e.id !== activity.targetId);
      } else if (activity.action === 'edited') {
        // Restore previous expense state
        updatedExpenses = expenses.map(e =>
          e.id === activity.targetId ? previousState : e
        );
      } else if (activity.action === 'deleted') {
        // Restore deleted expense
        updatedExpenses = [previousState, ...expenses];
      }
    }

    // Remove the activity from log
    const updatedActivityLog = activityLog.filter(a => a.id !== activity.id);

    setExpenses(updatedExpenses);
    setActivityLog(updatedActivityLog);

    // Save without creating new activity
    try {
      await updateGroupInSupabase(currentGroupId, {
        participants,
        expenses: updatedExpenses,
        activityLog: updatedActivityLog
      });
    } catch (error) {
      console.error("Error undoing action:", error);
      alert("Failed to undo. Please try again.");
    }
  };

  // Authentication gate
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50 transition-colors">
      <header className="bg-white shadow-sm sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo and App Name */}
              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={handleLogoClick}>
                <ESplitLogo size={40} />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    E-Split
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">Split expenses easily</p>
                </div>
              </div>

              {/* Desktop Group Selector */}
              <div className="hidden lg:block border-l border-gray-200 pl-4 ml-2">
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

            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Plus size={20} />
                <span className="hidden md:inline">Add Expense</span>
              </button>

              {/* User Info & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <span className="text-sm text-gray-600 hidden lg:inline">{user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {
            isMobileMenuOpen && (
              <div className="sm:hidden border-t border-gray-200 py-4 space-y-3">
                <div className="pb-3 border-b border-gray-200">
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
                <button
                  onClick={() => {
                    setIsExpenseModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Add Expense
                </button>
              </div>
            )
          }

          {/* Tabs */}
          <div className="flex gap-4 border-t border-gray-200 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={16} />
                Dashboard
              </div>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'participants'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <UsersIcon size={16} />
                Participants ({participants.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'activity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <Clock size={16} />
                Activity
              </div>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                Chat
              </div>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'analytics'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={16} />
                Analytics
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Expenses</div>
                    <div className="text-2xl font-bold text-indigo-600">${totalExpenses.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Per Person (Avg)</div>
                    <div className="text-2xl font-bold text-purple-600">${avgPerPerson.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 mt-1">Based on {activeParticipants.length} active participant{activeParticipants.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Transactions</div>
                    <div className="text-2xl font-bold text-gray-900">{expenses.filter(e => !e.isSettlement).length}</div>
                  </div>
                </div>
              </div>
            </div>

            <QuickAddExpense onAdd={handleAddExpense} participants={participants} />

            <Dashboard totalPaid={totalPaid} balances={balances} participants={participants} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <ExpenseList
                  expenses={expenses}
                  participants={participants}
                  onDelete={handleDeleteExpense}
                  onEdit={handleOpenEditExpense}
                />
              </div>
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <SettleUp
                    balances={balances}
                    participants={participants}
                    onOpenSettleModal={handleOpenSettleModal}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'participants' && (
          <div className="max-w-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Manage Participants</h2>
              <p className="text-gray-600">Add or remove people from your group</p>
            </div>
            <ParticipantManager
              participants={participants}
              currentUserEmail={user?.email}
              onAdd={handleAddParticipant}
              onRemove={handleRemoveParticipant}
            />
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="max-w-4xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Activity Log</h2>
              <p className="text-gray-600">Track all changes to this group</p>
            </div>
            <ActivityLog
              activities={activityLog}
              onUndo={handleUndo}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="max-w-4xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Group Chat</h2>
              <p className="text-gray-600">Discuss expenses with your group</p>
            </div>
            <Chat
              messages={chatMessages}
              currentUser={{ id: user?.id, name: displayName || user?.email }}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}

        {activeTab === 'analytics' && (
          <Analytics
            expenses={expenses}
            participants={participants}
          />
        )}
      </main>

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditExpense(null);
        }}
        onAdd={handleAddExpense}
        onEdit={handleEditExpense}
        participants={participants}
        editExpense={editExpense}
      />

      <SettleUpModal
        isOpen={isSettleModalOpen}
        onClose={() => {
          setIsSettleModalOpen(false);
          setSettlePrefill(null);
        }}
        onSettle={handleSettle}
        participants={participants}
        prefill={settlePrefill}
      />

      <ShareGroupModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        groupData={shareGroupData}
      />

      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPinModalGroupId(null);
        }}
        onSubmit={handlePinSubmit}
        mode={pinModalMode}
        groupName={groups.find(g => g.id === pinModalGroupId)?.name}
      />

      <InviteMemberModal
        isOpen={isInviteMemberModalOpen}
        onClose={() => setIsInviteMemberModalOpen(false)}
        onInvite={handleInviteMember}
        groupName={groups.find(g => g.id === currentGroupId)?.name || 'this group'}
      />

      <DevDashboard
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
      />
    </div>
  );
}

export default App;
