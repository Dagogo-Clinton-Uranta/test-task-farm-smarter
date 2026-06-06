import mongoose, { Schema, Model } from 'mongoose';
import { IResponse } from '../interfaces/response.interface.js';

/**
 * Response Schema matching EXACT production database
 * Collection: test.responsesdbs
 *
 * ⚠️ CRITICAL:
 * - Field names preserved exactly (form_id, agent_user_id, is_deleted, etc.)
 * - Collection name is 'responsesdbs' not 'responses'
 * - responseObject is a flexible object (Schema.Types.Mixed)
 */

interface IResponseMethods {
  // Add instance methods here if needed
}

type ResponseModel = Model<IResponse, object, IResponseMethods>;

const responseSchema = new Schema<IResponse, ResponseModel, IResponseMethods>(
  {
    // Required fields
    responseObject: {
      type: Schema.Types.Mixed, // Flexible object - can have any structure
      required: true,
    },
    form_id: {
      type: Schema.Types.ObjectId,
      ref: 'Form', // Reference to formdbs collection
      required: true,
    },
    client_submission_id: {
      type: String,
      trim: true,
    },
    form_version: {
      type: Number,
      min: 1,
    },
    submitted_at_client: {
      type: Date,
    },
    attachments_meta: {
      type: [
        {
          name: String,
          mimeType: String,
          size: Number,
          localKey: String,
        },
      ],
      default: [],
    },

    // Optional user references
    agent_user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs
    },
    admin_user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs
    },
    last_updated_by: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs
    },

    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'responsesdbs', // ⚠️ Exact collection name from production
  }
);

// Indexes for performance
responseSchema.index({ form_id: 1 });
responseSchema.index({ agent_user_id: 1 });
responseSchema.index({ admin_user_id: 1 });
responseSchema.index({ is_deleted: 1 });
responseSchema.index(
  { agent_user_id: 1, client_submission_id: 1 },
  {
    unique: true,
    partialFilterExpression: {
      client_submission_id: { $exists: true, $type: 'string' },
      agent_user_id: { $exists: true, $ne: null },
      is_deleted: false,
    },
  }
);
responseSchema.index({ createdAt: -1 });

// Create and export model
export const Response = mongoose.model<IResponse, ResponseModel>('Response', responseSchema);
