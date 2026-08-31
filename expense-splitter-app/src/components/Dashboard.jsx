import React from 'react';
import { ArrowRight } from 'lucide-react';
import { getParticipantHue } from '../utils/colors';

const Dashboard = ({ totalPaid, count, participants, balances, settleUp, expenses, onSettle }) => {
  // Settle up array should be passed from App.jsx or calculated here.
  // We'll calculate it if not passed.
  const nameOf = (id) => participants.find((p) => p.id === id)?.name || id;
  const fmt = (n) => `$${Math.abs(n).toFixed(2)}`;

  const total = expenses.filter(e => !e.isSettlement).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const perPerson = participants.length > 0 ? total / participants.length : 0;
  
  // Calculate settlements if not provided
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
      <section className="ledger-strip">
        <div className="ledger-cell">
          <div className="cell-label">Total spent</div>
          <div className="cell-value mono">${total.toFixed(2)}</div>
        </div>
        <div className="ledger-div" />
        <div className="ledger-cell">
          <div className="cell-label">Per person</div>
          <div className="cell-value mono accent-gold">${perPerson.toFixed(2)}</div>
        </div>
        <div className="ledger-div" />
        <div className="ledger-cell">
          <div className="cell-label">Entries</div>
          <div className="cell-value mono">{expenses.filter(e => !e.isSettlement).length}</div>
        </div>
      </section>

      <section>
        <h2 className="section-head">Who owes who</h2>
        <div className="balance-card">
          {activeSettlements.length === 0 && (
            <div className="all-settled">
              <div className="stamp">All settled</div>
              <p>Nobody owes anybody. Nicely split.</p>
            </div>
          )}
          {activeSettlements.map((s, i) => {
            const fromId = typeof s.from === 'object' ? s.from.id : s.from;
            const toId = typeof s.to === 'object' ? s.to.id : s.to;
            const amt = s.amt || s.amount;

            return (
              <div className="settle-row" key={i}>
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
                  <span className="mono amt-coral">{fmt(amt)}</span>
                  <button className="mini-btn" onClick={() => onSettle && onSettle(fromId, toId, amt)}>Settle</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
