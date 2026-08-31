import { describe, it, expect } from 'vitest';
import { calculateBalances, calculateSettlements, toCents, toDollars } from '../splitLogic';

describe('Eplitt Financial Engine - splitLogic.js', () => {
    
    // Participants mock
    const pA = { id: 'A', name: 'Alice' };
    const pB = { id: 'B', name: 'Bob' };
    const pC = { id: 'C', name: 'Charlie' };
    const pD = { id: 'D', name: 'Dave' };
    const participants = [pA, pB, pC, pD];

    const sumBalances = (balances) => {
        let sumCents = 0;
        Object.values(balances).forEach(b => sumCents += Math.round(b * 100));
        return sumCents;
    };

    describe('calculateBalances (FIN-01 to FIN-13)', () => {

        it('FIN-01: Equal split, even dollars', () => {
            const expenses = [{
                id: 1, amount: 100, paidBy: 'A', shares: { 'A': 33.34, 'B': 33.33, 'C': 33.33 }
            }];
            const { balances, totalPaid, totalShare } = calculateBalances(expenses, participants);
            
            expect(balances['A']).toBeCloseTo(66.66);
            expect(balances['B']).toBeCloseTo(-33.33);
            expect(balances['C']).toBeCloseTo(-33.33);
            expect(sumBalances(balances)).toBe(0);
            expect(totalPaid['A']).toBe(100);
            expect(totalShare['A']).toBe(33.34);
        });

        it('FIN-02: Uneven cents division', () => {
            const expenses = [{
                id: 2, amount: 10.01, paidBy: 'A', shares: { 'A': 3.35, 'B': 3.33, 'C': 3.33 }
            }];
            const { balances } = calculateBalances(expenses, participants);
            
            expect(balances['A']).toBeCloseTo(6.66);
            expect(balances['B']).toBeCloseTo(-3.33);
            expect(balances['C']).toBeCloseTo(-3.33);
            expect(sumBalances(balances)).toBe(0);
        });

        it('FIN-03: Sub-penny splits', () => {
            const expenses = [{
                id: 3, amount: 0.05, paidBy: 'A', shares: { 'A': 0.03, 'B': 0.02 }
            }];
            const { balances } = calculateBalances(expenses, participants);
            
            expect(balances['A']).toBeCloseTo(0.02);
            expect(balances['B']).toBeCloseTo(-0.02);
            expect(sumBalances(balances)).toBe(0);
        });

        it('FIN-04: Single payer, multiple beneficiaries (payer not in split)', () => {
            const expenses = [{
                id: 4, amount: 150, paidBy: 'A', shares: { 'B': 50, 'C': 50, 'D': 50 }
            }];
            const { balances } = calculateBalances(expenses, participants);
            
            expect(balances['A']).toBeCloseTo(150);
            expect(balances['B']).toBeCloseTo(-50);
            expect(balances['C']).toBeCloseTo(-50);
            expect(balances['D']).toBeCloseTo(-50);
            expect(sumBalances(balances)).toBe(0);
        });

        it('FIN-06 & FIN-07: Exact Amount Validations are handled by UI, engine trusts shares', () => {
            const expenses = [{
                id: 6, amount: 125.50, paidBy: 'A', shares: { 'A': 40, 'B': 50.50, 'C': 35 }
            }];
            const { balances } = calculateBalances(expenses, participants);
            
            expect(balances['A']).toBeCloseTo(85.50);
            expect(balances['B']).toBeCloseTo(-50.50);
            expect(balances['C']).toBeCloseTo(-35.00);
            expect(sumBalances(balances)).toBe(0);
        });

        it('FIN-11: Settlement does not inflate totalPaid/totalShare', () => {
            const expenses = [
                { id: 10, amount: 90, paidBy: 'A', shares: { 'A': 30, 'B': 30, 'C': 30 }, isSettlement: false },
                { id: 11, amount: 30, paidBy: 'B', paidTo: 'A', isSettlement: true } // B pays A $30
            ];
            
            const { balances, totalPaid, totalShare } = calculateBalances(expenses, participants);
            
            // B has paid off their debt to A
            expect(balances['B']).toBeCloseTo(0);
            expect(balances['A']).toBeCloseTo(30); // A is still owed $30 by C
            expect(balances['C']).toBeCloseTo(-30);
            expect(sumBalances(balances)).toBe(0);

            // Group spend metrics MUST NOT count the $30 settlement!
            expect(totalPaid['A']).toBe(90);
            expect(totalPaid['B']).toBe(0);
            expect(totalShare['B']).toBe(30);
        });

        it('FIN-12: Edits correctly recalculate ignoring settlements history', () => {
            const expenses = [
                // Initially was $90, later edited to $120
                { id: 12, amount: 120, paidBy: 'A', shares: { 'A': 40, 'B': 40, 'C': 40 }, isSettlement: false },
                { id: 13, amount: 30, paidBy: 'B', paidTo: 'A', isSettlement: true } // B already settled $30
            ];
            const { balances } = calculateBalances(expenses, participants);
            
            // A paid 120, share is 40. Received 30. A net = +50
            expect(balances['A']).toBeCloseTo(50);
            // B share is 40. Paid 30 settlement. B net = -10
            expect(balances['B']).toBeCloseTo(-10);
            // C share is 40. C net = -40
            expect(balances['C']).toBeCloseTo(-40);
            expect(sumBalances(balances)).toBe(0);
        });
    });

    describe('calculateSettlements (Stability and Greedy)', () => {
        it('should correctly balance out exact debts', () => {
            const balances = { 'A': 50, 'B': -50 };
            const settlements = calculateSettlements(balances, participants);
            expect(settlements.length).toBe(1);
            expect(settlements[0].from.id).toBe('B');
            expect(settlements[0].to.id).toBe('A');
            expect(settlements[0].amount).toBe(50);
        });

        it('should perform stable sorting for jumping settlements', () => {
            // A owes 50, B owes 50. C is owed 100.
            const balances = { 'A': -50, 'B': -50, 'C': 100 };
            const settlements1 = calculateSettlements(balances, participants);
            // With stable sort based on IDs ('A' before 'B'), B should always be processed predictably
            // With stable sort based on IDs ('A' before 'B'), A should always be processed first
            expect(settlements1.length).toBe(2);
            expect(settlements1[0].from.id).toBe('A');
            expect(settlements1[1].from.id).toBe('B');
            expect(settlements1[0].to.id).toBe('C');
            expect(settlements1[1].to.id).toBe('C');
            expect(settlements1[0].amount + settlements1[1].amount).toBe(100);
        });
    });
});
