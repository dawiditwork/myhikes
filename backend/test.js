require('dotenv').config(); // wczytuje zmienne z pliku .env
const axios = require('axios');

const API_KEY = process.env.GOOGLE_API_KEY; // Twój klucz z .env
const address = "Warszawa, Polska"; // możesz zmienić na inny adres

async function testGeocode() {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`
    );

    const data = response.data;

    if (data.status !== 'OK') {
      console.error('Błąd Google Geocode API:', data);
      return;
    }

    const location = data.results[0].geometry.location;
    console.log('Adres:', address);
    console.log('Szerokość (lat):', location.lat);
    console.log('Długość (lng):', location.lng);

  } catch (err) {
    console.error('Błąd podczas żądania:', err.message);
  }
}

testGeocode();