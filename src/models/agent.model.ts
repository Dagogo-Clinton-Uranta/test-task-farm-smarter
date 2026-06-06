import mongoose, { Schema, Model } from 'mongoose';
import { IAgent } from '../interfaces/agent.interface.js';

/**
 * Agent Schema matching EXACT production database
 * Collection: test.agentdbs
 *
 * ⚠️ CRITICAL:
 * - Field names preserved exactly (user_id, created_by, etc.)
 * - Collection name is 'agentdbs' not 'agents'
 */

interface IAgentMethods {
  // Add instance methods here if needed
}

type AgentModel = Model<IAgent, object, IAgentMethods>;

const agentSchema = new Schema<IAgent, AgentModel, IAgentMethods>(
  {
    // Required fields
    firstName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
    },

    // Relationships
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs collection
      required: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs (admin who created)
    },

    // Optional fields
    agentId: {
      type: String,
    },
    agentAddedId: {
      type: String,
    },
    username: {
      type: String,
    },
    gender: {
      type: String,
    },
    age: {
      type: Number,
    },
    country: {
      type: String,
    },
    location: {
      type: String,
      default: '',
    },
    image: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'agentdbs', // ⚠️ Exact collection name from production
  }
);

// Indexes for performance
agentSchema.index({ user_id: 1 });
agentSchema.index({ created_by: 1 });
agentSchema.index({ phoneNumber: 1 });
agentSchema.index({ agentId: 1 });
agentSchema.index({ createdAt: -1 });

// Create and export model
export const Agent = mongoose.model<IAgent, AgentModel>('Agent', agentSchema);
