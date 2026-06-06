import { Document, Types } from 'mongoose';

/**
 * Form Field Interface
 * Represents a single field in a dynamic form
 */
export interface IFormField {
  _id?: string | Types.ObjectId;
  id: string;
  key: string;
  name: string;
  prompt?: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'file' | 'textarea' | 'radio' | 'checkbox' | 'email' | 'image' | 'gps';
  isExpanded?: boolean;
  options?: Array<{
    key: string;
    value: string;
  }>;
  validations?: {
    isRequired?: boolean;
    isReadOnly?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Form Interface matching EXACT production database schema
 * Collection: test.formdbs
 *
 * ⚠️ CRITICAL:
 * - Field names must match exactly (user_id, is_deleted, etc.)
 * - Collection name is 'formdbs' not 'forms'
 * - agents and sharedWith are arrays of ObjectIds (as strings)
 */
export interface IForm extends Document {
  _id: Types.ObjectId;

  // Basic info
  title?: string;
  description?: string;
  photo?: string;
  quantity?: number;

  // Form structure
  fields: IFormField[]; // Required array of form fields

  // Visibility
  isPublic: boolean; // Required

  // Special form types
  isFarmerForm?: boolean; // True if this is the farmer creation form (only one can be true)
  version?: number;
  schemaHash?: string;

  // Relationships
  user_id: Types.ObjectId; // → userdbs (form creator)

  // Soft delete
  is_deleted: boolean; // Default false

  // Sharing
  agents?: (string | Types.ObjectId)[]; // Agent IDs (can be string or ObjectId)
  sharedWith?: (string | Types.ObjectId)[]; // User IDs (can be string or ObjectId)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

/**
 * Form creation input
 */
export interface IFormCreateInput {
  title?: string;
  description?: string;
  photo?: string;
  quantity?: number;
  fields: IFormField[];
  isPublic: boolean;
  isFarmerForm?: boolean;
  version?: number;
  schemaHash?: string;
  agents?: (string | Types.ObjectId)[];
  sharedWith?: (string | Types.ObjectId)[];
}

/**
 * Form update input
 */
export interface IFormUpdateInput {
  title?: string;
  description?: string;
  photo?: string;
  quantity?: number;
  fields?: IFormField[];
  isPublic?: boolean;
  isFarmerForm?: boolean;
  version?: number;
  schemaHash?: string;
  agents?: (string | Types.ObjectId)[];
  sharedWith?: (string | Types.ObjectId)[];
  is_deleted?: boolean;
}

/**
 * Form query options
 */
export interface IFormQueryOptions {
  withAgents?: boolean;
  includeDeleted?: boolean;
}

/**
 * Form generation input (AI)
 */
export interface IFormGenerationInput {
  formAim?: string;
  numberOfQuestions?: number;
}
