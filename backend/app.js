require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const placesRoutes = require('./routes/places-routes');
const usersRoutes = require('./routes/users-routes');
const reportsRoutes = require('./routes/reports-routes');
const notificationsRoutes = require('./routes/notifications-routes');
const HttpError = require('./models/http-error');

const app = express();
const port = Number(process.env.PORT) || 5000;
let connectionPromise;

const requiredEnvironmentVariables = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GOOGLE_API_KEY',
  'CLIENT_URL',
  'RESEND_API_KEY',
  'EMAIL_FROM'
];
const missingEnvironmentVariables = requiredEnvironmentVariables.filter(name => !process.env[name]);

if (missingEnvironmentVariables.length) {
  throw new Error(`Missing required environment variables: ${missingEnvironmentVariables.join(', ')}`);
}

const connectToDatabase = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI).catch(err => {
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
};

// Middleware do parsowania JSON, nie przeszkadza Multerowi
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Udostępniamy katalog z obrazkami
// CORS – umożliwia żądania z różnych domen
app.use((req, res, next) => {
  const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin;
  if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Trasy
app.get('/', (req, res) => {
  res.status(200).json({ name: 'MyHikes API', status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    next(new HttpError('Database connection failed.', 500));
  }
});

app.use('/api/places', placesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Obsługa nieistniejących tras
app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404);
  return next(error);
});

// Globalny error handler
app.use((error, req, res, next) => {
  // Jeśli Multer stworzył plik, a potem jest błąd – spróbuj go usunąć
  if (res.headerSent) {
    return next(error);
  }

  // Upewniamy się, że status jest liczbą
  const statusCode = error.name === 'MulterError' || /mime type|file type/i.test(error.message || '')
    ? 422
    : (typeof error.code === 'number' ? error.code : 500);
  res.status(statusCode).json({ message: error.message || 'An unknown error occurred!' });
});

// Połączenie z MongoDB i start serwera
if (require.main === module) {
  connectToDatabase()
  .then(() => {
    app.listen(port);
    console.log(`Server running on port ${port}`);
  })
  .catch(err => {
    console.log('MongoDB connection error:', err);
  });
}

module.exports = app;
