import React, { useEffect, useState } from 'react';
import { ArrowRight, Wallet, Users, Receipt, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { getParticipantHue } from '../utils/colors';

/**
 * Spring-animated number counter that smoothly interpolates values when totals change.
 */
const AnimatedValue = ({ value, prefix = '', decimals = 2 }) => {
  const spring = useSpring(value, { stiffness: 140, damping: 22, mass: 0.8 });
  const display = useTransform(spring, (current) => `${prefix}${Math.abs(current).toFixed(decimals)}`);
  const [rendered, setRendered] = useState(`${prefix}${Math.abs(value).toFixed(decimals)}`);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => setRendered(v));
    return () => unsubscribe();
  }, [display]);

  return <span>{rendered}</span>;
};

const Dashboard = ({ participants, balances, settleUp, expenses, onSettle }) => {
  const nameOf = (id) => participants.find((p) => p.id === id)?.name || id;
  const fmt = (n) => `$${Math.abs(n).toFixed(2)}`;

  const nonSettlementExpenses = expenses.filter(e => !e.isSettlement);
  const total = nonSettlementExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const perPerson = participants.length > 0 ? total / participants.length : 0;

  let activeSettlements = settleUp || [];
  if (!settleUp) {
    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance < -0.01) debtors.push({ id: userId, amt: -balance });
      else if (balance > 0.01) creditors.push({ id: userId, amt: balance });
    });

    debtors.sort((a, b) => b.amt - a.amt);
    creditors.sort((a, b) => b.amt - a.amt);

    const out = [];
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i], c = creditors[j];
      const amt = Math.min(d.amt, c.amt);
      out.push({ from: d.id, to: c.id, amt });
      d.amt -= amt; c.amt -= amt;
      if (d.amt < 0.01) i++;
      if (c.amt < 0.01) j++;
    }
    activeSettlements = out;
  }

  const getAvatarHue = (id) => {
    const idx = participants.findIndex(p => p.id === id);
    return getParticipantHue(idx >= 0 ? idx : 0);
  };

  const getInitial = (id) => nameOf(id).charAt(0).toUpperCase();

  return (
    <div className="stack-xl">
      {/* SaaS KPI Metric Cards */}
      <section className="ledger-strip">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.02 }}
          className="ledger-card ledger-cell"
        >
          <div className="cell-label">
            <span>Total spent</span>
            <span className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--teal-soft)', color: 'var(--teal)' }}>
              <Wallet size={14} />
            </span>
          </div>
          <div className="cell-value mono">
            <AnimatedValue value={total} prefix="$" decimals={2} />
          </div>
        </motion.div>

        <div className="ledger-div" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.08 }}
          className="ledger-card ledger-cell"
        >
          <div className="cell-label">
            <span>Per person</span>
            <span className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--gold-soft)', color: 'var(--gold)' }}>
              <Users size={14} />
            </span>
          </div>
          <div className="cell-value mono accent-gold">
            <AnimatedValue value={perPerson} prefix="$" decimals={2} />
          </div>
        </motion.div>

        <div className="ledger-div" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24, delay: 0.14 }}
          className="ledger-card ledger-cell"
        >
          <div className="cell-label">
            <span>Entries</span>
            <span className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--moss-soft)', color: 'var(--moss)' }}>
              <Receipt size={14} />
            </span>
          </div>
          <div className="cell-value mono">
            <AnimatedValue value={nonSettlementExpenses.length} prefix="" decimals={0} />
          </div>
        </motion.div>
      </section>

      {/* Animated Who Owes Who Settlement Section */}
      <section>
        <div className="section-head-row">
          <h2 className="section-head">Who owes who</h2>
          {activeSettlements.length > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full saas-shimmer-badge">
              <Sparkles size={11} className="inline mr-1" />
              {activeSettlements.length} simplified {activeSettlements.length === 1 ? 'transfer' : 'transfers'}
            </span>
          )}
        </div>

        <motion.div layout className="balance-card">
          <AnimatePresence mode="popLayout" initial={false}>
            {activeSettlements.length === 0 ? (
              <motion.div
                key="all-settled-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="all-settled"
              >
                <motion.div
                  initial={{ rotate: -8, scale: 0.85 }}
                  animate={{ rotate: -2, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 18 }}
                  className="stamp"
                >
                  <CheckCircle2 size={14} /> All settled
                </motion.div>
                <p>Nobody owes anybody. Nicely split.</p>
              </motion.div>
            ) : (
              activeSettlements.map((s, i) => {
                const fromId = typeof s.from === 'object' ? s.from.id : s.from;
                const toId = typeof s.to === 'object' ? s.to.id : s.to;
                const amt = s.amt || s.amount;
                const rowKey = `${fromId}->${toId}`;

                return (
                  <motion.div
                    layout
                    key={rowKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24, scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28, delay: i * 0.04 }}
                    className="settle-row"
                  >
                    <div className="settle-people">
                      <div className="avatar-chip" data-hue={getAvatarHue(fromId)} style={{ width: 32, height: 32, fontSize: 13 }}>
                        {getInitial(fromId)}
                      </div>
                      <ArrowRight size={14} className="muted" />
                      <div className="avatar-chip" data-hue={getAvatarHue(toId)} style={{ width: 32, height: 32, fontSize: 13 }}>
                        {getInitial(toId)}
                      </div>
                      <span>
                        <strong>{nameOf(fromId)}</strong> owes <strong>{nameOf(toId)}</strong>
                      </span>
                    </div>
                    <div className="settle-right">
                      <span className="mono amt-coral font-semibold">{fmt(amt)}</span>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        className="mini-btn"
                        onClick={() => onSettle && onSettle(fromId, toId, amt)}
                      >
                        Settle
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  );
};

export default Dashboard;
