import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ChevronLeft, User, History, FileText, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import EvolutionForm from "@/components/evolution/EvolutionForm";

interface EvolutionDetailsPageProps {
  id: number;
}

export default function EvolutionDetailsPage({ id }: EvolutionDetailsPageProps) {
  const { user } = useAuth();
  const [existingEvolution, setExistingEvolution] = useState<boolean>(false);
  
  // Fetch appointment details
  const { data: appointment, isLoading: isLoadingAppointment } = useQuery({
    queryKey: ["/api/appointments", id],
    enabled: !!id,
  });

  // Check if evolution already exists
  const { data: patientEvolutions, isLoading: isLoadingEvolutions } = useQuery({
    queryKey: ["/api/evolutions/patient", appointment?.patient?.id],
    enabled: !!appointment?.patient?.id,
  });

  useEffect(() => {
    // Check if this appointment already has an evolution
    if (patientEvolutions && patientEvolutions.length > 0) {
      const evolution = patientEvolutions.find(
        (ev: any) => ev.appointmentId === Number(id)
      );
      if (evolution) {
        setExistingEvolution(true);
      }
    }
  }, [patientEvolutions, id]);

  const isLoading = isLoadingAppointment || isLoadingEvolutions;
  
  const canEditEvolution = user?.role === "professional" || user?.role === "administrator";

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Atendimento não encontrado</h2>
        <p className="text-gray-500 mb-4">
          O atendimento que você está procurando não existe ou foi removido.
        </p>
        <Button asChild>
          <Link href="/evolutions">Voltar para atendimentos</Link>
        </Button>
      </div>
    );
  }

  // Find the evolution for this appointment if it exists
  const evolution = patientEvolutions?.find(
    (ev: any) => ev.appointmentId === Number(id)
  );

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link href="/evolutions">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">
            {existingEvolution || evolution
              ? "Detalhes da Evolução"
              : "Nova Evolução do Paciente"}
          </h1>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Documentos
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Evolução do Paciente</h2>
            <div className="mt-1 flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-2">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{appointment.patient.name}</p>
                <p className="text-xs text-gray-500">
                  {appointment.patient.birthDate && 
                    `${format(new Date(appointment.patient.birthDate), "dd/MM/yyyy", { locale: ptBR })} - ${appointment.procedure.name} (${formatDate(appointment.date)})`}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Info & Form */}
            <div className="lg:col-span-2">
              {(canEditEvolution && appointment.status === "in_progress" && !existingEvolution && !evolution) ? (
                <EvolutionForm
                  appointmentId={Number(id)}
                  patientData={appointment.patient}
                />
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Tipo de Atendimento</h3>
                      <div className="p-2 bg-gray-50 rounded-md">
                        {appointment.procedure.type === "consultation" ? "Consulta" : 
                         appointment.procedure.type === "exam" ? "Exame" : "Procedimento"}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Data do Atendimento</h3>
                      <div className="p-2 bg-gray-50 rounded-md">
                        {formatDate(appointment.date)} às {formatTime(appointment.date)}
                      </div>
                    </div>
                  </div>
                  
                  {evolution ? (
                    <>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Anamnese</h3>
                        <div className="p-3 bg-gray-50 rounded-md">
                          {evolution.anamnesis}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Diagnóstico</h3>
                        <div className="p-3 bg-gray-50 rounded-md">
                          {evolution.diagnosis}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Prescrição</h3>
                        <div className="p-3 bg-gray-50 rounded-md whitespace-pre-line">
                          {evolution.prescription || "Nenhuma prescrição registrada"}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Exames Solicitados</h3>
                          <div className="p-3 bg-gray-50 rounded-md min-h-[100px]">
                            {evolution.exams && evolution.exams.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {evolution.exams.map((exam: string, index: number) => (
                                  <Badge key={index} variant="outline" className="bg-purple-50">
                                    {exam}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500">Nenhum exame solicitado</p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Procedimentos Realizados</h3>
                          <div className="p-3 bg-gray-50 rounded-md min-h-[100px]">
                            {evolution.procedures && evolution.procedures.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {evolution.procedures.map((procedure: string, index: number) => (
                                  <Badge key={index} variant="outline" className="bg-indigo-50">
                                    {procedure}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500">Nenhum procedimento realizado</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Recomendações</h3>
                        <div className="p-3 bg-gray-50 rounded-md whitespace-pre-line">
                          {evolution.recommendations || "Nenhuma recomendação registrada"}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <FileText className="h-16 w-16 text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-700 mb-2">Sem Evolução Registrada</h3>
                      <p className="text-gray-500 mb-4 text-center max-w-md">
                        Este atendimento ainda não possui uma evolução registrada.
                        {canEditEvolution && appointment.status !== "in_progress" && (
                          " O atendimento precisa estar 'Em andamento' para registrar uma evolução."
                        )}
                      </p>
                      {canEditEvolution && appointment.status !== "in_progress" && (
                        <Button asChild>
                          <Link href={`/queue?appointmentId=${id}`}>
                            Ir para Fila de Espera
                          </Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Patient History */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-2">Histórico do Paciente</h3>
              
              <div className="space-y-3">
                {patientEvolutions && patientEvolutions.length > 0 ? (
                  patientEvolutions
                    .filter((ev: any) => ev.appointmentId !== Number(id))
                    .slice(0, 4)
                    .map((record: any) => (
                      <div key={record.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-all">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">
                            {record.appointment?.procedure?.type === "consultation" 
                              ? "Consulta" 
                              : record.appointment?.procedure?.type === "exam" 
                                ? "Exame" 
                                : "Procedimento"}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatDate(record.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {record.diagnosis?.substring(0, 100)}
                          {record.diagnosis?.length > 100 ? "..." : ""}
                        </p>
                        {record.prescription && (
                          <div className="mt-2 flex items-center text-xs">
                            <FileText className="h-3 w-3 text-primary-500 mr-1" />
                            <span className="text-primary-600">Prescrição médica</span>
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    Paciente sem histórico de atendimentos anteriores
                  </div>
                )}
                
                {patientEvolutions && patientEvolutions.length > 1 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/patients/${appointment.patient.id}`}>
                      Ver Histórico Completo
                    </Link>
                  </Button>
                )}
              </div>
              
              <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-2 pt-2">Anexar Documentos</h3>
              <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
                <div className="flex flex-col items-center">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <p className="mt-1 text-sm text-gray-500">Arraste arquivos ou clique para anexar</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Selecionar Arquivo
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {evolution && (
            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="outline">
                Gerar PDF
              </Button>
              <Button>
                Voltar para Fila
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
