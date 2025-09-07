import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Team, { ITeam } from '../models/Team';
import { protect, authorize } from '../middleware/auth';

const router = express.Router();

// @desc    Get all active team members (public)
// @route   GET /api/team
// @access  Public
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const department = req.query.department as string;
    const sort = req.query.sort as string || 'order';
    const order = req.query.order as string === 'desc' ? -1 : 1;

    // Build query - only show public and active team members
    const query: any = { 
      status: 'active',
      isPublic: true 
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = department;
    }

    const teamMembers = await Team.find(query)
      .select('-email -phone') // Don't expose contact info publicly
      .sort({ [sort]: order, name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Team.countDocuments(query);

    // Get team statistics
    const stats = {
      total: await Team.countDocuments({ status: 'active', isPublic: true }),
      byDepartment: await Team.aggregate([
        { $match: { status: 'active', isPublic: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    };

    res.json({
      success: true,
      data: {
        teamMembers,
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
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching team members'
    });
  }
});

// @desc    Get all team members (admin only)
// @route   GET /api/team/admin
// @access  Private (admin only)
router.get('/admin', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const department = req.query.department as string;
    const status = req.query.status as string;
    const sort = req.query.sort as string || 'createdAt';
    const order = req.query.order as string === 'asc' ? 1 : -1;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.status = status;
    }

    const teamMembers = await Team.find(query)
      .sort({ [sort]: order })
      .skip(skip)
      .limit(limit);

    const total = await Team.countDocuments(query);

    res.json({
      success: true,
      data: {
        teamMembers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching team members'
    });
  }
});

// @desc    Get team member by id or slug
// @route   GET /api/team/:identifier
// @access  Public
router.get('/:identifier', async (req: Request, res: Response) => {
  try {
    const identifier = req.params.identifier;
    
    // Try to find by slug first, then by ID
    let teamMember = await Team.findOne({ 
      slug: identifier,
      status: 'active',
      isPublic: true 
    }).select('-email -phone') as (ITeam & { _id: mongoose.Types.ObjectId }) | null; // Don't expose contact info publicly

    if (!teamMember) {
      teamMember = await Team.findOne({
        _id: identifier,
        status: 'active',
        isPublic: true
      }).select('-email -phone') as (ITeam & { _id: mongoose.Types.ObjectId }) | null;
    }
    
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    res.json({
      success: true,
      data: teamMember
    });
  } catch (error) {
    console.error('Get team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching team member'
    });
  }
});

// @desc    Create new team member
// @route   POST /api/team
// @access  Private (admin only)
router.post('/', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const {
      name,
      position,
      department,
      bio,
      avatar,
      email,
      phone,
      social,
      skills = [],
      experience = 0,
      joinedDate,
      status = 'active',
      isPublic = true,
      order = 0,
      achievements = [],
      education = [],
      languages = []
    } = req.body;

    // Validate required fields
    if (!name || !position || !department || !bio) {
      return res.status(400).json({
        success: false,
        message: 'Name, position, department, and bio are required'
      });
    }

    // Check if team member already exists
    const existingMember = await Team.findOne({ 
      name: { $regex: new RegExp('^' + name + '$', 'i') }
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'A team member with this name already exists'
      });
    }

    const teamMember = new Team({
      name,
      position,
      department,
      bio,
      avatar,
      email,
      phone,
      social,
      skills,
      experience,
      joinedDate: joinedDate || new Date(),
      status,
      isPublic,
      order,
      achievements,
      education,
      languages
    });

    await teamMember.save();

    res.status(201).json({
      success: true,
      data: teamMember,
      message: 'Team member created successfully'
    });
  } catch (error) {
    console.error('Create team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating team member'
    });
  }
});

// @desc    Update team member
// @route   PUT /api/team/:id
// @access  Private (admin only)
router.put('/:id', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const teamMember = await Team.findById(req.params.id);
    
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    const {
      name,
      position,
      department,
      bio,
      avatar,
      email,
      phone,
      social,
      skills,
      experience,
      joinedDate,
      status,
      isPublic,
      order,
      achievements,
      education,
      languages
    } = req.body;

    // Check if name changed and if new name exists
    if (name && name !== teamMember.name) {
      const existingMember = await Team.findOne({ 
        name: { $regex: new RegExp('^' + name + '$', 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'A team member with this name already exists'
        });
      }
    }

    // Update fields
    if (name) teamMember.name = name;
    if (position) teamMember.position = position;
    if (department) teamMember.department = department;
    if (bio) teamMember.bio = bio;
    if (avatar !== undefined) teamMember.avatar = avatar;
    if (email !== undefined) teamMember.email = email;
    if (phone !== undefined) teamMember.phone = phone;
    if (social !== undefined) teamMember.social = social;
    if (skills !== undefined) teamMember.skills = skills;
    if (experience !== undefined) teamMember.experience = experience;
    if (joinedDate !== undefined) teamMember.joinedDate = joinedDate;
    if (status) teamMember.status = status;
    if (isPublic !== undefined) teamMember.isPublic = isPublic;
    if (order !== undefined) teamMember.order = order;
    if (achievements !== undefined) teamMember.achievements = achievements;
    if (education !== undefined) teamMember.education = education;
    if (languages !== undefined) teamMember.languages = languages;

    await teamMember.save();

    res.json({
      success: true,
      data: teamMember,
      message: 'Team member updated successfully'
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating team member'
    });
  }
});

// @desc    Delete team member
// @route   DELETE /api/team/:id
// @access  Private (admin only)
router.delete('/:id', protect, authorize('admin'), async (req: Request, res: Response) => {
  try {
    const teamMember = await Team.findById(req.params.id);
    
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found'
      });
    }

    await Team.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting team member'
    });
  }
});

// @desc    Get departments list
// @route   GET /api/team/departments/list
// @access  Public
router.get('/departments/list', async (req: Request, res: Response) => {
  try {
    const departments = await Team.distinct('department', { 
      status: 'active', 
      isPublic: true 
    });
    
    // Get department counts
    const departmentCounts = await Team.aggregate([
      { $match: { status: 'active', isPublic: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const departmentsWithCounts = departments.map(department => {
      const deptData = departmentCounts.find(item => item._id === department);
      return {
        name: department,
        count: deptData ? deptData.count : 0
      };
    });

    res.json({
      success: true,
      data: departmentsWithCounts
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching departments'
    });
  }
});

export default router;
