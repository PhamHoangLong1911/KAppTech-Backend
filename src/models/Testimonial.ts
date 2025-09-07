import mongoose, { Schema, Document } from 'mongoose';

export interface ITestimonial extends Document {
  name: string;
  position: string;
  company: string;
  content: string;
  rating: number;
  avatar?: string;
  projectTitle?: string;
  projectCategory?: string;
  location?: string;
  testimonialType: 'client' | 'employee' | 'partner' | 'general';
  status: 'pending' | 'approved' | 'rejected';
  isPublic: boolean;
  isFeatured: boolean;
  dateGiven: Date;
  projectDuration?: string;
  projectValue?: string;
  source?: 'website' | 'email' | 'phone' | 'linkedin' | 'referral' | 'other';
  tags?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    linkedin?: string;
    website?: string;
  };
  projectDetails?: {
    services: string[];
    technologies: string[];
    outcome: string;
    challenges?: string;
  };
  order: number; // for sorting testimonials
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  company: {
    type: String,
    required: [true, 'Company is required'],
    trim: true,
    maxlength: [100, 'Company cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Testimonial content is required'],
    minlength: [10, 'Testimonial content must be at least 10 characters'],
    maxlength: [2000, 'Testimonial content cannot exceed 2000 characters']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  avatar: {
    type: String,
    default: ''
  },
  projectTitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Project title cannot exceed 200 characters']
  },
  projectCategory: {
    type: String,
    trim: true,
    enum: ['web-development', 'mobile-app', 'design', 'consulting', 'maintenance', 'other']
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  testimonialType: {
    type: String,
    enum: ['client', 'employee', 'partner', 'general'],
    default: 'client'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  dateGiven: {
    type: Date,
    default: Date.now
  },
  projectDuration: {
    type: String,
    trim: true
  },
  projectValue: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['website', 'email', 'phone', 'linkedin', 'referral', 'other'],
    default: 'website'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    website: { type: String, trim: true }
  },
  projectDetails: {
    services: [{
      type: String,
      trim: true
    }],
    technologies: [{
      type: String,
      trim: true
    }],
    outcome: {
      type: String,
      trim: true,
      maxlength: [1000, 'Outcome description cannot exceed 1000 characters']
    },
    challenges: {
      type: String,
      trim: true,
      maxlength: [1000, 'Challenges description cannot exceed 1000 characters']
    }
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
testimonialSchema.index({ status: 1 });
testimonialSchema.index({ isPublic: 1 });
testimonialSchema.index({ isFeatured: 1 });
testimonialSchema.index({ testimonialType: 1 });
testimonialSchema.index({ rating: -1 });
testimonialSchema.index({ dateGiven: -1 });
testimonialSchema.index({ order: 1 });

const Testimonial = mongoose.model<ITestimonial>('Testimonial', testimonialSchema);
export default Testimonial;
