import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Clock, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { petAdoptionService } from '../../services/PetAdoptionService.js';
import type { AdopterNotification } from '../../domain/petEntities.js';
import { ROUTES } from '../../config/constants.js';

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdopterNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = petAdoptionService.subscribeToNotifications(
      user.uid,
      (notifs) => {
        setNotifications(notifs);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (notifId: string) => {
    if (!user?.uid) return;
    try {
      await petAdoptionService.markNotificationRead(user.uid, notifId);
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.uid) return;
    try {
      await petAdoptionService.markAllNotificationsRead(user.uid);
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#E7DEDF] bg-white text-[#6B5B61] transition-colors hover:bg-[#FAF7F2] hover:text-[#231A1D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B1E3A]"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#7B1E3A] px-1 text-[11px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#E7DEDF] bg-white shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-[#E7DEDF] bg-[#FAF7F2] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-serif text-base font-bold text-[#231A1D]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-[#F3E3E8] px-2 py-0.5 text-xs font-semibold text-[#7B1E3A]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[#7B1E3A] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-[#E7DEDF]/50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#6B5B61]">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3.5 transition-colors ${
                    notif.read ? 'bg-white' : 'bg-[#FAF7F2]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-[#231A1D] leading-relaxed">
                      {notif.message}
                    </p>
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-[#6B5B61] hover:text-[#7B1E3A] p-1 rounded-sm"
                        title="Mark as read"
                        aria-label="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#6B5B61]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Link
                      to={
                        notif.id.startsWith('interest_') ||
                        notif.id.startsWith('mod_') ||
                        notif.id.startsWith('autohide_') ||
                        notif.id.startsWith('inactivity_reminder_') ||
                        notif.id.startsWith('report_removed_')
                          ? ROUTES.MY_LISTINGS
                          : ROUTES.MY_ADOPTIONS
                      }
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-0.5 font-medium text-[#7B1E3A] hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
