import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

// Definindo o schema para atualização do perfil
const profileFormSchema = z.object({
  name: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().optional().nullable(),
  // Senha é opcional para permitir que o usuário atualize outros campos sem mudar senha
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }).optional()
    .or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal(''))
}).refine(data => {
  // Se uma das senhas estiver presente, a outra também deve estar
  const passwordExists = !!data.password?.trim();
  const confirmPasswordExists = !!data.confirmPassword?.trim();
  
  // Se uma estiver presente e a outra não, retorna falso
  if (passwordExists !== confirmPasswordExists) {
    return false;
  }
  
  // Se ambas estiverem presentes, devem ser iguais
  if (passwordExists && confirmPasswordExists) {
    return data.password === data.confirmPassword;
  }
  
  // Se ambas estiverem ausentes, está tudo bem
  return true;
}, {
  message: 'As senhas não conferem',
  path: ['confirmPassword']
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Carregar dados do usuário
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/auth/current-user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/current-user', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Erro ao carregar usuário');
      }
      return response.json();
    },
    enabled: !!user // Só carrega se o usuário estiver logado
  });
  
  // Configuração do formulário
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });
  
  // Atualizar os valores do formulário quando os dados do usuário forem carregados
  React.useEffect(() => {
    if (userData?.user) {
      form.reset({
        name: userData.user.name || '',
        email: userData.user.email || '',
        phone: userData.user.phone || '',
        password: '',
        confirmPassword: ''
      });
    }
  }, [userData, form]);
  
  // Mutation para atualizar o perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // Remover confirmPassword e senha vazia antes de enviar
      const dataToSend = { ...data };
      delete dataToSend.confirmPassword;
      
      if (!dataToSend.password) {
        delete dataToSend.password;
      }
      
      const response = await apiRequest('PUT', '/api/profile', dataToSend);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso",
        variant: "default"
      });
      
      // Limpar campos de senha
      form.setValue('password', '');
      form.setValue('confirmPassword', '');
      
      // Atualizar os dados do usuário na cache
      queryClient.invalidateQueries({ queryKey: ['/api/auth/current-user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive"
      });
    }
  });
  
  // Função para enviar o formulário
  function onSubmit(data: ProfileFormValues) {
    updateProfileMutation.mutate(data);
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>
      
      <Tabs defaultValue="personal">
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais aqui.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
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
                          <Input placeholder="seu@email.com" {...field} />
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
                          <Input placeholder="(00) 00000-0000" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Número de telefone com DDD.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Segurança</CardTitle>
                  <CardDescription>
                    Atualize sua senha aqui. Deixe em branco para manter a senha atual.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Nova senha" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Mínimo de 6 caracteres.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Confirme a nova senha" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </form>
        </Form>
      </Tabs>
      
      {user?.role === 'medico' && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Informações Profissionais</CardTitle>
              <CardDescription>
                Suas informações profissionais. Para alterar, contate a administração.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Função: </span>
                  <span>{user.role === 'medico' ? 'Médico' : 
                         user.role === 'admin' ? 'Administrador' : 
                         user.role === 'recepcionista' ? 'Recepcionista' : 'Usuário'}</span>
                </div>
                
                {/* Informações adicionais para médicos serão carregadas via API */}
                <ProfessionalData userId={user.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Componente para exibir informações profissionais
function ProfessionalData({ userId }: { userId: number }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/professionals/user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/professionals/user/${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar dados profissionais');
      }
      return response.json();
    }
  });
  
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando informações profissionais...</p>;
  }
  
  if (error) {
    return <p className="text-sm text-destructive">Erro ao carregar informações profissionais</p>;
  }
  
  if (!data) {
    return <p className="text-sm text-muted-foreground">Nenhuma informação profissional encontrada</p>;
  }
  
  return (
    <div className="space-y-2">
      <div>
        <span className="font-medium">Especialidade: </span>
        <span>{data.specialty}</span>
      </div>
      <div>
        <span className="font-medium">Comissão: </span>
        <span>{data.commission}%</span>
      </div>
    </div>
  );
}