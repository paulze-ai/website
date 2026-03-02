import { Routes, Route, Navigate } from 'react-router-dom';
import Paulze from './paulze';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Paulze />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
