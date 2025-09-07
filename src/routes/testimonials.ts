import express, { Request, Response } from 'express';
import Testimonial, { ITestimonial } from '../models/Testimonial';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// @desc    Get active testimonials (public)
// @route   GET /api/testimonials
// @access  Public
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const type = req.query.type as string;
    const rating = req.query.rating as string;
    const featured = req.query.featured as string;
    const sort = req.query.sort as string || 'dateGiven';
    const order = req.query.order as string === 'asc' ? 1 : -1;

    // Build query - only show approved and public testimonials
    const query: any = { 
      status: 'approved',
      isPublic: true 
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (type) {
      query.testimonialType = type;
    }

    if (rating) {
      query.rating = { $gte: parseInt(rating) };
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    const testimonials = await Testimonial.find(query)
      .select('-contactInfo') // Don't expose contact info publicly
      .sort({ [sort]: order, order: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Testimonial.countDocuments(query);

    // Get testimonial statistics
    const stats = {
      total: await Testimonial.countDocuments({ status: 'approved', isPublic: true }),
      featured: await Testimonial.countDocuments({ status: 'approved', isPublic: true, isFeatured: true }),
      averageRating: await Testimonial.aggregate([
        { $match: { status: 'approved', isPublic: true } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]),
      byType: await Testimonial.aggregate([
        { $match: { status: 'approved', isPublic: true } },
        { $group: { _id: '$testimonialType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    };

    res.json({
      success: true,
      data: {
        testimonials,
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
    console.error('Get testimonials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching testimonials'
    });
  }
});

// @desc    Get all testimonials (admin only)
// @route   GET /api/testimonials/admin
// @access  Private (admin only)
router.get('/admin', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const type = req.query.type as string;
    const sort = req.query.sort as string || 'createdAt';
    const order = req.query.order as string === 'asc' ? 1 : -1;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (type) {
      query.testimonialType = type;
    }

    const testimonials = await Testimonial.find(query)
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit);

    const total = await Testimonial.countDocuments(query);

    res.json({
      success: true,
      data: {
        testimonials,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all testimonials error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching testimonials'
    });
  }
});

// @desc    Get testimonial by id
// @route   GET /api/testimonials/:id
// @access  Public
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const testimonial = await Testimonial.findOne({
      _id: req.params.id,
      status: 'approved',
      isPublic: true
    }).select('-contactInfo'); // Don't expose contact info publicly
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    res.json({
      success: true,
      data: testimonial
    });
  } catch (error) {
    console.error('Get testimonial error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching testimonial'
    });
  }
});

// @desc    Create new testimonial
// @route   POST /api/testimonials
// @access  Private (admin/editor only)
router.post('/', protect, authorize('admin', 'editor'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      position,
      company,
      content,
      rating = 5,
      avatar,
      projectTitle,
      projectCategory,
      location,
      testimonialType = 'client',
      status = 'pending',
      isPublic = false,
      isFeatured = false,
      dateGiven,
      projectDuration,
      projectValue,
      source = 'website',
      tags = [],
      contactInfo,
      projectDetails,
      order = 0
    } = req.body;

    // Validate required fields
    if (!name || !position || !company || !content) {
      return res.status(400).json({
        success: false,
        message: 'Name, position, company, and content are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const testimonial = new Testimonial({
      name,
      position,
      company,
      content,
      rating,
      avatar,
      projectTitle,
      projectCategory,
      location,
      testimonialType,
      status,
      isPublic,
      isFeatured,
      dateGiven: dateGiven || new Date(),
      projectDuration,
      projectValue,
      source,
      tags,
      contactInfo,
      projectDetails,
      order
    });

    await testimonial.save();

    res.status(201).json({
      success: true,
      data: testimonial,
      message: 'Testimonial created successfully'
    });
  } catch (error) {
    console.error('Create testimonial error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating testimonial'
    });
  }
});

// @desc    Submit testimonial (public)
// @route   POST /api/testimonials/submit
// @access  Public
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const {
      name,
      position,
      company,
      content,
      rating = 5,
      projectTitle,
      projectCategory,
      location,
      testimonialType = 'client',
      projectDuration,
      projectValue,
      contactInfo,
      projectDetails
    } = req.body;

    // Validate required fields
    if (!name || !position || !company || !content) {
      return res.status(400).json({
        success: false,
        message: 'Name, position, company, and content are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const testimonial = new Testimonial({
      name,
      position,
      company,
      content,
      rating,
      projectTitle,
      projectCategory,
      location,
      testimonialType,
      status: 'pending', // All public submissions are pending
      isPublic: false,
      isFeatured: false,
      dateGiven: new Date(),
      projectDuration,
      projectValue,
      source: 'website',
      contactInfo,
      projectDetails
    });

    await testimonial.save();

    res.status(201).json({
      success: true,
      message: 'Thank you for your testimonial! It will be reviewed and published soon.'
    });
  } catch (error) {
    console.error('Submit testimonial error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error submitting testimonial'
    });
  }
});

