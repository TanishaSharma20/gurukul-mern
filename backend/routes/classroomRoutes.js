const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const {
  createClassroom,
  getMyClassrooms,
  getAllClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  requestToJoin,
  listJoinRequests,
  decideJoinRequest,
  removeStudent,
} = require('../controllers/classroomController');
const { uploadMaterial, listMaterials, deleteMaterial } = require('../controllers/materialController');

const router = express.Router();

// Every route below requires a valid access token.
router.use(protect);

// --- Classrooms ---
router.post(
  '/',
  authorize('teacher'),
  [body('name').trim().notEmpty().withMessage('Classroom name is required')],
  validate,
  createClassroom
);

router.get('/mine', authorize('teacher'), getMyClassrooms);
router.get('/', getAllClassrooms); // browsable list for students (and teachers)
router.get('/:id', getClassroomById);
router.patch('/:id', authorize('teacher'), updateClassroom);
router.delete('/:id', authorize('teacher'), deleteClassroom);

// --- Join requests (student approval flow) ---
router.post('/:id/join', authorize('student'), requestToJoin);
router.get('/:id/requests', authorize('teacher'), listJoinRequests);
router.put(
  '/:id/requests/:studentId',
  authorize('teacher'),
  [body('status').isIn(['approved', 'rejected'])],
  validate,
  decideJoinRequest
);
router.delete('/:id/students/:studentId', authorize('teacher'), removeStudent);

// --- Materials ---
router.post(
  '/:id/materials',
  authorize('teacher'),
  [body('title').trim().notEmpty().withMessage('Title is required')],
  validate,
  uploadMaterial
);
router.get('/:id/materials', listMaterials);
router.delete('/:classroomId/materials/:materialId', authorize('teacher'), deleteMaterial);

module.exports = router;
