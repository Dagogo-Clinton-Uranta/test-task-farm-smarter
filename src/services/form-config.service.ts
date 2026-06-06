/**
 * Form Config Service
 * Manages form validation configuration, specifically required fields for farmer forms
 * Configuration is stored at service level (not in database)
 */

/**
 * Default required fields for farmer forms
 * This list can be modified directly in the service
 */
const DEFAULT_FARMER_FORM_REQUIRED_FIELDS = [
  'first_name',
  'last_name',
  'phone_number',
  'can_i_get_your_image',
  'farm_location',
  'farming_type',
  'cropslivestock',
  'farm_size',
  'farm_size_unit',
  'gender',
  'age_range',
  'no_of_spouses',
  'no_of_children',
  'id_government_identification_type',
  'do_you_have_a_smartphone',
  'do_you_do_organic_farming',
  'farming_experience',
];

/**
 * Get farmer form required fields
 */
export const getFarmerFormRequiredFields = (): string[] => {
  return [...DEFAULT_FARMER_FORM_REQUIRED_FIELDS];
};

/**
 * Validate that a form has all required fields for farmer form
 */
export const validateFarmerFormFields = (formFields: Array<{ name: string }>): {
  isValid: boolean;
  missingFields: string[];
} => {
  const requiredFields = getFarmerFormRequiredFields();
  const formFieldNames = formFields.map((field) => field.name);
  
  const missingFields = requiredFields.filter(
    (requiredField) => !formFieldNames.includes(requiredField)
  );
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

// Export service object
export const formConfigService = {
  getFarmerFormRequiredFields,
  validateFarmerFormFields,
};
