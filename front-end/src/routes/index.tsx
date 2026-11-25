// Tema visual do projeto (sobrescreve index.css, que é do template e fica somente leitura).
import '@/theme.css';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleProtectedRoute } from '@/components/RoleProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PublicHomePage } from '@/pages/Publico/PublicHomePage';
import { ProductionRequestPage } from '@/pages/Publico/ProductionRequestPage';
import { PrototypeRequestPage } from '@/pages/Publico/PrototypeRequestPage';
import { TrackRequestPage } from '@/pages/Publico/TrackRequestPage';
import { QueuePage } from '@/pages/Fila/QueuePage';
import { RequestDetailPage } from '@/pages/Fila/RequestDetailPage';
import { MachineDetailPage } from '@/pages/Maquinas/MachineDetailPage';
import { MachinesPage } from '@/pages/Maquinas/MachinesPage';
import { FilamentsPage } from '@/pages/Filamentos/FilamentsPage';
import { ItemsPage } from '@/pages/Itens/ItemsPage';
import { UsersPage } from '@/pages/Usuarios/UsersPage';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { ROUTES } from './constants';

export { ROUTES } from './constants';

const router = createBrowserRouter([
  { path: ROUTES.LOGIN, element: <LoginPage /> },
  // Público — solicitante sem login
  { path: ROUTES.SOLICITACAO, element: <PublicHomePage /> },
  { path: ROUTES.SOLICITACAO_PRODUCAO, element: <ProductionRequestPage /> },
  { path: ROUTES.SOLICITACAO_PROTOTIPAGEM, element: <PrototypeRequestPage /> },
  { path: ROUTES.ACOMPANHAR, element: <Navigate to={ROUTES.SOLICITACAO} replace /> },
  { path: ROUTES.ACOMPANHAR_CODIGO, element: <TrackRequestPage /> },
  // Painel — ADMIN / OPERATOR
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleProtectedRoute />,
        children: [
          {
            path: ROUTES.HOME,
            element: <MainLayout />,
            children: [
              { index: true, element: <Navigate to={ROUTES.FILA} replace /> },
              { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
              { path: ROUTES.FILA, element: <QueuePage /> },
              { path: ROUTES.FILA_DETALHE, element: <RequestDetailPage /> },
              { path: ROUTES.MAQUINAS, element: <MachinesPage /> },
              { path: ROUTES.MAQUINA_DETALHE, element: <MachineDetailPage /> },
              { path: ROUTES.FILAMENTOS, element: <FilamentsPage /> },
              { path: ROUTES.ITENS, element: <ItemsPage /> },
              { path: ROUTES.USUARIOS, element: <UsersPage /> },
              { path: ROUTES.NOT_FOUND, element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
