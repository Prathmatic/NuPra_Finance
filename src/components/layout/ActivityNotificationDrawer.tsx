import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { 
  X, 
  Bell, 
  CheckCheck, 
  Trash2, 
  CalendarCheck, 
  ArrowUpRight, 
  Target, 
  TrendingUp, 
  HandCoins,
  Clock
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { ActivityNotification } from '../../types/finance';

interface ActivityNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityNotificationDrawer: React.FC<ActivityNotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearNotifications,
    setActiveTab 
  } = useFinance();

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTimestamp = (isoString: string) => {
    try {
      const now = new Date();
      const date = new Date(isoString);
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  const getTypeIcon = (type: ActivityNotification['type']) => {
    switch (type) {
      case 'bill':
        return <CalendarCheck className="w-4 h-4 text-orange-400" />;
      case 'goal':
        return <Target className="w-4 h-4 text-emerald-400" />;
      case 'stock':
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      case 'settlement':
        return <HandCoins className="w-4 h-4 text-teal-400" />;
      case 'transaction':
      default:
        return <ArrowUpRight className="w-4 h-4 text-indigo-400" />;
    }
  };

  const handleNotificationClick = (notif: ActivityNotification) => {
    markNotificationAsRead(notif.id);
    if (notif.linkTab) {
      setActiveTab(notif.linkTab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm glass-panel bg-slate-900 border border-white/15 rounded-3xl p-4 shadow-2xl space-y-3.5 max-h-[85vh] flex flex-col mt-14 mr-1 sm:mr-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <span>Partner Activity</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black">
                    {unreadCount} new
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400">Collaborative updates & logs</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all text-xs"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1 -mr-1">
          {notifications.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-slate-500">
                <Bell className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-slate-300">No recent notifications</p>
              <p className="text-[11px] text-slate-500">When you or your partner record expenses or bills, updates show here.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  !notif.read
                    ? 'bg-indigo-950/40 border-indigo-500/40 hover:bg-indigo-950/60'
                    : 'bg-white/5 border-white/5 hover:border-white/15'
                }`}
              >
                <div className="relative mt-0.5 shrink-0">
                  <UserAvatar src={notif.actorAvatar} name={notif.actorName} size="sm" />
                  <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-900 ring-1 ring-white/10">
                    {getTypeIcon(notif.type)}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs font-bold truncate ${!notif.read ? 'text-white' : 'text-slate-300'}`}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatTimestamp(notif.timestamp)}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                    {notif.message}
                  </p>
                </div>

                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
