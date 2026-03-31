"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: number;
  type: string;
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeIcon(type: string) {
  switch (type) {
    case "answer":
      return "A";
    case "comment":
      return "C";
    case "mention":
      return "@";
    default:
      return "N";
  }
}

function typeColor(type: string) {
  switch (type) {
    case "answer":
      return "bg-[#2f6f44] text-white";
    case "comment":
      return "bg-[#0074cc] text-white";
    case "mention":
      return "bg-[#f48225] text-white";
    default:
      return "bg-[#6a737c] text-white";
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function fetchNotifications() {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  }

  async function handleOpen() {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      await fetch("/api/notifications/read", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  function handleClick(notification: Notification) {
    setOpen(false);
    router.push(notification.link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-[33px] h-[33px] flex items-center justify-center text-[#525960] hover:bg-[#e3e6e8] rounded-[3px]"
        title="Notifications"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="currentColor"
        >
          <path d="M15 13.5V14H3v-.5l1.5-1.5v-4a4.5 4.5 0 013.27-4.327A1.5 1.5 0 019 2a1.5 1.5 0 011.23 1.673A4.5 4.5 0 0113.5 8v4l1.5 1.5zM10.5 14.5a1.5 1.5 0 01-3 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center bg-[#f48225] text-white text-[10px] font-bold rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-[50px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-[360px] bg-white border border-[#d6d9dc] rounded-[4px] shadow-lg z-50 max-h-[400px] overflow-y-auto">
          <div className="px-3 py-2 border-b border-[#e3e6e8] text-[13px] font-bold text-[#232629]">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-[13px] text-[#838c95]">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 border-b border-[#f1f2f3] hover:bg-[#f1f2f3] transition-colors ${
                  !n.read ? "bg-[#f0f8ff]" : ""
                }`}
              >
                <span
                  className={`shrink-0 w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold mt-0.5 ${typeColor(n.type)}`}
                >
                  {typeIcon(n.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#232629] leading-[1.4]">
                    {n.message}
                  </div>
                  <div className="text-[11px] text-[#9199a1] mt-0.5">
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.read && (
                  <span className="shrink-0 w-2 h-2 bg-[#0074cc] rounded-full mt-1.5" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
