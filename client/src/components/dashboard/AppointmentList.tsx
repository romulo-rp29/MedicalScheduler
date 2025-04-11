import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MoreVertical, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function AppointmentList() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["/api/appointments"],
    staleTime: 60000, // 1 minute
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "HH:mm", { locale: ptBR });
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MMM/yyyy", { locale: ptBR });
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Agendado
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Confirmado
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Em Atendimento
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            Concluído
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Cancelado
          </span>
        );
      case "no_show":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Não Compareceu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Aguardando
          </span>
        );
    }
  };

  const renderProcedureTypeBadge = (type: string) => {
    switch (type) {
      case "consultation":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Consulta
          </span>
        );
      case "exam":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Exame
          </span>
        );
      case "procedure":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            Procedimento
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Outro
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-md font-medium text-gray-700">Próximos Atendimentos</h2>
        <Button variant="link" size="sm" asChild>
          <Link href="/appointments">Ver Todos</Link>
        </Button>
      </div>
      <div className="p-4">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Horário</th>
              <th>Tipo</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {appointments && appointments.length > 0 ? (
              appointments.slice(0, 5).map((appointment: any) => (
                <tr key={appointment.id} className="hover:bg-gray-50 transition-all">
                  <td>
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{appointment.patient.name}</p>
                        <p className="text-xs text-gray-500">
                          {appointment.patient.birthDate && 
                            `${formatDistanceToNow(new Date(appointment.patient.birthDate), 
                              { addSuffix: true, locale: ptBR })
                              .replace("há ", "")
                              .replace(" anos", " anos")}`}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="text-sm">{formatDate(appointment.date)}</p>
                      <p className="text-xs text-gray-500">{formatFullDate(appointment.date)}</p>
                    </div>
                  </td>
                  <td>
                    {renderProcedureTypeBadge(appointment.procedure.type)}
                  </td>
                  <td>
                    {renderStatusBadge(appointment.status)}
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/appointments/${appointment.id}`}>
                            Ver Detalhes
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/patients/${appointment.patient.id}`}>
                            Ver Paciente
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  Nenhum atendimento agendado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
