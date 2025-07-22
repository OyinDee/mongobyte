/**
 * Custom middleware to handle and log request body
 * This can help debug issues with empty request bodies
 */
const customBodyParser = (req, res, next) => {
  
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
        }
        next();
      } catch (e) {
        next();
      }
    });
  } else {
    next();
  }
};

module.exports = customBodyParser;
