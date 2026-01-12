import { useState, useEffect } from 'react';
import Card from '../../components/common/Card/Card';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Modal from '../../components/common/Modal/Modal';
import { usersService } from '../../services/firestore'; // NEW
import { generateId } from '../../utils/helpers';
import { notificationPreferencesService } from '../../services/notificationPreferencesService';
import { useAuth } from '../../hooks/useAuth';
import styles from './Settings.module.css';

const Settings = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]); // NEW: Start empty
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'member',
    permissions: ['read']
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // Success/feedback messages
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState(''); // 'success', 'error', 'warning'

  // System preferences state
  const [systemPreferences, setSystemPreferences] = useState({
    theme: 'light',
    notifications: true,
    autoSave: true,
    defaultCurrency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC'
  });
  const [preferencesChanged, setPreferencesChanged] = useState(false);

  // Notification preferences state
  const [notificationPreferences, setNotificationPreferences] = useState(null);
  const [notificationPreferencesChanged, setNotificationPreferencesChanged] = useState(false);
  const [loadingNotificationPreferences, setLoadingNotificationPreferences] = useState(true);

  // Load notification preferences on component mount
  useEffect(() => {
    if (user?.uid) {
      loadNotificationPreferences();
    }
  }, [user]);

  // NEW: Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await usersService.getAll();
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
        showFeedback('Failed to load team members', 'error');
      }
    };
    fetchUsers();
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      setLoadingNotificationPreferences(true);
      const preferences = await notificationPreferencesService.getUserPreferences(user.uid);
      setNotificationPreferences(preferences);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      showFeedback('Failed to load notification preferences', 'error');
    } finally {
      setLoadingNotificationPreferences(false);
    }
  };

  const roles = [
    { value: 'admin', label: 'Administrator', permissions: ['read', 'write', 'delete', 'admin'] },
    { value: 'manager', label: 'Project Manager', permissions: ['read', 'write'] },
    { value: 'member', label: 'Team Member', permissions: ['read'] }
  ];

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUser = (user, isEdit = false) => {
    const errors = {};

    if (!user.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(user.email)) {
      errors.email = 'Please enter a valid email address';
    } else {
      // Check for duplicate email (excluding current user in edit mode)
      const existingUser = users.find(u => u.email === user.email && (!isEdit || u.id !== user.id));
      if (existingUser) {
        errors.email = 'This email is already in use';
      }
    }

    if (!user.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (user.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!user.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (user.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    if (!user.role) {
      errors.role = 'Role is required';
    }

    return errors;
  };

  const showFeedback = (message, type = 'success') => {
    setFeedbackMessage(message);
    setFeedbackType(type);
    setTimeout(() => {
      setFeedbackMessage('');
      setFeedbackType('');
    }, 5000);
  };

  const handleAddUser = async () => {
    const errors = validateUser(newUser);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      showFeedback('Please fix the validation errors before adding the user', 'error');
      return;
    }

    try {
      const userData = {
        ...newUser,
        email: newUser.email.trim(),
        firstName: newUser.firstName.trim(),
        lastName: newUser.lastName.trim(),
        avatar: null,
        // Remove createdAt as service adds it
        lastLoginAt: null,
        permissions: roles.find(role => role.value === newUser.role)?.permissions || ['read']
      };

      const createdUser = await usersService.create(userData);
      setUsers([...users, createdUser]);

      setNewUser({
        email: '',
        firstName: '',
        lastName: '',
        role: 'member',
        permissions: ['read']
      });
      setValidationErrors({});
      setIsAddUserModalOpen(false);
      showFeedback(`Successfully added ${userData.firstName} ${userData.lastName} to the team`, 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      showFeedback('Failed to add user', 'error');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser({ ...user });
    setValidationErrors({});
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async () => {
    const errors = validateUser(selectedUser, true);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      showFeedback('Please fix the validation errors before updating the user', 'error');
      return;
    }

    // Check if role change affects permissions for critical roles
    const originalUser = users.find(u => u.id === selectedUser.id);
    if (originalUser.role === 'admin' && selectedUser.role !== 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        showFeedback('Cannot remove the last administrator. At least one admin must remain.', 'error');
        return;
      }
    }

    try {
      const updatedData = {
        ...selectedUser,
        email: selectedUser.email.trim(),
        firstName: selectedUser.firstName.trim(),
        lastName: selectedUser.lastName.trim(),
        permissions: roles.find(role => role.value === selectedUser.role)?.permissions || ['read']
      };

      await usersService.update(selectedUser.id, updatedData);

      setUsers(users.map(user =>
        user.id === selectedUser.id ? { ...user, ...updatedData } : user
      ));

      setIsEditUserModalOpen(false);
      setSelectedUser(null);
      setValidationErrors({});
      showFeedback(`Successfully updated ${updatedData.firstName} ${updatedData.lastName}'s information`, 'success');
    } catch (error) {
      console.error('Error updating user:', error);
      showFeedback('Failed to update user', 'error');
    }
  };

  const handleDeleteUser = (user) => {
    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        showFeedback('Cannot remove the last administrator. At least one admin must remain.', 'error');
        return;
      }
    }

    setUserToDelete(user);
    setIsConfirmModalOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete) {
      try {
        await usersService.delete(userToDelete.id);
        setUsers(users.filter(user => user.id !== userToDelete.id));
        showFeedback(`Successfully removed ${userToDelete.firstName} ${userToDelete.lastName} from the team`, 'success');
      } catch (error) {
        console.error('Error deleting user:', error);
        showFeedback('Failed to delete user', 'error');
      } finally {
        setUserToDelete(null);
        setIsConfirmModalOpen(false);
      }
    }
  };

  const handleNotificationPreferenceChange = (key, value) => {
    if (!notificationPreferences) return;

    // Handle nested properties (e.g., profitSummary.enabled)
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setNotificationPreferences(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setNotificationPreferences(prev => ({
        ...prev,
        [key]: value
      }));
    }
    setNotificationPreferencesChanged(true);
  };

  const saveNotificationPreferences = async () => {
    try {
      await notificationPreferencesService.updateUserPreferences(user.uid, notificationPreferences);
      setNotificationPreferencesChanged(false);
      showFeedback('Notification preferences saved successfully', 'success');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      showFeedback('Failed to save notification preferences', 'error');
    }
  };

  const resetNotificationPreferences = async () => {
    try {
      const defaultPreferences = notificationPreferencesService.getDefaultPreferences();
      setNotificationPreferences(defaultPreferences);
      setNotificationPreferencesChanged(true);
      showFeedback('Notification preferences reset to defaults', 'success');
    } catch (error) {
      console.error('Error resetting notification preferences:', error);
      showFeedback('Failed to reset notification preferences', 'error');
    }
  };

  const handleSystemPreferenceChange = (key, value) => {
    setSystemPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setPreferencesChanged(true);
  };

  const saveSystemPreferences = () => {
    // Simulate saving preferences
    setTimeout(() => {
      setPreferencesChanged(false);
      showFeedback('System preferences saved successfully', 'success');
    }, 500);
  };

  const resetSystemPreferences = () => {
    setSystemPreferences({
      theme: 'light',
      notifications: true,
      autoSave: true,
      defaultCurrency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      timezone: 'UTC'
    });
    setPreferencesChanged(false);
    showFeedback('System preferences reset to defaults', 'success');
  };

  return (
    <div className={styles.settings}>
      <div className={styles.header}>
        <h1>Settings</h1>
        <p>Manage your team, permissions, and system preferences</p>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className={`${styles.feedback} ${styles[feedbackType]}`}>
          <span>{feedbackMessage}</span>
          <button
            className={styles.closeFeedback}
            onClick={() => setFeedbackMessage('')}
          >
            ×
          </button>
        </div>
      )}

      {/* Team Management Section */}
      <Card title="Team Management" className={styles.section}>
        <div className={styles.sectionHeader}>
          <p>Manage team members and their permissions</p>
          <Button
            variant="primary"
            onClick={() => setIsAddUserModalOpen(true)}
          >
            Add Team Member
          </Button>
        </div>

        <div className={styles.userList}>
          {users.map(user => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userInfo}>
                <div className={styles.userAvatar}>
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div className={styles.userDetails}>
                  <h4>{user.firstName} {user.lastName}</h4>
                  <p>{user.email}</p>
                  <span className={`${styles.role} ${styles[user.role]}`}>
                    {roles.find(role => role.value === user.role)?.label}
                  </span>
                </div>
              </div>
              <div className={styles.userActions}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleEditUser(user)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleDeleteUser(user)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Notification Preferences Section */}
      <Card title="Notification Preferences" className={styles.section}>
        {loadingNotificationPreferences ? (
          <div className={styles.loading}>Loading notification preferences...</div>
        ) : notificationPreferences ? (
          <>
            <div className={styles.sectionHeader}>
              <p>Configure which notifications you want to receive</p>
            </div>

            <div className={styles.notificationPreferences}>
              {/* Financial Notifications */}
              <div className={styles.preferenceCategory}>
                <h4>Financial Notifications</h4>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.ledgerEntryCreated}
                      onChange={(e) => handleNotificationPreferenceChange('ledgerEntryCreated', e.target.checked)}
                    />
                    <span>Ledger entries created</span>
                    <small>Notify when new ledger entries are created from revenue processing</small>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.settlementCompleted}
                      onChange={(e) => handleNotificationPreferenceChange('settlementCompleted', e.target.checked)}
                    />
                    <span>Settlements completed</span>
                    <small>Notify when settlements are processed and marked as cleared</small>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.settlementReminder}
                      onChange={(e) => handleNotificationPreferenceChange('settlementReminder', e.target.checked)}
                    />
                    <span>Settlement reminders</span>
                    <small>Notify about pending settlements that need attention</small>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.revenueRuleModified}
                      onChange={(e) => handleNotificationPreferenceChange('revenueRuleModified', e.target.checked)}
                    />
                    <span>Revenue rule changes</span>
                    <small>Notify when revenue split rules are created or modified</small>
                  </label>
                </div>
              </div>

              {/* Payment Notifications */}
              <div className={styles.preferenceCategory}>
                <h4>Payment Notifications</h4>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.paymentAdded}
                      onChange={(e) => handleNotificationPreferenceChange('paymentAdded', e.target.checked)}
                    />
                    <span>New payments added</span>
                    <small>Notify when new payments are added to projects</small>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.paymentVerified}
                      onChange={(e) => handleNotificationPreferenceChange('paymentVerified', e.target.checked)}
                    />
                    <span>Payments verified</span>
                    <small>Notify when payments are verified by the team</small>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.proofUploaded}
                      onChange={(e) => handleNotificationPreferenceChange('proofUploaded', e.target.checked)}
                    />
                    <span>Payment proofs uploaded</span>
                    <small>Notify when payment proofs are uploaded for review</small>
                  </label>
                </div>
              </div>

              {/* Profit Summary */}
              <div className={styles.preferenceCategory}>
                <h4>Profit Summary Reports</h4>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.profitSummary?.enabled}
                      onChange={(e) => handleNotificationPreferenceChange('profitSummary.enabled', e.target.checked)}
                    />
                    <span>Enable profit summaries</span>
                    <small>Receive periodic profit summary reports</small>
                  </label>
                </div>

                {notificationPreferences.profitSummary?.enabled && (
                  <div className={styles.preferenceGroup}>
                    <label>Summary frequency</label>
                    <select
                      value={notificationPreferences.profitSummary?.frequency || 'monthly'}
                      onChange={(e) => handleNotificationPreferenceChange('profitSummary.frequency', e.target.value)}
                      className={styles.select}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Project Notifications */}
              <div className={styles.preferenceCategory}>
                <h4>Project Notifications</h4>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.projectCreated}
                      onChange={(e) => handleNotificationPreferenceChange('projectCreated', e.target.checked)}
                    />
                    <span>Added to projects</span>
                    <small>Notify when you're added to new projects</small>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.systemAlert}
                      onChange={(e) => handleNotificationPreferenceChange('systemAlert', e.target.checked)}
                    />
                    <span>System alerts</span>
                    <small>Important system notifications and announcements</small>
                  </label>
                </div>
              </div>

              {/* Delivery Methods */}
              <div className={styles.preferenceCategory}>
                <h4>Delivery Methods</h4>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.deliveryMethods?.inApp}
                      onChange={(e) => handleNotificationPreferenceChange('deliveryMethods.inApp', e.target.checked)}
                    />
                    <span>In-app notifications</span>
                    <small>Show notifications within the application</small>
                  </label>
                </div>

                <div className={styles.checkboxGroup}>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.deliveryMethods?.email}
                      onChange={(e) => handleNotificationPreferenceChange('deliveryMethods.email', e.target.checked)}
                      disabled
                    />
                    <span>Email notifications (Coming Soon)</span>
                    <small>Receive notifications via email</small>
                  </label>
                </div>
              </div>
            </div>

            {notificationPreferencesChanged && (
              <div className={styles.preferencesActions}>
                <Button
                  variant="secondary"
                  onClick={resetNotificationPreferences}
                >
                  Reset to Defaults
                </Button>
                <Button
                  variant="primary"
                  onClick={saveNotificationPreferences}
                >
                  Save Preferences
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.error}>Failed to load notification preferences</div>
        )}
      </Card>

      {/* System Preferences Section */}
      <Card title="System Preferences" className={styles.section}>
        <div className={styles.preferencesGrid}>
          <div className={styles.preferenceGroup}>
            <label>Theme</label>
            <select
              value={systemPreferences.theme}
              onChange={(e) => handleSystemPreferenceChange('theme', e.target.value)}
              className={styles.select}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div className={styles.preferenceGroup}>
            <label>Default Currency</label>
            <select
              value={systemPreferences.defaultCurrency}
              onChange={(e) => handleSystemPreferenceChange('defaultCurrency', e.target.value)}
              className={styles.select}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
            </select>
          </div>

          <div className={styles.preferenceGroup}>
            <label>Date Format</label>
            <select
              value={systemPreferences.dateFormat}
              onChange={(e) => handleSystemPreferenceChange('dateFormat', e.target.value)}
              className={styles.select}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div className={styles.preferenceGroup}>
            <label>Timezone</label>
            <select
              value={systemPreferences.timezone}
              onChange={(e) => handleSystemPreferenceChange('timezone', e.target.value)}
              className={styles.select}
            >
              <option value="UTC">UTC</option>
              <option value="EST">Eastern Time</option>
              <option value="PST">Pacific Time</option>
              <option value="GMT">Greenwich Mean Time</option>
            </select>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={systemPreferences.notifications}
                onChange={(e) => handleSystemPreferenceChange('notifications', e.target.checked)}
              />
              <span>Enable notifications</span>
            </label>
          </div>

          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={systemPreferences.autoSave}
                onChange={(e) => handleSystemPreferenceChange('autoSave', e.target.checked)}
              />
              <span>Auto-save changes</span>
            </label>
          </div>
        </div>

        {preferencesChanged && (
          <div className={styles.preferencesActions}>
            <Button
              variant="secondary"
              onClick={resetSystemPreferences}
            >
              Reset to Defaults
            </Button>
            <Button
              variant="primary"
              onClick={saveSystemPreferences}
            >
              Save Changes
            </Button>
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => {
          setIsAddUserModalOpen(false);
          setValidationErrors({});
        }}
        title="Add Team Member"
      >
        <div className={styles.modalContent}>
          <Input
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(value) => setNewUser({ ...newUser, email: value })}
            placeholder="user@example.com"
            required
            error={validationErrors.email}
          />
          <Input
            label="First Name"
            type="text"
            value={newUser.firstName}
            onChange={(value) => setNewUser({ ...newUser, firstName: value })}
            placeholder="John"
            required
            error={validationErrors.firstName}
          />
          <Input
            label="Last Name"
            type="text"
            value={newUser.lastName}
            onChange={(value) => setNewUser({ ...newUser, lastName: value })}
            placeholder="Doe"
            required
            error={validationErrors.lastName}
          />
          <div className={styles.selectGroup}>
            <label>Role</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className={`${styles.select} ${validationErrors.role ? styles.error : ''}`}
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            {validationErrors.role && (
              <span className={styles.errorText}>{validationErrors.role}</span>
            )}
          </div>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddUserModalOpen(false);
                setValidationErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddUser}
            >
              Add User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setValidationErrors({});
        }}
        title="Edit Team Member"
      >
        {selectedUser && (
          <div className={styles.modalContent}>
            <Input
              label="Email"
              type="email"
              value={selectedUser.email}
              onChange={(value) => setSelectedUser({ ...selectedUser, email: value })}
              placeholder="user@example.com"
              required
              error={validationErrors.email}
            />
            <Input
              label="First Name"
              type="text"
              value={selectedUser.firstName}
              onChange={(value) => setSelectedUser({ ...selectedUser, firstName: value })}
              placeholder="John"
              required
              error={validationErrors.firstName}
            />
            <Input
              label="Last Name"
              type="text"
              value={selectedUser.lastName}
              onChange={(value) => setSelectedUser({ ...selectedUser, lastName: value })}
              placeholder="Doe"
              required
              error={validationErrors.lastName}
            />
            <div className={styles.selectGroup}>
              <label>Role</label>
              <select
                value={selectedUser.role}
                onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                className={`${styles.select} ${validationErrors.role ? styles.error : ''}`}
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {validationErrors.role && (
                <span className={styles.errorText}>{validationErrors.role}</span>
              )}
            </div>
            <div className={styles.permissionsInfo}>
              <h4>Permissions:</h4>
              <ul>
                {roles.find(role => role.value === selectedUser.role)?.permissions.map(permission => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            </div>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditUserModalOpen(false);
                  setValidationErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateUser}
              >
                Update User
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setUserToDelete(null);
        }}
        title="Confirm User Removal"
      >
        {userToDelete && (
          <div className={styles.modalContent}>
            <p className={styles.confirmText}>
              Are you sure you want to remove <strong>{userToDelete.firstName} {userToDelete.lastName}</strong> from the team?
            </p>
            <p className={styles.warningText}>
              This action cannot be undone. The user will lose access to all projects and data.
            </p>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setUserToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDeleteUser}
              >
                Remove User
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Settings;