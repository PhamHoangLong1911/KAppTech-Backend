import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Media, { IMedia } from '../models/Media';
import User, { IUser } from '../models/User';
import { protect, authorize } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: IUser;
}

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    // Create category-based subdirectories
    const category = getCategoryFromMimetype(file.mimetype);
    const categoryDir = path.join(uploadsDir, category);
    
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    
    cb(null, categoryDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// Helper function to get category from mimetype
const getCategoryFromMimetype = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text/')) return 'documents';
  return 'other';
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Allow images, documents, videos, and audio
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|pdf|doc|docx|txt|mp4|avi|mov|mp3|wav|ogg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /^(image|video|audio|application\/(pdf|msword|vnd\.openxmlformats-officedocument)|text)\//.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, documents, videos, and audio files are allowed!'), false);
    }
  }
});

// @desc    Upload file
// @route   POST /api/media/upload
// @access  Private (admin/editor only)
router.post('/upload', protect, authorize('admin', 'editor'), upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { alt, title, description, tags, isPublic = true } = req.body;

    // Determine category
    const category = req.file.mimetype.startsWith('image/') ? 'image' :
                    req.file.mimetype.startsWith('video/') ? 'video' :
                    req.file.mimetype.startsWith('audio/') ? 'audio' :
                    req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document') || req.file.mimetype.includes('text') ? 'document' :
                    'other';

    // Create media record
    const media = new Media({
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/${getCategoryFromMimetype(req.file.mimetype)}/${req.file.filename}`,
      alt,
      title,
      description,
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()) : [],
      category,
      uploadedBy: req.user!.id,
      isPublic
    });

    await media.save();
    await media.populate('uploadedBy', 'name email');

    res.status(201).json({
      success: true,
      data: media,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// @desc    Get media library
// @route   GET /api/media
// @access  Private (admin/editor only)
router.get('/', protect, authorize('admin', 'editor'), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const category = req.query.category as string;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    const mediaFiles = await Media.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Media.countDocuments(query);

    res.json({
      success: true,
      data: {
        mediaFiles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching media'
    });
  }
});

// @desc    Delete media file
// @route   DELETE /api/media/:id
// @access  Private (admin/editor only)
router.delete('/:id', protect, authorize('admin', 'editor'), async (req: Request, res: Response) => {
  try {
    const media = await Media.findById(req.params.id);
    
    if (!media) {
      return res.status(404).json({
        success: false,
        message: 'Media file not found'
      });
    }

    // Delete physical file
    try {
      if (fs.existsSync(media.path)) {
        fs.unlinkSync(media.path);
      }
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
    }

    // Delete database record
    await Media.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Media file deleted successfully'
    });
  } catch (error) {
    console.error('Delete media file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting media file'
    });
  }
});

export default router;