// @desc    Update testimonial
// @route   PUT /api/testimonials/:id
// @access  Private (admin/editor only)
router.put('/:id', protect, authorize('admin', 'editor'), async (req: Request, res: Response) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    const {
      name,
      position,
      company,
      content,
      rating,
      avatar,
      projectTitle,
      projectCategory,
      location,
      testimonialType,
      status,
      isPublic,
      isFeatured,
      dateGiven,
      projectDuration,
      projectValue,
      source,
      tags,
      contactInfo,
      projectDetails,
      order
    } = req.body;

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Update fields
    if (name) testimonial.name = name;
    if (position) testimonial.position = position;
    if (company) testimonial.company = company;
    if (content) testimonial.content = content;
    if (rating !== undefined) testimonial.rating = rating;
    if (avatar !== undefined) testimonial.avatar = avatar;
    if (projectTitle !== undefined) testimonial.projectTitle = projectTitle;
    if (projectCategory !== undefined) testimonial.projectCategory = projectCategory;
    if (location !== undefined) testimonial.location = location;
    if (testimonialType) testimonial.testimonialType = testimonialType;
    if (status) testimonial.status = status;
    if (isPublic !== undefined) testimonial.isPublic = isPublic;
    if (isFeatured !== undefined) testimonial.isFeatured = isFeatured;
    if (dateGiven !== undefined) testimonial.dateGiven = dateGiven;
    if (projectDuration !== undefined) testimonial.projectDuration = projectDuration;
    if (projectValue !== undefined) testimonial.projectValue = projectValue;
    if (source) testimonial.source = source;
    if (tags !== undefined) testimonial.tags = tags;
    if (contactInfo !== undefined) testimonial.contactInfo = contactInfo;
    if (projectDetails !== undefined) testimonial.projectDetails = projectDetails;
    if (order !== undefined) testimonial.order = order;

    await testimonial.save();

    res.json({
      success: true,
      data: testimonial,
      message: 'Testimonial updated successfully'
    });
  } catch (error) {
    console.error('Update testimonial error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating testimonial'
    });
  }
});

// @desc    Delete testimonial
// @route   DELETE /api/testimonials/:id
// @access  Private (admin only)
router.delete('/:id', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    await Testimonial.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error) {
    console.error('Delete testimonial error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting testimonial'
    });
  }
});

// @desc    Approve testimonial
// @route   PUT /api/testimonials/:id/approve
// @access  Private (admin/editor only)
router.put('/:id/approve', protect, authorize('admin', 'editor'), async (req: Request, res: Response) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    testimonial.status = 'approved';
    testimonial.isPublic = true;
    await testimonial.save();

    res.json({
      success: true,
      data: testimonial,
      message: 'Testimonial approved successfully'
    });
  } catch (error) {
    console.error('Approve testimonial error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving testimonial'
    });
  }
});

// @desc    Reject testimonial
// @route   PUT /api/testimonials/:id/reject
// @access  Private (admin/editor only)
router.put('/:id/reject', protect, authorize('admin', 'editor'), async (req: Request, res: Response) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    testimonial.status = 'rejected';
    testimonial.isPublic = false;
    await testimonial.save();

    res.json({
      success: true,
      data: testimonial,
      message: 'Testimonial rejected'
    });
  } catch (error) {
    console.error('Reject testimonial error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting testimonial'
    });
  }
});

export default router;
