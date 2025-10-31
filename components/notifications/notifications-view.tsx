"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  CheckCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/auth-context";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  created_at: string;
}

type PostgresPayload<T> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: T;
};

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data: Notification[] = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        toast({
          title: "Error",
          description: "Failed to fetch notifications!",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    const token = localStorage.getItem("token");
    if (!token) return;

    const channel = supabase
      .channel("realtime:notifications")
      .on<PostgresPayload<Notification>>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new) {
            setNotifications((prev) => [...prev, payload.new as Notification]);
          }
        }
      )
      .on<PostgresPayload<Notification>>(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.old) {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== (payload.old as Notification).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_read: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, is_read: true } : notif
          )
        );
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );
        toast({
          title: "Success",
          description: "Notification deleted",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((n) => !n.is_read);
    for (const notification of unreadNotifications) {
      await markAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#059669]" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#FFB84D]" />;
      case "error":
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#DC2626]" />;
      default:
        return <Info className="h-4 w-4 sm:h-5 sm:w-5 text-[#2563EB]" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case "success":
        return "default";
      case "warning":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:items-center">
          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-[#FF8A5B]" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs sm:ml-2">
                  {unreadCount}
                </Badge>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Stay updated with your latest activities and updates
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4">
          {[...Array(3)].map((_, i) => (
            <Card
              key={i}
              className="rounded-xl sm:rounded-2xl bg-[#FBEAE4] border border-zinc-100 shadow-sm"
            >
              <CardContent className="p-3 sm:p-4">
                <div className="h-4 sm:h-6 bg-zinc-200 rounded w-3/4 animate-pulse mb-1.5 sm:mb-2"></div>
                <div className="h-3 sm:h-4 bg-zinc-200 rounded w-1/2 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:items-center">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-[#FF8A5B]" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs sm:ml-2">
                {unreadCount}
              </Badge>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Stay updated with your latest activities and updates
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto border-[#FF8A5B] text-[#FF8A5B] hover:bg-[#FFF2EF] flex items-center gap-1.5 text-xs sm:text-sm h-8 sm:h-10 px-2 sm:px-3"
          >
            <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="sm:hidden">Mark All</span>
            <span className="hidden sm:inline">Mark All as Read</span>
          </Button>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-all rounded-xl sm:rounded-2xl border border-zinc-200 shadow-md ${
                !notification.is_read
                  ? "border-l-4 border-l-[#FF8A5B] bg-[#FFF7F3]"
                  : "bg-white"
              }`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                    <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <h4 className="text-sm font-medium text-zinc-900 break-words">
                          {notification.title}
                        </h4>
                        <Badge
                          variant={getNotificationBadgeVariant(
                            notification.type
                          )}
                          className="capitalize text-xs sm:text-sm px-1.5 sm:px-2.5 py-0.5 sm:py-1"
                        >
                          {notification.type}
                        </Badge>
                        {!notification.is_read && (
                          <Badge
                            variant="outline"
                            className="text-[8px] sm:text-xs px-1 py-0 sm:px-1.5 sm:py-0.5"
                          >
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-600 break-words line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] sm:text-xs text-zinc-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification.id)}
                        className="h-7 w-7 sm:h-8 sm:w-8 text-[#FF8A5B] hover:bg-[#FFF2EF]"
                        aria-label="Mark as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteNotification(notification.id)}
                      className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-600 hover:bg-zinc-50"
                      aria-label="Delete notification"
                    >
                      <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl sm:rounded-2xl border border-zinc-100 bg-white shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
              <Bell className="h-8 w-8 sm:h-12 sm:w-12 text-[#FF8A5B] mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2 text-zinc-900">
                No notifications
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 text-center">
                You're all caught up! New notifications will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
