import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { evolutionFormSchema } from "@shared/schema";
import { z } from "zod";

import {
  Card,
  CardContent,
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type EvolutionFormValues = z.infer<typeof evolutionFormSchema>;

export default function MedicalConsultationEdit() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Get appointment ID from URL query parameter
  const params = new URLSearchParams(location.split("?")[1]);
  const appointmentId = parseInt(params.get("appointmentId") || "0");
  
  if (!appointmentId) {
    navigate("/waiting-queue");
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

  // Fetch procedures for checklist
  const { data: procedures = [], isLoading: proceduresLoading } = useQuery({
    queryKey: ["/api/procedures"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/procedures");
      return await res.json();
    }
  });

  // Prepare procedures with checked state
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
      patientId: 0,
      professionalId: 0,
      symptoms: "",
      diagnosis: "",
      notes: "",
      procedures: proceduresWithChecked
    }
  });

  // Update IDs when appointment is loaded
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
      
      // Make sure IDs are present
      const dataToSave = {
        ...evolutionData,
        appointmentId,
        patientId: appointment?.patientId || evolutionData.patientId,
        professionalId: appointment?.professionalId || evolutionData.professionalId,
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
        
        // Calculate financial values
        const selectedProcedures = procedures?.filter(p => p.checked) || [];
        const totalValue = selectedProcedures.reduce((sum, proc) => sum + proc.value, 0);
        
        // Get professional commission rate
        const professional = appointment?.professional;
        const commissionRate = professional?.commission || 0.2; // Default 20% if not set
        
        const clinicCommission = totalValue * commissionRate;
        const professionalValue = totalValue - clinicCommission;
        
        // Create financial record
        const financialRecord = {
          appointmentId,
          professionalId: evolution.professionalId,
          totalValue,
          clinicCommission,
          professionalValue
        };
        
        console.log("Registro financeiro a criar:", financialRecord);
        
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
      
      toast({
        title: "Atendimento finalizado",
        description: "O atendimento foi registrado com sucesso",
      });
      
      setShowConfirmDialog(false);
      navigate("/waiting-queue");
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

  if (appointmentLoading || proceduresLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-500">Agendamento não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Evolução de Atendimento - {appointment.patient?.name || 'Paciente'}
        </h1>
        <p className="text-gray-500">
          Preencha as informações da evolução para finalizar o atendimento
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dados do Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium">{appointment.patient?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CPF</p>
              <p className="font-medium">{appointment.patient?.cpf || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Data de Nascimento</p>
              <p className="font-medium">
                {appointment.patient?.birthDate
                  ? new Date(appointment.patient.birthDate).toLocaleDateString()
                  : 'Não informado'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Telefone</p>
              <p className="font-medium">{appointment.patient?.phone || 'Não informado'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Evolução Clínica</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sintomas / Queixas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva os sintomas e queixas do paciente"
                        className="min-h-[100px]"
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
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnóstico</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Diagnóstico" 
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evolução / Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva a evolução do paciente e observações clínicas"
                        className="min-h-[120px]"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Procedure Selection */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Procedimentos Realizados
                </h3>
                <div className="mt-2 border border-gray-300 rounded-md p-4 space-y-2">
                  {form.getValues().procedures?.map((procedure, index) => (
                    <div key={procedure.id} className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <div className="flex items-center">
                        <FormField
                          control={form.control}
                          name={`procedures.${index}.checked`}
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 m-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <label className="text-sm text-gray-900">
                                {procedure.name}
                              </label>
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="text-sm text-gray-700">
                        R$ {procedure.value.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Total */}
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <div className="text-lg font-semibold">
                  Total: R$ {calculateTotal().toFixed(2)}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                  Finalizar Atendimento
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/waiting-queue')}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar finalização de atendimento</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja finalizar este atendimento? Esta ação não poderá ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={confirmFinish}
              disabled={saveEvolutionMutation.isPending}
            >
              {saveEvolutionMutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}