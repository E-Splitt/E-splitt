import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Wallet,
  Sun,
  Moon,
  Lock,
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  BarChart3,
  Calendar,
  User,
  CornerDownLeft,
  X
} from 'lucide-react';
import { getParticipantHue } from '../utils/colors';

const CommandPaletteModal = ({
  onClose,
  onOpenAddExpense,
  onOpenSettleUp,
  onSelectTab,
  onSelectMember,
  onToggleTheme,
  onOpenPinModal,
  darkMode,
  participants = []
}) => {
  const [query, setQuery] = useState('');
  const [rawActiveIndex, setRawActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(timer);
  }, []);

  // Command items builder
  const commandSections = useMemo(() => {
    const sections = [];

    // 1. Quick Actions
    const quickActions = [
      {
        id: 'action-add-expense',
        title: 'Add New Expense',
        subtitle: 'Record a shared payment or bill',
        category: 'Actions',
        icon: Plus,
        iconColor: 'var(--teal)',
        iconBg: 'var(--teal-soft)',
        shortcut: 'N',
        run: () => {
          onClose();
          onOpenAddExpense();
        }
      },
      {
        id: 'action-settle-up',
        title: 'Settle Up Balances',
        subtitle: 'Record a debt settlement payment',
        category: 'Actions',
        icon: Wallet,
        iconColor: 'var(--moss)',
        iconBg: 'var(--moss-soft)',
        shortcut: 'S',
        run: () => {
          onClose();
          onOpenSettleUp();
        }
      },
      {
        id: 'action-toggle-theme',
        title: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        subtitle: 'Toggle SaaS light/dark color theme',
        category: 'Actions',
        icon: darkMode ? Sun : Moon,
        iconColor: 'var(--gold)',
        iconBg: 'var(--gold-soft)',
        shortcut: 'T',
        run: () => {
          onToggleTheme();
        }
      },
      {
        id: 'action-pin-security',
        title: 'Group PIN & Security',
        subtitle: 'Set or update 4-digit security PIN',
        category: 'Actions',
        icon: Lock,
        iconColor: 'var(--coral)',
        iconBg: 'var(--coral-soft)',
        shortcut: 'P',
        run: () => {
          onClose();
          onOpenPinModal?.();
        }
      }
    ];

    // 2. Navigation Tabs
    const navigationTabs = [
      {
        id: 'nav-dashboard',
        title: 'Dashboard Overview',
        subtitle: 'View balances, settlements & expense history',
        category: 'Navigation',
        icon: TrendingUp,
        run: () => {
          onClose();
          onSelectTab('dashboard');
        }
      },
      {
        id: 'nav-participants',
        title: `People & Members (${participants.length})`,
        subtitle: 'Manage group members and balance ledger',
        category: 'Navigation',
        icon: Users,
        run: () => {
          onClose();
          onSelectTab('participants');
        }
      },
      {
        id: 'nav-activity',
        title: 'Activity Timeline',
        subtitle: 'Audit log of recent additions and updates',
        category: 'Navigation',
        icon: Clock,
        run: () => {
          onClose();
          onSelectTab('activity');
        }
      },
      {
        id: 'nav-chat',
        title: 'Group Chat',
        subtitle: 'Send messages and discuss splits with members',
        category: 'Navigation',
        icon: MessageSquare,
        run: () => {
          onClose();
          onSelectTab('chat');
        }
      },
      {
        id: 'nav-analytics',
        title: 'Spend Analytics & Stats',
        subtitle: 'Category breakdowns and member contributions',
        category: 'Navigation',
        icon: BarChart3,
        run: () => {
          onClose();
          onSelectTab('analytics');
        }
      },
      {
        id: 'nav-archive',
        title: 'Period Archive',
        subtitle: 'Review settled periods and historical summaries',
        category: 'Navigation',
        icon: Calendar,
        run: () => {
          onClose();
          onSelectTab('archive');
        }
      }
    ];

    // 3. Member Filters
    const memberFilters = participants.map((p, idx) => ({
      id: `filter-member-${p.id}`,
      title: `Filter by ${p.name}`,
      subtitle: `Show expenses paid by or involving ${p.name}`,
      category: 'Filter by Member',
      icon: User,
      hue: getParticipantHue(idx),
      avatarChar: p.name.charAt(0).toUpperCase(),
      run: () => {
        onClose();
        onSelectMember(p.id);
      }
    }));

    // Filter by query
    const filterList = (list) => {
      if (!query.trim()) return list;
      const q = query.toLowerCase();
      return list.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    };

    const filteredActions = filterList(quickActions);
    const filteredNav = filterList(navigationTabs);
    const filteredMembers = filterList(memberFilters);

    if (filteredActions.length > 0) {
      sections.push({ category: 'Quick Actions', items: filteredActions });
    }
    if (filteredNav.length > 0) {
      sections.push({ category: 'Navigation', items: filteredNav });
    }
    if (filteredMembers.length > 0) {
      sections.push({ category: 'Filter by Member', items: filteredMembers });
    }

    return sections;
  }, [
    participants,
    query,
    darkMode,
    onClose,
    onOpenAddExpense,
    onOpenSettleUp,
    onToggleTheme,
    onOpenPinModal,
    onSelectTab,
    onSelectMember
  ]);

  // Flattened items for keyboard indexing
  const flatItems = useMemo(() => {
    return commandSections.flatMap(section => section.items);
  }, [commandSections]);

  const activeIndex = flatItems.length === 0 ? 0 : Math.min(rawActiveIndex, flatItems.length - 1);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setRawActiveIndex(prev => (flatItems.length === 0 ? 0 : (prev + 1) % flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setRawActiveIndex(prev => (flatItems.length === 0 ? 0 : (prev - 1 + flatItems.length) % flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[activeIndex]) {
        flatItems[activeIndex].run();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col z-10"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--line)',
          color: 'var(--ink)'
        }}
      >
        {/* Top Search Input */}
        <div
          className="flex items-center gap-3 px-4 py-3.5 border-b"
          style={{ borderColor: 'var(--line)' }}
        >
          <Search size={19} style={{ color: 'var(--muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setRawActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, tab, or member name..."
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-[var(--muted)]"
            style={{ color: 'var(--ink)' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setRawActiveIndex(0);
              }}
              className="p-1 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted)' }}
            >
              <X size={15} />
            </button>
          )}
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border uppercase"
            style={{
              backgroundColor: 'var(--page)',
              borderColor: 'var(--line)',
              color: 'var(--muted)'
            }}
          >
            esc
          </kbd>
        </div>

        {/* Commands List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto py-2 px-2 divide-y"
          style={{ borderColor: 'var(--line)' }}
        >
          {flatItems.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>
              No commands or members found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            commandSections.map((section) => (
              <div key={section.category} className="py-1.5 first:pt-0 last:pb-0 border-0">
                <div
                  className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--muted)' }}
                >
                  {section.category}
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {section.items.map((item) => {
                    const itemIndex = flatItems.indexOf(item);
                    const isActive = itemIndex === activeIndex;

                    return (
                      <div
                        key={item.id}
                        data-active={isActive}
                        onClick={() => item.run()}
                        onMouseEnter={() => setRawActiveIndex(itemIndex)}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left"
                        style={{
                          backgroundColor: isActive ? 'var(--teal-soft)' : 'transparent',
                          color: isActive ? 'var(--teal)' : 'var(--ink)'
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.avatarChar ? (
                            <div
                              className="avatar-chip flex-shrink-0"
                              data-hue={item.hue}
                              style={{ width: 28, height: 28, fontSize: 12 }}
                            >
                              {item.avatarChar}
                            </div>
                          ) : (
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: item.iconBg || 'var(--page)',
                                color: item.iconColor || 'var(--ink)'
                              }}
                            >
                              <item.icon size={15} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {item.title}
                            </div>
                            <div
                              className="text-[11px] truncate"
                              style={{ color: 'var(--muted)' }}
                            >
                              {item.subtitle}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-3 flex-shrink-0">
                          {item.shortcut && (
                            <kbd
                              className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] rounded border uppercase font-mono"
                              style={{
                                borderColor: 'var(--line)',
                                backgroundColor: 'var(--page)',
                                color: 'var(--muted)'
                              }}
                            >
                              {item.shortcut}
                            </kbd>
                          )}
                          {isActive && (
                            <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--teal)' }}>
                              <span className="hidden sm:inline">Select</span>
                              <CornerDownLeft size={13} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Footer Help */}
        <div
          className="px-4 py-2 text-[11px] border-t flex items-center justify-between"
          style={{
            borderColor: 'var(--line)',
            backgroundColor: 'var(--page)',
            color: 'var(--muted)'
          }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border text-[9px]" style={{ borderColor: 'var(--line)' }}>↑</kbd>
              <kbd className="px-1 py-0.5 rounded border text-[9px]" style={{ borderColor: 'var(--line)' }}>↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded border text-[9px]" style={{ borderColor: 'var(--line)' }}>↵</kbd>
              <span>select</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span>E-Split Modern SaaS</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CommandPalette = (props) => {
  return (
    <AnimatePresence>
      {props.isOpen && <CommandPaletteModal key="command-palette-modal" {...props} />}
    </AnimatePresence>
  );
};

export default CommandPalette;
