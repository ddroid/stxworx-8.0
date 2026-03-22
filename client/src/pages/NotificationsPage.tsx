import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, Briefcase, CheckCircle2, ChevronLeft, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as Shared from '../shared';
import {
  clearNotifications,
  formatRelativeTime,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
} from '../lib/api';

function getNotificationMeta(type: ApiNotification['type']) {
  switch (type) {
    case 'proposal_received':
      return { icon: Briefcase, color: 'bg-accent-orange' };
    case 'proposal_accepted':
      return { icon: CheckCircle2, color: 'bg-accent-blue' };
    case 'milestone_submitted':
      return { icon: Bell, color: 'bg-accent-red' };
    case 'milestone_approved':
      return { icon: ShoppingBag, color: 'bg-accent-cyan' };
    case 'milestone_rejected':
    case 'dispute_filed':
    case 'dispute_resolved':
      return { icon: AlertTriangle, color: 'bg-accent-red' };
    case 'project_completed':
      return { icon: CheckCircle2, color: 'bg-accent-cyan' };
    default:
      return { icon: Bell, color: 'bg-ink/20' };
  }
}

export const NotificationsPage = () => {
  const { isSignedIn } = Shared.useWallet();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!isSignedIn) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await getNotifications();
      setNotifications(rows);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, isRead: true })));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const handleOpenNotification = async (notification: ApiNotification) => {
    if (notification.isRead) {
      return;
    }

    try {
      await markNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((entry) => (entry.id === notification.id ? { ...entry, isRead: true } : entry)),
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px]">
      <div className="container-custom max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-10 h-10 bg-surface border border-border rounded-full flex items-center justify-center text-muted hover:text-ink hover:border-ink transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter">Notifications</h1>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <button onClick={handleMarkAllRead} className="text-xs font-bold text-accent-orange hover:underline">Mark all as read</button>
            <button onClick={handleClearAll} className="text-xs font-bold text-muted hover:text-ink">Clear all</button>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-[15px] overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-muted">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-sm text-muted">No notifications yet.</div>
          ) : (
            notifications.map((notification) => {
              const meta = getNotificationMeta(notification.type);
              const Icon = meta.icon;

              return (
                <button
                  key={notification.id}
                  onClick={() => handleOpenNotification(notification)}
                  className={`w-full text-left p-4 sm:p-6 flex items-start gap-4 sm:gap-6 border-b border-border/50 last:border-0 transition-colors hover:bg-ink/5 ${notification.isRead ? '' : 'bg-ink/5'}`}
                >
                  <div className={`w-12 h-12 rounded-[15px] ${meta.color} flex items-center justify-center text-bg shrink-0`}>
                    <Icon size={20} className={meta.color === 'bg-ink/20' ? 'text-ink' : ''} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                      <h3 className={`text-base ${notification.isRead ? 'font-bold' : 'font-black'}`}>{notification.title}</h3>
                      <span className="text-[10px] text-muted font-bold whitespace-nowrap">{formatRelativeTime(notification.createdAt)}</span>
                    </div>
                    <p className={`text-sm ${notification.isRead ? 'text-muted' : 'text-ink'}`}>{notification.message}</p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-3 h-3 bg-accent-orange rounded-full mt-2 shrink-0"></div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
