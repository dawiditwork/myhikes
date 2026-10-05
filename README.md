# MyHikes

![Backend Tests](https://github.com/dawiditwork/myhikes/actions/workflows/backend-tests.yml/badge.svg)

A full-stack MERN community platform for discovering, sharing and managing hiking locations.

[Live Demo](https://myhikes.dawidfrankowicz.com/) · [GitHub Repository](https://github.com/dawiditwork/myhikes)

## Overview

MyHikes is a hiking community application built with React, Node.js, Express and MongoDB.

Users can discover hiking locations, browse trails on an interactive map, manage personal hiking collections, explore community profiles and interact with shared trail content.

The backend includes authentication, authorization, validation, moderation, notifications, password recovery, image uploads and automated security-focused tests.

## Features

### Trail Discovery

- Interactive Google Maps integration
- Trail markers and marker clustering
- Search by place name
- Filter by difficulty
- Filter by trail status
- Filter by maximum duration
- Sort by date, rating, duration and difficulty
- Nearby trail discovery using browser geolocation
- Detailed trail pages

### Community

- Public explorer profiles
- Community member directory
- User-created hiking locations
- Ratings and comments
- Trail condition reports
- Favorites
- Want-to-visit collections
- Planned visits
- Completed hikes
- Personal trail logs and hiking statistics

### Authentication & Account Security

- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Email verification
- Password recovery and reset
- Rate limiting for sensitive endpoints
- Protected routes
- Ownership checks for editing and deleting resources
- Profile privacy settings
- Account deletion flow

### Moderation & Notifications

- Content reporting
- Moderation routes
- Admin authorization
- User notifications
- Moderation-related notification support

### Image Handling

- Image uploads
- Multer file handling
- Cloudinary storage
- Avatar uploads
- Hiking location image uploads

### API & Security

- Express REST API
- Input validation with Express Validator
- MongoDB ObjectId validation
- Security headers
- CORS configuration
- API health endpoint
- Environment variable validation
- Request size limits
- Authentication and optional-auth middleware

## Technology Stack

### Frontend

- React
- React Router
- Google Maps
- Google Maps Marker Clustering
- CSS

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Tokens
- bcrypt
- Express Validator
- Multer
- Cloudinary
- Resend

### Testing & CI

- Node.js Test Runner
- Supertest
- GitHub Actions
- Node.js experimental test coverage

## Architecture

```text
React Frontend
      │
      ▼
Express REST API
      │
      ├── Authentication middleware
      ├── Authorization / ownership checks
      ├── Validation
      ├── Rate limiting
      └── Controllers
             │
             ▼
          Mongoose
             │
             ▼
          MongoDB
```

External services:

```text
MyHikes
 ├── Google Maps → maps and location features
 ├── Cloudinary  → image storage
 └── Resend      → transactional email
```

## Backend Structure

```text
backend/
├── config/
│   └── cloudinary.js
├── controllers/
│   ├── notifications-controllers.js
│   ├── places-controllers.js
│   ├── reports-controllers.js
│   └── users-controllers.js
├── middleware/
│   ├── check-admin.js
│   ├── check-auth.js
│   ├── file-upload.js
│   ├── optional-auth.js
│   ├── rate-limit.js
│   └── validate-object-id.js
├── models/
├── routes/
├── scripts/
├── tests/
├── util/
└── app.js
```

## Frontend Structure

```text
frontend/src/
├── places/
│   ├── components/
│   └── pages/
├── shared/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   └── util/
├── user/
│   ├── components/
│   └── pages/
└── App.js
```

## Authentication Flow

```text
User logs in
    │
    ▼
Backend validates credentials
    │
    ▼
JWT is issued
    │
    ▼
Frontend stores authenticated session state
    │
    ▼
Protected API request
    │
    ▼
Authorization: Bearer <token>
    │
    ▼
check-auth middleware
    │
    ▼
jwt.verify(...)
    │
    ▼
req.userData.userId
```

Protected actions also perform ownership or admin checks where required.

## Password Reset Security

The password reset flow is covered by automated tests for:

- malformed tokens
- invalid input
- password length limits
- unknown tokens
- expired tokens
- secure password hashing
- token reuse prevention
- concurrent reset attempts
- database failure handling
- public endpoint rate limiting

## Testing

The backend currently contains **24 automated tests**.

Tested areas include:

- API health endpoint
- API security headers
- authentication middleware
- optional authentication
- ObjectId validation
- rate limiting
- password reset security
- email verification output
- model validation
- ownership authorization
- comment authorization
- moderation-related models

Run the test suite:

```bash
cd backend
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Current overall backend coverage is approximately:

```text
Lines:    50%
Branches: 84%
Functions: 56%
```

Security-sensitive middleware and models have significantly higher coverage.

## Continuous Integration

GitHub Actions runs backend tests automatically for backend changes and pull requests.

Pipeline:

```text
Checkout repository
        │
        ▼
Setup Node.js 22
        │
        ▼
npm ci
        │
        ▼
npm run test:coverage
```

## Health Check

The API provides a health endpoint:

```text
GET /api/health
```

Example response:

```json
{
  "status": "ok"
}
```

## Environment Variables

Backend configuration is documented in:

```text
backend/.env.example
```

Required variables include:

```env
PORT=
MONGODB_URI=
JWT_SECRET=
GOOGLE_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=
CLIENT_ORIGINS=
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_EMAILS=
```

Never commit real secrets to the repository.

## Getting Started

### Requirements

- Node.js 22
- npm
- MongoDB
- Google Maps API key
- Cloudinary account
- Resend configuration

### Clone the Repository

```bash
git clone https://github.com/dawiditwork/myhikes.git
cd myhikes
```

### Backend Setup

```bash
cd backend
npm install
```

Create an environment file based on:

```text
backend/.env.example
```

Start the backend:

```bash
npm run dev
```

Default local backend port:

```text
http://localhost:5000
```

### Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

## Production Build

Build the frontend:

```bash
cd frontend
npm run build
```

## Available Backend Scripts

```bash
npm run dev
npm start
npm test
npm run test:coverage
npm run migrate:images
```

## Project Status

MyHikes is a working full-stack portfolio project with:

- React frontend
- Express REST API
- MongoDB persistence
- JWT authentication
- email verification
- password reset
- authorization and ownership checks
- Cloudinary uploads
- Google Maps integration
- moderation and notifications
- automated backend tests
- CI with GitHub Actions
- production frontend build

## Author

Designed and developed by [Dawid Frankowicz](https://github.com/dawiditwork).

- Portfolio: [dawidfrankowicz.com](https://www.dawidfrankowicz.com/)
- Email: [dawiditwork@gmail.com](mailto:dawiditwork@gmail.com)
