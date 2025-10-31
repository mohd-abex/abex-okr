"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { NotificationsView } from "@/components/notifications/notifications-view";

export default function NotificationsPage() {
  return (
    <MainLayout>
      <NotificationsView />
    </MainLayout>
  );
}
