import { Document, Types } from 'mongoose';

export interface IRequestNote extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  authorType: 'admin';
  authorUserId: Types.ObjectId;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

