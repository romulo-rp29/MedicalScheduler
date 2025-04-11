import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { User, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

export default function WaitingRoom() {
  const { data: queue, isLoading } = useQuery({
    queryKey: ["/api/queue"],
    staleTime: 30000, // 30 seconds
  });

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

  const formatWaitingTime = (waitingSince: string) => {
    if (!waitingSince) return "Não chegou";
    return formatDistanceToNow(new Date(waitingSince), { 
      addSuffix: false, 
      locale: ptBR 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const waitingPatients = queue?.filter((appointment: any) => 
    appointment.status === "confirmed" || appointment.status === "in_progress"
  ).slice(0, 4);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-md font-medium text-gray-700">Sala de Espera</h2>
      </div>
      <div className="p-4 space-y-3">
        {waitingPatients && waitingPatients.length > 0 ? (
          waitingPatients.map((patient: any) => (
            <div 
              key={patient.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{patient.patient.name}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>
                      {patient.status === "in_progress" 
                        ? "Em atendimento" 
                        : `Aguardando há ${formatWaitingTime(patient.waitingSince)}`}
                    </span>
                  </div>
                </div>
              </div>
              {renderProcedureTypeBadge(patient.procedure.type)}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            Nenhum paciente na sala de espera
          </div>
        )}
        
        <Button className="w-full mt-4" asChild>
          <Link href="/queue">Ver Fila Completa</Link>
        </Button>
      </div>
    </div>
  );
}
