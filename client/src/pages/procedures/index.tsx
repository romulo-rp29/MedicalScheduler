import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertProcedureSchema } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Search, 
  Plus, 
  FileText, 
  Stethoscope,
  Microscope,
  DollarSign
} from 'lucide-react';
import { z } from 'zod';

// Create a form schema
const procedureFormSchema = insertProcedureSchema.extend({
  value: insertProcedureSchema.shape.value.or(
    z.string().regex(/^\d*\.?\d*$/).transform(val => parseFloat(val) || 0)
  ),
});

type ProcedureFormValues = Omit<
  typeof procedureFormSchema._type,
  "value"
> & {
  value: string | number;
};

export default function Procedures() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewProcedureOpen, setIsNewProcedureOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  
  // Fetch procedures data
  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ['/api/procedures'],
  });
  
  // Initialize form
  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'consultation',
      value: '',
    },
  });
  
  // Create procedure mutation
  const createProcedureMutation = useMutation({
    mutationFn: async (data: ProcedureFormValues) => {
      return apiRequest('POST', '/api/procedures', {
        ...data,
        value: typeof data.value === 'string' ? parseFloat(data.value) : data.value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procedures'] });
      toast({
        title: 'Procedimento criado',
        description: 'O procedimento foi criado com sucesso.',
      });
      setIsNewProcedureOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar procedimento',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: ProcedureFormValues) => {
    createProcedureMutation.mutate(data);
  };
  
  // Filter procedures based on search term and type
  const filteredProcedures = procedures.filter((procedure: any) => {
    const matchesSearch = procedure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          procedure.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || procedure.type === selectedType;
    
    return matchesSearch && matchesType;
  });
  
  // Get icon based on procedure type
  const getProcedureIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <Stethoscope className="h-4 w-4 text-blue-500" />;
      case 'exam':
        return <Microscope className="h-4 w-4 text-green-500" />;
      case 'procedure':
        return <FileText className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get label for procedure type
  const getProcedureTypeLabel = (type: string) => {
    switch (type) {
      case 'consultation':
        return 'Consulta';
      case 'exam':
        return 'Exame';
      case 'procedure':
        return 'Procedimento';
      default:
        return type;
    }
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Procedimentos</h1>
            <p className="mt-1 text-sm text-gray-500">
              {procedures.length} procedimentos cadastrados
            </p>
          </div>
          {user?.role === 'admin' && (
            <Dialog open={isNewProcedureOpen} onOpenChange={setIsNewProcedureOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Procedimento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Procedimento</DialogTitle>
                  <DialogDescription>
                    Adicione um novo procedimento, exame ou consulta ao sistema.
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
                          <FormLabel>Tipo*</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
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
                          <FormLabel>Valor (R$)*</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="0.00" 
                              {...field}
                              onChange={(e) => {
                                // Allow only numbers and decimal point
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                field.onChange(value);
                              }}
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
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsNewProcedureOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createProcedureMutation.isPending}>
                        {createProcedureMutation.isPending ? "Criando..." : "Criar Procedimento"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <CardTitle>Lista de Procedimentos</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 md:items-center">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="consultation">Consultas</SelectItem>
                    <SelectItem value="exam">Exames</SelectItem>
                    <SelectItem value="procedure">Procedimentos</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Buscar procedimentos..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <CardDescription>
              Gerencie os procedimentos, exames e consultas da clínica
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : filteredProcedures.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    {user?.role === 'admin' && (
                      <TableHead className="text-right">Ações</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProcedures.map((procedure: any) => (
                    <TableRow key={procedure.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {getProcedureIcon(procedure.type)}
                          <span className="ml-2">{procedure.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getProcedureTypeLabel(procedure.type)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {procedure.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          {procedure.value.toFixed(2)}
                        </div>
                      </TableCell>
                      {user?.role === 'admin' && (
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/procedures/edit/${procedure.id}`}>
                              Editar
                            </Link>
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhum procedimento encontrado.</p>
                {user?.role === 'admin' && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsNewProcedureOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Procedimento
                  </Button>
                )}
              </div>
            )}
          </CardContent>
          {filteredProcedures.length > 0 && (
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <div className="text-sm text-gray-500">
                Mostrando {filteredProcedures.length} de {procedures.length} procedimentos
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
