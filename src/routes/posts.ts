import express, { Request, Response } from 'express';
import Post, { IPost } from '../models/Post';
import User, { IUser } from '../models/User';
import { protect, authorize, optionalAuth } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: IUser;
}

const router = express.Router();

// @desc    Get published posts (public) or all posts (admin)
// @route   GET /api/posts
// @access  Public/Private
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;
    const tag = req.query.tag as string;
    const featured = req.query.featured as string;
    const sort = req.query.sort as string || 'publishedAt';
    const order = req.query.order as string === 'asc' ? 1 : -1;

    // Build query
    const query: any = {};
    
    // If not authenticated or not admin/editor, only show published posts
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      query.status = 'published';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    if (featured === 'true') {
      query.featured = true;
    }

    const posts = await Post.find(query)
      .populate('author', 'name email')
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    // Get post statistics
    const stats = {
      total: await Post.countDocuments(),
      published: await Post.countDocuments({ status: 'published' }),
      draft: await Post.countDocuments({ status: 'draft' }),
      featured: await Post.countDocuments({ featured: true })
    };

    res.json({
      success: true,
      data: {
        posts,
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
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching posts'
    });
  }
});

// @desc    Get post by slug
// @route   GET /api/posts/:slug
// @access  Public
router.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const query: any = { slug: req.params.slug };
    
    // If not authenticated or not admin/editor, only show published posts
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor')) {
      query.status = 'published';
    }

    const post = await Post.findOne(query).populate('author', 'name email');
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    // Get related posts (same category, excluding current post)
    const relatedPosts = await Post.find({
      category: post.category,
      status: 'published',
      _id: { $ne: post._id }
    })
      .populate('author', 'name email')
      .sort({ publishedAt: -1 })
      .limit(3);

    res.json({
      success: true,
      data: {
        post,
        relatedPosts
      }
    });
  } catch (error) {
    console.error('Get post by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching post'
    });
  }
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private (admin/editor/author)
router.post('/', protect, authorize('admin', 'editor', 'author'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      content,
      excerpt,
      status = 'draft',
      category,
      tags = [],
      featuredImage,
      featured = false,
      readTime,
      seo,
      scheduledAt
    } = req.body;

    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required'
      });
    }

    // Check if slug already exists
    const existingPost = await Post.findOne({ 
      title: { $regex: new RegExp('^' + title + '$', 'i') }
    });

    if (existingPost) {
      return res.status(400).json({
        success: false,
        message: 'A post with this title already exists'
      });
    }

    // Calculate read time if not provided
    const calculatedReadTime = readTime || Math.ceil(content.split(' ').length / 200);

    const post = new Post({
      title,
      content,
      excerpt: excerpt || content.substring(0, 300) + '...',
      status,
      category,
      tags,
      featuredImage,
      featured,
      readTime: calculatedReadTime,
      seo,
      scheduledAt,
      author: req.user!.id,
      publishedAt: status === 'published' ? new Date() : undefined
    });

    await post.save();
    await post.populate('author', 'name email');

    res.status(201).json({
      success: true,
      data: post,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating post'
    });
  }
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private (admin/editor/author - authors can only edit their own posts)
router.put('/:id', protect, authorize('admin', 'editor', 'author'), async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user is author and can edit this post
    if (req.user!.role === 'author' && post.author.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own posts'
      });
    }

    const {
      title,
      content,
      excerpt,
      status,
      category,
      tags,
      featuredImage,
      featured,
      readTime,
      seo,
      scheduledAt
    } = req.body;

    // Check if title changed and if new title exists
    if (title && title !== post.title) {
      const existingPost = await Post.findOne({ 
        title: { $regex: new RegExp('^' + title + '$', 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingPost) {
        return res.status(400).json({
          success: false,
          message: 'A post with this title already exists'
        });
      }
    }

    // Update fields
    if (title) post.title = title;
    if (content) {
      post.content = content;
      // Recalculate read time if content changed
      post.readTime = readTime || Math.ceil(content.split(' ').length / 200);
    }
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (status) post.status = status;
    if (category) post.category = category;
    if (tags !== undefined) post.tags = tags;
    if (featuredImage !== undefined) post.featuredImage = featuredImage;
    if (featured !== undefined) post.featured = featured;
    if (readTime !== undefined) post.readTime = readTime;
    if (seo) post.seo = seo;
    if (scheduledAt !== undefined) post.scheduledAt = scheduledAt;

    // Set publishedAt if status changed to published
    if (status === 'published' && post.status !== 'published') {
      post.publishedAt = new Date();
    }

    await post.save();
    await post.populate('author', 'name email');

    res.json({
      success: true,
      data: post,
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating post'
    });
  }
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private (admin/editor)
router.delete('/:id', protect, authorize('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting post'
    });
  }
});

// @desc    Like/Unlike post
// @route   POST /api/posts/:id/like
// @access  Public
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.likes += 1;
    await post.save();

    res.json({
      success: true,
      data: { likes: post.likes },
      message: 'Post liked successfully'
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error liking post'
    });
  }
});

// @desc    Get post categories
// @route   GET /api/posts/categories/list
// @access  Public
router.get('/categories/list', async (req: Request, res: Response) => {
  try {
    const categories = await Post.distinct('category', { status: 'published' });
    
    // Get category counts
    const categoryCounts = await Post.aggregate([
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
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching categories'
    });
  }
});

// @desc    Get popular tags
// @route   GET /api/posts/tags/popular
// @access  Public
router.get('/tags/popular', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const tags = await Post.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    res.json({
      success: true,
      data: tags.map(tag => ({
        name: tag._id,
        count: tag.count
      }))
    });
  } catch (error) {
    console.error('Get popular tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching tags'
    });
  }
});

export default router;
