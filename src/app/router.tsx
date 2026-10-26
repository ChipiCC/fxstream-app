import { createBrowserRouter, RouterProvider } from 'react-router';

import { AppShell } from './layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PairPage } from './pages/PairPage';
import { RouteErrorPage } from './pages/RouteErrorPage';
import { StatusPage } from './pages/StatusPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'pair/:base/:quote', element: <PairPage /> },
      { path: 'status', element: <StatusPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
