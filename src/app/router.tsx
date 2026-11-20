import { Navigate, Route, Routes } from 'react-router-dom';
import { GalleryPage } from '../features/gallery/GalleryPage';
import { AppShellLayout } from '../features/layout/AppShellLayout';
import { PipelinePage } from '../features/pipeline/PipelinePage';
import { SettingsPage } from '../features/settings/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShellLayout />}>
        <Route path="/" element={<Navigate to="/pipeline" replace />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/pipeline" replace />} />
      </Route>
    </Routes>
  );
}
