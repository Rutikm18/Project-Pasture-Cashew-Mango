const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'site.json');
    const siteConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json(siteConfig);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Config not found' });
  }
};
