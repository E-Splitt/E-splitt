import { db } from '../firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    addDoc
} from 'firebase/firestore';

// Collection references
const GROUPS_COLLECTION = 'groups';

// --- Group Operations ---

// Create a new group
export const createGroupInFirestore = async (groupData) => {
    try {
        const groupRef = doc(collection(db, GROUPS_COLLECTION));
        const newGroup = {
            ...groupData,
            id: groupRef.id, // Use Firestore ID
            createdAt: new Date().toISOString()
        };
        await setDoc(groupRef, newGroup);
        return newGroup;
    } catch (error) {
        console.error("Error creating group:", error);
        throw error;
    }
};

// Update an existing group (name, participants, expenses)
export const updateGroupInFirestore = async (groupId, data) => {
    try {
        const groupRef = doc(db, GROUPS_COLLECTION, groupId);
        await updateDoc(groupRef, data);
    } catch (error) {
        console.error("Error updating group:", error);
        throw error;
    }
};

// Delete a group
export const deleteGroupInFirestore = async (groupId) => {
    try {
        await deleteDoc(doc(db, GROUPS_COLLECTION, groupId));
    } catch (error) {
        console.error("Error deleting group:", error);
        throw error;
    }
};

// --- Real-time Listeners ---

// Listen to all groups (for the group selector)
// Note: In a real app with auth, we would query only groups the user belongs to.
// For this simple version, we'll listen to all groups or handle it via ID sharing.
export const subscribeToGroups = (callback) => {
    const q = query(collection(db, GROUPS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
        const groups = [];
        snapshot.forEach((doc) => {
            groups.push({ ...doc.data(), id: doc.id });
        });
        callback(groups);
    });
};

// Listen to a specific group's data (participants, expenses)
export const subscribeToGroupData = (groupId, callback) => {
    if (!groupId) return () => { };

    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    return onSnapshot(groupRef, (doc) => {
        if (doc.exists()) {
            callback({ ...doc.data(), id: doc.id });
        } else {
            callback(null);
        }
    });
};

// --- Import/Export ---

// Import a group from shared data
export const importGroupToFirestore = async (groupData) => {
    try {
        // Create a new document reference to get a new ID
        const groupRef = doc(collection(db, GROUPS_COLLECTION));

        // Prepare data with new ID but keeping content
        const newGroup = {
            ...groupData,
            id: groupRef.id,
            name: `${groupData.name} (Imported)`,
            importedAt: new Date().toISOString()
        };

        await setDoc(groupRef, newGroup);
        return newGroup;
    } catch (error) {
        console.error("Error importing group:", error);
        throw error;
    }
};
