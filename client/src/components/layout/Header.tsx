import { useLocation } from "wouter";
import { Search, Bell } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");

  const getPageTitle = (path: string) => {
    if (path === "/") return "Dashboard";
    if (path.startsWith("/patients")) return "Pacientes";
    if (path.startsWith("/appointments")) return "Agenda";
    if (path.startsWith("/queue")) return "Fila de Espera";
    if (path.startsWith("/evolutions")) return "Atendimentos";
    if (path.startsWith("/procedures")) return "Procedimentos";
    if (path.startsWith("/financial")) return "Financeiro";
    if (path.startsWith("/users")) return "Usuários";
    return "Clínica Médica";
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 py-3 sm:px-6 flex items-center justify-between">
        <h1 className="text-lg font-medium text-gray-900">{getPageTitle(location)}</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
            <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          <button className="relative p-1 text-gray-500 hover:text-primary-600 focus:outline-none transition-all">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">2</span>
          </button>
        </div>
      </div>
    </header>
  );
}
