import mongoose, { Model, Schema } from 'mongoose';
import { IRequestNote } from '../interfaces/request-note.interface.js';

interface RequestNoteModel extends Model<IRequestNote> {}

const requestNoteSchema = new Schema<IRequestNote, RequestNoteModel>(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true,
    },
    authorType: {
      type: String,
      enum: ['admin'],
      required: true,
      default: 'admin',
    },
    authorUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'requestnotes',
    strict: true,
  }
);

requestNoteSchema.index({ requestId: 1, createdAt: -1 });

export const RequestNote = mongoose.model<IRequestNote, RequestNoteModel>(
  'RequestNote',
  requestNoteSchema
);

