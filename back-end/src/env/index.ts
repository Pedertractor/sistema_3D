import z from 'zod';
import 'dotenv/config';

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => value?.trim().toLowerCase() === 'true');

const envSchema = z.object({
  DATABASE_URL: z.string(),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.string().default('3150'),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('12h'),
  APPNAME: z.string().default(''),
  APPKEY: z.string().default(''),
  API_PEDERTRACTOR_URL: z.string().default(''),
  PART_VALIDATION_DISABLED: booleanFromString,
  /** true = não consulta a API de colaboradores e devolve um colaborador fictício (apenas desenvolvimento offline). */
  EMPLOYEE_VALIDATION_DISABLED: booleanFromString,
  UPLOADS_DIR: z.string().default('./uploads'),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().default(50),
  SEED_ADMIN_CARD: z.string().default('0001'),
  SEED_ADMIN_UNIT: z.enum(['PEDERTRACTOR', 'TRACTOR']).default('PEDERTRACTOR'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const err = z.treeifyError(_env.error).properties;
  console.error('Variáveis de ambiente inválidas:', err);
  throw new Error('Variáveis de ambiente inválidas');
}

export const env = _env.data;
