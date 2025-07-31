const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 8080;

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'build')));

// API routes (if any) should go here
// app.use('/api', require('./api'));

// Environment variables endpoint
app.get('/config.js', (req, res) => {
  const config = {
    REACT_APP_AZURE_MAPS_API_KEY: process.env.REACT_APP_AZURE_MAPS_API_KEY,
    REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL
  };
  
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`window.ENV = ${JSON.stringify(config)};`);
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  
  // Read the index.html file
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error loading app');
    }
    
    // Inject the config script tag before closing head tag
    const configScript = '<script src="/config.js"></script>';
    const modifiedHtml = data.replace('</head>', `${configScript}</head>`);
    
    res.send(modifiedHtml);
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Environment variables:`);
  console.log(`- REACT_APP_AZURE_MAPS_API_KEY: ${process.env.REACT_APP_AZURE_MAPS_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`- REACT_APP_BACKEND_URL: ${process.env.REACT_APP_BACKEND_URL || 'Not set'}`);
});
