import { Outlet } from "react-router-dom"
import Navbar from "../components/Navbar"

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-navy-50 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
