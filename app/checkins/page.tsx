import CheckinsView from "@/components/checkins/checkins-view";
import { MainLayout } from "@/components/layout/main-layout";
import React from "react";

function page() {
  return (
    <MainLayout>
      <CheckinsView />
    </MainLayout>
  );
}

export default page;
