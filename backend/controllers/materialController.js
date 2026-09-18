const Classroom = require('../models/Classroom');
const Material = require('../models/Material');
const { asyncHandler } = require('../middleware/errorHandler');
const { findOwnedClassroomOr403 } = require('./classroomController');

// POST /api/classrooms/:id/materials (teacher, owner only)
const uploadMaterial = asyncHandler(async (req, res) => {
  const classroom = await findOwnedClassroomOr403(req.params.id, req.userId);

  const { title, description, resourceUrl } = req.body;
  const material = await Material.create({
    classroom: classroom._id,
    title,
    description,
    resourceUrl,
    uploadedBy: req.userId,
  });

  res.status(201).json(material);
});

// GET /api/classrooms/:id/materials
// The single most important access-control check in the app: we do NOT
// trust the JWT alone to say "this student can see materials". We look
// up the classroom's current student list fresh, every single request.
// That's what makes a revoked approval take effect immediately (Q28)
// instead of only after the access token happens to expire.
const listMaterials = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id);
  if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

  const isOwner = classroom.teacher.toString() === req.userId;

  if (!isOwner) {
    const entry = classroom.students.find((s) => s.student.toString() === req.userId);
    if (!entry || entry.status !== 'approved') {
      return res.status(403).json({
        message: 'You do not have approved access to this classroom\'s materials',
      });
    }
  }

  const materials = await Material.find({ classroom: classroom._id })
    .populate('uploadedBy', 'name')
    .sort('-createdAt');

  res.status(200).json(materials);
});

// DELETE /api/classrooms/:classroomId/materials/:materialId (teacher, owner only)
const deleteMaterial = asyncHandler(async (req, res) => {
  await findOwnedClassroomOr403(req.params.classroomId, req.userId);

  const material = await Material.findOneAndDelete({
    _id: req.params.materialId,
    classroom: req.params.classroomId,
  });

  if (!material) return res.status(404).json({ message: 'Material not found' });
  res.status(200).json({ message: 'Material deleted' });
});

module.exports = { uploadMaterial, listMaterials, deleteMaterial };
