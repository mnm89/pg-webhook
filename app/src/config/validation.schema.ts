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
export const validationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  SCHEMA_NAMES,
  PUBLICATION_NAME: Joi.string().required(),
  SLOT_NAME: Joi.string().required(),
  PORT: Joi.number().default(3000),
});
