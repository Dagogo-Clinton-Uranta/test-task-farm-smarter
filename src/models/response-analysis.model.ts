import mongoose, { Schema, Model } from 'mongoose';
import { IResponseAnalysis } from '../interfaces/response-analysis.interface.js';

/**
 * Response Analysis Schema matching EXACT production database
 * Collection: test.responseanalysisdbs
 */

interface IResponseAnalysisMethods {
  // Add instance methods here if needed
}

type ResponseAnalysisModel = Model<IResponseAnalysis, object, IResponseAnalysisMethods>;

const responseAnalysisSchema = new Schema<IResponseAnalysis, ResponseAnalysisModel, IResponseAnalysisMethods>(
  {
    // Required fields
    analysisObject: {
      type: [
        {
          role: {
            type: String,
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
        },
      ],
      required: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to userdbs collection
      required: true,
    },
    response_id: {
      type: Schema.Types.ObjectId,
      ref: 'Response', // Reference to responsesdbs collection
      required: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'responseanalysisdbs', // ⚠️ Exact collection name from production
  }
);

// Indexes for performance
responseAnalysisSchema.index({ user_id: 1 });
responseAnalysisSchema.index({ response_id: 1 });
responseAnalysisSchema.index({ createdAt: -1 });
// Compound index for unique analysis per user per response
responseAnalysisSchema.index({ user_id: 1, response_id: 1 }, { unique: true });

// Create and export model
export const ResponseAnalysis = mongoose.model<IResponseAnalysis, ResponseAnalysisModel>(
  'ResponseAnalysis',
  responseAnalysisSchema
);
