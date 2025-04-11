import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { patientFormSchema as patientSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { ArrowLeft, UserPlus } from "lucide-react";

// Define o tipo para usar com o formulário
type PatientFormValues = z.infer<typeof patientSchema>;

export default function PatientRegister() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Redirect if not authenticated or not admin/recepcionista
  if (!loading && (!user || (user.role !== 'admin' && user.role !== 'recepcionista'))) {
    return <Redirect to="/login" />;
  }

  // Initialize form with default values
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      cpf: "",
      rg: "",
      profession: "",
      birthDate: new Date(), // Usar um objeto Date
      gender: "male",
      address: "",
      observations: "",
      createdBy: user?.id || 0,
    },
  });
  
  // Função para garantir que valores nulos não sejam passados para os campos
  const getSafeValue = (value: any): string => 
    value === null || value === undefined ? "" : String(value);

  const onSubmit = async (data: PatientFormValues) => {
    console.log("Função onSubmit chamada com dados:", data);
    
    if (Object.keys(form.formState.errors).length > 0) {
      console.log("Formulário tem erros de validação:", form.formState.errors);
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Garantir que temos um usuário logado
      if (!user || !user.id) {
        throw new Error("Usuário não autenticado");
      }
      
      console.log("Iniciando cadastro de paciente:", data);
      
      // Enviar para API com a data correta
      const response = await apiRequest("POST", "/api/patients", {
        ...data,
        createdBy: user.id
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao cadastrar paciente");
      }
      
      const patientData = await response.json();
      console.log("Paciente cadastrado com sucesso:", patientData);
      
      // Invalidar a query cache para garantir que os dados mais recentes sejam buscados
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      
      // Notificar sucesso
      toast({
        title: "Sucesso!",
        description: "Paciente cadastrado com sucesso.",
      });
      
      // Redirecionar para lista de pacientes
      navigate("/patients");
      
    } catch (error) {
      console.error("Erro ao cadastrar paciente:", error);
      
      // Notificar erro
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao cadastrar paciente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/patients")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Cadastrar Paciente</h1>
            <p className="text-sm text-gray-500">
              Adicione um novo paciente ao sistema
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Paciente</CardTitle>
            <CardDescription>
              Preencha os dados do paciente abaixo.
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
                        <FormLabel>Nome Completo*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do paciente" {...field} value={getSafeValue(field.value)} />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Email do paciente" {...field} value={getSafeValue(field.value)} />
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
                        <FormLabel>Telefone*</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} value={getSafeValue(field.value)} />
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
                          <Input placeholder="000.000.000-00" {...field} value={getSafeValue(field.value)} />
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
                          <Input placeholder="00.000.000-0" {...field} value={getSafeValue(field.value)} />
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
                          <Input placeholder="Profissão do paciente" {...field} value={getSafeValue(field.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento*</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={
                              typeof field.value === 'string'
                                ? field.value
                                : field.value instanceof Date
                                ? field.value.toISOString().split('T')[0]
                                : ''
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero*</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
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

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input placeholder="Endereço do paciente" {...field} value={getSafeValue(field.value)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações adicionais sobre o paciente" 
                          className="min-h-[100px]"
                          {...field}
                          value={getSafeValue(field.value)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/patients")}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {isSubmitting ? "Cadastrando..." : "Finalizar"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}