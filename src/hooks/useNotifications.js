// hooks/useNotifications.js
// Drop this in your hooks/ folder.
// Use it anywhere in the affiliate-facing app to show a notification bell.
//
// Usage:
//   const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications(userId);

import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, onSnapshot,
  updateDoc, doc, writeBatch
} from 'firebase/firestore';

/**
 * @param {object} db     – Firestore instance
 * @param {string} userId – The current logged-in user's Firestore document ID
 */
export function useNotifications(db, userId) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!db || !userId) return;

    // Real-time listener – updates instantly when admin marks a payment
    const q = query(
      collection(db, 'Notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(
        snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    });

    return () => unsubscribe();
  }, [db, userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark a single notification as read
  const markAsRead = async (notificationId) => {
    if (!db) return;
    await updateDoc(doc(db, 'Notifications', notificationId), { read: true });
  };

  // Mark ALL notifications as read in a single batch write
  const markAllRead = async () => {
    if (!db) return;
    const unread = notifications.filter(n => !n.read);
    if (!unread.length) return;

    const batch = writeBatch(db);
    unread.forEach(n => batch.update(doc(db, 'Notifications', n.id), { read: true }));
    await batch.commit();
  };

  return { notifications, unreadCount, markAsRead, markAllRead };
}