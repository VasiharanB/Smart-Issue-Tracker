import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { AdminLayout } from "./layouts/AdminLayout";
import { DashboardOverview } from "./pages/admin/DashboardOverview";
import { TicketsPage } from "./pages/admin/TicketsPage";
import { HistoryPage } from "./pages/admin/HistoryPage";
import { CategoriesPage } from "./pages/admin/CategoriesPage";
import { SettingsPage } from "./pages/admin/SettingsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: DashboardOverview },
      { path: "tickets", Component: TicketsPage },
      { path: "history", Component: HistoryPage },
      { path: "categories", Component: CategoriesPage },
      { path: "settings", Component: SettingsPage },
    ],
  },
]);
