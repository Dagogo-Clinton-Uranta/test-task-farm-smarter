import Joi from 'joi';

const coordinatePairSchema = Joi.array()
  .items(Joi.number().required())
  .length(2)
  .required();

const linearRingSchema = Joi.array()
  .items(coordinatePairSchema)
  .min(4)
  .required()
  .custom((value, helpers) => {
    const first = value[0];
    const last = value[value.length - 1];

    if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
      return helpers.error('any.custom', {
        message: 'GeoJSON polygon linear ring must start and end with the same coordinate',
      });
    }

    return value;
  });

export const createFarmSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  owner_id: Joi.string().trim().min(1).max(255).required(),
  geometry: Joi.object({
    type: Joi.string().valid('Polygon').required(),
    coordinates: Joi.array().items(linearRingSchema).min(1).required(),
  }).required(),
});
