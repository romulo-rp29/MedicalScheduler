import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  FileText,
  Search,
  User,
  Calendar,
  Clock,
  MoreVertical
} from "lucide-react";
import { format, formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function EvolutionsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  // Fetch all completed appointments with user filter if professional
  const { data: evolutions, isLoading } = useQuery({
    queryKey: ["/api/appointments", { 
      status: "completed", 
      professionalId: user?.role === "professional" ? user.professionalId : undefined,
      date: dateFilter || undefined
    }],
  });

  // Filter evolutions by search term
  const filteredEvolutions = evolutions?.filter((evolution: any) => {
    if (!searchTerm) return true;
    
    const searchTermLower = searchTerm.toLowerCase();
    return (
      evolution.patient.name.toLowerCase().includes(searchTermLower) ||
      (evolution.notes && evolution.notes.toLowerCase().includes(searchTermLower))
    );
  });

  const renderProcedureType = (type: string) => {
    switch (type) {
      case "consultation":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Consulta</Badge>;
      case "exam":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Exame</Badge>;
      case "procedure":
        return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Procedimento</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Atendimentos</h1>
          <p className="text-gray-500">Consulte e registre evoluções dos pacientes</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-1">
          <Input
            placeholder="Buscar por paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            icon={<Search className="h-4 w-4 text-gray-400" />}
          />
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="w-full md:w-auto">
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full md:w-auto"
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Evolução de Pacientes</h2>
        </div>

        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvolutions && filteredEvolutions.length > 0 ? (
                filteredEvolutions.map((evolution: any) => (
                  <TableRow key={evolution.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{evolution.patient.name}</p>
                          <p className="text-xs text-gray-500">
                            {evolution.patient.birthDate && formatDistance(
                              new Date(evolution.patient.birthDate),
                              new Date(),
                              { addSuffix: false, locale: ptBR }
                            ).replace(/aproximadamente |cerca de /, "")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <div>
                          <p className="font-medium">
                            {format(new Date(evolution.date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(evolution.date), "HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderProcedureType(evolution.procedure.type)}
                      <p className="text-xs mt-1">{evolution.procedure.name}</p>
                    </TableCell>
                    <TableCell>
                      <p>{evolution.professional.user.name}</p>
                      <p className="text-xs text-gray-500">{evolution.professional.specialty}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Concluído</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="default" asChild>
                          <Link href={`/evolutions/${evolution.id}`}>Ver Evolução</Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/patients/${evolution.patient.id}`}>Ver Paciente</Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    <div className="flex flex-col items-center justify-center py-6">
                      <FileText className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-1">Nenhum atendimento encontrado</p>
                      <p className="text-sm text-gray-400">
                        {searchTerm 
                          ? "Tente ajustar os filtros de busca" 
                          : "Não há registros de atendimentos para esta data"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
