import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllClassrooms, requestToJoin } from '../api/classrooms';
import StatusBadge from '../components/StatusBadge';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setClassrooms(await getAllClassrooms());
    } catch (err) {
      setError('Could not load classrooms.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleJoin(id) {
    setPendingActionId(id);
    setError('');
    try {
      await requestToJoin(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send join request.');
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user.name.split(' ')[0]}</h1>
        <p>Browse classrooms and request access to their materials.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p className="loading-text">Loading...</p>}

      {!loading && classrooms.length === 0 && (
        <div className="empty-state">
          <h3>No classrooms yet</h3>
          <p>Check back once a teacher has created one.</p>
        </div>
      )}

      {!loading && classrooms.length > 0 && (
        <div className="classroom-grid">
          {classrooms.map((c) => (
            <div className="classroom-card" key={c._id}>
              <div>
                <h3>{c.name}</h3>
                <div className="teacher-name">Taught by {c.teacher?.name}</div>
              </div>
              {c.description && <div className="desc">{c.description}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {c.myStatus ? (
                  <StatusBadge status={c.myStatus} />
                ) : (
                  <span className="muted">{c.approvedCount} enrolled</span>
                )}

                {c.myStatus === 'approved' && (
                  <Link className="btn btn-outline btn-sm" to={`/classrooms/${c._id}`}>
                    Open
                  </Link>
                )}
                {(!c.myStatus || c.myStatus === 'rejected') && (
                  <button
                    className="btn btn-accent btn-sm"
                    disabled={pendingActionId === c._id}
                    onClick={() => handleJoin(c._id)}
                  >
                    {c.myStatus === 'rejected' ? 'Request again' : 'Request to join'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
