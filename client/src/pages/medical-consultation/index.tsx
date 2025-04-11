import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BadgeStatus } from "@/components/ui/badge-status";
import { useToast } from "@/hooks/use-toast";
import { User, ClipboardEdit, Calendar, Clock, Activity, Heart, Stethoscope, PenLine } from "lucide-react";

export default function MedicalConsultation() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [appointmentId, setAppointmentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("informacoes");
  const [evolutionForm, setEvolutionForm] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    diagnostics: "",
    prescription: "",
    exams: ""
  });

  // Extrair ID do agendamento da URL se presente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("appointmentId");
    if (id) {
      setAppointmentId(parseInt(id));
    }
  }, []);

  // Buscar detalhes do agendamento
  const { data: appointment, isLoading } = useQuery({
    queryKey: ["/api/appointments", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const res = await apiRequest("GET", `/api/appointments/${appointmentId}`);
      return await res.json();
    },
    enabled: !!appointmentId
  });

  // Buscar histórico de evoluções
  const { data: evolutions = [] } = useQuery({
    queryKey: ["/api/evolutions", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return [];
      const res = await apiRequest("GET", `/api/evolutions/appointment/${appointmentId}`);
      return await res.json();
    },
    enabled: !!appointmentId
  });

  // Buscar histórico médico do paciente
  const { data: patientHistory = [] } = useQuery({
    queryKey: ["/api/evolutions/patient", appointment?.patientId],
    queryFn: async () => {
      if (!appointment?.patientId) return [];
      const res = await apiRequest("GET", `/api/evolutions/patient/${appointment.patientId}`);
      return await res.json();
    },
    enabled: !!appointment?.patientId
  });

  // Mutação para salvar a evolução
  const saveEvolutionMutation = useMutation({
    mutationFn: async (data: any) => {
      // Buscar o profissional associado ao usuário atual
      const professionalResponse = await apiRequest("GET", `/api/professionals/user/${user?.id}`);
      const professional = await professionalResponse.json();
      
      const payload = {
        ...data,
        appointmentId,
        professionalId: professional?.id
      };
      
      const res = await apiRequest("POST", "/api/evolutions", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evolutions", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/evolutions/patient", appointment?.patientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      
      toast({
        title: "Evolução salva com sucesso",
        description: "O registro médico foi salvo no sistema",
      });
      
      // Limpa o formulário
      setEvolutionForm({
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        diagnostics: "",
        prescription: "",
        exams: ""
      });
      
      // Atualiza status do agendamento para concluído
      updateAppointmentStatusMutation.mutate({ status: "completed" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar evolução",
        description: error.message || "Ocorreu um erro ao salvar o registro médico",
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar status do agendamento
  const updateAppointmentStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      const res = await apiRequest("PATCH", `/api/appointments/${appointmentId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar o status do agendamento",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEvolutionForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEvolution = () => {
    saveEvolutionMutation.mutate(evolutionForm);
  };

  const handleStartConsultation = () => {
    if (appointment?.status !== "in_progress") {
      updateAppointmentStatusMutation.mutate({ status: "in_progress" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando detalhes da consulta...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-semibold">Consulta não encontrada</h2>
        <p>O agendamento solicitado não foi encontrado no sistema.</p>
        <Button onClick={() => navigate("/appointments")}>
          Voltar para Agendamentos
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Atendimento Médico</h1>
        <div className="flex items-center gap-3">
          <BadgeStatus status={appointment.status} />
          {appointment.status === "confirmed" && (
            <Button onClick={handleStartConsultation}>
              Iniciar Atendimento
            </Button>
          )}
          {appointment.status === "in_progress" && (
            <Button onClick={() => setActiveTab("evolucao")}>
              Registrar Evolução
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Painel de informações do paciente - lateral esquerda */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <User className="mr-2 h-5 w-5" />
                Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-lg font-medium">{appointment.patient?.name}</div>
                <div className="text-sm text-gray-500">
                  {appointment.patient?.birthDate && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>
                        {format(new Date(appointment.patient.birthDate), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {appointment.patient?.phone && (
                    <div className="flex items-center mt-1">
                      <User className="h-4 w-4 mr-1" />
                      <span>{appointment.patient.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h4 className="text-sm font-medium mb-2">Detalhes da Consulta</h4>
                <div className="text-sm space-y-1">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{format(new Date(appointment.date), "HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center">
                    <Stethoscope className="h-4 w-4 mr-1 text-gray-500" />
                    <span>{appointment.procedure?.name}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {patientHistory.length > 0 ? (
                  patientHistory.slice(0, 5).map((evolution: any) => (
                    <div key={evolution.id} className="border-l-2 border-primary pl-3 py-1">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          {evolution.appointment?.procedure?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(evolution.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {evolution.diagnostics || evolution.assessment || "Sem diagnóstico registrado"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">
                    Nenhum histórico médico anterior
                  </div>
                )}
                
                {patientHistory.length > 5 && (
                  <Button variant="link" className="w-full p-0 h-auto text-xs">
                    Ver histórico completo
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo principal - área de atendimento */}
        <div className="lg:col-span-3">
          <Card className="mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-0">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="informacoes">Informações do Paciente</TabsTrigger>
                  <TabsTrigger value="evolucao">Evolução</TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent className="pt-6">
                <TabsContent value="informacoes" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Dados Gerais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {appointment.patient?.cpf || "Não informado"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          RG
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {appointment.patient?.rg || "Não informado"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {appointment.patient?.email || "Não informado"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {appointment.patient?.phone || "Não informado"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Profissão
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {appointment.patient?.profession || "Não informado"}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gênero
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {appointment.patient?.gender === "male" ? "Masculino" : 
                           appointment.patient?.gender === "female" ? "Feminino" : 
                           appointment.patient?.gender === "other" ? "Outro" : "Não informado"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Endereço Completo
                        </label>
                        <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                          {appointment.patient?.address || "Endereço não informado"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">Observações do Agendamento</h3>
                    <div className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50 min-h-[100px]">
                      {appointment.notes || "Nenhuma observação registrada"}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="evolucao" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Registrar Evolução</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Subjetivo (Queixas do paciente)
                        </label>
                        <Textarea 
                          name="subjective"
                          value={evolutionForm.subjective}
                          onChange={handleInputChange}
                          placeholder="Descreva as queixas relatadas pelo paciente"
                          className="min-h-[120px]"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Objetivo (Exame físico)
                        </label>
                        <Textarea 
                          name="objective"
                          value={evolutionForm.objective}
                          onChange={handleInputChange}
                          placeholder="Registre os achados do exame físico"
                          className="min-h-[120px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Avaliação
                        </label>
                        <Textarea 
                          name="assessment"
                          value={evolutionForm.assessment}
                          onChange={handleInputChange}
                          placeholder="Registre sua avaliação clínica"
                          className="min-h-[120px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Plano
                        </label>
                        <Textarea 
                          name="plan"
                          value={evolutionForm.plan}
                          onChange={handleInputChange}
                          placeholder="Descreva o plano terapêutico"
                          className="min-h-[120px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Diagnóstico
                        </label>
                        <Textarea 
                          name="diagnostics"
                          value={evolutionForm.diagnostics}
                          onChange={handleInputChange}
                          placeholder="Registre o diagnóstico e CID (se aplicável)"
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Prescrição
                        </label>
                        <Textarea 
                          name="prescription"
                          value={evolutionForm.prescription}
                          onChange={handleInputChange}
                          placeholder="Registre a prescrição médica"
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Exames Solicitados
                        </label>
                        <Textarea 
                          name="exams"
                          value={evolutionForm.exams}
                          onChange={handleInputChange}
                          placeholder="Registre os exames solicitados"
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab("informacoes")}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSaveEvolution}
                        disabled={saveEvolutionMutation.isPending}
                      >
                        {saveEvolutionMutation.isPending ? "Salvando..." : "Salvar Evolução"}
                      </Button>
                    </div>
                  </div>

                  {evolutions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Evoluções Anteriores</h3>
                      <div className="space-y-4">
                        {evolutions.map((evolution: any) => (
                          <Card key={evolution.id}>
                            <CardHeader className="py-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center">
                                  <PenLine className="mr-2 h-4 w-4" />
                                  Evolução {format(new Date(evolution.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </CardTitle>
                                <Badge variant="outline">
                                  {evolution.professional?.user?.name}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="py-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {evolution.subjective && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Subjetivo</h4>
                                    <p className="text-sm">{evolution.subjective}</p>
                                  </div>
                                )}
                                
                                {evolution.objective && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Objetivo</h4>
                                    <p className="text-sm">{evolution.objective}</p>
                                  </div>
                                )}
                                
                                {evolution.assessment && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Avaliação</h4>
                                    <p className="text-sm">{evolution.assessment}</p>
                                  </div>
                                )}
                                
                                {evolution.plan && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Plano</h4>
                                    <p className="text-sm">{evolution.plan}</p>
                                  </div>
                                )}
                                
                                {evolution.diagnostics && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Diagnóstico</h4>
                                    <p className="text-sm">{evolution.diagnostics}</p>
                                  </div>
                                )}
                                
                                {evolution.prescription && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Prescrição</h4>
                                    <p className="text-sm">{evolution.prescription}</p>
                                  </div>
                                )}
                                
                                {evolution.exams && (
                                  <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">Exames</h4>
                                    <p className="text-sm">{evolution.exams}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}