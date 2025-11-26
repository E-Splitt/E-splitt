import { ShoppingCart, Utensils, Car, Home, Plane, Film, Gift, Heart, Briefcase, MoreHorizontal } from 'lucide-react';

export const categories = [
    { id: 'food', name: 'Food & Dining', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
    { id: 'groceries', name: 'Groceries', icon: ShoppingCart, color: 'bg-green-100 text-green-600' },
    { id: 'transport', name: 'Transport', icon: Car, color: 'bg-blue-100 text-blue-600' },
    { id: 'home', name: 'Home & Utilities', icon: Home, color: 'bg-purple-100 text-purple-600' },
    { id: 'travel', name: 'Travel', icon: Plane, color: 'bg-cyan-100 text-cyan-600' },
    { id: 'entertainment', name: 'Entertainment', icon: Film, color: 'bg-pink-100 text-pink-600' },
    { id: 'gifts', name: 'Gifts', icon: Gift, color: 'bg-red-100 text-red-600' },
    { id: 'health', name: 'Health', icon: Heart, color: 'bg-rose-100 text-rose-600' },
    { id: 'work', name: 'Work', icon: Briefcase, color: 'bg-indigo-100 text-indigo-600' },
    { id: 'other', name: 'Other', icon: MoreHorizontal, color: 'bg-gray-100 text-gray-600' },
];

export const getCategoryById = (id) => {
    return categories.find(cat => cat.id === id) || categories[categories.length - 1];
};
