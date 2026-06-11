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

const polygonCoordinatesSchema = Joi.array().items(linearRingSchema).min(1).required();

const multiPolygonCoordinatesSchema = Joi.array()
  .items(polygonCoordinatesSchema)
  .min(1)
  .required();

const geometrySchema = Joi.object({
  type: Joi.string().valid('Polygon', 'MultiPolygon').required(),
  coordinates: Joi.when('type', {
    switch: [
      { is: 'Polygon', then: polygonCoordinatesSchema },
      { is: 'MultiPolygon', then: multiPolygonCoordinatesSchema },
    ],
    otherwise: Joi.forbidden(),
  }),
})
  .required()
  .messages({
    'any.only': 'geometry.type must be Polygon or MultiPolygon',
  });

export const createFarmSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  owner_id: Joi.string().trim().min(1).max(255).required(),
  geometry: geometrySchema,
  properties: Joi.object({
    crop_type: Joi.string().trim().min(1).max(100).required(),
    area_ha: Joi.number().positive().optional(),
  }).required(),
});
