import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Mail,
  Phone,
  UserCog,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";

// Form schema with custom validation
const userFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  phone: z.string().optional(),
  role: z.string(),
  specialty: z.string().optional(),
  isActive: z.boolean(),
})
  .extend({
    confirmPassword: z
      .string()
      .min(6, "Senha de confirmação deve ter pelo menos 6 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type UserFormValues = z.infer<typeof userFormSchema>;

const medicalUserSchema = z.object({
  specialty: z.string().min(1, "Especialidade é obrigatória"),
  commission: z.number().min(0, "Comissão deve ser maior ou igual a 0"),
});

type MedicalUserValues = z.infer<typeof medicalUserSchema>;


export default function Users() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [showMedicalDialog, setShowMedicalDialog] = useState(false);
  const [newUserId, setNewUserId] = useState<number | null>(null);
  const medicalForm = useForm<MedicalUserValues>({
    resolver: zodResolver(medicalUserSchema),
    defaultValues: {
      specialty: "",
      commission: 0,
    },
  });

  // Fetch users data
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  // Initialize form
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      role: "receptionist",
      isActive: true,
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.role === "medico") {
        // Get specialty from form data
        const specialty = form.getValues("specialty");

        // Automatically create professional record
        const professionalData = {
          userId: data.id,
          specialty: specialty || "Clínico Geral", // Use form value or default
          commission: 0.2 // Default 20% commission
        };

        try {
          await createProfessionalMutation.mutateAsync(professionalData);
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
          toast({
            title: "Médico cadastrado",
            description: "O médico foi cadastrado com sucesso como profissional.",
          });
          setIsNewUserOpen(false);
          form.reset();
        } catch (error) {
          toast({
            title: "Erro",
            description: error instanceof Error ? error.message : "Erro ao criar profissional",
            variant: "destructive",
          });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({
          title: "Usuário cadastrado",
          description: "O usuário foi cadastrado com sucesso.",
        });
        setIsNewUserOpen(false);
        form.reset();
      }
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const createProfessionalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/professionals", data);
      return response.json();
    }
  });

  const createMedicalUserMutation = useMutation({
    mutationFn: async (data: MedicalUserValues) => {
      if(newUserId === null) throw new Error('Missing User ID');

      // Create professional record
      const professionalData = {
        userId: newUserId,
        specialty: data.specialty,
        commission: data.commission
      };

      await createProfessionalMutation.mutateAsync(professionalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      toast({
        title: "Médico Registrado",
        description: "O médico foi registrado com sucesso como profissional.",
      });
      setShowMedicalDialog(false);
      setIsNewUserOpen(false);
      form.reset();
      medicalForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao registrar médico como profissional",
        variant: "destructive",
      });
    },
  });


  // Toggle user active status mutation
  const toggleUserActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PUT", `/api/users/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Status atualizado",
        description: "O status do usuário foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar status do usuário",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormValues) => {
    createUserMutation.mutate(data);
  };

  const onSubmitMedicalDetails = (data: MedicalUserValues) => {
    createMedicalUserMutation.mutate(data);
  }

  const { watch } = form;

  // Filter users based on search term and role
  const filteredUsers = users.filter((user: any) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Get role badge styling
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1"
          >
            <ShieldCheck className="h-3 w-3" />
            Administrador
          </Badge>
        );
      case "professional":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1"
          >
            <UserCog className="h-3 w-3" />
            Profissional
          </Badge>
        );
      case "receptionist":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
          >
            <UserCheck className="h-3 w-3" />
            Recepcionista
          </Badge>
        );
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Toggle user active status
  const toggleUserActive = (id: number, currentStatus: boolean) => {
    toggleUserActiveMutation.mutate({
      id,
      isActive: !currentStatus,
    });
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Usuários</h1>
            <p className="mt-1 text-sm text-gray-500">
              {users.length} usuários cadastrados
            </p>
          </div>
          <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Adicione um novo usuário ao sistema.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome*</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome completo" {...field} />
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
                        <FormLabel>Email*</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@exemplo.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Senha"
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Senha*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Confirmar senha"
                              type="password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(00) 00000-0000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Função*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a função" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="admin">
                                Administrador
                              </SelectItem>
                              <SelectItem value="medico">
                                Médico
                              </SelectItem>
                              <SelectItem value="recepcionista">
                                Recepcionista
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            A função determina as permissões do usuário.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {watch("role") === "medico" && (
                    <FormField
                      control={form.control}
                      name="specialty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Especialidade*</FormLabel>
                          <FormControl>
                            <Input placeholder="Especialidade" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Usuário Ativo
                          </FormLabel>
                          <FormDescription>
                            Usuários inativos não podem acessar o sistema.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewUserOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending
                        ? "Criando..."
                        : "Criar Usuário"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={showMedicalDialog} onOpenChange={setShowMedicalDialog}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Detalhes do Médico</DialogTitle>
                <DialogDescription>
                  Adicione as especialidades e comissão do médico.
                </DialogDescription>
              </DialogHeader>
              <Form {...medicalForm} onSubmit={medicalForm.handleSubmit(onSubmitMedicalDetails)}>
                <form className="space-y-4">
                  <FormField
                    control={medicalForm.control}
                    name="specialty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidade*</FormLabel>
                        <FormControl>
                          <Input placeholder="Especialidade" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={medicalForm.control}
                    name="commission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comissão da Clínica*</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Comissão" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowMedicalDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMedicalUserMutation.isPending}>
                      {createMedicalUserMutation.isPending ? "Salvando..." : "Salvar Detalhes"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <CardTitle>Lista de Usuários</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 md:items-center">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as funções</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                    <SelectItem value="professional">Profissionais</SelectItem>
                    <SelectItem value="receptionist">Recepcionistas</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Buscar usuários..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <CardDescription>Gerencie os usuários do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src="" alt={user.name} />
                            <AvatarFallback>
                              {user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.phone ? (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {user.phone}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Ativo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleUserActive(user.id, user.isActive)
                          }
                          className={
                            user.isActive ? "text-red-600" : "text-green-600"
                          }
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Ativar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum usuário encontrado.</p>
              </div>
            )}
          </CardContent>
          {filteredUsers.length > 0 && (
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div className="text-sm text-gray-500">
                Mostrando {filteredUsers.length} de {users.length} usuários
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}