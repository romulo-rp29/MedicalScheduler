import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  ArrowLeft,
  Calendar,
  Search,
  User,
  FileText,
  Clock,
  ClipboardList,
  Printer,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
  Heart,
  Weight,
  Ruler,
  Pill,
  AlertTriangle,
} from "lucide-react";

export default function DoctorMedicalRecord() {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [evolutions, setEvolutions] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
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

  // Fetch evolutions for this patient
  const { data: patientEvolutions = [], isLoading: evolutionsLoading } = useQuery({
    queryKey: ["/api/evolutions/patient", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await apiRequest("GET", `/api/evolutions/patient/${patientId}`);
      return await res.json();
    },
    enabled: !!patientId,
    onSuccess: (data) => {
      // Sort by date descending
      const sortedData = [...data].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setEvolutions(sortedData);
    }
  });

  // Fetch appointments for this patient
  const { data: patientAppointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments/patient", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await apiRequest("GET", `/api/appointments?patientId=${patientId}`);
      return await res.json();
    },
    enabled: !!patientId,
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

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchMode(false);
      return;
    }
    
    setSearchMode(true);
    const query = searchQuery.toLowerCase();
    const filtered = patientEvolutions.filter((evolution: any) => {
      return (
        (evolution.diagnosis && evolution.diagnosis.toLowerCase().includes(query)) ||
        (evolution.symptoms && evolution.symptoms.toLowerCase().includes(query)) ||
        (evolution.notes && evolution.notes.toLowerCase().includes(query))
      );
    });
    
    setEvolutions(filtered);
    setCurrentPage(1);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setSearchMode(false);
    setEvolutions([...patientEvolutions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
    setCurrentPage(1);
  };

  // Pagination logic
  const lastEvolutionIndex = currentPage * itemsPerPage;
  const firstEvolutionIndex = lastEvolutionIndex - itemsPerPage;
  const currentEvolutions = evolutions.slice(firstEvolutionIndex, lastEvolutionIndex);
  const totalPages = Math.ceil(evolutions.length / itemsPerPage);
  
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
          <h1 className="text-2xl font-semibold ml-4">Carregando prontuário...</h1>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32 mt-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full mt-4" />
            </CardContent>
          </Card>
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
          Prontuário do Paciente
        </h1>
      </div>
      
      {/* Dados do paciente */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {patient.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{patient.name}</h2>
                <div className="text-muted-foreground flex items-center gap-1">
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
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate(`/patients/${patient.id}/appointments/new`)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Agendar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Consultas
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="text-2xl font-bold">
                  {patientAppointments.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {patientAppointments.filter((a: any) => a.status === "completed").length} consultas realizadas
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Evoluções
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="text-2xl font-bold">
                  {patientEvolutions.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Última: {patientEvolutions.length > 0 
                    ? format(new Date(patientEvolutions[0].createdAt), 'dd/MM/yyyy') 
                    : '-'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="flex gap-2">
                  {patientAppointments.some((a: any) => a.status === "in_progress") ? (
                    <Badge className="bg-green-500">Em Atendimento</Badge>
                  ) : patientAppointments.some((a: any) => 
                      ["scheduled", "waiting"].includes(a.status)
                    ) ? (
                    <Badge variant="outline">Agendado</Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {patientAppointments.some((a: any) => a.status === "scheduled") 
                    ? "Próximo atendimento agendado" 
                    : "Sem atendimentos futuros"}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Cadastro
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <div className="text-sm font-medium">
                  Desde {format(new Date(patient.createdAt || Date.now()), 'MMM yyyy', { locale: ptBR })}
                </div>
                <p className="text-xs text-muted-foreground">
                  CPF: {patient.cpf || 'Não informado'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Separator className="my-6" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Dados Pessoais
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium">{patient.phone || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{patient.email || 'Não informado'}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="text-sm font-medium">{patient.address || 'Não informado'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Profissão</p>
                  <p className="text-sm font-medium">{patient.profession || 'Não informada'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <Heart className="h-4 w-4 mr-2" />
                Dados Clínicos
              </h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Peso</p>
                    </div>
                    <p className="text-sm font-medium">-</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Ruler className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Altura</p>
                    </div>
                    <p className="text-sm font-medium">-</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Sangue</p>
                    </div>
                    <p className="text-sm font-medium">-</p>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Alergias</p>
                  </div>
                  <p className="text-sm font-medium">Não informadas</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-1.5">
                    <Pill className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Medicamentos</p>
                  </div>
                  <p className="text-sm font-medium">Não informados</p>
                </div>
              </div>
            </div>
          </div>
          
          {patient.observations && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Observações Importantes
                </h3>
                <p className="text-sm">{patient.observations}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Histórico médico */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <CardTitle>Histórico de Atendimentos</CardTitle>
            
            <div className="w-full md:w-80 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar no histórico..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                />
              </div>
              {searchMode ? (
                <Button variant="ghost" size="sm" onClick={clearSearch}>
                  Limpar
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleSearch}>
                  Buscar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs de conteúdo */}
          <Tabs defaultValue="evolutions" className="w-full">
            <TabsList className="mb-4 w-full md:w-auto">
              <TabsTrigger value="evolutions" className="flex-1 md:flex-none">
                Evoluções Médicas
              </TabsTrigger>
              <TabsTrigger value="appointments" className="flex-1 md:flex-none">
                Agendamentos
              </TabsTrigger>
            </TabsList>
            
            {/* Tab - Evoluções Médicas */}
            <TabsContent value="evolutions">
              {evolutions.length > 0 ? (
                <div className="space-y-6">
                  {searchMode && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">
                        {evolutions.length} resultados encontrados para "{searchQuery}"
                      </p>
                    </div>
                  )}
                  
                  {currentEvolutions.map((evolution: any) => (
                    <Card key={evolution.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(evolution.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              {format(new Date(evolution.createdAt), 'HH:mm')}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Médico: Dr. {evolution.professional?.user?.name || 'Não especificado'}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-4">
                        {/* SOAP - Metodologia de prontuário médico */}
                        {evolution.subjective && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-1 text-primary">S - Subjetivo</h4>
                            <p className="text-sm">{evolution.subjective}</p>
                          </div>
                        )}
                        
                        {evolution.objective && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-1 text-primary">O - Objetivo</h4>
                            <p className="text-sm">{evolution.objective}</p>
                          </div>
                        )}
                        
                        {evolution.assessment && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-1 text-primary">A - Avaliação</h4>
                            <p className="text-sm">{evolution.assessment}</p>
                          </div>
                        )}
                        
                        {evolution.plan && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-1 text-primary">P - Plano</h4>
                            <p className="text-sm">{evolution.plan}</p>
                          </div>
                        )}
                        
                        {/* Informações adicionais */}
                        {evolution.diagnostics && (
                          <div className="mb-4 mt-6">
                            <h4 className="text-sm font-medium mb-1">Diagnóstico CID</h4>
                            <p className="text-sm">{evolution.diagnostics}</p>
                          </div>
                        )}
                        
                        {evolution.prescription && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-1">Prescrição</h4>
                            <p className="text-sm whitespace-pre-line">{evolution.prescription}</p>
                          </div>
                        )}
                        
                        {evolution.exams && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-1">Exames Solicitados</h4>
                            <p className="text-sm">{evolution.exams}</p>
                          </div>
                        )}
                        
                        {/* Campos legados (mostrar apenas se não tem dados SOAP) */}
                        {!evolution.subjective && !evolution.objective && !evolution.assessment && !evolution.plan && (
                          <>
                            {evolution.diagnosis && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-1">Diagnóstico</h4>
                                <p className="text-sm">{evolution.diagnosis}</p>
                              </div>
                            )}
                            
                            {evolution.symptoms && (
                              <div className="mb-4">
                                <h4 className="text-sm font-medium mb-1">Sintomas / Queixas</h4>
                                <p className="text-sm">{evolution.symptoms}</p>
                              </div>
                            )}
                            
                            {evolution.notes && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Conduta / Orientações</h4>
                                <p className="text-sm">{evolution.notes}</p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                      <CardFooter className="py-3 bg-muted/30 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <a href={`/doctors/consultation/${evolution.appointmentId}`}>
                            Visualizar Detalhes
                          </a>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                  
                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center pt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      
                      <div className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      {searchMode 
                        ? "Nenhum resultado encontrado" 
                        : "Sem histórico de evoluções"}
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      {searchMode 
                        ? `Não encontramos resultados para "${searchQuery}". Tente outros termos ou limpe a busca.` 
                        : "Este paciente não possui registros de evoluções médicas no sistema."}
                    </p>
                    {searchMode && (
                      <Button onClick={clearSearch}>
                        Limpar Busca
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* Tab - Agendamentos */}
            <TabsContent value="appointments">
              {patientAppointments.length > 0 ? (
                <div className="space-y-3">
                  {patientAppointments
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((appointment: any) => (
                      <div 
                        key={appointment.id} 
                        className="flex items-center gap-4 p-3 rounded-lg border"
                      >
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {format(new Date(appointment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                            <span className="text-muted-foreground">
                              {format(new Date(appointment.date), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <span>
                              {appointment.procedure?.type === 'consultation' ? 'Consulta' : 
                               appointment.procedure?.type === 'exam' ? 'Exame' : 'Procedimento'}:
                            </span>
                            <span className="ml-1 font-medium truncate">
                              {appointment.procedure?.name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <Badge
                            variant={
                              appointment.status === "completed" ? "outline" : 
                              appointment.status === "in_progress" ? "default" : 
                              appointment.status === "waiting" ? "secondary" : 
                              appointment.status === "cancelled" ? "destructive" :
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
                          variant="ghost"
                          asChild
                        >
                          <a href={`/doctors/consultation/${appointment.id}`}>
                            Detalhes
                          </a>
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      Sem agendamentos
                    </h3>
                    <p className="text-muted-foreground max-w-md mb-6">
                      Este paciente não possui histórico de agendamentos no sistema.
                    </p>
                    <Button onClick={() => navigate(`/patients/${patient.id}/appointments/new`)}>
                      Agendar Consulta
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}