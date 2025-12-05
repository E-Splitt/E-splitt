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
import UserProfileModal from './components/UserProfileModal';
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
