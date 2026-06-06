import { Document, Types } from 'mongoose';

/**
 * Response Analysis Interface matching EXACT production database schema
 * Collection: test.responseanalysisdbs
 */

export interface IResponseAnalysis extends Document {
  _id: Types.ObjectId;

  // Required fields
  analysisObject: Array<{
    role: string; // 'user' or 'assistant' or 'system'
    content: string;
  }>;
  user_id: Types.ObjectId; // → userdbs
  response_id: Types.ObjectId; // → responsesdbs

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  __v?: number;
}

/**
 * Response Analysis creation input
 */
export interface IResponseAnalysisCreateInput {
  analysisObject: Array<{
    role: string;
    content: string;
  }>;
  user_id: Types.ObjectId;
  response_id: Types.ObjectId;
}

/**
 * Response Analysis update input
 */
export interface IResponseAnalysisUpdateInput {
  analysisObject: Array<{
    role: string;
    content: string;
  }>;
}
