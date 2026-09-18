import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getClassroom,
  updateClassroom,
  deleteClassroom,
  decideJoinRequest,
  removeStudent,
  requestToJoin,
  listMaterials,
  uploadMaterial,
  deleteMaterial,
} from '../api/classrooms';
import StatusBadge from '../components/StatusBadge';

export default function ClassroomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });

  const [materialForm, setMaterialForm] = useState({ title: '', description: '', resourceUrl: '' });
  const [uploading, setUploading] = useState(false);

  const isOwner = Array.isArray(classroom?.students);

  const loadClassroom = useCallback(async () => {
    const data = await getClassroom(id);
    setClassroom(data);
    setEditForm({ name: data.name, description: data.description || '' });
    return data;
  }, [id]);

  const loadMaterials = useCallback(async () => {
    try {
      setMaterials(await listMaterials(id));
    } catch (err) {
      // Not approved yet, or not allowed - just show an empty state.
      setMaterials([]);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await loadClassroom();
        if (cancelled) return;
        const owner = Array.isArray(data.students);
        if (owner || data.myStatus === 'approved') {
          await loadMaterials();
        }
      } catch (err) {
        if (!cancelled) setError('Could not load this classroom.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadClassroom, loadMaterials]);

  async function refetchAfterAction() {
    const data = await loadClassroom();
    if (Array.isArray(data.students) || data.myStatus === 'approved') {
      await loadMaterials();
    } else {
      setMaterials([]);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError('');
    try {
      await updateClassroom(id, editForm);
      setEditing(false);
      await refetchAfterAction();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save changes.');
    }
  }

  async function handleDeleteClassroom() {
    if (!window.confirm('Delete this classroom? This cannot be undone.')) return;
    try {
      await deleteClassroom(id);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete classroom.');
    }
  }

  async function handleDecide(studentId, status) {
    setBusyId(studentId);
    setError('');
    try {
      await decideJoinRequest(id, studentId, status);
      await refetchAfterAction();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update that request.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemoveStudent(studentId) {
    if (!window.confirm('Remove this student? They will lose access immediately.')) return;
    setBusyId(studentId);
    setError('');
    try {
      await removeStudent(id, studentId);
      await refetchAfterAction();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove student.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleJoin() {
    setError('');
    try {
      await requestToJoin(id);
      await refetchAfterAction();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send join request.');
    }
  }

  async function handleUploadMaterial(e) {
    e.preventDefault();
    if (!materialForm.title.trim()) return;
    setUploading(true);
    setError('');
    try {
      await uploadMaterial(id, materialForm);
      setMaterialForm({ title: '', description: '', resourceUrl: '' });
      await loadMaterials();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not upload material.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteMaterial(materialId) {
    if (!window.confirm('Delete this material?')) return;
    try {
      await deleteMaterial(id, materialId);
      await loadMaterials();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete material.');
    }
  }

  if (loading) return <p className="loading-text">Loading...</p>;
  if (!classroom) return <p className="loading-text">Classroom not found.</p>;

  const pendingRequests = isOwner ? classroom.students.filter((s) => s.status === 'pending') : [];
  const approvedStudents = isOwner ? classroom.students.filter((s) => s.status === 'approved') : [];

  return (
    <div>
      <Link className="back-link" to="/dashboard">
        &larr; Back to dashboard
      </Link>

      {error && <div className="error-banner">{error}</div>}

      <div className="page-header">
        {!editing ? (
          <>
            <h1>{classroom.name}</h1>
            {classroom.description && <p>{classroom.description}</p>}
            {!isOwner && <p className="muted">Taught by {classroom.teacher?.name}</p>}
            {isOwner && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}>
                  Edit details
                </button>
                <button className="btn btn-danger-outline btn-sm" onClick={handleDeleteClassroom}>
                  Delete classroom
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSaveEdit} style={{ maxWidth: 480 }}>
            <div className="field">
              <label>Name</label>
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-accent btn-sm" type="submit">
                Save
              </button>
              <button className="btn btn-outline btn-sm" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {!isOwner && (
        <div className="section">
          {classroom.myStatus === 'approved' && <StatusBadge status="approved" />}
          {classroom.myStatus === 'pending' && (
            <div className="empty-state">
              <h3>Request pending</h3>
              <p>Your teacher hasn't responded yet. Materials will appear here once you're approved.</p>
            </div>
          )}
          {classroom.myStatus === 'rejected' && (
            <div className="empty-state">
              <h3>Request declined</h3>
              <p>You can send another request if you'd like the teacher to take another look.</p>
              <button className="btn btn-accent btn-sm" onClick={handleJoin}>
                Request again
              </button>
            </div>
          )}
          {!classroom.myStatus && (
            <div className="empty-state">
              <h3>You haven't joined this classroom</h3>
              <p>Request access to see its materials.</p>
              <button className="btn btn-accent btn-sm" onClick={handleJoin}>
                Request to join
              </button>
            </div>
          )}
        </div>
      )}

      {isOwner && (
        <div className="section">
          <div className="section-head">
            <h2>Pending requests</h2>
          </div>
          {pendingRequests.length === 0 && <p className="muted">No pending requests right now.</p>}
          {pendingRequests.length > 0 && (
            <div className="row-list">
              {pendingRequests.map((s) => (
                <div className="row-item" key={s.student._id}>
                  <div>
                    <div className="row-title">{s.student.name}</div>
                    <div className="row-meta">{s.student.email}</div>
                  </div>
                  <div className="row-actions">
                    <button
                      className="btn btn-accent btn-sm"
                      disabled={busyId === s.student._id}
                      onClick={() => handleDecide(s.student._id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      disabled={busyId === s.student._id}
                      onClick={() => handleDecide(s.student._id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isOwner && (
        <div className="section">
          <div className="section-head">
            <h2>Roster</h2>
          </div>
          {approvedStudents.length === 0 && <p className="muted">No approved students yet.</p>}
          {approvedStudents.length > 0 && (
            <div className="row-list">
              {approvedStudents.map((s) => (
                <div className="row-item" key={s.student._id}>
                  <div>
                    <div className="row-title">{s.student.name}</div>
                    <div className="row-meta">{s.student.email}</div>
                  </div>
                  <div className="row-actions">
                    <button
                      className="btn btn-danger-outline btn-sm"
                      disabled={busyId === s.student._id}
                      onClick={() => handleRemoveStudent(s.student._id)}
                    >
                      Remove access
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isOwner && (
        <div className="section">
          <div className="section-head">
            <h2>Add material</h2>
          </div>
          <form onSubmit={handleUploadMaterial} style={{ maxWidth: 480 }}>
            <div className="field">
              <label>Title</label>
              <input
                required
                value={materialForm.title}
                onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                placeholder="Week 1 slides"
              />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <textarea
                value={materialForm.description}
                onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Link (optional)</label>
              <input
                value={materialForm.resourceUrl}
                onChange={(e) => setMaterialForm({ ...materialForm, resourceUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <button className="btn btn-accent" type="submit" disabled={uploading}>
              {uploading ? 'Adding...' : 'Add material'}
            </button>
          </form>
        </div>
      )}

      {(isOwner || classroom.myStatus === 'approved') && (
        <div className="section">
          <div className="section-head">
            <h2>Materials</h2>
          </div>
          {materials.length === 0 && <p className="muted">No materials have been added yet.</p>}
          {materials.length > 0 && (
            <div className="row-list">
              {materials.map((m) => (
                <div className="row-item material-item" key={m._id}>
                  <div>
                    <div className="row-title">{m.title}</div>
                    {m.description && <div className="row-meta">{m.description}</div>}
                    {m.resourceUrl && (
                      <a className="resource-link" href={m.resourceUrl} target="_blank" rel="noreferrer">
                        Open resource
                      </a>
                    )}
                  </div>
                  {isOwner && (
                    <div className="row-actions">
                      <button className="btn btn-danger-outline btn-sm" onClick={() => handleDeleteMaterial(m._id)}>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
