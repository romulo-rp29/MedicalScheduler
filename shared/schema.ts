import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'medico', 'recepcionista']);
export const appointmentStatusEnum = pgEnum('appointment_status', ['scheduled', 'waiting', 'in_progress', 'completed', 'cancelled']);
export const appointmentTypeEnum = pgEnum('appointment_type', ['consultation', 'exam', 'procedure']);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Professionals table (extends users)
export const professionals = pgTable("professionals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  specialty: text("specialty").notNull(),
  commission: doublePrecision("commission").notNull(), // percentage that goes to clinic
});

// Patients table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  cpf: text("cpf"),
  rg: text("rg"),
  profession: text("profession"),
  birthDate: timestamp("birth_date").notNull(),
  gender: genderEnum("gender").notNull(),
  address: text("address"),
  observations: text("observations"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  needsCompletion: boolean("needs_completion").default(false), // Flag para indicar se o cadastro precisa ser completado
});

// Procedures table
export const procedures = pgTable("procedures", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: appointmentTypeEnum("type").notNull(),
  value: doublePrecision("value").notNull(), // price of the procedure
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").references(() => patients.id), // Opcional para permitir pré-agendamentos
  professionalId: integer("professional_id").notNull().references(() => professionals.id),
  date: timestamp("date").notNull(),
  status: appointmentStatusEnum("status").notNull().default('scheduled'),
  notes: text("notes"),
  patientName: text("patient_name"), // Para pré-agendamentos
  patientPhone: text("patient_phone"), // Para pré-agendamentos
  isPending: boolean("is_pending").notNull().default(true), // Indica se o cadastro de paciente está completo
});

// Tabela de relação entre agendamentos e procedimentos
export const appointmentProcedures = pgTable("appointment_procedures", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  procedureId: integer("procedure_id").notNull().references(() => procedures.id),
});

// Patient evolutions/medical records
export const evolutions = pgTable("evolutions", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  professionalId: integer("professional_id").notNull().references(() => professionals.id),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  // SOAP fields
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  // Additional fields
  diagnostics: text("diagnostics"),
  prescription: text("prescription"),
  exams: text("exams"),
  // Legacy fields (mantendo por compatibilidade)
  symptoms: text("symptoms"),
  diagnosis: text("diagnosis"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Financial records
export const financialRecords = pgTable("financial_records", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  professionalId: integer("professional_id").notNull().references(() => professionals.id),
  totalValue: doublePrecision("total_value").notNull(),
  clinicCommission: doublePrecision("clinic_commission").notNull(),
  professionalValue: doublePrecision("professional_value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProfessionalSchema = createInsertSchema(professionals).omit({ id: true });

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true });

// Extend the patient schema to handle date transformation
export const patientFormSchema = insertPatientSchema.extend({
  birthDate: z.preprocess(
    (arg) => typeof arg === 'string' ? new Date(arg) : arg,
    z.date()
  ),
});
export const insertProcedureSchema = createInsertSchema(procedures).omit({ id: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true });
export const insertAppointmentProcedureSchema = createInsertSchema(appointmentProcedures).omit({ id: true });

// Extend the appointment schema to handle date transformation and procedures
export const appointmentFormSchema = insertAppointmentSchema.extend({
  date: z.preprocess(
    (arg) => typeof arg === 'string' ? new Date(arg) : arg,
    z.date()
  ),
  // Campo para multiplos procedimentos
  procedureIds: z.array(z.number()).optional(),
});

export type AppointmentFormData = z.infer<typeof appointmentFormSchema>;
export const insertEvolutionSchema = createInsertSchema(evolutions).omit({ id: true, createdAt: true });

// Esquema para evolução com validação
export const evolutionFormSchema = z.object({
  appointmentId: z.number(),
  professionalId: z.number(),
  patientId: z.number(),
  // SOAP fields
  subjective: z.string().nullable().optional(),
  objective: z.string().nullable().optional(),
  assessment: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
  // Additional fields
  diagnostics: z.string().nullable().optional(),
  prescription: z.string().nullable().optional(),
  exams: z.string().nullable().optional(),
  // Legacy fields
  symptoms: z.string().nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  // Procedures for financial calculation
  procedures: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      value: z.number(),
      checked: z.boolean().default(false),
    })
  ).optional(),
});
export const insertFinancialRecordSchema = createInsertSchema(financialRecords).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = z.infer<typeof insertProcedureSchema>;

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;

export type AppointmentProcedure = typeof appointmentProcedures.$inferSelect;
export type InsertAppointmentProcedure = z.infer<typeof insertAppointmentProcedureSchema>;

export type Evolution = typeof evolutions.$inferSelect;
export type InsertEvolution = z.infer<typeof insertEvolutionSchema>;

export type FinancialRecord = typeof financialRecords.$inferSelect;
export type InsertFinancialRecord = z.infer<typeof insertFinancialRecordSchema>;

// Extended schemas for form validation
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;