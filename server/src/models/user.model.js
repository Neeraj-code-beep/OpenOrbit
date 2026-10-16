import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [
        function () {
          return !this.authProviders || this.authProviders.includes('local');
        },
        'Password is required for local accounts',
      ],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password by default in queries
    },
    authProviders: {
      type: [String],
      enum: ['local', 'github'],
      default: ['local'],
    },

    // GitHub Account Linkage
    githubId: {
      type: String,
      unique: true,
      sparse: true, // Allows null/undefined for local-only accounts
      index: true,
    },
    githubUsername: {
      type: String,
      trim: true,
    },
    githubAvatarUrl: {
      type: String,
      trim: true,
    },
    githubProfileUrl: {
      type: String,
      trim: true,
    },

    // Server-Side Encrypted Credentials & Rotation
    githubAccessTokenEncrypted: {
      type: String,
      select: false,
    },
    githubRefreshTokenEncrypted: {
      type: String,
      select: false,
    },
    githubTokenExpiresAt: {
      type: Date,
      select: false,
    },
    githubRefreshTokenExpiresAt: {
      type: Date,
      select: false,
    },
    githubKeyVersion: {
      type: String,
      default: 'v1',
      select: false,
    },
    githubScopes: {
      type: [String],
      default: [],
      select: false,
    },

    // Token Refresh Concurrency Control
    githubTokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
    githubTokenRefreshingUntil: {
      type: Date,
      default: null,
      select: false,
    },

    // Reauthentication Ticket Verification (Single-use, short-lived hash)
    reauthTicketHash: {
      type: String,
      default: null,
      select: false,
    },
    reauthTicketExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.password;
        delete ret.reauthTicketHash;
        delete ret.reauthTicketExpiresAt;
        delete ret.githubAccessTokenEncrypted;
        delete ret.githubRefreshTokenEncrypted;
        delete ret.githubTokenExpiresAt;
        delete ret.githubRefreshTokenExpiresAt;
        delete ret.githubKeyVersion;
        delete ret.githubScopes;
        delete ret.githubTokenVersion;
        delete ret.githubTokenRefreshingUntil;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.password;
        delete ret.reauthTicketHash;
        delete ret.reauthTicketExpiresAt;
        delete ret.githubAccessTokenEncrypted;
        delete ret.githubRefreshTokenEncrypted;
        delete ret.githubTokenExpiresAt;
        delete ret.githubRefreshTokenExpiresAt;
        delete ret.githubKeyVersion;
        delete ret.githubScopes;
        delete ret.githubTokenVersion;
        delete ret.githubTokenRefreshingUntil;
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * Pre-save middleware: hash password with bcrypt before saving
 */
userSchema.pre('save', async function () {
  // Only hash password if it exists and has been modified (or is new)
  if (!this.password || !this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compares candidate plaintext password with stored bcrypt hash
 * @param {string} candidatePassword
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword) return false;
  if (!this.password) {
    // If password wasn't selected in query, retrieve it
    const userWithPassword = await mongoose.model('User').findById(this._id).select('+password');
    if (!userWithPassword || !userWithPassword.password) return false;
    return bcrypt.compare(candidatePassword, userWithPassword.password);
  }
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Returns a sanitized plain JavaScript object without sensitive fields
 * @returns {{ id: string, name: string, email: string, authProviders: string[], githubConnected: boolean, githubUsername: string|null, githubAvatarUrl: string|null, hasPassword: boolean, createdAt: Date, updatedAt: Date }}
 */
userSchema.methods.toSafeObject = function () {
  return {
    id: this._id ? this._id.toString() : this.id,
    name: this.name,
    email: this.email,
    authProviders: this.authProviders || ['local'],
    githubConnected: Boolean(this.githubId),
    githubUsername: this.githubUsername || null,
    githubAvatarUrl: this.githubAvatarUrl || null,
    hasPassword: Array.isArray(this.authProviders) && this.authProviders.includes('local'),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
