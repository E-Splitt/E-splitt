import React, { useState } from 'react';
import { Download, Check, FileSpreadsheet } from 'lucide-react';

const ExportButton = ({ expenses, participants }) => {
    const [exported, setExported] = useState(false);

    const getPersonName = (userId) => {
        const person = participants.find(p => p.id === userId);
        return person?.name || 'Unknown';
    };

    const exportToCSV = () => {
        if (!expenses || expenses.length === 0) {
            alert('No expenses to export');
            return;
        }

        // CSV Header
        const headers = ['Date', 'Description', 'Amount', 'Paid By', 'Category', 'Split Details', 'Type'];

        // CSV Rows
        const rows = expenses.map(expense => {
            const splitDetails = expense.isSettlement
                ? `Payment to ${getPersonName(expense.paidTo)}`
                : Object.entries(expense.shares || {})
                    .map(([userId, share]) => `${getPersonName(userId)}: $${share.toFixed(2)}`)
                    .join(' | ');

            return [
                expense.expenseDate || expense.date || '',
                `"${(expense.description || '').replace(/"/g, '""')}"`,
                expense.amount?.toFixed(2) || '0.00',
                getPersonName(expense.paidBy),
                expense.category || 'other',
                `"${splitDetails}"`,
                expense.isSettlement ? 'Settlement' : 'Expense'
            ];
        });

        // Build CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `e-split-expenses-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success state
        setExported(true);
        setTimeout(() => setExported(false), 2000);
    };

    return (
        <button
            onClick={exportToCSV}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200 ${exported
                    ? 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
                    : 'text-themed-secondary bg-themed-card border-themed hover:shadow-md'
                }`}
            title="Export expenses to CSV"
        >
            {exported ? (
                <>
                    <Check size={16} />
                    Exported!
                </>
            ) : (
                <>
                    <Download size={16} />
                    <span className="hidden md:inline">Export CSV</span>
                </>
            )}
        </button>
    );
};

export default ExportButton;
