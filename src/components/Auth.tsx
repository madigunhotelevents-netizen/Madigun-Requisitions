import React, { useState } from 'react';
import { 
  KeyRound, 
  User as UserIcon, 
  ShieldAlert, 
  UserPlus, 
  LogIn, 
  CheckCircle2, 
  Clock,
  Cloud
} from 'lucide-react';
import { User } from '../types';
import MadigunLogo from './MadigunLogo';

interface AuthProps {
  onLogin: (user: User) => void;
  users: (User & { password?: string })[];
  onRegisterUser: (newUser: User & { password?: string }) => void;
  customLogo?: string | null;
}

export default function Auth({ onLogin, users, onRegisterUser, customLogo = null }: AuthProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  
  const [error, setError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRegistrationSuccess('');

    if (!username.trim() || !password) {
      setError('Please fill in both username and password.');
      return;
    }

    const foundUser = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password
    );

    if (foundUser) {
      if (foundUser.status === 'pending') {
        setError('Account Pending Approval: Your account registration is awaiting role assignment and approval from the Primary Account (Property Custodian).');
        return;
      }

      onLogin({
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name,
        role: foundUser.role,
        status: foundUser.status,
        email: foundUser.email,
        department: foundUser.department,
        shift: foundUser.shift,
        password: foundUser.password
      });
    } else {
      setError('Invalid username or password.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRegistrationSuccess('');

    if (!regUsername.trim() || !regPassword || !fullName.trim() || !email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const exists = users.some((u) => u.username.toLowerCase() === regUsername.toLowerCase().trim());
    if (exists) {
      setError('Username is already taken. Please choose another.');
      return;
    }

    const isFirstUser = users.length === 0;
    const newUser = {
      id: `user-${Date.now()}`,
      username: regUsername.toLowerCase().trim(),
      password: regPassword,
      name: fullName.trim(),
      role: isFirstUser ? ('admin' as const) : ('staff' as const),
      status: isFirstUser ? ('approved' as const) : ('pending' as const),
      email: email.trim(),
      department: isFirstUser ? 'Property Custodian / Administration' : 'Pending Assignment',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    onRegisterUser(newUser);
    
    // Clear registration fields
    setFullName('');
    setRegUsername('');
    setEmail('');
    setRegPassword('');

    // Switch to login tab and display success/pending message
    setActiveTab('login');
    if (isFirstUser) {
      setRegistrationSuccess('Account created successfully! As the initial user, you have been granted Administrator permissions. You can now log in.');
    } else {
      setRegistrationSuccess('Registration submitted! Your account is currently pending approval. Please inform the Administrator to assign your role and activate your account.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans text-[#3E312C]" id="auth-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col items-center">
        <MadigunLogo size={80} className="mb-2" customLogo={customLogo} />
        
        <p className="text-[10px] text-[#8C7A6B] font-mono tracking-[0.2em] uppercase mt-2 text-center" id="app-sub-title">
          MADIGUN HOTEL & EVENTS • INVENTORY & REQUISITIONS HUB
        </p>

        <h2 className="mt-3 text-center text-2xl font-extrabold font-serif text-[#3E312C] tracking-tight" id="auth-heading">
          Sign In to Terminal
        </h2>
        <p className="text-xs text-[#8C7A6B] mt-1 text-center">Secure Role Authentication & Access Control</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Tab Switcher & Form Card */}
        <div className="bg-white py-6 px-6 shadow-sm border border-[#EBE6DD] sm:rounded-[32px] sm:px-8" id="auth-card">
          <div className="flex bg-[#F4F2EB] p-1 rounded-full border border-[#EBE6DD] mb-6">
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(''); setRegistrationSuccess(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'login' ? 'bg-[#3E312C] text-white shadow-xs' : 'text-[#8C7A6B] hover:text-[#3E312C]'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError(''); setRegistrationSuccess(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'register' ? 'bg-[#3E312C] text-white shadow-xs' : 'text-[#8C7A6B] hover:text-[#3E312C]'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register Account
            </button>
          </div>

          {registrationSuccess && (
            <div className="mb-4 bg-emerald-50 border-l-4 border-emerald-700 p-3.5 rounded-xl flex items-start gap-2.5 animate-fade-in" id="auth-success-box">
              <Clock className="h-4 w-4 text-emerald-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-emerald-900 font-bold">Registration Submitted</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">{registrationSuccess}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-[#FDF2F0] border-l-4 border-[#3E312C] p-3.5 rounded-xl flex items-start gap-2.5 animate-fade-in" id="auth-error-box">
              <ShieldAlert className="h-4 w-4 text-[#3E312C] shrink-0 mt-0.5" />
              <p className="text-xs text-[#3E312C] font-semibold leading-snug">{error}</p>
            </div>
          )}

          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4" id="login-form">
              <div>
                <label htmlFor="login-username" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Username
                </label>
                <div className="mt-1 relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-[#8C7A6B]" />
                  </div>
                  <input
                    id="login-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">
                  Password
                </label>
                <div className="mt-1 relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-[#8C7A6B]" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 rounded-full text-xs font-bold text-white bg-[#3E312C] hover:bg-[#2C211F] transition-all shadow-xs cursor-pointer mt-2"
              >
                Sign In to Terminal
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3" id="register-form">
              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Username *</label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                  placeholder="e.g. jdoe"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                  placeholder="e.g. jdoe@madigun.hotel"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8C7A6B] uppercase tracking-wider">Password *</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-[#E6E4DD] rounded-xl text-[#3E312C] text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#3E312C]"
                  placeholder="••••••••"
                />
              </div>

              <div className="bg-[#FAF9F5] border border-[#E6E4DD] p-2.5 rounded-xl text-[11px] text-[#8C7A6B] leading-tight flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                <span>Account role will be assigned & approved by Primary Admin upon registration.</span>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 rounded-full text-xs font-bold text-white bg-[#3E312C] hover:bg-[#2C211F] transition-all shadow-xs cursor-pointer mt-2"
              >
                Submit Registration
              </button>
            </form>
          )}

          {/* Automated Live Cloud Sync Status */}
          <div className="mt-6 pt-4 border-t border-[#EBE6DD] flex items-center justify-center text-[11px] text-[#8C7A6B]">
            <div className="flex items-center gap-1.5 font-medium text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 px-3 py-1 rounded-full">
              <Cloud className="h-3.5 w-3.5 text-emerald-600" />
              <span>Real-Time Cloud Synchronization Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
