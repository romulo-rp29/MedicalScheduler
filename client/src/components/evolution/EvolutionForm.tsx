import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { insertEvolutionSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface EvolutionFormProps {
  appointmentId: number;
  patientData?: any;
  onComplete?: () => void;
}

// Extend the insertEvolutionSchema with additional validation
const formSchema = insertEvolutionSchema.extend({
  appointmentId: z.number(),
  anamnesis: z.string().min(3, "A anamnese é obrigatória"),
  diagnosis: z.string().min(3, "O diagnóstico é obrigatório"),
});

type EvolutionFormValues = z.infer<typeof formSchema>;

export default function EvolutionForm({
  appointmentId,
  patientData,
  onComplete,
}: EvolutionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Fetch available exams and procedures for the patient
  const { data: exams } = useQuery({
    queryKey: ["/api/procedures"],
    select: (data) => data.filter((proc: any) => proc.type === "exam"),
  });

  const { data: procedures } = useQuery({
    queryKey: ["/api/procedures"],
    select: (data) => data.filter((proc: any) => proc.type === "procedure"),
  });

  const form = useForm<EvolutionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appointmentId,
      anamnesis: "",
      diagnosis: "",
      prescription: "",
      recommendations: "",
      exams: [],
      procedures: [],
    },
  });

  const createEvolutionMutation = useMutation({
    mutationFn: async (data: EvolutionFormValues) => {
      return apiRequest("POST", "/api/evolutions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/evolutions/patient", patientData?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      
      toast({
        title: "Evolução registrada com sucesso",
        description: "O atendimento foi registrado com sucesso.",
      });
      
      if (onComplete) {
        onComplete();
      } else {
        setLocation("/evolutions");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao registrar evolução",
        description:
          error.message ||
          "Ocorreu um erro ao registrar a evolução. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  async function onSubmit(values: EvolutionFormValues) {
    setIsSubmitting(true);
    try {
      // Complete the appointment at the same time
      await apiRequest("POST", `/api/appointments/${appointmentId}/complete`, {});
      
      // Create the evolution record
      await createEvolutionMutation.mutateAsync(values);
    } catch (error) {
      console.error("Erro ao registrar evolução:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <FormField
              control={form.control}
              name="anamnesis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anamnese</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do estado do paciente, sintomas e queixas"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnóstico</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Diagnóstico com CID-10 se apropriado"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div>
            <FormField
              control={form.control}
              name="prescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Medicamentos e tratamentos prescritos"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormField
                control={form.control}
                name="exams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exames Solicitados</FormLabel>
                    <div className="border border-gray-200 rounded-md p-4 space-y-2">
                      {exams?.map((exam: any) => (
                        <div key={exam.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`exam-${exam.id}`}
                            checked={field.value?.includes(exam.name)}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              const newValues = checked
                                ? [...currentValues, exam.name]
                                : currentValues.filter(
                                    (value) => value !== exam.name
                                  );
                              field.onChange(newValues);
                            }}
                          />
                          <Label htmlFor={`exam-${exam.id}`}>{exam.name}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="procedures"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedimentos Realizados</FormLabel>
                    <div className="border border-gray-200 rounded-md p-4 space-y-2">
                      {procedures?.map((procedure: any) => (
                        <div key={procedure.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`procedure-${procedure.id}`}
                            checked={field.value?.includes(procedure.name)}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              const newValues = checked
                                ? [...currentValues, procedure.name]
                                : currentValues.filter(
                                    (value) => value !== procedure.name
                                  );
                              field.onChange(newValues);
                            }}
                          />
                          <Label htmlFor={`procedure-${procedure.id}`}>
                            {procedure.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div>
            <FormField
              control={form.control}
              name="recommendations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recomendações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Orientações para o paciente"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => setLocation("/queue")}>
              Salvar como Rascunho
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Finalizando..." : "Finalizar Atendimento"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
