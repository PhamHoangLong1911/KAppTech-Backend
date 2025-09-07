import mongoose, { Schema, Document } from 'mongoose';

export interface IMedia extends Document {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  alt?: string;
  title?: string;
  description?: string;
  tags?: string[];
  category: 'image' | 'document' | 'video' | 'audio' | 'other';
  uploadedBy: mongoose.Schema.Types.ObjectId;
  isPublic: boolean;
  usageCount: number;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    quality?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const mediaSchema = new Schema<IMedia>({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  mimetype: {
    type: String,
    required: [true, 'MIME type is required']
  },
  size: {
    type: Number,
    required: [true, 'File size is required']
  },
  path: {
    type: String,
    required: [true, 'File path is required']
  },
  url: {
    type: String,
    required: [true, 'File URL is required']
  },
  alt: {
    type: String,
    trim: true,
    maxlength: [255, 'Alt text cannot exceed 255 characters']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    enum: ['image', 'document', 'video', 'audio', 'other'],
    required: [true, 'Category is required']
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  metadata: {
    width: { type: Number },
    height: { type: Number },
    duration: { type: Number },
    format: { type: String },
    quality: { type: String }
  }
}, {
  timestamps: true
});

// Index for better query performance
mediaSchema.index({ category: 1 });
mediaSchema.index({ uploadedBy: 1 });
mediaSchema.index({ mimetype: 1 });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ isPublic: 1 });
mediaSchema.index({ createdAt: -1 });

// Method to determine category from mimetype
mediaSchema.methods.getCategoryFromMimetype = function() {
  if (this.mimetype.startsWith('image/')) return 'image';
  if (this.mimetype.startsWith('video/')) return 'video';
  if (this.mimetype.startsWith('audio/')) return 'audio';
  if (this.mimetype.includes('pdf') || this.mimetype.includes('document') || this.mimetype.includes('text/')) return 'document';
  return 'other';
};

const Media = mongoose.model<IMedia>('Media', mediaSchema);
export default Media;
