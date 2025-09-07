import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface ICaseStudy extends Document {
  title: string;
  slug: string;
  description: string;
  content: string;
  category: string;
  technologies: string[];
  client?: {
    name: string;
    logo?: string;
    website?: string;
  };
  project?: {
    description: string;
    challenge: string;
    solution: string;
    results: string;
    duration: string;
    teamSize: number;
  };
  images: {
    featured: string;
    gallery?: string[];
    screenshots?: string[];
  };
  testimonial?: {
    quote?: string;
    author?: {
      name?: string;
      position?: string;
      company?: string;
      avatar?: string;
    };
  };
  metrics?: Array<{
    label: string;
    value: string;
    improvement: string;
  }>;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };
  projectUrl?: string;
  githubUrl?: string;
  completionDate?: Date;
  publishedAt?: Date;
  author: mongoose.Schema.Types.ObjectId;
  viewCount: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

const caseStudySchema = new Schema<ICaseStudy>({
  title: {
    type: String,
    required: [true, 'Case study title is required'],
    trim: true,
    maxlength: [150, 'Title cannot exceed 150 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  client: {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      maxlength: [100, 'Client name cannot exceed 100 characters']
    },
    industry: {
      type: String,
      required: [true, 'Client industry is required']
    },
    logo: String,
    website: String
  },
  project: {
    description: {
      type: String,
      required: [true, 'Project description is required']
    },
    challenge: {
      type: String,
      required: [true, 'Project challenge is required']
    },
    solution: {
      type: String,
      required: [true, 'Project solution is required']
    },
    results: {
      type: String,
      required: [true, 'Project results are required']
    },
    duration: {
      type: String,
      required: [true, 'Project duration is required']
    },
    teamSize: {
      type: Number,
      min: [1, 'Team size must be at least 1']
    }
  },
  technologies: [{
    name: String,
    category: {
      type: String,
      enum: ['frontend', 'backend', 'database', 'cloud', 'mobile', 'devops', 'other']
    }
  }],
  images: {
    featured: {
      type: String,
      required: [true, 'Featured image is required']
    },
    gallery: [String],
    screenshots: [String]
  },
  testimonial: {
    quote: String,
    author: {
      name: String,
      position: String,
      company: String,
      avatar: String
    }
  },
  metrics: [{
    label: String,
    value: String,
    improvement: String
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
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
caseStudySchema.pre<ICaseStudy>('save', function(next) {
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
caseStudySchema.index({ slug: 1 });
caseStudySchema.index({ status: 1 });
caseStudySchema.index({ 'client.industry': 1 });
caseStudySchema.index({ publishedAt: -1 });
caseStudySchema.index({ isFeatured: -1 });

const CaseStudy = mongoose.model<ICaseStudy>('CaseStudy', caseStudySchema);
export default CaseStudy;
