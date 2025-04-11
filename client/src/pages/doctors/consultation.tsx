import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { evolutionFormSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription, 
} from "@/components/ui/dialog";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  User,
  AlertTriangle,
  MoveLeft,
  Save,
  Printer,
  Stethoscope,
  PlusCircle,
  Hash,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type EvolutionFormValues = z.infer<typeof evolutionFormSchema>;

export default function DoctorConsultation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Get appointment ID from URL
  const pathSegments = location.split('/');
  const appointmentId = parseInt(pathSegments[pathSegments.length - 1]);
  
  if (!appointmentId) {
    navigate("/doctors/dashboard");
  }

  // Fetch appointment details
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ["/api/appointments", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const res = await apiRequest("GET", `/api/appointments/${appointmentId}`);
      return await res.json();
    },
    enabled: !!appointmentId
  });

  // Fetch patient details
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ["/api/patients", appointment?.patientId],
    queryFn: async () => {
      if (!appointment?.patientId) return null;
      const res = await apiRequest("GET", `/api/patients/${appointment.patientId}`);
      return await res.json();
    },
    enabled: !!appointment?.patientId
  });

  // Fetch patient history
  const { data: patientHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ["/api/evolutions/patient", appointment?.patientId],
    queryFn: async () => {
      if (!appointment?.patientId) return [];
      const res = await apiRequest("GET", `/api/evolutions/patient/${appointment.patientId}`);
      return await res.json();
    },
    enabled: !!appointment?.patientId
  });

  // Fetch procedures for checklist
  const { data: procedures = [], isLoading: proceduresLoading } = useQuery({
    queryKey: ["/api/procedures"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/procedures");
      return await res.json();
    }
  });

  // Prepare procedures with checked state for the form
  const proceduresWithChecked = (procedures || []).map((proc: any) => ({
    id: proc.id,
    name: proc.name,
    value: proc.value,
    checked: proc.id === (appointment?.procedureId || 0)
  }));

  // Form setup
  const form = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionFormSchema),
    defaultValues: {
      appointmentId,
      patientId: appointment?.patientId || 0,
      professionalId: appointment?.professionalId || 0,
      symptoms: "",
      diagnosis: "",
      notes: "",
      procedures: proceduresWithChecked
    }
  });

  // Update form with appointment data when loaded
  useEffect(() => {
    if (appointment && !appointmentLoading) {
      form.setValue("patientId", appointment.patientId);
      form.setValue("professionalId", appointment.professionalId);
    }
  }, [appointment, appointmentLoading, form]);

  // Update procedures when they are loaded
  useEffect(() => {
    if (!proceduresLoading && procedures.length > 0) {
      form.setValue("procedures", proceduresWithChecked);
    }
  }, [procedures, proceduresLoading, form, proceduresWithChecked]);

  // Mutation to save evolution and complete appointment
  const saveEvolutionMutation = useMutation({
    mutationFn: async (data: EvolutionFormValues) => {
      console.log("Salvando evolução com dados:", data);
      const { procedures, ...evolutionData } = data;
      
      // Make sure IDs are present and all fields have valid values
      const dataToSave = {
        ...evolutionData,
        appointmentId,
        patientId: appointment?.patientId || evolutionData.patientId,
        professionalId: appointment?.professionalId || evolutionData.professionalId,
        // SOAP fields
        subjective: evolutionData.subjective || null,
        objective: evolutionData.objective || null,
        assessment: evolutionData.assessment || null,
        plan: evolutionData.plan || null,
        // Additional fields
        diagnostics: evolutionData.diagnostics || null,
        prescription: evolutionData.prescription || null,
        exams: evolutionData.exams || null,
        // Legacy fields (mantendo para compatibilidade)
        symptoms: evolutionData.symptoms || null,
        diagnosis: evolutionData.diagnosis || null,
        notes: evolutionData.notes || null
      };
      
      console.log("Dados de evolução a enviar:", dataToSave);
      
      try {
        // First save the evolution
        const response = await apiRequest("POST", "/api/evolutions", dataToSave);
        console.log("Resposta da criação de evolução:", response.status);
        const evolution = await response.json();
        console.log("Evolução criada:", evolution);
        
        // Then update appointment status
        const statusResponse = await apiRequest("PATCH", `/api/appointments/${appointmentId}/status`, { 
          status: "completed" 
        });
        console.log("Resposta da atualização de status:", statusResponse.status);
        
        // Módulo financeiro temporariamente desativado
        /* MÓDULO FINANCEIRO - Comentado para implementação futura
        // Calculate financial values
        const selectedProcedures = procedures?.filter(p => p.checked) || [];
        const totalValue = selectedProcedures.reduce((sum, proc) => sum + proc.value, 0);
        
        // Get professional commission rate
        const professional = appointment?.professional;
        const commissionRate = professional?.commission || 0.2; // Default 20% if not set
        
        const clinicCommission = totalValue * commissionRate;
        const professionalValue = totalValue - clinicCommission;
        */
        
        // Create simplified financial record (apenas para finalizar o atendimento)
        const financialRecord = {
          appointmentId,
          professionalId: evolution.professionalId,
          totalValue: 0,
          clinicCommission: 0,
          professionalValue: 0
        };
        
        console.log("Registro para finalizar atendimento:", financialRecord);
        
        // Envia para a API temporária que apenas finaliza o atendimento
        const financialResponse = await apiRequest("POST", "/api/financial-records", financialRecord);
        console.log("Resposta da criação financeira:", financialResponse.status);
        
        return evolution;
      } catch (error) {
        console.error("Erro ao salvar evolução:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Evolução salva com sucesso!");
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/evolutions/patient", appointment?.patientId] });
      
      setShowConfirmDialog(false);
      setShowSuccess(true);
      
      // Redirecionar após feedback visual de sucesso
      setTimeout(() => {
        navigate("/doctors/dashboard");
      }, 2000);
    },
    onError: (error) => {
      console.error("Erro ao salvar evolução:", error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar os dados",
        variant: "destructive",
      });
    }
  });

  // Mutation to update appointment status (for starting/continuing consult)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      return apiRequest("PATCH", `/api/appointments/${appointmentId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments", appointmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
    },
  });

  // Start consultation if it's in waiting status
  useEffect(() => {
    if (appointment?.status === "waiting") {
      updateStatusMutation.mutate({ status: "in_progress" });
    }
  }, [appointment]);

  // Form submission
  const onSubmit = (data: EvolutionFormValues) => {
    console.log("Formulário submetido:", data);
    setShowConfirmDialog(true);
  };

  const confirmFinish = () => {
    console.log("Confirmando finalização com dados:", form.getValues());
    saveEvolutionMutation.mutate(form.getValues());
  };

  // Calculate total from selected procedures
  const calculateTotal = () => {
    const procedures = form.getValues().procedures || [];
    return procedures
      .filter(p => p.checked)
      .reduce((sum, proc) => sum + proc.value, 0);
  };

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

  const isLoading = appointmentLoading || patientLoading || proceduresLoading;

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
          <h1 className="text-2xl font-semibold ml-4">Carregando consulta...</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <Skeleton className="h-7 w-40" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <Skeleton className="h-7 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 items-center">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  if (!appointment) {
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
          <h1 className="text-2xl font-semibold ml-4">Atendimento não encontrado</h1>
        </div>
        
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Agendamento não encontrado</h2>
            <p className="text-muted-foreground mb-6">
              Não foi possível encontrar o agendamento solicitado.
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
          Atendimento: {patient?.name}
        </h1>
        <Badge 
          variant={appointment.status === "completed" ? "outline" : "default"}
          className="ml-4"
        >
          {appointment.status === "scheduled" && "Agendado"}
          {appointment.status === "waiting" && "Aguardando"}
          {appointment.status === "in_progress" && "Em Andamento"}
          {appointment.status === "completed" && "Concluído"}
          {appointment.status === "cancelled" && "Cancelado"}
        </Badge>
      </div>
      
      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal - Formulário */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Clínica</CardTitle>
              <CardDescription>
                Registre os detalhes do atendimento médico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* SOAP - Subjetivo */}
                  <FormField
                    control={form.control}
                    name="subjective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subjetivo</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informações relatadas pelo paciente, incluindo sintomas, queixas e histórico"
                            className="min-h-[100px] resize-none"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* SOAP - Objetivo */}
                  <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objetivo</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Achados clínicos objetivos, incluindo exame físico e resultados de exames"
                            className="min-h-[100px] resize-none"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* SOAP - Avaliação */}
                  <FormField
                    control={form.control}
                    name="assessment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avaliação</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Avaliação clínica, diagnósticos, impressões e análise dos problemas"
                            className="min-h-[100px] resize-none"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* SOAP - Plano */}
                  <FormField
                    control={form.control}
                    name="plan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plano</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Plano de tratamento, conduta, orientações e acompanhamento"
                            className="min-h-[100px] resize-none"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Campos adicionais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="diagnostics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Diagnóstico CID</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Código CID ou descrição do diagnóstico" 
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="exams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exames Solicitados</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Exames solicitados" 
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="prescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prescrição</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detalhes da prescrição médica"
                            className="min-h-[100px] resize-none"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Mantendo campos antigos para compatibilidade, mas ocultos */}
                  <div className="hidden">
                    <FormField
                      control={form.control}
                      name="symptoms"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Procedimentos */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">
                      Procedimentos Realizados
                    </h3>
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        {form.getValues().procedures?.map((procedure, index) => (
                          <div key={procedure.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center">
                              <FormField
                                control={form.control}
                                name={`procedures.${index}.checked`}
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <label className="text-sm font-medium">
                                      {procedure.name}
                                    </label>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="text-sm font-medium">
                              R$ {procedure.value.toFixed(2)}
                            </div>
                          </div>
                        ))}
                        
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="font-semibold">Total</span>
                          <span className="font-semibold">R$ {calculateTotal().toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex justify-between gap-2 pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/doctors/dashboard")}
              >
                Cancelar
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button
                  type="button"
                  onClick={() => form.handleSubmit(onSubmit)()}
                  disabled={appointment.status === "completed"}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Finalizar Atendimento
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
        
        {/* Coluna lateral - Informações do paciente e histórico */}
        <div className="space-y-6">
          {/* Informações do paciente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informações do Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src="" alt={patient?.name} />
                  <AvatarFallback className="text-lg">
                    {patient?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{patient?.name}</h3>
                  <div className="text-sm text-muted-foreground">
                    {patient?.gender === 'male' ? 'Masculino' : 
                     patient?.gender === 'female' ? 'Feminino' : 'Outro'}, {calculateAge(patient?.birthDate)} anos
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Data Nascimento</p>
                  <p className="font-medium">
                    {patient?.birthDate 
                      ? format(new Date(patient.birthDate), 'dd/MM/yyyy') 
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">CPF</p>
                  <p className="font-medium">{patient?.cpf || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Telefone</p>
                  <p className="font-medium">{patient?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <p className="font-medium truncate">{patient?.email || '-'}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-muted-foreground mb-1">Endereço</p>
                <p className="text-sm">{patient?.address || 'Não informado'}</p>
              </div>
              
              {patient?.observations && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm">{patient.observations}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Informações do agendamento */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Detalhes do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Data</p>
                  <p className="font-medium">
                    {format(new Date(appointment.date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Horário</p>
                  <p className="font-medium">
                    {format(new Date(appointment.date), 'HH:mm')}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Procedimento</p>
                  <Badge variant="outline" className="font-normal">
                    {appointment.procedure?.type === 'consultation' ? 'Consulta' : 
                    appointment.procedure?.type === 'exam' ? 'Exame' : 'Procedimento'}
                  </Badge>
                  <p className="font-medium mt-1">{appointment.procedure?.name}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground mb-1">Valor</p>
                  <p className="font-medium">
                    R$ {appointment.procedure?.value?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              
              {appointment.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground mb-1">Observações</p>
                    <p className="text-sm">{appointment.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Histórico do paciente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center">
                <ClipboardList className="h-5 w-5 mr-2" />
                Histórico Médico
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {historyLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : patientHistory.length > 0 ? (
                <div className="space-y-4">
                  {patientHistory
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice((historyPage - 1) * 3, historyPage * 3)
                    .map((evolution: any) => (
                      <Card key={evolution.id} className="overflow-hidden">
                        <CardHeader className="py-3 bg-muted/50">
                          <div className="flex justify-between items-center">
                            <div className="text-sm">
                              <span className="font-medium">
                                {format(new Date(evolution.createdAt), 'dd/MM/yyyy')}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {format(new Date(evolution.createdAt), 'HH:mm')}
                              </span>
                            </div>
                            {evolution.appointmentId === appointmentId && (
                              <Badge variant="outline" className="text-xs">Atual</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 text-sm">
                          {evolution.diagnosis && (
                            <div className="mb-2">
                              <span className="font-medium">Diagnóstico:</span> {evolution.diagnosis}
                            </div>
                          )}
                          {evolution.symptoms && (
                            <div className="mb-2 line-clamp-2">
                              <span className="font-medium">Sintomas:</span> {evolution.symptoms}
                            </div>
                          )}
                          {evolution.notes && (
                            <div className="line-clamp-2">
                              <span className="font-medium">Conduta:</span> {evolution.notes}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    
                  {/* Paginação */}
                  {patientHistory.length > 3 && (
                    <div className="flex justify-between items-center pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Página {historyPage} de {Math.ceil(patientHistory.length / 3)}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.min(Math.ceil(patientHistory.length / 3), p + 1))}
                        disabled={historyPage >= Math.ceil(patientHistory.length / 3)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground text-sm">
                    Nenhum histórico médico anterior encontrado.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Diálogo de confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar atendimento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja finalizar este atendimento? Esta ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <span className="font-medium">Paciente:</span>
              <span>{patient?.name}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Procedimentos selecionados:</span>
              <span className="text-sm font-medium">{form.getValues().procedures?.filter(p => p.checked).length || 0}</span>
            </div>
            <div className="flex items-center justify-between text-primary">
              <span className="font-medium">Valor total:</span>
              <span className="font-medium">R$ {calculateTotal().toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmFinish}
              disabled={saveEvolutionMutation.isPending}
            >
              {saveEvolutionMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Processando...
                </>
              ) : (
                "Confirmar e Finalizar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de sucesso */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <DialogTitle className="text-xl mb-2">Atendimento finalizado com sucesso!</DialogTitle>
            <DialogDescription>
              O atendimento foi registrado e todas as informações foram salvas.
            </DialogDescription>
            <Button className="mt-6" onClick={() => navigate("/doctors/dashboard")}>
              Voltar para o Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}