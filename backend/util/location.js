const axios = require('axios');
const HttpError = require('../models/http-error');

const API_KEY = process.env.GOOGLE_API_KEY; // ❗ NIE hardcode

async function getCoordsForAddress(address) {
  const response = await axios.get(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );

  const data = response.data;

  // 🔐 pełna walidacja odpowiedzi Google
  if (
    !data ||
    data.status !== 'OK' ||
    !data.results ||
    data.results.length === 0
  ) {
    console.error('GOOGLE GEOCODE ERROR:', data);
    throw new HttpError(
      'Could not find location for the specified address.',
      422
    );
  }

  return data.results[0].geometry.location;
}

module.exports = getCoordsForAddress;
