import mongoose from 'mongoose';

const savedIssueSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    issueId: {
      type: Number,
      required: [true, 'GitHub issue ID is required'],
    },
    number: {
      type: Number,
      required: [true, 'Issue number is required'],
    },
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    bodySnippet: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Snippet cannot exceed 1000 characters'],
    },
    htmlUrl: {
      type: String,
      required: [true, 'Issue HTML URL is required'],
      trim: true,
    },
    state: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    repository: {
      owner: {
        type: String,
        required: [true, 'Repository owner is required'],
        trim: true,
      },
      name: {
        type: String,
        required: [true, 'Repository name is required'],
        trim: true,
      },
      fullName: {
        type: String,
        required: [true, 'Repository full name is required'],
        trim: true,
      },
    },
    labels: [
      {
        name: { type: String, trim: true },
        color: { type: String, trim: true },
      },
    ],
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['saved', 'in_progress', 'completed', 'dismissed'],
      default: 'saved',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound unique index ensuring a user cannot duplicate save the same issue
savedIssueSchema.index(
  { userId: 1, 'repository.fullName': 1, number: 1 },
  { unique: true }
);

export const SavedIssue =
  mongoose.models.SavedIssue || mongoose.model('SavedIssue', savedIssueSchema);
