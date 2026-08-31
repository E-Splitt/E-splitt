import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader, Check, Receipt, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getParticipantHue } from '../utils/colors';

const AddExpenseModal = ({ isOpen, onClose, onAdd, onEdit, participants, editExpense }) => {
    const isEditing = !!editExpense;

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    useEffect(() => {
        if (editExpense) {
            setDescription(editExpense.description);
            setAmount(editExpense.amount.toString());
            setPaidBy(editExpense.paidBy);

            const shareUserIds = Object.keys(editExpense.shares || {}).filter(id => editExpense.shares[id] > 0);
            setSelectedParticipants(shareUserIds);
        } else if (isOpen && participants.length > 0) {
            setPaidBy(participants[0].id);
            const uniqueIds = [...new Set(participants.map(p => p.id))];
            setSelectedParticipants(uniqueIds);
        }
    }, [editExpense, isOpen, participants]);

    // Clear errors when modal opens
    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setTouched({});
        }
    }, [isOpen]);

    // Real-time validation
    useEffect(() => {
        const newErrors = {};
        if (touched.description && !description.trim()) newErrors.description = 'Description is required';
        if (touched.amount) {
            const amt = parseFloat(amount);
            if (!amount) newErrors.amount = 'Amount is required';
            else if (isNaN(amt) || amt <= 0) newErrors.amount = 'Enter a valid amount';
        }
        if (touched.participants && selectedParticipants.length === 0) newErrors.participants = 'Select at least one person';
        setErrors(newErrors);
    }, [description, amount, selectedParticipants, touched]);

    const handleParticipantToggle = (userId) => {
        setTouched(prev => ({ ...prev, participants: true }));
        setSelectedParticipants(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const calculateShares = () => {
        const shares = {};
        const amountFloat = parseFloat(amount) || 0;
        const totalCents = Math.round(amountFloat * 100);
        const selected = selectedParticipants;

        if (selected.length > 0) {
            const baseShareCents = Math.floor(totalCents / selected.length);
            let remainderCents = totalCents % selected.length;
            
            // Distribute remainder pennies to first users
            selected.forEach(userId => {
                let shareCents = baseShareCents;
                if (remainderCents > 0) {
                    shareCents += 1;
                    remainderCents -= 1;
                }
                shares[userId] = shareCents / 100;
            });
        }

        return shares;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        // Validate all fields
        setTouched({ description: true, amount: true, participants: true });

        const amountFloat = parseFloat(amount);
        if (!description.trim() || isNaN(amountFloat) || amountFloat <= 0 || selectedParticipants.length === 0) {
            return;
        }

        const shares = calculateShares();

        const expenseData = {
            id: editExpense?.id || Date.now(),
            date: editExpense?.date || new Date().toLocaleDateString(),
            expenseDate: editExpense?.expenseDate || new Date().toISOString().split('T')[0],
            description,
            amount: amountFloat,
            paidBy,
            category: editExpense?.category || 'other',
            shares,
            isSettlement: false
        };

        try {
            setIsSubmitting(true);

            if (isEditing) {
                await onEdit(expenseData);
            } else {
                await onAdd(expenseData);
            }

            onClose();
            resetForm();
        } catch (error) {
            console.error('Error saving expense:', error);
            setErrors(prev => ({ ...prev, submit: 'Failed to save. Please try again.' }));
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setDescription('');
        setAmount('');
        setPaidBy('');
        setSelectedParticipants([]);
        setIsSubmitting(false);
        setErrors({});
        setTouched({});
    };

    if (!isOpen) return null;

    const tapLift = { whileTap: { scale: 0.98 } };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                  className="overlay"
                  onClick={onClose}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    className="modal"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <div className="modal-head">
                      <div className="modal-title">
                        <Receipt size={18} /> {isEditing ? 'Edit expense' : 'New expense'}
                      </div>
                      <motion.button className="icon-btn ghost" onClick={onClose} whileTap={{ scale: 0.9 }}>
                        <X size={18} />
                      </motion.button>
                    </div>

                    {errors.submit && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                            {errors.submit}
                        </div>
                    )}
                    
                    <label className="field-label">What was it for?</label>
                    <input className={`field ${errors.description && touched.description ? 'border-red-500' : ''}`} placeholder="e.g. Firewood" value={description} onChange={(e) => { setDescription(e.target.value); setTouched(prev => ({...prev, description: true})); }} />
                    {errors.description && touched.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}

                    <label className="field-label">Amount</label>
                    <input type="number" step="0.01" className={`field mono ${errors.amount && touched.amount ? 'border-red-500' : ''}`} placeholder="0.00" value={amount} onChange={(e) => { setAmount(e.target.value); setTouched(prev => ({...prev, amount: true})); }} />
                    {errors.amount && touched.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}

                    <label className="field-label">Paid by</label>
                    <div className="chip-row">
                      {participants.map((p, idx) => (
                        <motion.button
                          key={p.id}
                          className={`person-chip ${paidBy === p.id ? "selected" : ""}`}
                          onClick={() => setPaidBy(p.id)}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="avatar-chip" data-hue={getParticipantHue(idx)} style={{ width: 22, height: 22, fontSize: 10 }}>
                              {p.name.charAt(0).toUpperCase()}
                          </div>
                          {p.name}
                        </motion.button>
                      ))}
                    </div>

                    <label className="field-label">Split between</label>
                    <div className="chip-row">
                      {participants.map((p, idx) => (
                        <motion.button
                          key={p.id}
                          className={`person-chip ${selectedParticipants.includes(p.id) ? "selected" : ""}`}
                          onClick={() => handleParticipantToggle(p.id)}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="avatar-chip" data-hue={getParticipantHue(idx)} style={{ width: 22, height: 22, fontSize: 10 }}>
                              {p.name.charAt(0).toUpperCase()}
                          </div>
                          {p.name}
                          {selectedParticipants.includes(p.id) && <Check size={13} />}
                        </motion.button>
                      ))}
                    </div>
                    {errors.participants && touched.participants && <p className="text-red-500 text-xs mt-1">{errors.participants}</p>}

                    <motion.button 
                        className="add-btn full" 
                        onClick={handleSubmit} 
                        {...tapLift}
                        disabled={isSubmitting}
                        style={{ marginTop: 24 }}
                    >
                      {isSubmitting ? (
                          <><Loader size={16} className="animate-spin" /> Saving...</>
                      ) : (
                          <><Wallet size={16} /> {isEditing ? 'Save Changes' : 'Add to the tab'}</>
                      )}
                    </motion.button>
                  </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AddExpenseModal;
