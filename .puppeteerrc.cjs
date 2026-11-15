const { join } = require('path');

/**
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  // Cambiar la ruta de caché a una carpeta local del proyecto permitida en Render
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
