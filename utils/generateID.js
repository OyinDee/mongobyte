const crypto = require('crypto');

const generateId = (length = 6) => {
    return crypto.randomBytes(length).toString('hex').toUpperCase().slice(0, length);
};

module.exports = generateId;
