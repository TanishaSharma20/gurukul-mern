import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">Gurukul</div>
        <div className="brand-sub">Classrooms, done simply</div>
      </div>

      <nav>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          Dashboard
        </NavLink>
      </nav>

      <div className="user-card">
        <div className="name">{user?.name}</div>
        <div className="role">{user?.role}</div>
        <button className="btn btn-outline btn-sm" onClick={logout} style={{ width: '100%' }}>
          Log out
        </button>
      </div>
    </aside>
  );
}
