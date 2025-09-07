import mongoose, { Schema, Document } from 'mongoose';
import slugify from 'slugify';

export interface ITeam extends Document {
  name: string;
  slug: string;
  position: string;
  department: 'leadership' | 'development' | 'design' | 'marketing' | 'sales' | 'operations';
  bio: string;
  avatar?: string;
  email?: string;
  phone?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
  };
  skills?: string[];
  experience: number; // years of experience
  joinedDate: Date;
  status: 'active' | 'inactive' | 'alumni';
  isPublic: boolean;
  order: number; // for sorting team members
  achievements?: string[];
  education?: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  languages?: Array<{
    language: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'native';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  department: {
    type: String,
    enum: ['leadership', 'development', 'design', 'marketing', 'sales', 'operations'],
    required: [true, 'Department is required']
  },
  bio: {
    type: String,
    required: [true, 'Bio is required'],
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  avatar: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  social: {
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    github: { type: String, trim: true },
    website: { type: String, trim: true }
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    default: 0,
    min: 0
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'alumni'],
    default: 'active'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  achievements: [{
    type: String,
    trim: true
  }],
  education: [{
    degree: {
      type: String,
      required: true,
      trim: true
    },
    institution: {
      type: String,
      required: true,
      trim: true
    },
    year: {
      type: Number,
      required: true
    }
  }],
  languages: [{
    language: {
      type: String,
      required: true,
      trim: true
    },
    proficiency: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'native'],
      required: true
    }
  }]
}, {
  timestamps: true
});

// Create slug from name before saving
teamSchema.pre<ITeam>('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true
    });
  }
  next();
});

// Index for better query performance
teamSchema.index({ slug: 1 });
teamSchema.index({ department: 1 });
teamSchema.index({ status: 1 });
teamSchema.index({ order: 1 });
teamSchema.index({ isPublic: 1 });

const Team = mongoose.model<ITeam>('Team', teamSchema);
export default Team;
