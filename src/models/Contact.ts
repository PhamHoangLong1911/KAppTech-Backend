import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'website' | 'referral' | 'social' | 'email' | 'phone' | 'other';
  inquiryType: 'general' | 'quote' | 'support' | 'partnership' | 'career' | 'other';
  budget?: string;
  timeline?: string;
  services?: string[];
  isNewsletter: boolean;
  ipAddress?: string;
  userAgent?: string;
  responseDate?: Date;
  notes?: string;
  assignedTo?: mongoose.Schema.Types.ObjectId;
  tags?: string[];
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<IContact>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters']
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, 'Company cannot exceed 100 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'closed'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'social', 'email', 'phone', 'other'],
    default: 'website'
  },
  inquiryType: {
    type: String,
    enum: ['general', 'quote', 'support', 'partnership', 'career', 'other'],
    default: 'general'
  },
  budget: {
    type: String,
    trim: true,
    enum: ['under-5k', '5k-10k', '10k-25k', '25k-50k', '50k-100k', 'above-100k', 'not-specified']
  },
  timeline: {
    type: String,
    trim: true,
    enum: ['asap', '1-month', '2-3-months', '3-6-months', '6-12-months', 'flexible']
  },
  services: [{
    type: String,
    trim: true,
    enum: ['web-development', 'mobile-app', 'ui-ux-design', 'branding', 'seo', 'maintenance', 'consulting', 'other']
  }],
  isNewsletter: {
    type: Boolean,
    default: false
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  responseDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  followUpDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
contactSchema.index({ status: 1 });
contactSchema.index({ priority: 1 });
contactSchema.index({ inquiryType: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ assignedTo: 1 });
contactSchema.index({ followUpDate: 1 });

const Contact = mongoose.model<IContact>('Contact', contactSchema);
export default Contact;
