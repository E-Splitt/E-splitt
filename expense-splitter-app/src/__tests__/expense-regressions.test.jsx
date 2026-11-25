import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { expenseAllocation, allocateCents } from '../utils/splitLogic';
import AddExpenseModal from '../components/AddExpenseModal';
import Dashboard from '../components/Dashboard';
import SettleUpModal from '../components/SettleUpModal';

const ids = ['A','B','C'];
const participants = ids.map(id => ({ id, name: id }));
describe('Expense and settlement regressions', () => {
    it('allocates the remaining cent and rejects incomplete custom inputs', () => {
        expect(expenseAllocation(10, ids, 'shares', { A:1,B:1,C:1 }).computedShares)
            .toEqual({ A:3.34,B:3.33,C:3.33 });
        expect(expenseAllocation(10, ids, 'exact', { A:3.33,B:3.33,C:3.33 }).allocationStatus.valid).toBe(false);
        expect(expenseAllocation(1000, ids, 'percent', allocateCents(10000,ids)).computedShares)
            .toEqual({ A:333.4,B:333.3,C:333.3 });
        expect(expenseAllocation(1000, ids, 'percent', { A:33.3,B:33.3,C:33.3 }).allocationStatus.valid).toBe(false);
        expect(expenseAllocation(10, ids, 'shares', {}).allocationStatus.valid).toBe(false);
    });
    it.each([undefined, { A:50,B:50 }])('preserves percentage splits when editing a description', async splitInputs => {
        const onEdit = vi.fn();
        render(<AddExpenseModal isOpen participants={participants} onEdit={onEdit} onClose={vi.fn()}
            editExpense={{ id:'x', description:'Lunch', amount:40, paidBy:'A', splitMode:'percent', shares:{A:20,B:20}, splitInputs }}/>);
        fireEvent.change(screen.getByDisplayValue('Lunch'), {target:{value:'Dinner'}});
        fireEvent.click(screen.getByRole('button', {name:'Save Changes'}));
        await waitFor(() => expect(onEdit).toHaveBeenCalled());
        expect(onEdit.mock.calls[0][0]).toMatchObject({description:'Dinner', shares:{A:20,B:20}, splitInputs:{A:50,B:50}});
    });
    it('shows a one-cent debt on the dashboard', () => {
        render(<Dashboard balances={{A:0.01,B:-0.01}} participants={participants} expenses={[]}/>);
        expect(screen.queryByText('All settled')).toBeNull();
        expect(screen.getByText('$0.01')).toBeDefined();
    });
    it('flags a legacy unbalanced bill even when there are no matching debts', () => {
        render(<Dashboard balances={{A:0.01,B:0}} participants={participants} expenses={[]}/>);
        expect(screen.getByRole('alert').textContent).toContain('$0.01');
        expect(screen.queryByText('All settled')).toBeNull();
    });
    it('keeps a failed settlement open for retry', async () => {
        const close = vi.fn();
        render(<SettleUpModal isOpen participants={participants} prefill={{fromId:'A',toId:'B',amount:10}}
            onSettle={vi.fn().mockRejectedValue(new Error('Offline'))} onClose={close}/>);
        fireEvent.click(screen.getByRole('button',{name:'Record Payment'}));
        expect(await screen.findByText('Could not save payment. Please try again.')).toBeDefined();
        expect(close).not.toHaveBeenCalled();
        expect(screen.getByDisplayValue('10')).toBeDefined();
    });
});
