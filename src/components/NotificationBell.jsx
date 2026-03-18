// components/NotificationBell.jsx
// Place this in your affiliate-facing navbar.
//
// Usage:
//   import NotificationBell from './components/NotificationBell';
//   <NotificationBell db={db} userId={currentUser.uid} />

import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, DollarSign, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell({ db, userId }) {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications(db, userId);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = () => {
    setOpen(prev => !prev);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  };

  const formatTime = (createdAt) => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <span className="font-semibold text-gray-800">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-green-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${!n.read ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <DollarSign className={`w-3.5 h-3.5 ${!n.read ? 'text-green-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}