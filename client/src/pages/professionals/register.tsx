import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, insertProfessionalSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, UserPlus } from "lucide-react";
import { z } from "zod";

// Create a combined schema for professional registration
const professionalFormSchema = z.object({
  // User data
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  phone: z.string().optional(),

  // Professional data
  specialty: z.string().min(1, "Especialidade é obrigatória"),
  commission: z
    .number()
    .min(0, "Comissão não pode ser negativa")
    .max(1, "Comissão não pode ser maior que 100%")
    .or(
      z
        .string()
        .regex(/^\d*\.?\d*$/)
        .transform((val) => parseFloat(val) || 0),
    ),
});

type ProfessionalFormValues = z.infer<typeof professionalFormSchema>;

export default function ProfessionalRegister() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  const form = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      specialty: "",
      commission: 0.2, // Default 20%
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
  });

  // Create professional mutation
  const createProfessionalMutation = useMutation({
    mutationFn: async (professionalData: any) => {
      const response = await apiRequest(
        "POST",
        "/api/professionals",
        professionalData,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
      toast({
        title: "Profissional cadastrado",
        description: "O profissional foi cadastrado com sucesso.",
      });
      navigate("/professionals");
    },
  });

  const onSubmit = async (data: ProfessionalFormValues) => {
    setIsSubmitting(true);
    try {
      // First create the user
      const userData = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: "medico", // Set the role as medico
        isActive: true,
      };

      const user = await createUserMutation.mutateAsync(userData);

      // Then create the professional with the user ID
      const professionalData = {
        userId: user.id,
        specialty: data.specialty,
        commission:
          typeof data.commission === "string"
            ? parseFloat(data.commission)
            : data.commission,
      };

      await createProfessionalMutation.mutateAsync(professionalData);
    } catch (error) {
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao cadastrar profissional",
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
            onClick={() => navigate("/professionals")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Cadastrar Profissional
            </h1>
            <p className="text-sm text-gray-500">
              Adicione um novo profissional ao sistema
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Profissional</CardTitle>
            <CardDescription>
              Preencha os dados do profissional abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Informações Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nome do profissional"
                              {...field}
                            />
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
                              placeholder="Email do profissional"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-medium">
                    Informações Profissionais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                    <FormField
                      control={form.control}
                      name="commission"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Comissão da Clínica (%)*</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="20"
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                // Convert percentage to decimal
                                field.onChange(isNaN(value) ? 0 : value / 100);
                              }}
                              value={
                                typeof field.value === "number"
                                  ? (field.value * 100).toString()
                                  : field.value
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            Percentual que será repassado à clínica sobre o
                            valor dos procedimentos.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <CardFooter className="flex justify-end gap-2 px-0 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/professionals")}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {isSubmitting ? "Cadastrando..." : "Cadastrar Profissional"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
