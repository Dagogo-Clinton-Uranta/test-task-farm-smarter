import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'node:crypto';
import { IForm, IFormField } from '../interfaces/form.interface.js';

/**
 * Form Schema matching EXACT production database
 * Collection: test.formdbs
 *
 * ⚠️ CRITICAL:
 * - Field names preserved exactly (user_id, is_deleted, etc.)
 * - Collection name is 'formdbs' not 'forms'
 * - agents and sharedWith are arrays (can contain strings or ObjectIds)
 */

interface IFormMethods {
  // Add instance methods here if needed
}

type FormModel = Model<IForm, object, IFormMethods>;

// Form field sub-schema
const formFieldSchema = new Schema<IFormField>(
  {
    id: { type: String, required: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    prompt: { type: String },
    type: {
      type: String,
      enum: ['text', 'number', 'select', 'multiselect', 'date', 'file', 'textarea', 'radio', 'checkbox', 'email', 'image', 'gps'],
      required: true,
    },
    isExpanded: { type: Boolean, default: false },
    options: [
      {
        key: String,
        value: String,
      },
    ],
    validations: {
      isRequired: { type: Boolean, default: false },
      isReadOnly: { type: Boolean, default: false },
      min: Number,
      max: Number,
      pattern: String,
    },
  },
  { _id: true } // Allow _id in subdocuments
);

const formSchema = new Schema<IForm, FormModel, IFormMethods>(
  {
    // Basic info
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    photo: {
      type: String,
    },
    quantity: {
      type: Number,
    },

    // Form structure (required)
    fields: {
      type: [formFieldSchema],
      required: true,
    },

    // Visibility (required)
    isPublic: {
      type: Boolean,
      required: true,
      default: false,
    },

    // Special form types
    isFarmerForm: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    schemaHash: {
      type: String,
    },

    // Relationships
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs collection
      required: true,
    },

    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false,
    },

    // Sharing
    agents: {
      type: [Schema.Types.Mixed], // Can be string or ObjectId
      default: [],
    },
    sharedWith: {
      type: [Schema.Types.Mixed], // Can be string or ObjectId
      default: [],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'formdbs', // ⚠️ Exact collection name from production
  }
);

// Indexes for performance
formSchema.index({ user_id: 1 });
formSchema.index({ is_deleted: 1 });
formSchema.index({ isPublic: 1 });
formSchema.index({ isFarmerForm: 1 }); // For uniqueness check
formSchema.index({ 'agents': 1 });
formSchema.index({ 'sharedWith': 1 });
formSchema.index({ createdAt: -1 });
formSchema.index({ title: 1 }); // For text search

// Text search index (if needed)
formSchema.index({ title: 'text', description: 'text' });

formSchema.pre('save', function (next) {
  const hasStructureUpdate =
    this.isModified('fields') || this.isModified('title') || this.isModified('description');

  if (hasStructureUpdate) {
    const hashInput = JSON.stringify({
      fields: this.fields,
      title: this.title,
      description: this.description,
    });
    this.schemaHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    if (!this.isNew) {
      this.version = (this.version || 1) + 1;
    } else if (!this.version) {
      this.version = 1;
    }
  }

  next();
});

// Create and export model
export const Form = mongoose.model<IForm, FormModel>('Form', formSchema);
