import { useState, useEffect } from "react";
import { useLocation, useParams, Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";

// Esquema de validação do formulário
const professionalFormSchema = z.object({
  // Campos do profissional
  specialty: z.string().min(3, "A especialidade deve ter pelo menos 3 caracteres"),
  commission: z.coerce.number().min(0, "A comissão não pode ser negativa").max(100, "A comissão não pode exceder 100%"),
  
  // Campos do usuário associado
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido")
});

type ProfessionalFormValues = z.infer<typeof professionalFormSchema>;

export default function ProfessionalEdit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const id = parseInt(params.id ?? '');
  
  // Verificação de ID válido
  if (isNaN(id)) {
    return <Redirect to="/professionals" />;
  }
  
  // Verificação de permissões - apenas admin pode editar profissionais
  if (user?.role !== 'admin') {
    return <Redirect to="/" />;
  }

  // Buscar dados do profissional
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['/api/professionals', id],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Extrair dados do profissional e usuário associado
  const professional = data?.professional;
  const userData = data?.user;

  // Configuração do formulário
  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues: {
      specialty: "",
      commission: 0,
      name: "",
      email: ""
    },
  });

  // Atualizar valores do formulário quando os dados do profissional forem carregados
  useEffect(() => {
    if (professional && userData) {
      console.log("Dados do profissional recebidos:", professional, userData);
      
      form.reset({
        specialty: professional.specialty,
        commission: professional.commission,
        name: userData.name,
        email: userData.email
      });
    }
  }, [professional, userData, form]);

  // Mutação para atualizar o profissional
  const updateMutation = useMutation({
    mutationFn: async (data: ProfessionalFormValues) => {
      const payload = {
        professional: {
          specialty: data.specialty,
          commission: data.commission
        },
        user: {
          name: data.name,
          email: data.email
        }
      };
      
      const response = await apiRequest("PUT", `/api/professionals/${id}`, payload);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao atualizar profissional");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profissional Atualizado",
        description: "Os dados do profissional foram atualizados com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/professionals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/professionals', id] });
      setLocation("/professionals");
    },
    onError: (error) => {
      console.error("Erro ao atualizar profissional:", error);
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar o profissional.",
        variant: "destructive",
      });
    },
  });

  // Função para lidar com o envio do formulário
  const onSubmit = async (data: ProfessionalFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-muted-foreground">Carregando informações do profissional...</p>
      </div>
    );
  }

  if (error || !professional || !userData) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1" 
            onClick={() => setLocation("/professionals")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h1 className="text-2xl font-semibold ml-4">Profissional não encontrado</h1>
        </div>
        
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              Não foi possível encontrar o profissional solicitado ou você não tem permissão para editá-lo.
            </p>
            <Button onClick={() => setLocation("/professionals")}>
              Voltar para lista de profissionais
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
          onClick={() => setLocation("/professionals")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <h1 className="text-2xl font-semibold ml-4">Editar Profissional</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dados do Profissional</CardTitle>
          <CardDescription>
            Edite as informações do profissional nos campos abaixo
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
                        <Input placeholder="Nome completo do profissional" {...field} />
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
                        <Input placeholder="E-mail do profissional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Especialidade do profissional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="commission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comissão (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="0.1"
                          placeholder="Percentual de comissão" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Percentual da comissão sobre os procedimentos realizados
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mr-2"
                  onClick={() => setLocation("/professionals")}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}