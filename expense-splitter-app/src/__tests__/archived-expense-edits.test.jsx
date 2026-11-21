import React from 'react';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddExpenseModal from '../components/AddExpenseModal';
import PeriodDetailsView from '../components/PeriodDetailsView';
import { getArchivedExpenseEdits } from '../services/periodService';

vi.mock('../services/periodService', () => ({ getArchivedExpenseEdits: vi.fn() }));

it('opens archived expense edits and displays the recorded author and changes', async () => {
    const expense = { id: 'bill', description: 'Team dinner', amount: 14, date: '2026-11-15', paidBy: 'a' };
    const payment = { id: 'payment', description: 'Recorded payment', amount: 1, date: '2026-11-16', paidBy: 'a', isSettlement: true };
    getArchivedExpenseEdits.mockResolvedValue([{
        id: 'edit', actor_name: 'Ledger Editor', edited_at: '2026-11-17T12:00:00Z',
        before_expense: { ...expense, description: 'Dinner', amount: 10 }, after_expense: expense
    }]);
    const onEditExpense = vi.fn();

    render(<PeriodDetailsView
        period={{ id: 'period', name: 'November', start_date: '2026-11-01', end_date: '2026-11-20' }}
        expenses={[expense, payment]} participants={[{ id: 'a', name: 'Alex' }]} onEditExpense={onEditExpense}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Team dinner' }));
    expect(onEditExpense).toHaveBeenCalledWith(expense);
    expect(screen.queryByRole('button', { name: 'Edit Recorded payment' })).toBeNull();
    expect(await screen.findByText('Ledger Editor edited Dinner')).toBeTruthy();
    expect(screen.getByText(/Amount.*\$10\.00.*\$14\.00/)).toBeTruthy();
});

it('offers archive additions and attributes the new expense in history', async () => {
    getArchivedExpenseEdits.mockResolvedValue([{
        id: 'add', actor_name: 'Ledger Editor', edited_at: '2026-11-17T12:00:00Z',
        before_expense: null, after_expense: { description: 'Taxi', amount: 20 }
    }]);
    const onAddExpense = vi.fn();
    render(<PeriodDetailsView
        period={{ id: 'period', name: 'November', start_date: '2026-11-01', end_date: '2026-11-20' }}
        onAddExpense={onAddExpense}
    />);
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(onAddExpense).toHaveBeenCalledOnce();
    expect(await screen.findByText('Ledger Editor added Taxi')).toBeTruthy();
});

it('preserves the archive expense date and ID when retrying a failed save', async () => {
    const onAdd = vi.fn().mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({});
    const onClose = vi.fn();
    render(<AddExpenseModal isOpen archivePeriod={{ id: 'period', name: 'November', end_date: '2026-11-20T12:00:00' }}
        participants={[{ id: 'a', name: 'Alex' }]} onAdd={onAdd} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Expense date/), { target: { value: '2026-11-16' } });
    fireEvent.change(screen.getByPlaceholderText(/Firewood/), { target: { value: 'Taxi' } });
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to archive' }));
    expect(await screen.findByText('Connection lost')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add to archive' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onAdd.mock.calls[1][0]).toEqual(onAdd.mock.calls[0][0]);
    expect(onAdd.mock.calls[1][0]).toMatchObject({ expenseDate: '2026-11-16', shares: { a: 20 } });
});
