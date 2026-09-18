const Classroom = require('../models/Classroom');
const { asyncHandler } = require('../middleware/errorHandler');

// Small shared guard: loads the classroom and 404s if missing, 403s if
// the requester isn't the owning teacher. Used by every teacher-only,
// single-classroom action below.
async function findOwnedClassroomOr403(classroomId, teacherId) {
  const classroom = await Classroom.findById(classroomId);
  if (!classroom) {
    const err = new Error('Classroom not found');
    err.statusCode = 404;
    throw err;
  }
  if (classroom.teacher.toString() !== teacherId) {
    const err = new Error('Forbidden: you do not own this classroom');
    err.statusCode = 403;
    throw err;
  }
  return classroom;
}

// POST /api/classrooms (teacher)
const createClassroom = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const classroom = await Classroom.create({ name, description, teacher: req.userId });
  res.status(201).json(classroom);
});

// GET /api/classrooms/mine (teacher) - classrooms this teacher owns
const getMyClassrooms = asyncHandler(async (req, res) => {
  const classrooms = await Classroom.find({ teacher: req.userId })
    .populate('teacher', 'name email')
    .sort('-createdAt');
  res.status(200).json(classrooms);
});

// GET /api/classrooms (student/any authenticated user) - browsable list,
// annotated with the requester's own join status if they have one.
const getAllClassrooms = asyncHandler(async (req, res) => {
  const classrooms = await Classroom.find({}).populate('teacher', 'name email').sort('-createdAt');

  const shaped = classrooms.map((c) => {
    const mine = c.students.find((s) => s.student.toString() === req.userId);
    return {
      _id: c._id,
      name: c.name,
      description: c.description,
      teacher: c.teacher,
      approvedCount: c.students.filter((s) => s.status === 'approved').length,
      myStatus: mine ? mine.status : null,
      createdAt: c.createdAt,
    };
  });

  res.status(200).json(shaped);
});

// GET /api/classrooms/:id
const getClassroomById = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id)
    .populate('teacher', 'name email')
    .populate('students.student', 'name email');

  if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

  const isOwner = classroom.teacher._id.toString() === req.userId;

  if (isOwner) {
    return res.status(200).json(classroom);
  }

  // Students only see their own status, never the whole roster.
  const mine = classroom.students.find((s) => s.student._id.toString() === req.userId);
  res.status(200).json({
    _id: classroom._id,
    name: classroom.name,
    description: classroom.description,
    teacher: classroom.teacher,
    myStatus: mine ? mine.status : null,
  });
});

// PATCH /api/classrooms/:id (teacher, owner only)
// PATCH (not PUT) because we only touch the fields that were sent -
// e.g. renaming a classroom shouldn't wipe its description or roster.
const updateClassroom = asyncHandler(async (req, res) => {
  const classroom = await findOwnedClassroomOr403(req.params.id, req.userId);

  if (req.body.name !== undefined) classroom.name = req.body.name;
  if (req.body.description !== undefined) classroom.description = req.body.description;

  await classroom.save();
  res.status(200).json(classroom);
});

// DELETE /api/classrooms/:id (teacher, owner only)
const deleteClassroom = asyncHandler(async (req, res) => {
  const classroom = await findOwnedClassroomOr403(req.params.id, req.userId);
  await classroom.deleteOne();
  res.status(200).json({ message: 'Classroom deleted' });
});

// POST /api/classrooms/:id/join (student) - request to join a classroom
const requestToJoin = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findById(req.params.id);
  if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

  const existing = classroom.students.find((s) => s.student.toString() === req.userId);

  if (existing) {
    if (existing.status === 'approved') {
      return res.status(409).json({ message: 'You are already approved for this classroom' });
    }
    if (existing.status === 'pending') {
      return res.status(409).json({ message: 'Your join request is already pending' });
    }
    // Previously rejected - allow requesting again.
    existing.status = 'pending';
    existing.requestedAt = new Date();
    existing.decidedAt = undefined;
  } else {
    classroom.students.push({ student: req.userId, status: 'pending' });
  }

  await classroom.save();
  res.status(201).json({ message: 'Join request submitted' });
});

// GET /api/classrooms/:id/requests?status=pending (teacher, owner only)
const listJoinRequests = asyncHandler(async (req, res) => {
  const classroom = await findOwnedClassroomOr403(req.params.id, req.userId);
  await classroom.populate('students.student', 'name email');

  const statusFilter = req.query.status; // 'pending' | 'approved' | 'rejected' | undefined
  const requests = classroom.students.filter((s) => !statusFilter || s.status === statusFilter);

  res.status(200).json(requests);
});

// PUT /api/classrooms/:id/requests/:studentId (teacher, owner only)
// PUT here is fine (not PATCH) - we are fully replacing this one
// sub-resource's decision state (status + decidedAt) in one shot.
const decideJoinRequest = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'approved' | 'rejected'
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
  }

  const classroom = await findOwnedClassroomOr403(req.params.id, req.userId);
  const entry = classroom.students.find((s) => s.student.toString() === req.params.studentId);

  if (!entry) return res.status(404).json({ message: 'Join request not found' });

  entry.status = status;
  entry.decidedAt = new Date();
  await classroom.save();

  res.status(200).json({ message: `Request ${status}`, entry });
});

// DELETE /api/classrooms/:id/students/:studentId (teacher, owner only)
// Revokes a student's access outright (Q28's "approval is revoked").
const removeStudent = asyncHandler(async (req, res) => {
  const classroom = await findOwnedClassroomOr403(req.params.id, req.userId);
  const before = classroom.students.length;
  classroom.students = classroom.students.filter(
    (s) => s.student.toString() !== req.params.studentId
  );

  if (classroom.students.length === before) {
    return res.status(404).json({ message: 'Student not found in this classroom' });
  }

  await classroom.save();
  res.status(200).json({ message: 'Student removed from classroom' });
});

module.exports = {
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
  findOwnedClassroomOr403,
};
