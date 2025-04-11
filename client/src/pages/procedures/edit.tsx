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

// Esquema de validação do formulário
const procedureFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  type: z.enum(["consultation", "exam", "procedure"], {
    required_error: "O tipo do procedimento é obrigatório",
  }),
  value: z.coerce.number().min(0, "O valor não pode ser negativo"),
  description: z.string().optional(),
});

type ProcedureFormValues = z.infer<typeof procedureFormSchema>;

export default function ProcedureEdit() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const params = useParams();
  const id = parseInt(params.id ?? '');
  
  // Verificação de ID válido
  if (isNaN(id)) {
    return <Redirect to="/procedures" />;
  }
  
  // Verificação de permissões - apenas admin pode editar procedimentos
  if (user?.role !== 'admin') {
    return <Redirect to="/" />;
  }

  // Buscar dados do procedimento
  const { data: procedure, isLoading, error } = useQuery<any>({
    queryKey: ['/api/procedures', id],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  // Configuração do formulário
  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureFormSchema),
    defaultValues: {
      name: "",
      type: "consultation",
      value: 0,
      description: "",
    },
  });

  // Função para formatar valor monetário para exibição
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Função para converter string monetária para número
  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  };

  // Atualizar valores do formulário quando os dados do procedimento forem carregados
  useEffect(() => {
    if (procedure) {
      console.log("Dados do procedimento recebidos:", procedure);
      
      form.reset({
        name: procedure.name,
        type: procedure.type,
        value: procedure.value,
        description: procedure.description || "",
      });
    }
  }, [procedure, form]);

  // Mutação para atualizar o procedimento
  const updateMutation = useMutation({
    mutationFn: async (data: ProcedureFormValues) => {
      const response = await apiRequest("PUT", `/api/procedures/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao atualizar procedimento");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Procedimento Atualizado",
        description: "Os dados do procedimento foram atualizados com sucesso.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/procedures'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procedures', id] });
      setLocation("/procedures");
    },
    onError: (error) => {
      console.error("Erro ao atualizar procedimento:", error);
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar o procedimento.",
        variant: "destructive",
      });
    },
  });

  // Função para lidar com o envio do formulário
  const onSubmit = async (data: ProcedureFormValues) => {
    updateMutation.mutate(data);
  };

  // Exibir carregamento
  if (isLoading) {
    return (
      <div className="container py-8 flex flex-col items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p className="text-muted-foreground">Carregando informações do procedimento...</p>
      </div>
    );
  }

  // Exibir erro se não encontrar o procedimento
  if (error || !procedure) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1" 
            onClick={() => setLocation("/procedures")}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <h1 className="text-2xl font-semibold ml-4">Procedimento não encontrado</h1>
        </div>
        
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mb-4">
              Não foi possível encontrar o procedimento solicitado ou você não tem permissão para editá-lo.
            </p>
            <Button onClick={() => setLocation("/procedures")}>
              Voltar para lista de procedimentos
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
          onClick={() => setLocation("/procedures")}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <h1 className="text-2xl font-semibold ml-4">Editar Procedimento</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Dados do Procedimento</CardTitle>
          <CardDescription>
            Edite as informações do procedimento nos campos abaixo
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
                      <FormLabel>Nome do Procedimento</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do procedimento" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Procedimento</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de procedimento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="consultation">Consulta</SelectItem>
                          <SelectItem value="exam">Exame</SelectItem>
                          <SelectItem value="procedure">Procedimento</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          placeholder="Valor do procedimento" 
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrição do procedimento" 
                          className="resize-none" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
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
                  onClick={() => setLocation("/procedures")}
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