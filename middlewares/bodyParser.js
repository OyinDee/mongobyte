/**
 * Custom middleware to handle and log request body
 * This can help debug issues with empty request bodies
 */
const customBodyParser = (req, res, next) => {
  console.log('INCOMING REQUEST:');
  console.log('URL:', req.url);
  console.log('METHOD:', req.method);
  console.log('HEADERS:', req.headers);
  console.log('BODY (pre-middleware):', req.body);
  
  // If body is empty but content-type suggests JSON
  if (
    (!req.body || Object.keys(req.body).length === 0) && 
    req.headers['content-type'] && 
    req.headers['content-type'].includes('application/json')
  ) {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    
    req.on('end', () => {
      try {
        if (data) {
          req.body = JSON.parse(data);
          console.log('PARSED BODY:', req.body);
        }
        next();
      } catch (e) {
        console.error('Error parsing request body:', e);
        next();
      }
    });
  } else {
    next();
  }
};

module.exports = customBodyParser;
