import express, { Request, Response } from 'express';
import Contact, { IContact } from '../models/Contact';
import { protect, authorize } from '../middleware/auth';

// Use require for express-validator due to ESM compatibility issues
const { body, validationResult } = require('express-validator');

const router = express.Router();

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
router.post('/', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('subject').trim().isLength({ min: 5 }).withMessage('Subject must be at least 5 characters'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters')
], async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      name,
      email,
      phone,
      company,
      subject,
      message,
      inquiryType = 'general',
      budget,
      timeline,
      services = [],
      isNewsletter = false
    } = req.body;

    // Get client IP and user agent for tracking
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const contact = new Contact({
      name,
      email,
      phone,
      company,
      subject,
      message,
      inquiryType,
      budget,
      timeline,
      services,
      isNewsletter,
      ipAddress,
      userAgent,
      status: 'new',
      priority: 'medium',
      source: 'website'
    });

    await contact.save();

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to user

    res.json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon!',
      data: {
        id: contact._id,
        name: contact.name,
        email: contact.email,
        subject: contact.subject
      }
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while sending your message. Please try again.'
    });
  }
});

// @desc    Get all contact submissions
// @route   GET /api/contact
// @access  Private (admin only)
router.get('/', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const inquiryType = req.query.inquiryType as string;
    const sort = req.query.sort as string || 'createdAt';
    const order = req.query.order as string === 'asc' ? 1 : -1;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (inquiryType) {
      query.inquiryType = inquiryType;
    }

    const contacts = await Contact.find(query)
      .populate('assignedTo', 'name email')
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(query);

    // Get contact statistics
    const stats = {
      total: await Contact.countDocuments(),
      new: await Contact.countDocuments({ status: 'new' }),
      read: await Contact.countDocuments({ status: 'read' }),
      replied: await Contact.countDocuments({ status: 'replied' }),
      closed: await Contact.countDocuments({ status: 'closed' }),
      byInquiryType: await Contact.aggregate([
        { $group: { _id: '$inquiryType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      byPriority: await Contact.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    };

    res.json({
      success: true,
      data: {
        contacts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contacts'
    });
  }
});

// @desc    Get contact by ID
// @route   GET /api/contact/:id
// @access  Private (admin only)
router.get('/:id', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findById(req.params.id).populate('assignedTo', 'name email');
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Mark as read if it's new
    if (contact.status === 'new') {
      contact.status = 'read';
      await contact.save();
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contact'
    });
  }
});

// @desc    Update contact status/priority/assignment
// @route   PUT /api/contact/:id
// @access  Private (admin only)
router.put('/:id', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    const {
      status,
      priority,
      notes,
      assignedTo,
      followUpDate,
      tags
    } = req.body;

    // Update fields
    if (status) contact.status = status;
    if (priority) contact.priority = priority;
    if (notes !== undefined) contact.notes = notes;
    if (assignedTo !== undefined) contact.assignedTo = assignedTo;
    if (followUpDate !== undefined) contact.followUpDate = followUpDate;
    if (tags !== undefined) contact.tags = tags;

    // Set response date if status changed to replied
    if (status === 'replied' && contact.status !== 'replied') {
      contact.responseDate = new Date();
    }

    await contact.save();
    await contact.populate('assignedTo', 'name email');

    res.json({
      success: true,
      data: contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating contact'
    });
  }
});

// @desc    Delete contact
// @route   DELETE /api/contact/:id
// @access  Private (admin only)
router.delete('/:id', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    await Contact.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting contact'
    });
  }
});

export default router;
