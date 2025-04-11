import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  BarChart2, 
  ClipboardList, 
  Clock, 
  User,
  LogOut, 
  Menu,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ href, icon, children, active, onClick }: NavItemProps) {
  return (
    <Link href={href}>
      <div
        className={cn(
          "text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer",
          active && "bg-gray-100 text-gray-900"
        )}
        onClick={onClick}
      >
        <div className={cn(
          "text-gray-400 group-hover:text-gray-500 mr-3 h-6 w-6", 
          active && "text-gray-500"
        )}>
          {icon}
        </div>
        {children}
      </div>
    </Link>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const isActive = (path: string) => location === path;

  const sidebarContent = (
    <div className="flex flex-col h-0 flex-1">
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-primary">
        <div className="h-8 w-auto">
          <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="ml-3 text-white font-medium text-lg">Clínica Médica</h1>
      </div>
      
      {/* User Info */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <Avatar>
              <AvatarImage src="" alt={user.name} />
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {user.name}
              </p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                {user.role === 'admin' ? 'Administrador' : 
                 user.role === 'medico' ? 'Médico' : 
                 user.role === 'recepcionista' ? 'Recepcionista' : 'Usuário'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 bg-white space-y-1 overflow-y-auto">
        {/* Admin Navigation */}
        {user.role === 'admin' && (
          <>
            <NavItem href="/dashboard" icon={<LayoutDashboard />} active={isActive("/dashboard") || isActive("/")} onClick={() => setOpen(false)}>
              Dashboard
            </NavItem>
            <NavItem href="/users" icon={<Users />} active={isActive("/users")} onClick={() => setOpen(false)}>
              Usuários
            </NavItem>
            <NavItem href="/professionals" icon={<Users />} active={isActive("/professionals")} onClick={() => setOpen(false)}>
              Profissionais
            </NavItem>
            <NavItem href="/patients" icon={<Users />} active={isActive("/patients")} onClick={() => setOpen(false)}>
              Pacientes
            </NavItem>
            <NavItem href="/procedures" icon={<FileText />} active={isActive("/procedures")} onClick={() => setOpen(false)}>
              Procedimentos
            </NavItem>
            <NavItem href="/appointments" icon={<Calendar />} active={isActive("/appointments")} onClick={() => setOpen(false)}>
              Agendamentos
            </NavItem>
            {/* Módulo financeiro temporariamente desativado 
            <NavItem href="/financial" icon={<BarChart2 />} active={isActive("/financial")} onClick={() => setOpen(false)}>
              Financeiro
            </NavItem>
            */}
          </>
        )}
        
        {/* Médico Navigation */}
        {user.role === 'medico' && (
          <>
            <NavItem 
              href="/doctors/dashboard" 
              icon={<LayoutDashboard />} 
              active={isActive("/doctors/dashboard") || isActive("/dashboard") || isActive("/")} 
              onClick={() => setOpen(false)}
            >
              Dashboard
            </NavItem>
            <NavItem 
              href="/waiting-queue" 
              icon={<Clock />} 
              active={isActive("/waiting-queue")} 
              onClick={() => setOpen(false)}
            >
              Fila de Espera
            </NavItem>
            <NavItem 
              href="/appointments" 
              icon={<Calendar />} 
              active={isActive("/appointments")} 
              onClick={() => setOpen(false)}
            >
              Agendamentos
            </NavItem>
            <NavItem 
              href="/patients" 
              icon={<Users />} 
              active={isActive("/patients") || location.startsWith("/doctors/patient/")} 
              onClick={() => setOpen(false)}
            >
              Pacientes
            </NavItem>
            <NavItem 
              href="/medical-records" 
              icon={<FileText />} 
              active={isActive("/medical-records") || location.startsWith("/doctors/medical-record/")} 
              onClick={() => setOpen(false)}
            >
              Prontuários
            </NavItem>
            {/* Módulo financeiro temporariamente desativado 
            <NavItem 
              href="/financial" 
              icon={<BarChart2 />} 
              active={isActive("/financial")} 
              onClick={() => setOpen(false)}
            >
              Financeiro
            </NavItem>
            */}
          </>
        )}
        
        {/* Recepcionista Navigation */}
        {user.role === 'recepcionista' && (
          <>
            <NavItem href="/dashboard" icon={<LayoutDashboard />} active={isActive("/dashboard") || isActive("/")} onClick={() => setOpen(false)}>
              Dashboard
            </NavItem>
            <NavItem href="/appointments" icon={<Calendar />} active={isActive("/appointments")} onClick={() => setOpen(false)}>
              Agendamentos
            </NavItem>
            <NavItem href="/patients" icon={<Users />} active={isActive("/patients")} onClick={() => setOpen(false)}>
              Pacientes
            </NavItem>
            <NavItem href="/waiting-queue" icon={<Clock />} active={isActive("/waiting-queue")} onClick={() => setOpen(false)}>
              Fila de Espera
            </NavItem>
          </>
        )}
        
        {/* Common Navigation */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <NavItem href="/profile" icon={<User />} active={isActive("/profile")} onClick={() => setOpen(false)}>
            Meu Perfil
          </NavItem>
          <button 
            className="w-full text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            onClick={() => {
              logout();
              setOpen(false);
            }}
          >
            <LogOut className="text-gray-400 group-hover:text-gray-500 mr-3 h-6 w-6" />
            Sair
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none absolute top-0 left-0 z-10">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r border-gray-200">
          {sidebarContent}
        </div>
      </aside>
    </>
  );
}
