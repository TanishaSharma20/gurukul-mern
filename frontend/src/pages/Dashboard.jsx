import { useAuth } from '../context/AuthContext';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  return user.role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />;
}
