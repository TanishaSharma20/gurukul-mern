import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createClassroom, getMyClassrooms } from '../api/classrooms';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setClassrooms(await getMyClassrooms());
    } catch (err) {
      setError('Could not load your classrooms.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createClassroom(form);
      setForm({ name: '', description: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create classroom.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Good to see you, {user.name.split(' ')[0]}</h1>
        <p>Create classrooms and manage who has access to your materials.</p>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>New classroom</h2>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleCreate} style={{ maxWidth: 480 }}>
          <div className="field">
            <label htmlFor="cname">Name</label>
            <input
              id="cname"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Intro to Algorithms"
            />
          </div>
          <div className="field">
            <label htmlFor="cdesc">Description (optional)</label>
            <textarea
              id="cdesc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What will students find here?"
            />
          </div>
          <button className="btn btn-accent" type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create classroom'}
          </button>
        </form>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Your classrooms</h2>
        </div>

        {loading && <p className="loading-text">Loading...</p>}

        {!loading && classrooms.length === 0 && (
          <div className="empty-state">
            <h3>No classrooms yet</h3>
            <p>Create your first classroom above - students will be able to find and request to join it.</p>
          </div>
        )}

        {!loading && classrooms.length > 0 && (
          <div className="row-list">
            {classrooms.map((c) => {
              const pending = c.students.filter((s) => s.status === 'pending').length;
              const approved = c.students.filter((s) => s.status === 'approved').length;
              return (
                <div className="row-item" key={c._id}>
                  <div>
                    <div className="row-title">{c.name}</div>
                    <div className="row-meta">
                      {approved} approved student{approved === 1 ? '' : 's'}
                      {pending > 0 && ` · ${pending} pending request${pending === 1 ? '' : 's'}`}
                    </div>
                  </div>
                  <div className="row-actions">
                    <Link className="btn btn-outline btn-sm" to={`/classrooms/${c._id}`}>
                      Manage
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
