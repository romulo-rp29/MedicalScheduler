import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { insertEvolutionSchema, insertFinancialRecordSchema } from '@shared/schema';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from "lucide-react";
import { Separator } from '@/components/ui/separator';

const evolutionFormSchema = insertEvolutionSchema.extend({
  procedures: z.array(z.object({
    id: z.number(),
    name: z.string(),
    checked: z.boolean(),
    value: z.number(),
  }))
});

type EvolutionFormValues = z.infer<typeof evolutionFormSchema>;

export default function PatientCare() {
  const { id } = useParams<{ id: string }>();
  const appointmentId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('evolution');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Fetch appointment data
  const { data: appointment, isLoading: appointmentLoading } = useQuery({
    queryKey: ['/api/appointments', appointmentId],
  });
  
  // Fetch patient's history (previous evolutions)
  const { data: evolutions = [], isLoading: evolutionsLoading } = useQuery({
    queryKey: ['/api/evolutions/patient', appointment?.patientId],
    // Só buscar quando tivermos um patientId válido
    enabled: !!appointment?.patientId,
  });

  // Fetch available procedures
  const { data: procedures = [], isLoading: proceduresLoading } = useQuery({
    queryKey: ['/api/procedures'],
  });
  
  // Convert procedures to form format with checked state
  const proceduresWithChecked = procedures.map((proc: any) => {
    // Verificar se este procedimento está entre os procedimentos do agendamento
    const isProcedureInAppointment = appointment?.procedures?.some((appProc: any) => 
      appProc.id === proc.id
    ) || false;
    
    return {
      id: proc.id,
      name: proc.name,
      checked: isProcedureInAppointment,
      value: proc.value
    };
  });
  
  // Mutation to save evolution
  const saveEvolutionMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Dados recebidos na mutação:", data);
      const { procedures, ...evolutionData } = data;
      
      // Garantir que os IDs estão presentes
      if (!evolutionData.patientId || !evolutionData.professionalId || !evolutionData.appointmentId) {
        console.error("Dados incompletos:", evolutionData);
        evolutionData.patientId = appointment?.patientId;
        evolutionData.professionalId = appointment?.professionalId;
        evolutionData.appointmentId = appointmentId;
      }
      
      console.log("Dados de evolução a enviar:", evolutionData);
      
      // First save the evolution
      const response = await apiRequest('POST', '/api/evolutions', evolutionData);
      const evolution = await response.json();
      console.log("Evolução criada:", evolution);
      
      // Then update appointment status and save selected procedures
      const selectedProcedures = procedures.filter((p: any) => p.checked);
      console.log("Procedimentos selecionados:", selectedProcedures);
      
      // Salvando os procedimentos selecionados no agendamento
      for (const proc of selectedProcedures) {
        await apiRequest('POST', '/api/appointment-procedures', {
          appointmentId: appointmentId,
          procedureId: proc.id
        });
      }
      
      // Atualizando o status para completado - O módulo financeiro está temporariamente desativado
      
      /* MÓDULO FINANCEIRO - Comentado para implementação futura
      // Calculate financial values
      const totalValue = selectedProcedures.reduce((sum: number, proc: any) => sum + proc.value, 0);
      
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
      await apiRequest('POST', '/api/financial-records', financialRecord);
      
      return evolution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/waiting-queue'] });
      // Invalidar todas as consultas de evoluções para este paciente
      queryClient.invalidateQueries({ queryKey: ['/api/evolutions/patient', appointment?.patientId] });
      
      toast({
        title: "Atendimento finalizado",
        description: "O atendimento foi registrado com sucesso",
      });
      
      setShowConfirmDialog(false);
      navigate('/waiting-queue');
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar os dados",
        variant: "destructive",
      });
    }
  });

  // Form setup
  const form = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionFormSchema),
    defaultValues: {
      appointmentId,
      patientId: 0, // Será preenchido quando os dados do agendamento estiverem disponíveis
      professionalId: 0, // Será preenchido quando os dados do agendamento estiverem disponíveis
      symptoms: '',
      diagnosis: '',
      notes: '',
      procedures: proceduresWithChecked
    }
  });
  
  // Atualizar os IDs quando o agendamento for carregado
  useEffect(() => {
    if (appointment && !appointmentLoading) {
      form.setValue('patientId', appointment.patientId);
      form.setValue('professionalId', appointment.professionalId);
    }
  }, [appointment, appointmentLoading, form]);
  
  // Atualizar procedimentos quando os dados forem carregados
  useEffect(() => {
    if (!proceduresLoading && procedures.length > 0) {
      form.setValue('procedures', proceduresWithChecked);
    }
  }, [procedures, proceduresLoading, form, proceduresWithChecked]);

  const onSubmit = (data: EvolutionFormValues) => {
    console.log("Formulário submetido:", data);
    setShowConfirmDialog(true);
  };
  
  const confirmFinish = () => {
    const formData = form.getValues();
    console.log("Dados do formulário para envio:", formData);
    
    // Garante que todos os campos obrigatórios estão presentes
    const dataToSubmit = {
      ...formData,
      patientId: appointment?.patientId || formData.patientId,
      professionalId: appointment?.professionalId || formData.professionalId,
      appointmentId: appointmentId
    };
    
    console.log("Dados a serem enviados após validação:", dataToSubmit);
    saveEvolutionMutation.mutate(dataToSubmit);
  };
  
  // Calculate total from selected procedures
  const calculateTotal = () => {
    const procedures = form.getValues().procedures;
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
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src="" alt={appointment.patient?.name || ''} />
              <AvatarFallback>
                {appointment.patient?.name?.charAt(0) || 'P'}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-semibold text-gray-900">
              Atendimento - {appointment.patient?.name || 'Paciente'}
            </h1>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() => navigate('/waiting-queue')}
              className="mr-2"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="evolution" className="flex-1">Evolução</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger>
            <TabsTrigger value="exams" className="flex-1">Exames</TabsTrigger>
            <TabsTrigger value="financial" className="flex-1">Financeiro</TabsTrigger>
          </TabsList>
          
          <TabsContent value="evolution" className="mt-4">
            <Card>
              <CardContent className="pt-6">
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
                            <Input placeholder="Diagnóstico" {...field} />
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
                        {form.getValues().procedures.map((procedure, index) => (
                          <div key={procedure.id} className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <div className="flex items-center">
                              <FormField
                                control={form.control}
                                name={`procedures.${index}.checked`}
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2">
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
                    
                    <div className="flex justify-end gap-2">
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
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Atendimentos</CardTitle>
              </CardHeader>
              <CardContent>
                {evolutionsLoading ? (
                  <div className="py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : evolutions.length > 0 ? (
                  <div className="space-y-6">
                    {evolutions.map((evolution: any) => (
                      <div key={evolution.id} className="border-b pb-6">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">
                            {new Date(evolution.createdAt).toLocaleDateString()}
                          </h3>
                          <span className="text-sm text-gray-500">
                            {new Date(evolution.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        {evolution.diagnosis && (
                          <div className="mb-2">
                            <p className="text-sm font-medium text-gray-500">Diagnóstico</p>
                            <p>{evolution.diagnosis}</p>
                          </div>
                        )}
                        
                        {evolution.symptoms && (
                          <div className="mb-2">
                            <p className="text-sm font-medium text-gray-500">Sintomas</p>
                            <p>{evolution.symptoms}</p>
                          </div>
                        )}
                        
                        {evolution.notes && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Observações</p>
                            <p>{evolution.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 py-4">Nenhum histórico encontrado para este paciente.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="exams" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Exames</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Nenhum exame encontrado para este paciente.</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* MÓDULO FINANCEIRO - Comentado para implementação futura */}
          <TabsContent value="financial" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Financeiras</CardTitle>
                <CardDescription className="text-amber-500 font-semibold">
                  Módulo financeiro será disponibilizado em breve
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    O módulo financeiro está temporariamente desativado.
                    <br />
                    Esta funcionalidade estará disponível em uma próxima atualização.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
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
