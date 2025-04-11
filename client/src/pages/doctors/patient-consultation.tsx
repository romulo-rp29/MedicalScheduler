import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Avatar, 
  AvatarFallback,
} from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import {
  ArrowLeft,
  Calendar,
  Check,
  FileText,
  Clock,
  ArrowRight,
  AlertTriangle,
  User,
  Heart,
  Plus,
} from "lucide-react";

export default function DoctorPatientConsultation() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Get patient ID from URL
  const pathSegments = location.split('/');
  const patientId = parseInt(pathSegments[pathSegments.length - 1]);

  if (!patientId) {
    navigate("/doctors/dashboard");
  }

  // Fetch patient details
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["/api/patients", patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const res = await apiRequest("GET", `/api/patients/${patientId}`);
      return await res.json();
    },
    enabled: !!patientId,
  });

  // Fetch past consultations
  const { data: evolutions = [], isLoading: evolutionsLoading } = useQuery({
    queryKey: ["/api/evolutions/patient", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await apiRequest("GET", `/api/evolutions/patient/${patientId}`);
      return await res.json();
    },
    enabled: !!patientId,
  });

  // Fetch upcoming and recent appointments
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments/patient", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await apiRequest("GET", `/api/appointments?patientId=${patientId}`);
      return await res.json();
    },
    enabled: !!patientId,
  });

  // Filter appointments
  const upcomingAppointments = appointments
    .filter((a: any) => ["scheduled", "waiting"].includes(a.status))
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
  const recentAppointments = appointments
    .filter((a: any) => ["in_progress", "completed"].includes(a.status))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  const ongoingAppointment = appointments
    .find((a: any) => a.status === "in_progress");

  // Mutation to update appointment status (for starting/continuing consult)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/patient", patientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      toast({
        title: "Status atualizado",
        description: "O status do agendamento foi atualizado com sucesso",
      });
    },
  });

  // Calculate age from birthdate
  function calculateAge(birthdate?: string) {
    if (!birthdate) return "";
    
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  const isLoading = patientLoading || evolutionsLoading || appointmentsLoading;

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1" 
            onClick={() => navigate("/doctors/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h1 className="text-2xl font-semibold ml-4">Carregando...</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1" 
            onClick={() => navigate("/doctors/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h1 className="text-2xl font-semibold ml-4">Paciente não encontrado</h1>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Paciente não encontrado</h2>
            <p className="text-muted-foreground mb-6">
              Não foi possível encontrar o paciente solicitado.
            </p>
            <Button onClick={() => navigate("/doctors/dashboard")}>
              Voltar para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      {/* Cabeçalho */}
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1" 
          onClick={() => navigate("/doctors/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <h1 className="text-2xl font-semibold ml-4">
          Consultar Paciente
        </h1>
      </div>
      
      {/* Layout principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="md:col-span-2 space-y-6">
          {/* Card do paciente */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="text-lg">
                      {patient.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{patient.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      <span>
                        {patient.gender === 'male' ? 'Masculino' : 
                         patient.gender === 'female' ? 'Feminino' : 'Outro'}, {calculateAge(patient.birthDate)} anos
                      </span>
                      {patient.birthDate && (
                        <>
                          <span className="mx-1">•</span>
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{format(new Date(patient.birthDate), 'dd/MM/yyyy')}</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/doctors/medical-record/${patientId}`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Prontuário Completo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">{patient.phone || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">{patient.email || 'Não informado'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="text-sm font-medium">{patient.address || 'Não informado'}</p>
                </div>
              </div>
              
              {patient.observations && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observações Clínicas</p>
                    <p className="text-sm">{patient.observations}</p>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="justify-between bg-muted/30 py-3">
              <div className="text-sm">
                <span className="text-muted-foreground">CPF:</span> <span className="font-medium">{patient.cpf || 'Não informado'}</span>
              </div>
              <Button
                variant="default"
                size="sm"
                asChild
              >
                <a href={`/patients/${patientId}/appointments/new`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Consulta
                </a>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Atendimento atual ou próximos agendamentos */}
          {ongoingAppointment ? (
            <Card className="border-2 border-primary">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-primary flex items-center">
                    <Clock className="h-5 w-5 mr-2 animate-pulse" />
                    Atendimento em Andamento
                  </CardTitle>
                  <Badge variant="secondary">
                    Em Andamento
                  </Badge>
                </div>
                <CardDescription>
                  Iniciado em {format(new Date(ongoingAppointment.date), "dd 'de' MMMM", { locale: ptBR })} às {format(new Date(ongoingAppointment.date), 'HH:mm')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Procedimento</p>
                    <p className="font-medium">{ongoingAppointment.procedure?.name}</p>
                    <p className="text-sm">
                      {ongoingAppointment.procedure?.type === 'consultation' ? 'Consulta' : 
                       ongoingAppointment.procedure?.type === 'exam' ? 'Exame' : 'Procedimento'}
                    </p>
                  </div>
                  
                  {ongoingAppointment.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">{ongoingAppointment.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 py-4">
                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/doctors/consultation/${ongoingAppointment.id}`)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continuar Atendimento
                </Button>
              </CardFooter>
            </Card>
          ) : upcomingAppointments.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Próximos Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingAppointments.map((appointment: any) => (
                    <div 
                      key={appointment.id} 
                      className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">
                            {format(new Date(appointment.date), "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          <Clock className="h-3 w-3 text-muted-foreground ml-1" />
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(appointment.date), 'HH:mm')}
                          </p>
                        </div>
                        <p className="text-sm mt-1">
                          {appointment.procedure?.name}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={appointment.status === "waiting" ? "secondary" : "outline"}>
                          {appointment.status === "scheduled" ? "Agendado" : "Aguardando"}
                        </Badge>
                        
                        {appointment.status === "waiting" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              updateStatusMutation.mutate({ 
                                id: appointment.id, 
                                status: "in_progress" 
                              }, {
                                onSuccess: () => {
                                  navigate(`/doctors/consultation/${appointment.id}`);
                                }
                              });
                            }}
                          >
                            Iniciar
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateStatusMutation.mutate({ 
                                id: appointment.id, 
                                status: "waiting" 
                              });
                            }}
                          >
                            Check-in
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sem agendamentos</h3>
                <p className="text-muted-foreground mb-6">
                  Não há agendamentos ativos para este paciente.
                </p>
                <Button
                  asChild
                >
                  <a href={`/patients/${patientId}/appointments/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agendar Nova Consulta
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Histórico de consultas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Histórico Clínico Recente
              </CardTitle>
              <CardDescription>
                Últimas consultas e evoluções do paciente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="consultations" className="w-full">
                <TabsList className="mb-4 w-full md:w-auto grid grid-cols-2 md:inline-flex">
                  <TabsTrigger value="consultations">Consultas</TabsTrigger>
                  <TabsTrigger value="evolutions">Evoluções</TabsTrigger>
                </TabsList>
                
                {/* Tab de consultas recentes */}
                <TabsContent value="consultations">
                  {recentAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {recentAppointments.map((appointment: any) => (
                        <Card key={appointment.id}>
                          <CardHeader className="py-3 flex flex-row items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {format(new Date(appointment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(appointment.date), 'HH:mm')}
                              </p>
                            </div>
                            <Badge variant={appointment.status === "completed" ? "outline" : "default"}>
                              {appointment.status === "in_progress" ? "Em Andamento" : "Concluído"}
                            </Badge>
                          </CardHeader>
                          <CardContent className="py-2">
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm text-muted-foreground">Tipo</p>
                                <p className="font-medium">
                                  {appointment.procedure?.type === 'consultation' ? 'Consulta' : 
                                   appointment.procedure?.type === 'exam' ? 'Exame' : 'Procedimento'}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Procedimento</p>
                                <p className="font-medium">{appointment.procedure?.name}</p>
                              </div>
                              
                              {appointment.notes && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Observações</p>
                                  <p className="text-sm">{appointment.notes}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="bg-muted/30 py-3">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="ml-auto"
                              asChild
                            >
                              <a href={`/doctors/consultation/${appointment.id}`}>Ver Detalhes</a>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                      
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          asChild
                        >
                          <a href={`/doctors/medical-record/${patientId}`}>
                            Ver Histórico Completo
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Não há histórico de consultas para este paciente.
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                {/* Tab de evoluções */}
                <TabsContent value="evolutions">
                  {evolutions.length > 0 ? (
                    <div className="space-y-4">
                      {evolutions.slice(0, 3).map((evolution: any) => (
                        <Card key={evolution.id}>
                          <CardHeader className="py-3">
                            <div className="flex justify-between items-center">
                              <p className="font-medium">
                                {format(new Date(evolution.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(evolution.createdAt), 'HH:mm')}
                              </p>
                            </div>
                          </CardHeader>
                          <CardContent className="py-2">
                            <div className="space-y-2">
                              {evolution.diagnosis && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Diagnóstico</p>
                                  <p className="font-medium">{evolution.diagnosis}</p>
                                </div>
                              )}
                              
                              {evolution.symptoms && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Sintomas</p>
                                  <p className="text-sm line-clamp-2">{evolution.symptoms}</p>
                                </div>
                              )}
                              
                              {evolution.notes && (
                                <div>
                                  <p className="text-sm text-muted-foreground">Conduta</p>
                                  <p className="text-sm line-clamp-2">{evolution.notes}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="bg-muted/30 py-3">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="ml-auto"
                              asChild
                            >
                              <a href={`/doctors/consultation/${evolution.appointmentId}`}>
                                Ver Detalhes
                              </a>
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                      
                      <div className="flex justify-center pt-2">
                        <Button
                          variant="outline"
                          asChild
                        >
                          <a href={`/doctors/medical-record/${patientId}`}>
                            Ver Histórico Completo
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Não há registros de evoluções para este paciente.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Coluna lateral */}
        <div className="space-y-6">
          {/* Card de ações rápidas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <a href={`/patients/${patientId}/appointments/new`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Consulta
                </a>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <a href={`/doctors/medical-record/${patientId}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Prontuário Completo
                </a>
              </Button>
              
              {recentAppointments.length > 0 && recentAppointments[0].status === "in_progress" && (
                <Button
                  variant="default"
                  className="w-full justify-start"
                  asChild
                >
                  <a href={`/doctors/consultation/${recentAppointments[0].id}`}>
                    <Check className="h-4 w-4 mr-2" />
                    Continuar Atendimento
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Resumo do paciente */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Resumo do Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Consultas</p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {appointments.filter((a: any) => a.status === "completed").length} consultas realizadas
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Última Consulta</p>
                  {recentAppointments.length > 0 ? (
                    <>
                      <p className="font-medium">
                        {format(new Date(recentAppointments[0].date), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {recentAppointments[0].procedure?.name}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm">Nenhuma consulta anterior</p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm text-muted-foreground">Próxima Consulta</p>
                  {upcomingAppointments.length > 0 ? (
                    <>
                      <p className="font-medium">
                        {format(new Date(upcomingAppointments[0].date), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(upcomingAppointments[0].date), 'HH:mm')} - {upcomingAppointments[0].procedure?.name}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm">Nenhum agendamento futuro</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Outros dados */}
          {patient.observations && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Observações Importantes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{patient.observations}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}