import { ViteReactSSG } from 'vite-react-ssg'
import { Navigate } from 'react-router-dom'
import Paulze from './paulze'

export const createRoot = ViteReactSSG({
  routes: [
    { path: '/', element: <Paulze /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
})
