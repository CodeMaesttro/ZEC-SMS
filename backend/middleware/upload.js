const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = uploadDir;
    
    // Create subdirectories based on file type
    if (file.fieldname === 'profileImage') {
      uploadPath = path.join(uploadDir, 'profiles');
    } else if (file.fieldname === 'document') {
      uploadPath = path.join(uploadDir, 'documents');
    } else if (file.fieldname === 'studyMaterial') {
      uploadPath = path.join(uploadDir, 'study-materials');
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    profileImage: /jpeg|jpg|png|gif/,
    document: /pdf|doc|docx|txt/,
    studyMaterial: /pdf|doc|docx|ppt|pptx|txt|jpeg|jpg|png/
  };
  
  const fieldAllowedTypes = allowedTypes[file.fieldname] || /jpeg|jpg|png|pdf|doc|docx/;
  const extname = fieldAllowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = fieldAllowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${fieldAllowedTypes.source}`));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: fileFilter
});

module.exports = upload;
