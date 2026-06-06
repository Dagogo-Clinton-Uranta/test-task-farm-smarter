import { Document, Types } from 'mongoose';

/**
 * Agent Interface matching EXACT production database schema
 * Collection: test.agentdbs
 *
 * ⚠️ CRITICAL:
 * - Field names must match exactly (user_id, created_by, etc.)
 * - Collection name is 'agentdbs' not 'agents'
 */
export interface IAgent extends Document {
  _id: Types.ObjectId;

  // Required fields
  firstName: string;
  lastName: string;
  phoneNumber: string;

  // Relationships
  user_id: Types.ObjectId; // → userdbs (required)
  created_by?: Types.ObjectId; // → userdbs (admin who created)

  // Optional fields
  agentId?: string;
  agentAddedId?: string;
  username?: string;
  gender?: string;
  age?: number;
  country?: string;
  location?: string;
  image?: string;
  isActive?: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

/**
 * Agent creation input
 */
export interface IAgentCreateInput {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  location?: string;
  user_id: Types.ObjectId;
  created_by?: Types.ObjectId;
  agentId?: string;
  username?: string;
  gender?: string;
  age?: number;
  country?: string;
  image?: string;
}

/**
 * Agent update input
 */
export interface IAgentUpdateInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  location?: string;
  created_by?: Types.ObjectId;
  agentId?: string;
  username?: string;
  gender?: string;
  age?: number;
  country?: string;
  image?: string;
  isActive?: boolean;
}

/**
 * Agent with populated data (from aggregation)
 */
export interface IAgentWithDetails extends IAgent {
  user?: any;
  forms?: any[];
  responses?: any[];
  id?: string;
}
