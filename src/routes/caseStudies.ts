import express, { Request, Response } from 'express';
import CaseStudy, { ICaseStudy } from '../models/CaseStudy';
import User, { IUser } from '../models/User';
import { protect, authorize, optionalAuth } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: IUser;
}

const router = express.Router();

// @desc    Get published case studies (public) or all (admin)
// @route   GET /api/case-studies
// @access  Public/Private
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 9;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const technology = req.query.technology as string;
    const featured = req.query.featured as string;
    const sort = req.query.sort as string || 'publishedAt';
    const order = req.query.order as string === 'asc' ? 1 : -1;

    // Build query
    const query: any = {};
    
    // If not authenticated or not admin/editor, only show published case studies
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      query.status = 'published';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (technology) {
      query.technologies = { $in: [technology] };
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    const caseStudies = await CaseStudy.find(query)
      .populate('author', 'name email')
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit);

    const total = await CaseStudy.countDocuments(query);

    // Get case study statistics
    const stats = {
      total: await CaseStudy.countDocuments(),
      published: await CaseStudy.countDocuments({ status: 'published' }),
      draft: await CaseStudy.countDocuments({ status: 'draft' }),
      featured: await CaseStudy.countDocuments({ isFeatured: true })
    };

    res.json({
      success: true,
      data: {
        caseStudies,
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
    console.error('Get case studies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching case studies'
    });
  }
});

// @desc    Get case study by slug
// @route   GET /api/case-studies/:slug
// @access  Public
router.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const query: any = { slug: req.params.slug };
    
    // If not authenticated or not admin/editor, only show published case studies
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      query.status = 'published';
    }

    const caseStudy = await CaseStudy.findOne(query).populate('author', 'name email');
    
    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: 'Case study not found'
      });
    }

    // Increment view count
    caseStudy.viewCount += 1;
    await caseStudy.save();

    // Get related case studies (same category, excluding current)
    const relatedCaseStudies = await CaseStudy.find({
      category: caseStudy.category,
      status: 'published',
      _id: { $ne: caseStudy._id }
    })
      .populate('author', 'name email')
      .sort({ publishedAt: -1 })
      .limit(3);

    res.json({
      success: true,
      data: {
        caseStudy,
        relatedCaseStudies
      }
    });
  } catch (error) {
    console.error('Get case study by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching case study'
    });
  }
});

// @desc    Create new case study
// @route   POST /api/case-studies
// @access  Private (admin/editor)
router.post('/', protect, authorize('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      content,
      category,
      technologies = [],
      client,
      project,
      images,
      testimonial,
      metrics = [],
      status = 'draft',
      isFeatured = false,
      seo
    } = req.body;

    // Validate required fields
    if (!title || !description || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, content, and category are required'
      });
    }

    // Check if slug already exists
    const existingCaseStudy = await CaseStudy.findOne({ 
      title: { $regex: new RegExp('^' + title + '$', 'i') }
    });

    if (existingCaseStudy) {
      return res.status(400).json({
        success: false,
        message: 'A case study with this title already exists'
      });
    }

    const caseStudy = new CaseStudy({
      title,
      description,
      content,
      category,
      technologies,
      client,
      project,
      images,
      testimonial,
      metrics,
      status,
      isFeatured,
      seo,
      author: req.user!.id,
      publishedAt: status === 'published' ? new Date() : undefined
    });

    await caseStudy.save();
    await caseStudy.populate('author', 'name email');

    res.status(201).json({
      success: true,
      data: caseStudy,
      message: 'Case study created successfully'
    });
  } catch (error) {
    console.error('Create case study error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating case study'
    });
  }
});

// @desc    Update case study
// @route   PUT /api/case-studies/:id
// @access  Private (admin/editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    
    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: 'Case study not found'
      });
    }

    const {
      title,
      description,
      content,
      category,
      technologies,
      client,
      project,
      images,
      testimonial,
      metrics,
      status,
      isFeatured,
      seo
    } = req.body;

    // Check if title changed and if new title exists
    if (title && title !== caseStudy.title) {
      const existingCaseStudy = await CaseStudy.findOne({ 
        title: { $regex: new RegExp('^' + title + '$', 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingCaseStudy) {
        return res.status(400).json({
          success: false,
          message: 'A case study with this title already exists'
        });
      }
    }

    // Update fields
    if (title) caseStudy.title = title;
    if (description) caseStudy.description = description;
    if (content) caseStudy.content = content;
    if (category) caseStudy.category = category;
    if (technologies !== undefined) caseStudy.technologies = technologies;
    if (client !== undefined) caseStudy.client = client;
    if (project !== undefined) caseStudy.project = project;
    if (images !== undefined) caseStudy.images = images;
    if (testimonial !== undefined) caseStudy.testimonial = testimonial;
    if (metrics !== undefined) caseStudy.metrics = metrics;
    if (status) caseStudy.status = status;
    if (isFeatured !== undefined) caseStudy.isFeatured = isFeatured;
    if (seo !== undefined) caseStudy.seo = seo;

    // Set publishedAt if status changed to published
    if (status === 'published' && caseStudy.status !== 'published') {
      caseStudy.publishedAt = new Date();
    }

    await caseStudy.save();
    await caseStudy.populate('author', 'name email');

    res.json({
      success: true,
      data: caseStudy,
      message: 'Case study updated successfully'
    });
  } catch (error) {
    console.error('Update case study error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating case study'
    });
  }
});

// @desc    Delete case study
// @route   DELETE /api/case-studies/:id
// @access  Private (admin only)
router.delete('/:id', protect, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    
    if (!caseStudy) {
      return res.status(404).json({
        success: false,
        message: 'Case study not found'
      });
    }

    await CaseStudy.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Case study deleted successfully'
    });
  } catch (error) {
    console.error('Delete case study error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting case study'
    });
  }
});

// @desc    Get case study categories
// @route   GET /api/case-studies/categories/list
// @access  Public
router.get('/categories/list', async (req: Request, res: Response) => {
  try {
    const categories = await CaseStudy.distinct('category', { status: 'published' });
    
    // Get category counts
    const categoryCounts = await CaseStudy.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const categoriesWithCounts = categories.map(category => {
      const categoryData = categoryCounts.find(item => item._id === category);
      return {
        name: category,
        count: categoryData ? categoryData.count : 0
      };
    });

    res.json({
      success: true,
      data: categoriesWithCounts
    });
  } catch (error) {
    console.error('Get case study categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching categories'
    });
  }
});

// @desc    Get popular technologies
// @route   GET /api/case-studies/technologies/popular
// @access  Public
router.get('/technologies/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const technologies = await CaseStudy.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$technologies' },
      { $group: { _id: '$technologies', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      data: technologies.map(tech => ({
        name: tech._id,
        count: tech.count
      }))
    });
  } catch (error) {
    console.error('Get popular technologies error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching technologies'
    });
  }
});

export default router;
