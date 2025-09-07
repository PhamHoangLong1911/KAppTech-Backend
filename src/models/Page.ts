import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface IPage extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'archived';
  pageType: 'home' | 'about' | 'services' | 'contact' | 'faq' | 'careers' | 'custom';
  featured: boolean;
  author: mongoose.Schema.Types.ObjectId;
  featuredImage?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  };
  template?: string;
  customCSS?: string;
  customJS?: string;
  publishedAt?: Date;
  viewCount: number;
  isHomePage: boolean;
  parentPage?: mongoose.Schema.Types.ObjectId;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>({
  title: {
    type: String,
    required: [true, 'Page title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: [true, 'Page content is required']
  },
  excerpt: {
    type: String,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  pageType: {
    type: String,
    enum: ['home', 'about', 'services', 'contact', 'faq', 'careers', 'custom'],
    default: 'custom'
  },
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
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate slug before saving
pageSchema.pre<IPage>('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { 
      lower: true, 
      strict: true 
    });
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Indexes
pageSchema.index({ slug: 1 });
pageSchema.index({ status: 1 });
pageSchema.index({ pageType: 1 });
pageSchema.index({ publishedAt: -1 });

const Page = mongoose.model<IPage>('Page', pageSchema);
export default Page;
