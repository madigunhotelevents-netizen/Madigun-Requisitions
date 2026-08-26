import React, { useState, useMemo } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Trash2, 
  Edit2, 
  Save, 
  Calendar, 
  Briefcase, 
  Clock, 
  HeartHandshake,
  Search,
  Users as UsersIcon,
  X,
  UserCheck
} from 'lucide-react';
import { User, UserRole } from '../types';

interface UsersProps {
  currentUser: User;
  users: User[];
  onDeleteUser: (userId: string) => void;
  onUpdateUser: (updatedUser: User) => void;
  onAddUser?: (newUser: any) => void;
}

export default function Users({
  currentUser,
  users,
  onDeleteUser,
  onUpdateUser,
  onAddUser
}: UsersProps) {
  const isAdmin = currentUser.role === 'admin';

  // State for search
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for Editing Own Profile
  const [isEditingOwn, setIsEditingOwn] = useState(false);
  const [ownProfile, setOwnProfile] = useState<User>({ ...currentUser });

  // State for Admin Editing another User
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserData, setEditingUserData] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // State for Admin Adding a User Internally
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('staff');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newShift, setNewShift] = useState('');
  const [newJoinedDate, setNewJoinedDate] = useState('');
  const [newEmergencyContact, setNewEmergencyContact] = useState('');
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');

  // Role map state for pending user approvals
  const [pendingRoleMap, setPendingRoleMap] = useState<Record<string, UserRole>>({});

  const pendingUsers = useMemo(() => {
    return users.filter(u => u.status === 'pending');
  }, [users]);

  const handleApprovePendingUser = (pUser: User) => {
    const selectedRole = pendingRoleMap[pUser.id] || 'staff';
    let dept = 'Housekeeping & Kitchen Ops';
    if (selectedRole === 'admin') dept = 'Property Custodian';
    else if (selectedRole === 'purchaser') dept = 'Procurement & Purchasing';
    else if (selectedRole === 'managing_director') dept = 'Executive Management';
    else if (selectedRole === 'rooms_event_officer') dept = 'Rooms & Deployed Inventory';

    onUpdateUser({
      ...pUser,
      role: selectedRole,
      status: 'approved',
      department: dept
    });
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newUsername.trim() || !newPassword || !newFullName.trim()) {
      setAddError('Please fill in Name, Username, and Password.');
      return;
    }

    const usernameLower = newUsername.trim().toLowerCase();
    const exists = users.some(u => u.username.toLowerCase() === usernameLower);
    if (exists) {
      setAddError('Username already taken. Please choose another one.');
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      username: usernameLower,
      password: newPassword,
      name: newFullName.trim(),
      role: newRole,
      status: 'approved' as const,
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined,
      department: newDepartment.trim() || undefined,
      shift: newShift || undefined,
      joinedDate: newJoinedDate || new Date().toISOString().split('T')[0],
      emergencyContact: newEmergencyContact.trim() || undefined
    };

    if (onAddUser) {
      onAddUser(newUser);
    }

    // Reset Form
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    setNewRole('staff');
    setNewEmail('');
    setNewPhone('');
    setNewDepartment('');
    setNewShift('');
    setNewJoinedDate('');
    setNewEmergencyContact('');
    setIsAddingUser(false);
  };

  // Synchronize when currentUser changes
  React.useEffect(() => {
    setOwnProfile({ ...currentUser });
  }, [currentUser]);

  // Handle saving own profile
  const handleSaveOwnProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(ownProfile);
    setIsEditingOwn(false);
  };

  // Handle starting edit for another user (admin only)
  const handleStartEditUser = (user: User) => {
    setEditError('');
    setEditingUserId(user.id);
    setEditingUserData({ ...user });
  };

  // Handle saving edited user (admin only)
  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    if (editingUserData) {
      const usernameLower = editingUserData.username.trim().toLowerCase();
      if (!usernameLower) {
        setEditError('Username cannot be empty.');
        return;
      }
      if (!editingUserData.password || !editingUserData.password.trim()) {
        setEditError('Password cannot be empty.');
        return;
      }
      const duplicateExists = users.some(u => u.id !== editingUserData.id && u.username.toLowerCase() === usernameLower);
      if (duplicateExists) {
        setEditError('Username already taken by another account.');
        return;
      }

      onUpdateUser({
        ...editingUserData,
        username: usernameLower
      });
      setEditingUserId(null);
      setEditingUserData(null);
    }
  };

  // Filtered users directory list
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const search = searchTerm.toLowerCase();
      return (
        user.name.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search) ||
        (user.email || '').toLowerCase().includes(search) ||
        (user.department || '').toLowerCase().includes(search) ||
        (user.phone || '').includes(search)
      );
    });
  }, [users, searchTerm]);

  return (
    <div className="space-y-6 font-sans text-[#3E312C]" id="users-profile-tab">
      
      {/* Tab Header */}
      <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in" id="users-header">
        <div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-[#3E312C]">Accounts & User Management</h2>
        </div>
        <div className="flex gap-2 bg-[#FAF9F5] border border-[#E6E4DD] px-4 py-2 rounded-full font-mono text-[11px] text-[#8C7A6B]">
          <span className="font-bold text-[#3E312C]">{users.length}</span> Registered Account{users.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="profiles-grid-layouts">
        
        {/* LEFT COLUMN: Personal Profile Information Card */}
        <div className="lg:col-span-1" id="my-profile-panel">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm space-y-6 relative overflow-hidden">
            <div className="border-b border-[#F0EFE9] pb-4">
              <span className="text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider block">Your Personal Profile</span>
              <h3 className="font-serif text-xl text-[#3E312C] mt-1">Employee Account</h3>
            </div>

            {isEditingOwn ? (
              // Edit Profile Form
              <form onSubmit={handleSaveOwnProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={ownProfile.name}
                    onChange={(e) => setOwnProfile({ ...ownProfile, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-xs bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">Email Address</label>
                  <input
                    type="email"
                    value={ownProfile.email || ''}
                    onChange={(e) => setOwnProfile({ ...ownProfile, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-xs bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">Phone Number</label>
                  <input
                    type="text"
                    value={ownProfile.phone || ''}
                    onChange={(e) => setOwnProfile({ ...ownProfile, phone: e.target.value })}
                    placeholder="+63 9XX XXX XXXX"
                    className="w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-xs bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">Department</label>
                    <input
                      type="text"
                      value={ownProfile.department || ''}
                      onChange={(e) => setOwnProfile({ ...ownProfile, department: e.target.value })}
                      placeholder="e.g. Culinary"
                      className="w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-xs bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">Assigned Shift</label>
                    <select
                      value={ownProfile.shift || ''}
                      onChange={(e) => setOwnProfile({ ...ownProfile, shift: e.target.value })}
                      className="w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-xs bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                    >
                      <option value="">-- Select Shift --</option>
                      <option value="Morning Shift">Morning Shift</option>
                      <option value="Evening Shift">Evening Shift</option>
                      <option value="Night Shift">Night Shift</option>
                      <option value="General Shift">General Shift</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">Date Joined</label>
                  <input
                    type="date"
                    value={ownProfile.joinedDate || ''}
                    onChange={(e) => setOwnProfile({ ...ownProfile, joinedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-xs bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase">Emergency Contact</label>
                  <textarea
                    rows={2}
                    value={ownProfile.emergencyContact || ''}
                    onChange={(e) => setOwnProfile({ ...ownProfile, emergencyContact: e.target.value })}
                    placeholder="e.g. Spouse Name - +63 XXX XXX XXXX"
                    className="w-full px-3 py-2 border border-[#EBE6DD] rounded-xl text-xs bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C] resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-[#3E312C] hover:bg-[#2C211F] text-white py-2 px-3 rounded-full text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" /> Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOwnProfile({ ...currentUser });
                      setIsEditingOwn(false);
                    }}
                    className="border border-[#EBE6DD] hover:bg-[#FAF9F5] text-[#8C7A6B] py-2 px-4 rounded-full text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              // Display profile Card
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center gap-4 bg-[#FAF9F5] p-4 rounded-2xl border border-[#EBE6DD]">
                  <div className="h-12 w-12 rounded-full bg-[#3E312C] flex items-center justify-center text-white font-bold text-lg">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#3E312C]">{currentUser.name}</h4>
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#8C7A6B] bg-[#EBE6DD] border border-[#DFD9D0] px-1.5 py-0.5 rounded-md mt-0.5">
                      {currentUser.role === 'admin' ? (
                        <>
                          <ShieldCheck className="h-3 w-3 text-[#3E312C]" />
                          Property Custodian (Admin)
                        </>
                      ) : currentUser.role === 'managing_director' ? (
                        <>
                          <ShieldCheck className="h-3 w-3 text-amber-700" />
                          Hotel Managing Director
                        </>
                      ) : currentUser.role === 'staff' ? (
                        <>
                          <UserIcon className="h-3 w-3 text-[#3E312C]" />
                          Staff Account
                        </>
                      ) : (
                        <>
                          <UserIcon className="h-3 w-3 text-[#3E312C]" />
                          {currentUser.role}
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-[#8C7A6B] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-[#8C7A6B] block">Email Address</span>
                      <span className="font-semibold">{currentUser.email || 'None registered'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="h-4 w-4 text-[#8C7A6B] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-[#8C7A6B] block">Phone Number</span>
                      <span className="font-semibold">{currentUser.phone || 'None registered'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Briefcase className="h-4 w-4 text-[#8C7A6B] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-[#8C7A6B] block">Department</span>
                      <span className="font-semibold">{currentUser.department || 'General BOH'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-[#8C7A6B] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-[#8C7A6B] block">Assigned Shift</span>
                      <span className="font-semibold">{currentUser.shift || 'Not assigned'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Calendar className="h-4 w-4 text-[#8C7A6B] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-[#8C7A6B] block">Date Joined</span>
                      <span className="font-semibold">{currentUser.joinedDate ? new Date(currentUser.joinedDate).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 border-t border-[#F0EFE9] pt-3">
                    <HeartHandshake className="h-4 w-4 text-[#8C7A6B] mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-mono text-[#8C7A6B] block">Emergency Contact</span>
                      <span className="font-medium block italic mt-0.5 text-[#3E312C]/90 bg-[#FAF9F5] p-2.5 border border-[#EBE6DD] rounded-xl leading-relaxed whitespace-pre-line">
                        {currentUser.emergencyContact || 'No information provided yet.'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditingOwn(true)}
                  className="w-full bg-[#3E312C] hover:bg-[#2C211F] text-white py-2.5 rounded-full text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-2xs mt-4"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit Profile Details
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Users Directory List (and admin management tools) */}
        <div className="lg:col-span-2" id="directory-panel">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] p-6 shadow-sm flex flex-col h-full space-y-4">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-[#F0EFE9] pb-4">
              <div>
                <h3 className="font-serif text-xl text-[#3E312C]">Hotel Staff Directory</h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(true)}
                    className="flex items-center gap-1 bg-[#3E312C] hover:bg-[#2C211F] text-white text-xs font-semibold px-4 py-2 rounded-full cursor-pointer transition-all shadow-2xs shrink-0"
                    id="admin-create-user-btn"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Register Staff Account
                  </button>
                )}
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C7A6B]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-[#EBE6DD] rounded-xl text-xs bg-white text-[#3E312C] focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                    placeholder="Search staff details..."
                  />
                </div>
              </div>
            </div>

            {/* Pending Account Registrations Banner (Admin Role Assignment & Approval) */}
            {isAdmin && pendingUsers.length > 0 && (
              <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-4 space-y-3 animate-fade-in" id="pending-approvals-card">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-800 shrink-0" />
                    <h4 className="font-bold text-xs font-mono uppercase text-amber-900 tracking-wider">
                      Pending Account Registrations ({pendingUsers.length})
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                    Action Required
                  </span>
                </div>

                <p className="text-xs text-amber-900/80 leading-snug">
                  The following staff members submitted registration requests. As Property Custodian (Primary Admin), assign their designated role to approve and activate their access.
                </p>

                <div className="space-y-2.5 pt-1">
                  {pendingUsers.map(pUser => {
                    const selectedRole = pendingRoleMap[pUser.id] || 'staff';
                    return (
                      <div key={pUser.id} className="bg-white border border-amber-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#3E312C]">{pUser.name}</span>
                            <span className="text-xs font-mono text-[#8C7A6B]">(@{pUser.username})</span>
                          </div>
                          <p className="text-xs text-[#8C7A6B] font-mono mt-0.5">Email: {pUser.email || 'N/A'}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase text-[#8C7A6B]">Assign Role:</span>
                            <select
                              value={selectedRole}
                              onChange={(e) => setPendingRoleMap(prev => ({ ...prev, [pUser.id]: e.target.value as UserRole }))}
                              className="px-2.5 py-1.5 border border-[#E6E4DD] rounded-xl text-xs font-bold text-[#3E312C] bg-[#FAF9F5] focus:ring-2 focus:ring-[#3E312C]"
                            >
                              <option value="staff">Staff (Create Requisitions Only)</option>
                              <option value="purchaser">Purchaser / Auditor (Check & Verify PR)</option>
                              <option value="managing_director">Hotel Managing Director</option>
                              <option value="admin">Property Custodian (Primary Admin)</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApprovePendingUser(pUser)}
                            className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all shadow-2xs"
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Approve & Assign
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteUser(pUser.id)}
                            className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List block */}
            <div className="divide-y divide-[#F0EFE9] overflow-y-auto max-h-[600px] pr-1 space-y-1">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isEditingThisUser = editingUserId === user.id;

                  return (
                    <div key={user.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {isEditingThisUser && editingUserData ? (
                        /* Admin Edit Form Row */
                        <form onSubmit={handleSaveUserEdit} className="w-full bg-[#FAF9F5] border border-[#EBE6DD] rounded-2xl p-4 space-y-3">
                          <div className="flex justify-between items-center border-b border-[#EBE6DD] pb-2 mb-2">
                            <span className="text-[10px] font-mono font-bold uppercase text-[#8C7A6B]">Admin Editing: {user.name}</span>
                            <button type="button" onClick={() => setEditingUserId(null)} className="text-[#8C7A6B] hover:text-[#3E312C]"><X className="h-4 w-4" /></button>
                          </div>

                          {editError && (
                            <div className="mb-2 bg-red-50 border-l-4 border-red-700 p-2.5 rounded-lg text-xs text-red-700 font-medium">
                              {editError}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-[#8C7A6B]">Full Name</label>
                              <input
                                type="text"
                                required
                                value={editingUserData.name}
                                onChange={(e) => setEditingUserData({ ...editingUserData, name: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-xl bg-white text-[#3E312C]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-[#8C7A6B]">Role</label>
                              <select
                                value={editingUserData.role}
                                onChange={(e) => setEditingUserData({ ...editingUserData, role: e.target.value as any })}
                                className="w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-xl bg-white text-[#3E312C] focus:ring-1 focus:ring-[#3E312C] font-semibold"
                              >
                                <option value="staff">Staff (Create Requisitions Only)</option>
                                <option value="purchaser">Purchaser / Auditor (Check & Verify PR)</option>
                                <option value="managing_director">Hotel Managing Director</option>
                                <option value="admin">Property Custodian (Primary Admin)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-[#8C7A6B]">Email</label>
                              <input
                                type="email"
                                value={editingUserData.email || ''}
                                onChange={(e) => setEditingUserData({ ...editingUserData, email: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-xl bg-white text-[#3E312C]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-[#8C7A6B]">Phone</label>
                              <input
                                type="text"
                                value={editingUserData.phone || ''}
                                onChange={(e) => setEditingUserData({ ...editingUserData, phone: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-xl bg-white text-[#3E312C]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-[#8C7A6B]">Department</label>
                              <input
                                type="text"
                                value={editingUserData.department || ''}
                                onChange={(e) => setEditingUserData({ ...editingUserData, department: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-xl bg-white text-[#3E312C]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase text-[#8C7355]">Username (Login ID) *</label>
                              <input
                                type="text"
                                required
                                value={editingUserData.username}
                                onChange={(e) => setEditingUserData({ ...editingUserData, username: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-xl bg-[#FAF9F5] font-bold text-[#3E312C]"
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase text-[#8C7355]">Password *</label>
                              <input
                                type="text"
                                required
                                value={editingUserData.password || ''}
                                onChange={(e) => setEditingUserData({ ...editingUserData, password: e.target.value })}
                                className="w-full px-2.5 py-1.5 border border-[#EBE6DD] rounded-xl bg-[#FAF9F5] font-bold text-[#3E312C]"
                                placeholder="Enter updated password"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-2 border-t border-[#EBE6DD]">
                            <button
                              type="submit"
                              className="bg-[#3E312C] hover:bg-[#2C211F] text-white px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Save Record
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUserId(null);
                                setEditingUserData(null);
                              }}
                              className="border border-[#EBE6DD] hover:bg-white text-[#8C7A6B] px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* Normal Directory Row Display */
                        <div className="w-full">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-[#FAF9F5] border border-[#E6E4DD] flex items-center justify-center text-[#3E312C] font-semibold text-sm">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-sm text-[#3E312C]">{user.name}</span>
                                  {user.status === 'pending' ? (
                                    <span className="flex items-center gap-1 text-[9px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded-md font-mono font-bold">
                                      <Clock className="h-3 w-3 text-amber-700" /> PENDING APPROVAL
                                    </span>
                                  ) : (
                                    <>
                                      {user.role === 'admin' && (
                                        <span className="flex items-center gap-1 text-[9px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded-md font-mono font-bold">
                                          <ShieldCheck className="h-3 w-3 text-amber-700" /> PRIMARY ADMIN
                                        </span>
                                      )}
                                      {user.role === 'managing_director' && (
                                        <span className="flex items-center gap-1 text-[9px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded-md font-mono font-bold">
                                          <ShieldCheck className="h-3 w-3 text-purple-700" /> MANAGING DIRECTOR
                                        </span>
                                      )}
                                      {user.role === 'staff' && (
                                        <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded-md border border-emerald-200 font-mono font-bold">STAFF (PR ONLY)</span>
                                      )}
                                      {user.role === 'rooms_event_officer' && (
                                        <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md border border-blue-200 font-mono font-bold">ROOMS & EVENTS</span>
                                      )}
                                      {user.role === 'purchaser' && (
                                        <span className="text-[9px] bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded-md border border-amber-200 font-mono font-bold">PURCHASER</span>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className="text-xs text-[#8C7A6B] flex flex-wrap gap-x-2 gap-y-1 mt-0.5 font-mono">
                                  <span className="flex items-center gap-1"><Mail className="h-3 w-3 shrink-0" /> {user.email || 'No email'}</span>
                                  <span className="text-[#D1C4B5]">•</span>
                                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {user.phone || 'No phone'}</span>
                                  {user.department && (
                                    <>
                                      <span className="text-[#D1C4B5]">•</span>
                                      <span>Dept: <strong className="text-[#3E312C]">{user.department}</strong></span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Admin management buttons (cannot delete self) */}
                            <div className="flex items-center gap-2 self-end md:self-center">
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => handleStartEditUser(user)}
                                    className="text-[#8C7A6B] hover:text-[#3E312C] p-2 border border-[#EBE6DD] rounded-xl hover:bg-[#FAF9F5] cursor-pointer transition-colors"
                                    title="Edit Staff Information"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>

                                  {user.id !== currentUser.id && (
                                    <button
                                      onClick={() => setUserToDelete(user)}
                                      className="text-red-700 hover:text-red-900 hover:bg-red-50 p-2 border border-[#F2DED9] rounded-xl cursor-pointer transition-colors"
                                      title="Delete/Purge Resigned Staff Account"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="mt-2 bg-[#FAF9F5] border border-[#EBE6DD] px-3.5 py-2 rounded-xl flex flex-wrap gap-x-5 gap-y-1 text-xs font-mono text-[#3E312C]" id={`credentials-${user.id}`}>
                              <span>Username: <strong className="text-[#8C7A6B] font-bold select-all">{user.username}</strong></span>
                              <span className="text-[#E6E4DD] md:inline hidden">|</span>
                              <span>Password: <strong className="text-[#8C7355] font-bold select-all">{(user as any).password || 'N/A'}</strong></span>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-[#8C7A6B]">
                  <UsersIcon className="h-10 w-10 mx-auto text-[#D1C4B5] mb-2" />
                  <p className="font-semibold text-[#3E312C]">No matching staff found</p>
                  <p className="text-xs text-[#8C7A6B] mt-1">Try loosening your search terms.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* MODAL: PREMIUM IFRAME-SAFE DELETE USER DIALOG */}
      {/* ========================================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/60 flex items-center justify-center p-4 backdrop-blur-xs" id="user-delete-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-[#3E312C]">
            <button 
              onClick={() => setUserToDelete(null)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center pt-2 space-y-3">
              <div className="mx-auto bg-red-50 text-red-700 border border-red-200 h-12 w-12 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg text-[#3E312C] font-semibold">Confirm Staff Purge</h3>
                <p className="text-xs text-[#8C7A6B] mt-1.5 leading-relaxed">
                  Are you absolutely sure you want to delete <span className="font-bold text-[#3E312C]">"{userToDelete.name}"</span>'s account? This will permanently sever their terminal access. (Used for staff resignation)
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold text-xs rounded-full cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteUser(userToDelete.id);
                  setUserToDelete(null);
                }}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-800 text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#3E312C]/60 flex items-center justify-center p-4 backdrop-blur-xs" id="user-create-modal">
          <div className="bg-white border border-[#E6E4DD] rounded-[32px] max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 text-[#3E312C]">
            <button 
              onClick={() => setIsAddingUser(false)}
              className="absolute top-5 right-5 text-[#8C7A6B] hover:text-[#3E312C] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="border-b border-[#F0EFE9] pb-3 mb-4">
              <h3 className="font-serif text-xl text-[#3E312C]">Register Staff Account</h3>
            </div>

            {addError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-700 p-3 rounded-lg text-xs text-red-700 font-medium">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl bg-[#FAF9F5]/30 focus:ring-2 focus:ring-[#3E312C] focus:border-[#3E312C]"
                    placeholder="e.g. Chef Juan Dela Cruz"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl bg-white focus:ring-2 focus:ring-[#3E312C] font-semibold"
                  >
                    <option value="staff">Staff (Create Requisitions Only)</option>
                    <option value="purchaser">Purchaser / Auditor (Check & Verify PR)</option>
                    <option value="managing_director">Hotel Managing Director</option>
                    <option value="admin">Property Custodian (Primary Admin)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl bg-[#FAF9F5]/30 focus:ring-2 focus:ring-[#3E312C]"
                    placeholder="e.g. juan123"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Password *</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl bg-[#FAF9F5]/30 focus:ring-2 focus:ring-[#3E312C]"
                    placeholder="Enter password"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl bg-white"
                    placeholder="juan@hotel.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl bg-white"
                    placeholder="e.g. +63 912 345 6789"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Department</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl bg-white"
                    placeholder="e.g. Pastry / Hot Kitchen"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-[#8C7A6B] uppercase tracking-wider">Shift Schedule</label>
                  <input
                    type="text"
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E6E4DD] rounded-xl bg-white"
                    placeholder="e.g. AM Shift (6am - 3pm)"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#F0EFE9]">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="flex-1 py-2.5 border border-[#E6E4DD] text-[#8C7A6B] hover:bg-[#FAF9F5] font-semibold rounded-full cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#3E312C] hover:bg-[#2C211F] text-white font-semibold rounded-full cursor-pointer shadow-xs transition-colors"
                >
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
