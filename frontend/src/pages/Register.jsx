import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      const message = apiErrors?.[0]?.message || err.response?.data?.message || 'Could not create account.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">Gurukul</div>
        <div className="tagline">Create your account</div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>I am a</label>
            <div className="role-toggle">
              <button
                type="button"
                className={form.role === 'student' ? 'selected' : ''}
                onClick={() => setForm({ ...form, role: 'student' })}
              >
                Student
              </button>
              <button
                type="button"
                className={form.role === 'teacher' ? 'selected' : ''}
                onClick={() => setForm({ ...form, role: 'teacher' })}
              >
                Teacher
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ada Lovelace"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@school.edu"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </div>
          <button className="btn btn-accent" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
