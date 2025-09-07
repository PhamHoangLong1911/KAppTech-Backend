# KAppTech CMS - Backend API

A robust Node.js/Express.js backend API for KAppTech CMS with TypeScript, MongoDB, JWT authentication, and comprehensive content management features.

## 🚀 Features

- **Node.js & Express.js** with TypeScript
- **MongoDB** with Mongoose ODM
- **JWT Authentication** with role-based access control
- **RESTful API** design
- **File Upload** support with Multer
- **Input Validation** with express-validator
- **Security** with helmet, cors, rate limiting
- **User Management** (Admin, Editor, Author, Viewer roles)
- **Content Management** (Pages, Posts, Case Studies)
- **Middleware** for authentication and authorization
- **Environment Configuration**
- **Development Tools** (ts-node-dev, debugging)

## 🛠️ Tech Stack

- Node.js 18+
- Express.js 4.21.2
- TypeScript 5.9.2
- MongoDB with Mongoose 8.10.0
- JWT for authentication
- Bcrypt for password hashing
- Multer for file uploads
- Express-validator for input validation

## 📋 Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- npm or yarn

## 🚀 Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/PhamHoangLong1911/KAppTech-Backend.git
cd KAppTech-Backend

# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/kapptech_cms
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kapptech_cms

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-64-characters-minimum
JWT_EXPIRE=7d

# File Upload Configuration
MAX_FILE_SIZE=5000000
FILE_UPLOAD_PATH=./public/uploads

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000
```

### Development

```bash
# Start development server with auto-reload
npm run dev

# The server will run on http://localhost:5000
```

### Production

```bash
# Build the project
npm run build

# Start production server
npm start
```

## 🎯 Available Scripts

- `npm run dev` - Start development server with ts-node-dev
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests (to be implemented)
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 📚 API Documentation

### Authentication Endpoints

```
POST /api/auth/register - Register new user
POST /api/auth/login    - Login user
GET  /api/auth/me       - Get current user profile
PUT  /api/auth/profile  - Update user profile
```

### User Management (Admin only)

```
GET    /api/users       - Get all users
GET    /api/users/:id   - Get user by ID
PUT    /api/users/:id   - Update user
DELETE /api/users/:id   - Delete user
```

### Content Management

```
# Pages
GET    /api/pages       - Get all pages
POST   /api/pages       - Create new page
GET    /api/pages/:id   - Get page by ID
PUT    /api/pages/:id   - Update page
DELETE /api/pages/:id   - Delete page

# Posts
GET    /api/posts       - Get all posts
POST   /api/posts       - Create new post
GET    /api/posts/:id   - Get post by ID
PUT    /api/posts/:id   - Update post
DELETE /api/posts/:id   - Delete post

# Case Studies
GET    /api/case-studies       - Get all case studies
POST   /api/case-studies       - Create new case study
GET    /api/case-studies/:id   - Get case study by ID
PUT    /api/case-studies/:id   - Update case study
DELETE /api/case-studies/:id   - Delete case study
```

### File Upload

```
POST /api/upload        - Upload files
```

## 🔐 Authentication & Authorization

### JWT Authentication
- JWT tokens expire in 7 days (configurable)
- Tokens are required for protected routes
- Include token in Authorization header: `Bearer <token>`

### User Roles
- **Admin**: Full system access
- **Editor**: Content management access
- **Author**: Limited content creation/editing
- **Viewer**: Read-only access

### Protected Routes
Routes are protected using middleware:
- `protect` - Requires valid JWT token
- `authorize(['admin'])` - Requires specific roles

## 📁 Project Structure

```
src/
├── controllers/         # Route controllers
│   ├── authController.ts
│   ├── userController.ts
│   ├── pageController.ts
│   ├── postController.ts
│   └── caseStudyController.ts
├── middleware/          # Custom middleware
│   ├── auth.ts         # Authentication middleware
│   ├── error.ts        # Error handling middleware
│   └── upload.ts       # File upload middleware
├── models/             # Mongoose models
│   ├── User.ts
│   ├── Page.ts
│   ├── Post.ts
│   └── CaseStudy.ts
├── routes/             # API routes
│   ├── auth.ts
│   ├── users.ts
│   ├── pages.ts
│   ├── posts.ts
│   └── caseStudies.ts
├── utils/              # Utility functions
│   ├── database.ts     # Database connection
│   └── helpers.ts      # Helper functions
├── types/              # TypeScript type definitions
└── server.ts           # Main server file
```

## 🗄️ Database Schema

### User Model
```typescript
{
  firstName: string
  lastName: string
  email: string (unique)
  password: string (hashed)
  role: 'admin' | 'editor' | 'author' | 'viewer'
  avatar?: string
  bio?: string
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}
```

### Content Models (Page, Post, CaseStudy)
```typescript
{
  title: string
  content: string
  slug: string (unique)
  author: ObjectId (User)
  status: 'draft' | 'published' | 'archived'
  featuredImage?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}
```

## 🛡️ Security Features

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Security**: Secure token generation and validation
- **Input Validation**: Express-validator for request validation
- **CORS**: Configured for frontend domain
- **Rate Limiting**: Prevent API abuse
- **Helmet**: Security headers
- **NoSQL Injection**: Mongoose built-in protection

## 🚀 Deployment

### Environment Setup
1. Set NODE_ENV to 'production'
2. Configure production MongoDB URI
3. Set secure JWT secret (64+ characters)
4. Configure CORS for production frontend URL

### Deployment Platforms

#### AWS EC2 / DigitalOcean
```bash
# Build the project
npm run build

# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name kapptech-api

# Setup PM2 startup
pm2 startup
pm2 save
```

#### Heroku
```bash
# Install Heroku CLI
# Create Procfile
echo "web: npm start" > Procfile

# Deploy
heroku create kapptech-api
git push heroku main
```

#### Railway / Render
- Connect GitHub repository
- Set environment variables
- Deploy automatically

### Database Deployment
- **MongoDB Atlas**: Cloud MongoDB service
- **Local MongoDB**: Self-hosted option
- **Railway/Render**: Managed database add-ons

## 🧪 Testing

```bash
# Run tests (to be implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 📊 Monitoring & Logging

The API includes:
- Request logging with Morgan
- Error handling middleware
- Database connection monitoring
- Performance metrics (to be added)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@kapptech.com or create an issue on GitHub.

## 🔗 Related

- [KAppTech Frontend](https://github.com/PhamHoangLong1911/KAppTech-Frontend) - The React frontend for this API

## 📋 TODO

- [ ] Add comprehensive test suite
- [ ] Implement API documentation with Swagger
- [ ] Add email notification system
- [ ] Implement caching with Redis
- [ ] Add API versioning
- [ ] Performance monitoring
- [ ] Backup and recovery procedures
