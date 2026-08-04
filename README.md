# MyHikes

A full-stack community platform for discovering, sharing and exploring hiking locations.

[Live Demo](https://myhikes.dawidfrankowicz.com/) · [GitHub Repository](https://github.com/dawiditwork/myhikes)

## Overview

MyHikes helps outdoor enthusiasts discover interesting places shared by the community.

Users can browse hikes on an interactive map, search for locations, filter trails and explore profiles created by other members.

## Features

- Interactive map with trail markers
- Search by place name
- Trail filtering by difficulty
- Filtering by trail status
- Filtering by maximum duration
- Sorting by date, rating, duration and difficulty
- Nearby trail discovery using browser geolocation
- Community member directory
- Public explorer profiles and shared collections
- User authentication
- Image uploads and cloud storage
- Responsive interface for desktop and mobile

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

## Project Structure

```text
myhikes/
├── frontend/   # React user interface
└── backend/    # Express API and database logic
```

## Getting Started

### Requirements

- Node.js 22
- npm
- MongoDB database
- Google Maps API key
- Cloudinary account

### Clone the repository

```bash
git clone https://github.com/dawiditwork/myhikes.git
cd myhikes
```

### Backend setup

```bash
cd backend
npm install
```

Create the backend environment file and provide the required database, authentication and Cloudinary configuration.

Start the development server:

```bash
npm run dev
```

### Frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm start
```

## Available Backend Scripts

```bash
npm run dev
npm start
npm test
```

## Author

Designed and developed by [Dawid Frankowicz](https://github.com/dawiditwork).

- Portfolio: [dawidfrankowicz.com](https://www.dawidfrankowicz.com/)
- Email: [dawiditwork@gmail.com](mailto:dawiditwork@gmail.com)
