import React, { useMemo } from 'react';
import { PieChart, Pie, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

const Analytics = ({ expenses, participants }) => {
    // Filter out settlements
    const actualExpenses = expenses.filter(e => !e.isSettlement);

    // Calculate total spending
    const totalSpending = useMemo(() => {
        return actualExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    }, [actualExpenses]);

    // Category breakdown
    const categoryData = useMemo(() => {
        const categories = {};
        actualExpenses.forEach(exp => {
            const cat = exp.category || 'other';
            categories[cat] = (categories[cat] || 0) + exp.amount;
        });

        return Object.entries(categories).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: parseFloat(value.toFixed(2))
        })).sort((a, b) => b.value - a.value);
    }, [actualExpenses]);

    // Monthly spending trend (last 6 months)
    const monthlyData = useMemo(() => {
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 5);
        const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

        return months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);

            const monthExpenses = actualExpenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate >= monthStart && expDate <= monthEnd;
            });

            const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

            return {
                month: format(month, 'MMM yyyy'),
                amount: parseFloat(total.toFixed(2)),
                count: monthExpenses.length
            };
        });
    }, [actualExpenses]);

    // Top spenders
    const topSpenders = useMemo(() => {
        const spenderTotals = {};
        actualExpenses.forEach(exp => {
            const payer = participants.find(p => p.id === exp.paidBy);
            if (payer) {
                spenderTotals[payer.name] = (spenderTotals[payer.name] || 0) + exp.amount;
            }
        });

        return Object.entries(spenderTotals)
            .map(([name, amount]) => ({
                name,
                amount: parseFloat(amount.toFixed(2))
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [actualExpenses, participants]);

    // Colors for charts
    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

    if (actualExpenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <TrendingUp size={64} className="mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
                <p className="text-sm">Add some expenses to see analytics</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign size={24} />
                        <span className="text-indigo-200 text-sm">Total</span>
                    </div>
                    <div className="text-3xl font-bold">${totalSpending.toFixed(2)}</div>
                    <div className="text-indigo-200 text-sm mt-1">All time spending</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Calendar size={24} />
                        <span className="text-purple-200 text-sm">Expenses</span>
                    </div>
                    <div className="text-3xl font-bold">{actualExpenses.length}</div>
                    <div className="text-purple-200 text-sm mt-1">Total transactions</div>
                </div>

                <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp size={24} />
                        <span className="text-pink-200 text-sm">Average</span>
                    </div>
                    <div className="text-3xl font-bold">
                        ${(totalSpending / actualExpenses.length).toFixed(2)}
                    </div>
                    <div className="text-pink-200 text-sm mt-1">Per expense</div>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Users size={24} />
                        <span className="text-amber-200 text-sm">Categories</span>
                    </div>
                    <div className="text-3xl font-bold">{categoryData.length}</div>
                    <div className="text-amber-200 text-sm mt-1">Different types</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trend */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" />
                        Monthly Spending Trend
                    </h3>
                    <div className="h-[200px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickMargin={10} />
                                <YAxis tick={{ fontSize: 10 }} width={40} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                                    formatter={(value) => [`$${value}`, 'Amount']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    dot={{ fill: '#6366f1', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Spending by Category
                    </h3>
                    <div className="h-[200px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `$${value}`} contentStyle={{ fontSize: '12px' }} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Spenders */}
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Users size={20} className="text-purple-600" />
                        Top Spenders
                    </h3>
                    <div className="h-[200px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topSpenders}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickMargin={10} />
                                <YAxis tick={{ fontSize: 10 }} width={40} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                                    formatter={(value) => [`$${value}`, 'Total Spent']}
                                />
                                <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Category Details Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Category</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">% of Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryData.map((cat, index) => (
                                <tr key={cat.name} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-3 px-4 flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        <span className="text-sm text-gray-900">{cat.name}</span>
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm font-medium text-gray-900">
                                        ${cat.value.toFixed(2)}
                                    </td>
                                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                                        {((cat.value / totalSpending) * 100).toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
