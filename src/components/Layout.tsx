import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { 
  Home, 
  Calendar, 
  Rocket, 
  Mail, 
  Image as ImageIcon, 
  Bell,
  Briefcase,
  Map
} from "lucide-react";
import { cn } from "../lib/utils";

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
      active 
        ? "bg-zinc-100 text-zinc-900 font-medium" 
        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
    )}
  >
    <Icon size={20} />
    <span>{label}</span>
  </Link>
);

export const Layout: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/roadmap", icon: Map, label: "Roadmap" },
    { to: "/initiatives", icon: Rocket, label: "Iniciativas" },
    { to: "/projects", icon: Briefcase, label: "Proyectos" },
    { to: "/mailbox", icon: Mail, label: "Buzón" },
    { to: "/calendar", icon: Calendar, label: "Calendario" },
    { to: "/imagine", icon: ImageIcon, label: "Imagene V1" },
  ];

  return (
    <div className="flex h-screen bg-white text-zinc-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-100 flex flex-col p-4 bg-zinc-50/50">
        <div className="flex items-center gap-2 px-4 mb-8">
          <div className="bg-zinc-900 text-white px-3 py-1 rounded-xl font-normal text-xl tracking-tight">
            Imagene <span className="font-bold">Hub</span>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.to} 
              {...item} 
              active={location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to))} 
            />
          ))}
        </nav>

        <div className="mt-auto pt-8 flex justify-center">
          <img 
            src="sopra_logo.png" 
            alt="Sopra Steria Logo" 
            className="h-8 object-contain opacity-60 hover:opacity-100 transition-opacity"
            referrerPolicy="no-referrer"
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-bottom border-zinc-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold capitalize">
              {menuItems.find(i => i.to === location.pathname)?.label || "Imagine Hub"}
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-24 h-24 flex items-center justify-center overflow-hidden">
                <img 
                  src="aeroline.png" 
                  alt="User Avatar" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
