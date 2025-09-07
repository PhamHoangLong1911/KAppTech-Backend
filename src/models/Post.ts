import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'archived';
  category: 'technology' | 'business' | 'design' | 'tutorial' | 'news' | 'tips';
  tags: string[];
  featuredImage?: string;
  author: mongoose.Schema.Types.ObjectId;
  readTime: number;
  viewCount: number;
  likes: number;
  featured: boolean;
  publishedAt?: Date;
  scheduledAt?: Date;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>({
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'Post content is required']
  },
  excerpt: {
    type: String,
    required: [true, 'Post excerpt is required'],
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  category: {
    type: String,
    enum: ['news', 'insights', 'technology', 'company', 'tutorials', 'announcements'],
    required: [true, 'Category is required']
  },
  tags: [String],
  featuredImage: {
    type: String,
    default: null
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    keywords: [String],
    ogImage: String
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  publishedAt: {
    type: Date,
    default: null
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  viewCount: {
    type: Number,
    default: 0
  },
  readTime: {
    type: Number, // in minutes
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate slug and calculate read time before saving
postSchema.pre<IPost>('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { 
      lower: true, 
      strict: true 
    });
  }
  
  // Calculate read time (average 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Indexes
postSchema.index({ slug: 1 });
postSchema.index({ status: 1 });
postSchema.index({ category: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index({ featured: -1 });

const Post = mongoose.model<IPost>('Post', postSchema);
export default Post;
