import mongoose, { Schema, Model } from 'mongoose';
import { IAdmin } from '../interfaces/admin.interface.js';

/**
 * Admin Schema matching EXACT production database
 * Collection: test.admindbs
 *
 * ⚠️ CRITICAL:
 * - Field names preserved exactly (user_id, etc.)
 * - Collection name is 'admindbs' not 'admins'
 */

interface IAdminMethods {
  // Add instance methods here if needed
}

type AdminModel = Model<IAdmin, object, IAdminMethods>;

const adminSchema = new Schema<IAdmin, AdminModel, IAdminMethods>(
  {
    // Required fields
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },

    // Relationships
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs collection
      required: true,
    },

    // Optional fields
    email: {
      type: String,
    },
    password: {
      type: String, // Legacy field
    },
    location: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'admindbs', // ⚠️ Exact collection name from production
  }
);

// Indexes for performance
adminSchema.index({ user_id: 1 });
adminSchema.index({ phoneNumber: 1 });
adminSchema.index({ createdAt: -1 });

// Create and export model
export const Admin = mongoose.model<IAdmin, AdminModel>('Admin', adminSchema);
