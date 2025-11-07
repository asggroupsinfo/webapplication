import { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { User, UserCreate, UserUpdate } from '../../types';

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreate>({
    email: '',
    password: '',
    role: 'Admin',
  });

  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.role === 'Super Admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await userAPI.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', role: 'Admin' });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ email: user.email, password: '', role: user.role });
    setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await userAPI.deleteUser(userId);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        const updateData: UserUpdate = {
          email: formData.email,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await userAPI.updateUser(editingUser.id, updateData);
      } else {
        await userAPI.createUser(formData);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="bg-bearish-red/20 border border-bearish-red text-bearish-red px-4 py-3 rounded">
          Access denied. Super Admin privileges required.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-premium-orange">User Management</h1>
        <button
          onClick={handleCreate}
          className="bg-premium-orange text-pitch-black px-4 py-2 rounded-md hover:bg-golden-glow transition-colors"
        >
          Add User
        </button>
      </div>

      {error && (
        <div className="bg-bearish-red/20 border border-bearish-red text-bearish-red px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-orange mx-auto mb-4"></div>
            <p className="text-gray-400">Loading users...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-charcoal rounded-lg border border-gray-700 p-12 text-center">
          <p className="text-gray-400 mb-4">No users found</p>
          <button
            onClick={handleCreate}
            className="bg-premium-orange text-pitch-black px-4 py-2 rounded-md hover:bg-golden-glow transition-colors"
          >
            Create First User
          </button>
        </div>
      ) : (
        <div className="bg-charcoal rounded-lg overflow-hidden border border-gray-700">
          <table className="w-full">
            <thead className="bg-deep-space">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Role</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-deep-space">
                  <td className="px-4 py-3 text-sm text-gray-300">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{user.role}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.is_active
                          ? 'bg-vegetarian-green/20 text-vegetarian-green'
                          : 'bg-bearish-red/20 text-bearish-red'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-premium-orange hover:text-golden-glow transition-colors"
                      >
                        Edit
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-bearish-red hover:text-red-400 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-charcoal p-6 rounded-lg border border-premium-orange/20 max-w-md w-full">
            <h2 className="text-xl font-bold text-premium-orange mb-4">
              {editingUser ? 'Edit User' : 'Create User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {editingUser && '(leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'Super Admin' | 'Admin' })}
                  className="w-full px-4 py-2 bg-deep-space border border-gray-700 rounded-md text-white"
                >
                  <option value="Admin">Admin</option>
                  <option value="Super Admin">Super Admin</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-premium-orange text-pitch-black rounded-md hover:bg-golden-glow"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

