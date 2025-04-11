import { useEffect, useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { insertAppointmentSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extend the insertAppointmentSchema with additional validation
const formSchema = insertAppointmentSchema.extend({
  date: z.preprocess(
    (val) => typeof val === 'string' ? new Date(val) : val,
    z.date()
  ),
  time: z.string(),
  selectedProcedures: z.array(z.number())
    .min(1, { message: "Selecione pelo menos um procedimento" })
    .optional(),
});

// Combined form values with time separate from date
type AppointmentFormValues = z.infer<typeof formSchema> & {
  time: string;
  selectedProcedures?: number[];
};

interface AppointmentFormProps {
  onSuccess?: () => void;
}

export default function AppointmentForm({ onSuccess }: AppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchProcedure, setSearchProcedure] = useState('');
  const [searchPatient, setSearchPatient] = useState('');
  const [showQuickPatient, setShowQuickPatient] = useState(false);
  const [quickPatientName, setQuickPatientName] = useState('');
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Função para criar um paciente rapidamente com apenas o nome
  const createQuickPatientMutation = useMutation({
    mutationFn: async (patientName: string) => {
      const response = await apiRequest("POST", "/api/patients/quick", { 
        name: patientName,
        // Valores mínimos necessários
        phone: "A preencher", // Temporário, a ser preenchido no check-in
        gender: "other", // Valor padrão temporário
        birthDate: new Date(), // Valor padrão temporário, a ser atualizado
      });
      return await response.json();
    },
    onSuccess: (newPatient) => {
      // Atualiza a lista de pacientes
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      // Seleciona o novo paciente no formulário
      form.setValue("patientId", newPatient.id);
      
      // Fecha o formulário de paciente rápido
      setShowQuickPatient(false);
      setQuickPatientName("");
      
      toast({
        title: "Paciente criado com sucesso",
        description: "O cadastro completo deverá ser feito no momento do check-in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar paciente",
        description: error.message || "Ocorreu um erro ao criar o paciente. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Fetch patients, professionals, and procedures
  const { data: patients = [] } = useQuery<any[]>({ 
    queryKey: ["/api/patients"],
    refetchOnWindowFocus: true, // Recarregar quando a janela receber foco
    staleTime: 30000, // Considera dados obsoletos após 30s
  });
  
  const { data: professionals = [] } = useQuery<any[]>({ 
    queryKey: ["/api/professionals"],
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });
  
  const { data: procedures = [] } = useQuery<any[]>({ 
    queryKey: ["/api/procedures"],
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: 0,
      professionalId: 0,
      date: new Date(),
      time: "08:00",
      status: "scheduled",
      notes: "",
      selectedProcedures: [],
    },
  });
  
  // Calcular valor total dos procedimentos selecionados
  const selectedProceduresTotal = useMemo(() => {
    const selectedProcedureIds = form.watch("selectedProcedures") || [];
    
    return procedures
      .filter(proc => selectedProcedureIds.includes(proc.id))
      .reduce((total, proc) => total + proc.value, 0);
  }, [procedures, form.watch("selectedProcedures")]);

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormValues) => {
      // Combine date and time preservando a data correta
      // Garantir que a data seja tratada corretamente (problema com timezone)
      const dateStr = typeof data.date === 'string' 
        ? data.date 
        : data.date instanceof Date 
          ? data.date.toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0];
          
      console.log("Data selecionada:", dateStr);
      
      // Criar a data com o formato correto
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = data.time.split(":").map(Number);
      
      // Criar um novo objeto de data local para manter o horário exato
      const dateObj = new Date();
      dateObj.setFullYear(year, month - 1, day);
      dateObj.setHours(hours, minutes, 0, 0);
      
      console.log("Data formatada para agendamento:", dateObj.toISOString());
      
      // Verificar se há procedimentos selecionados
      const selectedProcedures = data.selectedProcedures || [];
      if (selectedProcedures.length === 0) {
        throw new Error("Selecione pelo menos um procedimento");
      }
      
      console.log("Procedimentos selecionados:", selectedProcedures);

      // Criar o agendamento base
      const appointmentData = {
        patientId: data.patientId,
        professionalId: data.professionalId,
        date: dateObj, // Enviar objeto de data em vez de string
        status: data.status,
        notes: data.notes,
        procedureIds: selectedProcedures, // Enviar array de procedimentos
      };

      console.log("Enviando dados para API:", appointmentData);
      
      // Criar o agendamento
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      const appointmentResponse = await response.json();
      
      console.log("Agendamento criado:", appointmentResponse);
      
      return appointmentResponse;
    },
    onSuccess: () => {
      // Invalidar todas as consultas que possam ser afetadas pelo novo agendamento
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/waiting-queue"] });
      
      toast({
        title: "Agendamento criado com sucesso",
        description: "O agendamento foi criado com sucesso no sistema.",
      });
      
      // Chama o callback de sucesso, se fornecido
      if (onSuccess) {
        onSuccess();
      } else {
        setLocation("/appointments");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Ocorreu um erro ao criar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  async function onSubmit(values: AppointmentFormValues) {
    setIsSubmitting(true);
    try {
      await createAppointmentMutation.mutateAsync(values);
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-medium">Novo Agendamento</h3>
      </div>
      <div className="p-4 space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Paciente</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-primary"
                      onClick={() => setShowQuickPatient(!showQuickPatient)}
                    >
                      {showQuickPatient ? "Cancelar" : "Criar paciente rápido"}
                    </Button>
                  </div>
                  
                  {showQuickPatient ? (
                    <div className="space-y-4 p-4 border rounded-md bg-slate-50">
                      <div className="space-y-2">
                        <FormLabel className="text-sm">Nome do paciente</FormLabel>
                        <Input
                          placeholder="Digite o nome completo do paciente"
                          value={quickPatientName}
                          onChange={(e) => setQuickPatientName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          O cadastro completo será necessário no momento do check-in
                        </p>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowQuickPatient(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (quickPatientName.trim().length < 3) {
                              toast({
                                title: "Nome inválido",
                                description: "O nome deve ter pelo menos 3 caracteres",
                                variant: "destructive",
                              });
                              return;
                            }
                            createQuickPatientMutation.mutate(quickPatientName);
                          }}
                          disabled={createQuickPatientMutation.isPending || !quickPatientName.trim()}
                        >
                          {createQuickPatientMutation.isPending ? "Criando..." : "Criar paciente"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o paciente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        <div className="p-2 sticky top-0 bg-white z-10">
                          <Input
                            type="text"
                            placeholder="Buscar paciente por nome, CPF ou telefone..."
                            value={searchPatient}
                            onChange={(e) => setSearchPatient(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="mt-2">
                          {patients
                            ?.filter((patient: any) => {
                              if (!searchPatient) return true;
                              
                              // Converter para minúsculas para comparação insensível a maiúsculas/minúsculas
                              const searchLower = searchPatient.toLowerCase();
                              const nameLower = patient.name ? patient.name.toLowerCase() : '';
                              
                              return (
                                nameLower.includes(searchLower) || 
                                (patient.cpf && patient.cpf.includes(searchPatient)) ||
                                (patient.phone && patient.phone.includes(searchPatient))
                              );
                            })
                            .map((patient: any) => (
                              <SelectItem key={patient.id} value={patient.id.toString()}>
                                {patient.name} {patient.phone ? `- ${patient.phone}` : ''}
                              </SelectItem>
                            ))
                          }
                        </div>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      value={field.value instanceof Date ? field.value.toISOString().substr(0, 10) : field.value} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="professionalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    defaultValue={field.value?.toString() || "0"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o profissional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {professionals?.map((professional: any) => (
                        <SelectItem key={professional.id} value={professional.id.toString()}>
                          {professional.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="selectedProcedures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Procedimentos</FormLabel>
                  <div className="mb-2">
                    <Input
                      type="text"
                      placeholder="Buscar procedimento por nome..."
                      value={searchProcedure}
                      onChange={(e) => setSearchProcedure(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="border border-gray-200 rounded-md p-4 space-y-3 max-h-64 overflow-y-auto">
                    {procedures
                      ?.filter((procedure: any) => 
                        procedure.name.toLowerCase().includes(searchProcedure.toLowerCase()))
                      .map((procedure: any) => (
                      <div 
                        key={procedure.id} 
                        className="flex items-center justify-between pb-2 border-b border-gray-100"
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`procedure-${procedure.id}`}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            checked={field.value?.includes(procedure.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                field.onChange([...(field.value || []), procedure.id]);
                              } else {
                                field.onChange(
                                  (field.value || []).filter((id: number) => id !== procedure.id)
                                );
                              }
                            }}
                          />
                          <label 
                            htmlFor={`procedure-${procedure.id}`}
                            className="text-sm font-medium text-gray-700"
                          >
                            {procedure.name} ({procedure.type === "consultation" ? "Consulta" : 
                              procedure.type === "exam" ? "Exame" : "Procedimento"})
                          </label>
                        </div>
                        <div className="text-sm text-gray-500">
                          R$ {procedure.value.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre o agendamento" 
                      className="resize-none" 
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      defaultValue={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Resumo do valor total */}
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-700">
                  Valor Total dos Procedimentos:
                </div>
                <div className="text-lg font-semibold text-primary">
                  R$ {selectedProceduresTotal.toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setLocation("/appointments")}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Agendando..." : "Agendar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
