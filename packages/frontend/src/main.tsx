import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import './styles.css';
import { ToastProvider } from './lib/toast';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectLayout } from './pages/ProjectLayout';
import { DefinitionPhase } from './features/definition/DefinitionPhase';
import { ResearchPhase } from './features/research/ResearchPhase';
import { AnalysisPhase } from './features/analysis/AnalysisPhase';
import { BlueprintsPhase } from './features/blueprints/BlueprintsPhase';

const router = createBrowserRouter([
  { path: '/', element: <ProjectsPage /> },
  {
    path: '/projects/:projectId',
    element: <ProjectLayout />,
    children: [
      { index: true, element: <Navigate to="definition" replace /> },
      { path: 'definition', element: <DefinitionPhase /> },
      { path: 'research', element: <ResearchPhase /> },
      { path: 'analysis', element: <AnalysisPhase /> },
      { path: 'blueprints', element: <BlueprintsPhase /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>,
);
