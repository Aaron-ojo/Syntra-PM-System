import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Teams from './pages/Teams'
import TeamDetails from './pages/TeamDetails'
import ProjectBoard from './pages/ProjectBoard'

function App() {
  return (
    <BrowserRouter>
      <div className="w-full max-w-full overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/team/:teamId" element={<TeamDetails />} />
          <Route path="/project/:projectId" element={<ProjectBoard />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App