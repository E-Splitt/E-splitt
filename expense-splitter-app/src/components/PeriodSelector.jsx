import React, { useState } from 'react';
import { Calendar, ChevronDown, Check, Plus } from 'lucide-react';

const PeriodSelector = ({
    periods = [],
    currentPeriod,
    onSelectPeriod
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const formatPeriodDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatPeriodDisplay = (period) => {
        const startDate = formatPeriodDate(period.start_date);
        const endDate = period.end_date ? formatPeriodDate(period.end_date) : 'Present';
        const status = period.status === 'active' ? '(Active)' : '(Settled)';
        return `${startDate} - ${endDate} ${status}`;
    };

    const activePeriod = periods.find(p => p.id === currentPeriod);

    return (
        <div className="relative">
            {/* Selector Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="group-pill"
            >
                <span className="truncate max-w-[200px]">
                    {activePeriod ? activePeriod.name || formatPeriodDisplay(activePeriod) : 'Select Period'}
                </span>
                <ChevronDown
                    size={14}
                    className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-muted)' }}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-full rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto themed-card">
                        {/* Active Period Section */}
                        <div className="p-2" style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                            <div className="text-xs font-semibold uppercase px-2 py-1" style={{ color: 'var(--text-muted)' }}>
                                Current Period
                            </div>
                            {periods.filter(p => p.status === 'active').map(period => (
                                <button
                                    key={period.id}
                                    onClick={() => {
                                        onSelectPeriod(period.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between"
                                    style={{
                                        backgroundColor: currentPeriod === period.id ? 'var(--bg-card-hover)' : 'transparent',
                                    }}
                                >
                                    <div>
                                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {period.name}
                                        </div>
                                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                            {formatPeriodDisplay(period)}
                                        </div>
                                    </div>
                                    {currentPeriod === period.id && (
                                        <Check size={16} style={{ color: 'var(--accent-indigo)' }} />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Closed Periods Section */}
                        {periods.filter(p => p.status === 'closed').length > 0 && (
                            <div className="p-2">
                                <div className="text-xs font-semibold uppercase px-2 py-1" style={{ color: 'var(--text-muted)' }}>
                                    Past Periods
                                </div>
                                {periods.filter(p => p.status === 'closed').map(period => (
                                    <button
                                        key={period.id}
                                        onClick={() => {
                                            onSelectPeriod(period.id);
                                            setIsOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between"
                                        style={{
                                            backgroundColor: currentPeriod === period.id ? 'var(--bg-card-hover)' : 'transparent',
                                        }}
                                    >
                                        <div>
                                            <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                {period.name}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {formatPeriodDisplay(period)}
                                            </div>
                                        </div>
                                        {currentPeriod === period.id && (
                                            <Check size={16} style={{ color: 'var(--text-secondary)' }} />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PeriodSelector;
