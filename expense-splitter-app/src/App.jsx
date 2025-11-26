import React, { useState, useEffect } from 'react';
import { Plus, Receipt, Users as UsersIcon, TrendingUp, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ExpenseList from './components/ExpenseList';
import AddExpenseModal from './components/AddExpenseModal';
import SettleUp from './components/SettleUp';
import SettleUpModal from './components/SettleUpModal';
import ParticipantManager from './components/ParticipantManager';
import QuickAddExpense from './components/QuickAddExpense';
import GroupSelector from './components/GroupSelector';
import ShareGroupModal from './components/ShareGroupModal';
import ESplitLogo from './components/ESplitLogo';
import { calculateBalances, getActiveParticipants } from './utils/splitLogic';
import initialData from './data/initialData.json';
import {
  createGroupInSupabase,
  updateGroupInSupabase,
  deleteGroupInSupabase,
  subscribeToGroups,
  subscribeToGroupData,
  importGroupToSupabase
} from './services/supabaseService';

function App() {
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareGroupData, setShareGroupData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load groups from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToGroups((fetchedGroups) => {
      setGroups(fetchedGroups);
    });

    return () => unsubscribe();
  }, []);

  // Handle default group selection
  useEffect(() => {
    if (groups.length > 0 && !currentGroupId) {
      // Only create default if we haven't already tried (to avoid loops)
      const hasInitialized = localStorage.getItem('hasInitialized');
      if (!hasInitialized) {
        handleCreateGroup('My Group');
        localStorage.setItem('hasInitialized', 'true');
      } else {
        // Select first group if none selected
        setCurrentGroupId(groups[0].id);
      }
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
      }
    });

    return () => unsubscribe();
  }, [currentGroupId]);

  // Helper to save current group data to Firestore
  const saveGroupData = async (updatedParticipants, updatedExpenses) => {
    if (!currentGroupId) return;

    try {
      await updateGroupInSupabase(currentGroupId, {
        participants: updatedParticipants,
        expenses: updatedExpenses
      });
    } catch (error) {
      console.error("Error saving group data:", error);
      alert("Failed to save changes. Please check your connection.");
    }
  };

  const handleCreateGroup = async (groupName) => {
    try {
      const newGroupData = {
        name: groupName,
        participants: [],
        expenses: []
      };
      const createdGroup = await createGroupInSupabase(newGroupData);
      setCurrentGroupId(createdGroup.id);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please check your connection.");
    }
  };

  const handleSelectGroup = (groupId) => {
    setCurrentGroupId(groupId);
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

  // --- Expense & Participant Handlers (Now saving to Firestore) ---

  const handleAddExpense = (newExpense) => {
    const updatedExpenses = [newExpense, ...expenses];
    // Optimistic update
    setExpenses(updatedExpenses);
    saveGroupData(participants, updatedExpenses);
  };

  const handleEditExpense = (updatedExpense) => {
    const updatedExpenses = expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e);
    setExpenses(updatedExpenses);
    saveGroupData(participants, updatedExpenses);
  };

  const handleDeleteExpense = (expenseId) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      const updatedExpenses = expenses.filter(e => e.id !== expenseId);
      setExpenses(updatedExpenses);
      saveGroupData(participants, updatedExpenses);
    }
  };

  const handleOpenEditExpense = (expense) => {
    setEditExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleSettle = (settlement) => {
    const updatedExpenses = [settlement, ...expenses];
    setExpenses(updatedExpenses);
    saveGroupData(participants, updatedExpenses);
  };

  const handleAddParticipant = (newParticipant) => {
    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    saveGroupData(updatedParticipants, expenses);
  };

  const handleRemoveParticipant = (userId) => {
    // Check if participant has any expenses
    const hasExpenses = expenses.some(expense =>
      expense.paidBy === userId ||
      (expense.shares && expense.shares[userId] > 0)
    );

    if (hasExpenses) {
      alert('Cannot remove participant with existing expenses. Delete their expenses first.');
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

  const { balances, totalPaid, totalShare } = calculateBalances(expenses, participants);

  // Get only participants who are actually involved in expenses
  const activeParticipants = getActiveParticipants(expenses, participants);

  const totalExpenses = expenses
    .filter(e => !e.isSettlement)
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate average based on ACTIVE participants only (not all participants)
  const avgPerPerson = activeParticipants.length > 0 ? totalExpenses / activeParticipants.length : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo and App Name */}
              <div className="flex items-center gap-2">
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
          {isMobileMenuOpen && (
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
          )}

          {/* Tabs */}
          <div className="flex gap-4 border-t border-gray-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'dashboard'
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
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${activeTab === 'participants'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              <div className="flex items-center gap-2">
                <UsersIcon size={16} />
                Participants ({participants.length})
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
              onAdd={handleAddParticipant}
              onRemove={handleRemoveParticipant}
            />
          </div>
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
    </div>
  );
}

export default App;
