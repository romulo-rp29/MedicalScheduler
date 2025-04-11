import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute, useParams, Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { patientFormSchema as patientSchema } from "@shared/schema";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";

type PatientFormValues = z.infer<typeof patientSchema>;

export default function PatientEdit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const id = parseInt(params.id);
  
  // Verificação de ID válido
  if (isNaN(id)) {
    return <Redirect to="/patients" />;
  }

  // Buscar dados do paciente
  const { data: patient, isLoading, error } = useQuery<any>({
    queryKey: ['/api/patients', id],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Processamento dos dados do paciente para configurar formulário com valores iniciais
  const initialValues = useMemo(() => {
    if (!patient) {
      return {
        name: "",
        email: "",
        phone: "",
        cpf: "",
        rg: "",
        birthDate: new Date(),
        gender: "male" as "male" | "female" | "other",
        address: "",
        observations: "",
        profession: ""
      };
    }
    
    console.log("Configurando valores iniciais a partir dos dados:", patient);
    
    // Processa a data de nascimento
    let birthDate;
    try {
      birthDate = patient.birthDate ? new Date(patient.birthDate) : new Date();
      if (isNaN(birthDate.getTime())) {
        console.warn("Data convertida inválida, usando data atual");
        birthDate = new Date();
      }
    } catch (e) {
      console.error("Erro ao processar data de nascimento:", e);
      birthDate = new Date();
    }
    
    return {
      name: patient.name || "",
      email: patient.email || "",
      phone: patient.phone || "",
      cpf: patient.cpf || "",
      rg: patient.rg || "",
      birthDate: birthDate,
      gender: patient.gender || "male",
      address: patient.address || "",
      observations: patient.observations || "",
      profession: patient.profession || ""
    };
  }, [patient]);
  
  // Configuração do formulário com valores iniciais
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: initialValues
  });
  
  // Atualizar formulário quando os valores iniciais mudarem
  useEffect(() => {
    if (patient) {
      console.log("Atualizando formulário com dados do paciente", initialValues);
      form.reset(initialValues);
    }
  }, [initialValues, form, patient]);

  // Mutação para atualizar o paciente
  const updateMutation = useMutation({
    mutationFn: async (data: PatientFormValues) => {
      console.log("Dados originais recebidos no mutationFn:", data);
      
      // Garantir que todos os campos são enviados com valores válidos
      const cleanedData: Record<string, any> = {};
      
      // Processar todos os campos
      Object.keys(data).forEach((key) => {
        const value = data[key as keyof PatientFormValues];
        
        // Não enviar undefined
        if (value !== undefined) {
          // Converter objetos Date para ISO string
          if (value instanceof Date && !isNaN(value.getTime())) {
            cleanedData[key] = value.toISOString();
          } else {
            cleanedData[key] = value;
          }
        } else {
          // Campos undefined viram null para o backend
          cleanedData[key] = null;
        }
      });
      
      // Se o paciente estava com cadastro incompleto e agora estamos salvando,
      // vamos marcar o cadastro como completo incluindo needsCompletion = false
      const needsCompletion = patient?.needsCompletion || 
                              patient?.observations?.includes('Cadastro rápido');
      
      if (needsCompletion) {
        cleanedData.needsCompletion = false;
        
        // Se tinha observação de cadastro rápido, remover essa parte
        if (cleanedData.observations && typeof cleanedData.observations === 'string' && 
            cleanedData.observations.includes('Cadastro rápido')) {
          cleanedData.observations = cleanedData.observations
            .replace('Cadastro rápido - Completar no check-in', '')
            .trim();
        }
      }
      
      console.log("Dados limpos a serem enviados:", cleanedData);
      
      // O backend está usando PUT, não PATCH
      const response = await apiRequest("PUT", `/api/patients/${id}`, cleanedData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao atualizar paciente");
      }
      return await response.json();
    },
    onSuccess: () => {
      const needsCompletion = patient?.needsCompletion || 
                             patient?.observations?.includes('Cadastro rápido');
      
      toast({
        title: needsCompletion ? "Cadastro Completado" : "Paciente Atualizado",
        description: needsCompletion 
          ? "Os dados do paciente foram completados com sucesso."
          : "Os dados do paciente foram atualizados com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/patients', id] });
      setLocation("/patients");
    },
    onError: (error) => {
      console.error("Erro ao atualizar paciente:", error);
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar o paciente.",
        variant: "destructive",
      });
    },
  });

  // Função para formatar data para exibição no formato DD/MM/YYYY
  const formatDateForDisplay = (date: Date | string | undefined) => {
    if (!date) return '';
    
    try {
      // Se for string, tenta converter para Date
      const parsedDate = typeof date === 'string' ? new Date(date) : date;
      
      // Verificar se a data é válida
      if (isNaN(parsedDate.getTime())) {
        console.warn("Data inválida:", date);
        return '';
      }
      
      // Ajuste do fuso horário para evitar problemas com timezone
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const year = parsedDate.getFullYear();
      
      const formattedDate = `${day}/${month}/${year}`; // Formato dd/MM/yyyy
      console.log(`Formatando data ${date} para exibição: ${formattedDate}`);
      return formattedDate;
    } catch (error) {
      console.error("Erro ao formatar data:", error, typeof date);
      return '';
    }
  };
  
  // Função auxiliar para formatar a entrada de data com inserção automática de barras
  const formatDateInput = (value: string) => {
    // Remove todas as barras
    const clean = value.replace(/\//g, '');
    
    // Se não houver dígitos, retorna vazio
    if (!clean) return '';
    
    // Formata com barras
    if (clean.length <= 2) {
      // Apenas dia
      return clean;
    } else if (clean.length <= 4) {
      // Dia/Mês
      return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    } else {
      // Dia/Mês/Ano
      return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
    }
  };
  
  // Função para converter data no formato DD/MM/YYYY para objeto Date
  const convertStringToDate = (dateString: string) => {
    if (!dateString) return new Date();
    
    try {
      // Formato esperado: DD/MM/YYYY
      const parts = dateString.split('/');
      if (parts.length !== 3) return new Date();
      
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexado em JS
      const year = parseInt(parts[2], 10);
      
      // Criar data ao meio-dia para evitar problemas com fusos horários
      const date = new Date(year, month, day, 12, 0, 0);
      return date;
    } catch (error) {
      console.error("Erro ao converter string para data:", error);
      return new Date();
    }
  };

  // Função para lidar com o envio do formulário
  const onSubmit = async (data: PatientFormValues) => {
    console.log("Função onSubmit chamada com dados:", data);
    
    // Verificar se os dados obrigatórios estão presentes
    if (!data.name || !data.phone || !data.gender) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha pelo menos nome, telefone e gênero.",
        variant: "destructive",
      });
      return;
    }
    
    // Garantir que a data de nascimento seja uma data válida
    if (!(data.birthDate instanceof Date) || isNaN(data.birthDate.getTime())) {
      toast({
        title: "Data inválida",
        description: "Por favor, forneça uma data de nascimento válida.",
        variant: "destructive",
      });
      return;
    }
    
    // Se passou por todas as validações, enviar para o servidor
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-muted-foreground">Carregando informações do paciente...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1" 
            onClick={() => setLocation("/patients")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h1 className="text-2xl font-semibold ml-4">Paciente não encontrado</h1>
        </div>
        
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              Não foi possível encontrar o paciente solicitado ou você não tem permissão para editá-lo.
            </p>
            <Button onClick={() => setLocation("/patients")}>
              Voltar para lista de pacientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1" 
          onClick={() => setLocation("/patients")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <h1 className="text-2xl font-semibold ml-4">Editar Paciente</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dados do Paciente</CardTitle>
          <CardDescription>
            {patient.needsCompletion || patient.observations?.includes('Cadastro rápido') ? (
              <div className="mt-2">
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md mb-2">
                  <p className="font-medium">Cadastro Incompleto</p>
                  <p className="text-sm">
                    Este paciente foi registrado com informações mínimas durante o agendamento. 
                    Por favor, complete os dados do cadastro abaixo.
                  </p>
                </div>
              </div>
            ) : (
              "Edite as informações do paciente nos campos abaixo"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome completo do paciente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="E-mail do paciente" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefone do paciente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input placeholder="CPF do paciente" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RG</FormLabel>
                      <FormControl>
                        <Input placeholder="RG do paciente" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissão</FormLabel>
                      <FormControl>
                        <Input placeholder="Profissão do paciente" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => {
                    // Estado local para data formatada
                    const [formattedDate, setFormattedDate] = useState(() => 
                      formatDateForDisplay(field.value)
                    );
                    
                    // Atualizar a data formatada sempre que field.value mudar
                    useEffect(() => {
                      setFormattedDate(formatDateForDisplay(field.value));
                    }, [field.value]);
                    
                    return (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="DD/MM/AAAA" 
                            value={formattedDate}
                            onChange={(e) => {
                              // Obter apenas números do valor digitado
                              const digitsOnly = e.target.value.replace(/[^\d]/g, '');
                              
                              // Formatar com barras usando a função formatDateInput
                              const formattedValue = formatDateInput(e.target.value);
                              setFormattedDate(formattedValue);
                              
                              console.log("Formatando entrada:", e.target.value, "->", formattedValue);
                              
                              // Validar e converter para Date apenas se tiver o formato correto
                              if (/^\d{2}\/\d{2}\/\d{4}$/.test(formattedValue)) {
                                const date = convertStringToDate(formattedValue);
                                console.log("Data convertida:", date);
                                if (!isNaN(date.getTime())) {
                                  field.onChange(date);
                                }
                              }
                            }}
                            // Adicionar máscara de input para guiar o usuário
                            onKeyDown={(e) => {
                              const value = formattedDate || '';
                              
                              // Permitir teclas de controle como Backspace, Delete, etc.
                              if (
                                e.key === 'Backspace' || 
                                e.key === 'Delete' || 
                                e.key === 'Tab' || 
                                e.key === 'ArrowLeft' || 
                                e.key === 'ArrowRight'
                              ) {
                                return;
                              }
                              
                              // Bloquear caracteres que não são números
                              if (!/\d/.test(e.key) && e.key !== '/') {
                                e.preventDefault();
                                return;
                              }
                              
                              // Adicionar barras automaticamente
                              if (e.key !== '/' && (value.length === 2 || value.length === 5)) {
                                setFormattedDate(value + '/');
                              }
                              
                              // Evitar mais que 10 caracteres (DD/MM/AAAA = 10)
                              if (value.length >= 10 && e.key !== 'Backspace' && e.key !== 'Delete') {
                                e.preventDefault();
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        <FormDescription className="text-xs">
                          Formato: DD/MM/AAAA (exemplo: 29/01/1990)
                        </FormDescription>
                      </FormItem>
                    );
                  }}
                />
                
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o gênero" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input placeholder="Endereço completo do paciente" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Informações adicionais relevantes sobre o paciente"
                        className="min-h-[120px]"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setLocation("/patients")}
            type="button"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => {
              console.log("Formulário será submetido manualmente");
              // Obter dados do formulário
              const data = form.getValues();
              console.log("Dados coletados:", data);
              
              // Validações manuais
              if (!data.name || !data.phone || !data.gender) {
                toast({
                  title: "Dados incompletos",
                  description: "Por favor, preencha pelo menos nome, telefone e gênero.",
                  variant: "destructive",
                });
                return;
              }
              
              // Chamar diretamente a mutação
              updateMutation.mutate(data);
            }}
            disabled={updateMutation.isPending}
            type="button"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}