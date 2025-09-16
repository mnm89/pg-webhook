import * as Joi from 'joi';

const SCHEMA_NAMES = Joi.string()
  .default(['public'])
  .custom((value: string) => {
    return value.split(',').map((s: string) => s.trim());
  }, 'CSV to Array')
  .custom((arr: string[], helpers) => {
    if (!Array.isArray(arr) || arr.some((s) => !s)) {
      return helpers.error('any.invalid');
    }
    return arr;
  });
const SLOT_NAME = Joi.string()
  .pattern(/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/)
  .required()
  .messages({
    'string.pattern.base':
      'SLOT_NAME must start with a letter or underscore, and contain only letters, numbers, and underscores (max 63 chars)',
  });
const PUBLICATION_PREFIX = Joi.string()
  .pattern(/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/)
  .required()
  .messages({
    'string.pattern.base':
      'PUBLICATION_PREFIX must start with a letter or underscore, and contain only letters, numbers, and underscores (max 63 chars)',
  });
const NODE_ENV = Joi.string()
  .valid('development', 'production', 'test', 'provision')
  .default('development');
const LOG_LEVELS = Joi.string()
  .default(['log', 'error', 'warn', 'debug', 'verbose', 'fatal'])
  .custom((value: string) => {
    return value.split(',').map((s: string) => s.trim());
  }, 'CSV to Array')
  .custom((arr: string[], helpers) => {
    if (
      !Array.isArray(arr) ||
      arr.some((s) => !s) ||
      !arr.every((s) =>
        ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'].includes(s),
      )
    ) {
      return helpers.error('any.invalid');
    }
    return arr;
  });

export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  SCHEMA_NAMES,
  PUBLICATION_PREFIX,
  SLOT_NAME,
  LOG_LEVELS,
  LOG_JSON: Joi.boolean().default(false),
  NODE_ENV,
  PORT: Joi.number().default(3000),
  WEBHOOKS_API_KEY: Joi.string().required(),
  WEBHOOK_MAX_RETRIES: Joi.number().default(3),
  WEBHOOK_RETRY_DELAY: Joi.number().default(2000),
});
