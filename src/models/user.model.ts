import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../interfaces/user.interface.js';
import { logger } from '../utils/logger.js';

/**
 * User Schema matching EXACT production database
 * Collection: test.userdbs
 *
 * ⚠️ CRITICAL:
 * - Field names preserved exactly (passWord with capital W!)
 * - is_active can be boolean OR string (using Mixed type)
 * - Collection name is 'userdbs' not 'users'
 */

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  comparePin(candidatePin: string): Promise<boolean>;
  toJSON(): Partial<IUser>;
}

type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    // Authentication (⚠️ Note exact casing!)
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // Allow multiple docs without email
    },
    passWord: {
      type: String, // ⚠️ Capital W - main password field
      select: false, // Don't return in queries by default
    },
    password: {
      type: String, // ⚠️ Also exists in some docs
      select: false,
    },
    pin: {
      type: String,
      select: false,
    },

    // Contact info
    phone: String,
    phoneNumber: String,

    // Personal info
    firstName: String,
    lastName: String,
    middleName: String,
    gender: String,
    dateOfBirth: String,

    // Role flags (⚠️ No enum - production DB has various role strings like "SuperAdmin", "Admin", "Agent", etc.)
    role: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isMerchant: {
      type: Boolean,
      default: false,
    },
    isRetailer: {
      type: Boolean,
      default: false,
    },
    isTeller: {
      type: Boolean,
      default: false,
    },

    // Status (⚠️ Can be boolean OR string - using Mixed)
    is_active: {
      type: Schema.Types.Mixed,
      default: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },

    // Profile info
    profilePicture: String,
    address: String,
    city: String,
    state: String,
    country: String,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'userdbs', // ⚠️ Exact collection name from production
  }
);

// Indexes for performance
/*userSchema.index({ email: 1 }, { sparse: true });*/
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ is_active: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save hook: Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('passWord') && !this.isModified('password') && !this.isModified('pin')) {
    return next();
  }

  try {
    // Hash passWord if modified (⚠️ Note capital W)
    if (this.isModified('passWord') && this.passWord) {
      const salt = await bcrypt.genSalt(10);
      this.passWord = await bcrypt.hash(this.passWord, salt);
    }

    // Also hash password field if it exists
    if (this.isModified('password') && this.password) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified('pin') && this.pin) {
      const salt = await bcrypt.genSalt(10);
      this.pin = await bcrypt.hash(this.pin, salt);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method: Compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    // Try passWord first (⚠️ Capital W - primary field)
    if (this.passWord) {
      return await bcrypt.compare(candidatePassword, this.passWord);
    }

    // Fallback to password field if it exists
    if (this.password) {
      return await bcrypt.compare(candidatePassword, this.password);
    }

    return false;
  } catch (error: any) {
    logger.error('Error comparing password', {
      error: error.message,
      stack: error.stack,
      userId: this._id.toString(),
    });
    return false;
  }
};

userSchema.methods.comparePin = async function (
  candidatePin: string
): Promise<boolean> {
  try {
    if (!this.pin) {
      return false;
    }

    return await bcrypt.compare(candidatePin, this.pin);
  } catch (error: any) {
    logger.error('Error comparing pin', {
      error: error.message,
      stack: error.stack,
      userId: this._id.toString(),
    });
    return false;
  }
};

// Instance method: Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const userObject = this.toObject() as any;

  // Remove sensitive fields
  delete userObject.passWord;
  delete userObject.password;
  delete userObject.pin;
  delete userObject.__v;

  return userObject;
};

// Static method: Find by email
userSchema.statics.findByEmail = function (email: string) {
  return this.findOne({ email: email.toLowerCase() }).select('+passWord +password');
};

// Create and export model
export const User = mongoose.model<IUser, UserModel>('User', userSchema);
