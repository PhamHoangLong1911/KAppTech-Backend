import express, { Request, Response } from 'express';
import Page, { IPage } from '../models/Page';
import User, { IUser } from '../models/User';
import { protect, authorize, optionalAuth } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: IUser;
}

const router = express.Router();

// @desc    Get all published pages (public) or all pages (admin)
// @route   GET /api/pages
// @access  Public/Private
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const pageType = req.query.pageType as string;
    const sort = req.query.sort as string || 'createdAt';
    const order = req.query.order as string === 'asc' ? 1 : -1;

    // Build query
    const query: any = {};
    
    // If not authenticated or not admin/editor, only show published pages
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      query.status = 'published';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (pageType) {
      query.pageType = pageType;
    }

    const pages = await Page.find(query)
      .populate('author', 'name email')
      .sort({ [sort]: order, sortOrder: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Page.countDocuments(query);

    res.json({
      success: true,
      data: {
        pages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pages'
    });
  }
});

// @desc    Get page by slug
// @route   GET /api/pages/:slug
// @access  Public
router.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const query: any = { slug: req.params.slug };
    
    // If not authenticated or not admin/editor, only show published pages
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      query.status = 'published';
    }

    const page = await Page.findOne(query).populate('author', 'name email');
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    // Increment view count
    page.viewCount += 1;
    await page.save();

    res.json({
      success: true,
      data: page
    });
  } catch (error) {
    console.error('Get page by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching page'
    });
  }
});

// @desc    Create new page
// @route   POST /api/pages
// @access  Private (admin/editor only)
router.post('/', protect, authorize('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      content,
      excerpt,
      status = 'draft',
      pageType = 'custom',
      featured = false,
      featuredImage,
      seo,
      template,
      customCSS,
      customJS,
      isHomePage = false,
      parentPage,
      sortOrder = 0
    } = req.body;

    // Check if slug already exists
    const existingPage = await Page.findOne({ 
      title: { $regex: new RegExp('^' + title + '$', 'i') }
    });

    if (existingPage) {
      return res.status(400).json({
        success: false,
        message: 'A page with this title already exists'
      });
    }

    // If setting as home page, unset current home page
    if (isHomePage) {
      await Page.updateMany({ isHomePage: true }, { isHomePage: false });
    }

    const page = new Page({
      title,
      content,
      excerpt,
      status,
      pageType,
      featured,
      featuredImage,
      seo,
      template,
      customCSS,
      customJS,
      isHomePage,
      parentPage,
      sortOrder,
      author: req.user!.id,
      publishedAt: status === 'published' ? new Date() : undefined
    });

    await page.save();
    await page.populate('author', 'name email');

    res.status(201).json({
      success: true,
      data: page,
      message: 'Page created successfully'
    });
  } catch (error) {
    console.error('Create page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating page'
    });
  }
});

// @desc    Update page
// @route   PUT /api/pages/:id
// @access  Private (admin/editor only)
router.put('/:id', protect, authorize('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  try {
    const page = await Page.findById(req.params.id);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    const {
      title,
      content,
      excerpt,
      status,
      pageType,
      featured,
      featuredImage,
      seo,
      template,
      customCSS,
      customJS,
      isHomePage,
      parentPage,
      sortOrder
    } = req.body;

    // Check if title changed and if new title exists
    if (title && title !== page.title) {
      const existingPage = await Page.findOne({ 
        title: { $regex: new RegExp('^' + title + '$', 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingPage) {
        return res.status(400).json({
          success: false,
          message: 'A page with this title already exists'
        });
      }
    }

    // If setting as home page, unset current home page
    if (isHomePage && !page.isHomePage) {
      await Page.updateMany({ isHomePage: true }, { isHomePage: false });
    }

    // Update fields
    if (title) page.title = title;
    if (content) page.content = content;
    if (excerpt !== undefined) page.excerpt = excerpt;
    if (status) page.status = status;
    if (pageType) page.pageType = pageType;
    if (featured !== undefined) page.featured = featured;
    if (featuredImage !== undefined) page.featuredImage = featuredImage;
    if (seo) page.seo = seo;
    if (template !== undefined) page.template = template;
    if (customCSS !== undefined) page.customCSS = customCSS;
    if (customJS !== undefined) page.customJS = customJS;
    if (isHomePage !== undefined) page.isHomePage = isHomePage;
    if (parentPage !== undefined) page.parentPage = parentPage;
    if (sortOrder !== undefined) page.sortOrder = sortOrder;

    // Set publishedAt if status changed to published
    if (status === 'published' && page.status !== 'published') {
      page.publishedAt = new Date();
    }

    await page.save();
    await page.populate('author', 'name email');

    res.json({
      success: true,
      data: page,
      message: 'Page updated successfully'
    });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating page'
    });
  }
});

// @desc    Delete page
// @route   DELETE /api/pages/:id
// @access  Private (admin only)
router.delete('/:id', protect, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const page = await Page.findById(req.params.id);
    
    if (!page) {
      return res.status(404).json({
        success: false,
        message: 'Page not found'
      });
    }

    await Page.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Page deleted successfully'
    });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting page'
    });
  }
});

// @desc    Get home page
// @route   GET /api/pages/special/home
// @access  Public
router.get('/special/home', async (req: Request, res: Response) => {
  try {
    const homePage = await Page.findOne({ 
      isHomePage: true, 
      status: 'published' 
    }).populate('author', 'name email');
    
    if (!homePage) {
      return res.status(404).json({
        success: false,
        message: 'Home page not found'
      });
    }

    // Increment view count
    homePage.viewCount += 1;
    await homePage.save();

    res.json({
      success: true,
      data: homePage
    });
  } catch (error) {
    console.error('Get home page error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching home page'
    });
  }
});

export default router;
