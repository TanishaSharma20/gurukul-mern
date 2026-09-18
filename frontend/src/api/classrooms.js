import api from './axios';

export const createClassroom = (data) => api.post('/classrooms', data).then((r) => r.data);
export const getMyClassrooms = () => api.get('/classrooms/mine').then((r) => r.data);
export const getAllClassrooms = () => api.get('/classrooms').then((r) => r.data);
export const getClassroom = (id) => api.get(`/classrooms/${id}`).then((r) => r.data);
export const updateClassroom = (id, data) => api.patch(`/classrooms/${id}`, data).then((r) => r.data);
export const deleteClassroom = (id) => api.delete(`/classrooms/${id}`).then((r) => r.data);

export const requestToJoin = (id) => api.post(`/classrooms/${id}/join`).then((r) => r.data);
export const listJoinRequests = (id, status) =>
  api.get(`/classrooms/${id}/requests`, { params: status ? { status } : {} }).then((r) => r.data);
export const decideJoinRequest = (id, studentId, status) =>
  api.put(`/classrooms/${id}/requests/${studentId}`, { status }).then((r) => r.data);
export const removeStudent = (id, studentId) =>
  api.delete(`/classrooms/${id}/students/${studentId}`).then((r) => r.data);

export const listMaterials = (id) => api.get(`/classrooms/${id}/materials`).then((r) => r.data);
export const uploadMaterial = (id, data) => api.post(`/classrooms/${id}/materials`, data).then((r) => r.data);
export const deleteMaterial = (classroomId, materialId) =>
  api.delete(`/classrooms/${classroomId}/materials/${materialId}`).then((r) => r.data);
