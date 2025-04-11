import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

import {
  Calendar,
  Clock,
  Users,
  Activity,
  TrendingUp,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  FileText,
  User,
} from "lucide-react";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [today] = useState(new Date());
  const formattedDate = format(today, "yyyy-MM-dd");
  const displayDate = format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Buscar informações do profissional
  const { data: professional } = useQuery({
    queryKey: ["/api/professionals/user"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/professionals/user");
      return await res.json();
    },
    enabled: user?.role === "medico",
  });

  // Buscar agendamentos para hoje
  const { data: appointments = [] } = useQuery({
    queryKey: ["/api/appointments", { date: formattedDate, professionalId: professional?.id }],
    queryFn: async () => {
      if (!professional?.id) return [];
      const res = await apiRequest("GET", `/api/appointments?date=${formattedDate}&professionalId=${professional.id}`);
      return await res.json();
    },
    enabled: !!professional?.id,
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  // Buscar fila de espera
  const { data: waitingQueue = [] } = useQuery({
    queryKey: ["/api/queue", formattedDate, professional?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/queue?date=${formattedDate}`);
      return await res.json();
    },
    enabled: !!professional?.id,
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  // Buscar dados financeiros
  const { data: financialRecords = [] } = useQuery({
    queryKey: ["/api/financial-records/professional", professional?.id, { date: formattedDate }],
    queryFn: async () => {
      if (!professional?.id) return [];
      const res = await apiRequest("GET", `/api/financial-records/professional?date=${formattedDate}`);
      return await res.json();
    },
    enabled: !!professional?.id,
  });

  // Filtrar e contar agendamentos por status
  const scheduledCount = appointments.filter((a: any) => a.status === "scheduled").length;
  const waitingCount = appointments.filter((a: any) => a.status === "waiting").length;
  const inProgressCount = appointments.filter((a: any) => a.status === "in_progress").length;
  const completedCount = appointments.filter((a: any) => a.status === "completed").length;
  const totalAppointments = appointments.length;
  
  // Calcular progresso do dia
  const completionRate = totalAppointments > 0 
    ? (completedCount / totalAppointments) * 100 
    : 0;

  // Resumo financeiro
  const totalGross = financialRecords.reduce((sum: number, record: any) => sum + record.totalValue, 0);
  const totalClinic = financialRecords.reduce((sum: number, record: any) => sum + record.clinicCommission, 0);
  const totalProfessional = financialRecords.reduce((sum: number, record: any) => sum + record.professionalValue, 0);

  // Filtrar pacientes em espera e em atendimento
  const myWaitingPatients = waitingQueue.filter((a: any) => 
    a.professionalId === professional?.id && 
    (a.status === "waiting" || a.status === "in_progress")
  );

  // Função para calcular idade
  function calculateAge(birthdate: string) {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  return (
    <div className="container px-4 py-6 space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel do Médico</h1>
          <p className="text-muted-foreground">{displayDate}</p>
        </div>
        
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/waiting-queue">
              <Clock className="mr-2 h-4 w-4" />
              Fila de Espera
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/medical-records">
              <FileText className="mr-2 h-4 w-4" />
              Prontuários
            </Link>
          </Button>
        </div>
      </div>

      {/* Cartões de status */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pacientes Agendados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCount + waitingCount + inProgressCount + completedCount}</div>
            <p className="text-xs text-muted-foreground">
              {scheduledCount} aguardando, {waitingCount} em espera
            </p>
            <Progress 
              value={completionRate} 
              className="h-2 mt-3" 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Atendimento</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
            <p className="text-xs text-muted-foreground">
              {completedCount} atendimentos concluídos
            </p>
            <div className="mt-3 h-2 w-full flex gap-0.5">
              {appointments
                .filter((a: any) => a.status === "in_progress")
                .map((a: any, idx: number) => (
                  <div 
                    key={idx}
                    className="h-full bg-primary animate-pulse"
                    style={{width: `${100 / Math.max(1, inProgressCount)}%`}}
                  />
                ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita do Dia</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalProfessional.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Bruto: R$ {totalGross.toFixed(2)}
            </p>
            <div className="flex items-center mt-3 text-xs">
              <span className="text-muted-foreground">Taxa clínica</span>
              <Separator className="flex-1 mx-2" />
              <span className="font-medium">R$ {totalClinic.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAppointments ? Math.round(completedCount / totalAppointments * 100) : 0}%</div>
            <p className="text-xs text-muted-foreground">
              {completedCount} de {totalAppointments} atendimentos
            </p>
            <Progress 
              value={completionRate} 
              className="h-2 mt-3" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabs principais */}
      <Tabs defaultValue="waiting" className="space-y-4">
        <TabsList>
          <TabsTrigger value="waiting" className="relative">
            Próximos Atendimentos
            {waitingCount > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground">{waitingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="schedule">Agenda do Dia</TabsTrigger>
        </TabsList>
        
        {/* Tab da Fila de Espera */}
        <TabsContent value="waiting" className="space-y-4">
          {myWaitingPatients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myWaitingPatients.map((appointment: any) => (
                <Card key={appointment.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-4 bg-muted/50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{appointment.patient?.name?.[0] || 'P'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium">{appointment.patient?.name}</h3>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <User className="mr-1 h-3 w-3" />
                            {appointment.patient?.gender === 'male' ? 'M' : 
                             appointment.patient?.gender === 'female' ? 'F' : '-'}, {calculateAge(appointment.patient?.birthDate)} anos
                          </div>
                        </div>
                      </div>
                      <Badge variant={appointment.status === "waiting" ? "outline" : "default"}>
                        {appointment.status === "waiting" ? "Aguardando" : "Em Atendimento"}
                      </Badge>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Horário</p>
                          <p className="font-medium">{format(new Date(appointment.date), 'HH:mm')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tipo</p>
                          <p className="font-medium">
                            {appointment.procedure?.type === 'consultation' ? 'Consulta' : 
                             appointment.procedure?.type === 'exam' ? 'Exame' : 'Procedimento'}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-sm font-medium mb-1">{appointment.procedure?.name}</p>
                      
                      {appointment.notes && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {appointment.notes}
                        </p>
                      )}
                      
                      <div className="mt-4">
                        <Button 
                          asChild
                          className="w-full"
                        >
                          <Link href={`/doctors/consultation/${appointment.id}`}>
                            <span className="flex items-center justify-center">
                              {appointment.status === "waiting" ? (
                                <>Iniciar Atendimento <ArrowRight className="ml-2 h-4 w-4" /></>
                              ) : (
                                <>Continuar Atendimento <ArrowRight className="ml-2 h-4 w-4" /></>
                              )}
                            </span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum paciente aguardando</h3>
                <p className="text-muted-foreground">
                  No momento não há pacientes na fila de espera para atendimento.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Tab da Agenda do Dia */}
        <TabsContent value="schedule">
          {appointments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Agenda do Dia</CardTitle>
                <CardDescription>
                  Todos os agendamentos para {format(today, "dd 'de' MMMM", { locale: ptBR })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.map((appointment: any) => (
                    <div 
                      key={appointment.id} 
                      className="flex items-center gap-4 p-3 rounded-lg border"
                    >
                      <div className="flex-shrink-0">
                        <Avatar>
                          <AvatarFallback>{appointment.patient?.name?.[0] || 'P'}</AvatarFallback>
                        </Avatar>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{appointment.patient?.name}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {format(new Date(appointment.date), 'HH:mm')}
                          <span className="mx-1">•</span>
                          {appointment.procedure?.name}
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <Badge
                          variant={
                            appointment.status === "completed" ? "outline" : 
                            appointment.status === "in_progress" ? "default" : 
                            appointment.status === "waiting" ? "secondary" : 
                            "outline"
                          }
                        >
                          {appointment.status === "scheduled" && "Agendado"}
                          {appointment.status === "waiting" && "Aguardando"}
                          {appointment.status === "in_progress" && "Em Andamento"}
                          {appointment.status === "completed" && "Concluído"}
                          {appointment.status === "cancelled" && "Cancelado"}
                        </Badge>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant={appointment.status === "completed" ? "outline" : "default"}
                        disabled={appointment.status === "cancelled"}
                        asChild
                      >
                        <Link href={`/doctors/consultation/${appointment.id}`}>
                          {appointment.status === "completed" ? "Detalhes" : "Atender"}
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum agendamento</h3>
                <p className="text-muted-foreground">
                  Você não possui agendamentos para o dia de hoje.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}