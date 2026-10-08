import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@irontrack.sys');
  const [password, setPassword] = useState('••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [showRequestAccess, setShowRequestAccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestData, setRequestData] = useState({ name: '', email: '', roleInterest: 'Trainer' });
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email or identification ID.');
      return;
    }
    setErrorMessage('');
    onLoginSuccess();
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSubmitted(true);
    setTimeout(() => {
      setRequestSubmitted(false);
      setShowRequestAccess(false);
    }, 2000);
  };

  return (
    <div className="bg-[#111111] text-[#e5e2e1] min-h-[calc(100vh-42px)] flex flex-col justify-center items-center p-5 md:p-16 selection:bg-[#E2FF00] selection:text-[#111111] relative overflow-hidden">
      {/* Background subtle brutalist grid lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

      <div className="w-full max-w-[440px] flex flex-col items-center relative z-10">
        {/* Massive Headline */}
        <header className="mb-8 w-full flex justify-center text-center">
          <h1 className="font-bebas text-[72px] md:text-[84px] text-[#E2FF00] tracking-tight uppercase text-center leading-none drop-shadow-[0_0_20px_rgba(226,255,0,0.15)]">
            IRON_PULSE
          </h1>
        </header>

        {/* Login Box */}
        <form
          onSubmit={handleSignIn}
          className="w-full flex flex-col gap-6 bg-[#0e0e0e] p-8 border border-[#F5F5F5]/10 rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
        >
          {errorMessage && (
            <div className="p-3 bg-[#93000a]/40 border border-[#ffb4ab] text-[#ffb4ab] text-xs font-montserrat font-semibold">
              {errorMessage}
            </div>
          )}

          {/* Email Input */}
          <div className="flex flex-col gap-1">
            <label
              className="font-montserrat text-xs text-[#c6c9ab] uppercase tracking-widest font-bold"
              htmlFor="login-email"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-transparent border-0 border-b-2 border-[#F5F5F5]/20 px-0 py-3 font-inter text-base text-[#FFFFFF] focus:ring-0 focus:border-[#E2FF00] outline-none transition-colors placeholder:text-[#c6c9ab]/40"
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1">
            <label
              className="font-montserrat text-xs text-[#c6c9ab] uppercase tracking-widest font-bold"
              htmlFor="login-password"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border-0 border-b-2 border-[#F5F5F5]/20 px-0 py-3 font-inter text-base text-[#FFFFFF] focus:ring-0 focus:border-[#E2FF00] outline-none transition-colors placeholder:text-[#c6c9ab]/40"
            />
          </div>

          {/* Options Row */}
          <div className="flex justify-between items-center mt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 bg-transparent border-[#F5F5F5]/30 rounded-none text-[#E2FF00] focus:ring-0 cursor-pointer accent-[#E2FF00]"
              />
              <span className="font-inter text-sm text-[#c6c9ab] hover:text-white transition-colors">
                Remember me
              </span>
            </label>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="font-inter text-sm text-[#E2FF00] hover:text-white transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign In CTA */}
          <button
            id="login-submit-btn"
            type="submit"
            className="mt-3 w-full bg-[#E2FF00] text-[#111111] font-bebas text-3xl py-3.5 uppercase hover:bg-white transition-all duration-200 flex justify-center items-center gap-2 group cursor-pointer shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] active:translate-x-0.5 active:translate-y-0.5"
          >
            <span>SIGN IN</span>
            <span className="material-symbols-outlined text-2xl group-hover:translate-x-1.5 transition-transform">
              arrow_forward
            </span>
          </button>
        </form>

        {/* Footer Request Link */}
        <div className="mt-8 text-center">
          <p className="font-inter text-sm text-[#c6c9ab]">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setShowRequestAccess(true)}
              className="text-[#E2FF00] hover:text-white transition-colors uppercase font-montserrat font-bold text-xs ml-2 tracking-wider underline cursor-pointer"
            >
              REQUEST ACCESS
            </button>
          </p>
        </div>

        {/* Quick Demo Credentials Info */}
        <div className="mt-8 p-3 border border-white/10 bg-[#1c1b1b]/70 text-center w-full">
          <p className="font-montserrat text-[11px] uppercase tracking-wider text-[#c6c6c7]">
            Demo Environment Ready • Click <strong className="text-[#E2FF00]">SIGN IN</strong> to enter full facility suite
          </p>
        </div>
      </div>

      {/* Request Access Modal */}
      {showRequestAccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border-2 border-[#E2FF00] w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowRequestAccess(false)}
              className="absolute top-4 right-4 text-[#c6c6c7] hover:text-white font-mono text-xl"
            >
              ✕
            </button>
            <h3 className="font-bebas text-3xl text-[#E2FF00] tracking-wider mb-2">REQUEST PROTOCOL ACCESS</h3>
            <p className="font-inter text-xs text-[#c6c9ab] mb-6">
              Submit your credentials for administrative authorization into IronTrack Elite.
            </p>

            {requestSubmitted ? (
              <div className="p-6 bg-[#201f1f] border border-[#E2FF00] text-center">
                <span className="material-symbols-outlined text-[#E2FF00] text-4xl mb-2">verified</span>
                <p className="font-bebas text-2xl text-white">ACCESS REQUEST LOGGED</p>
                <p className="font-inter text-xs text-[#c6c9ab] mt-1">
                  Facility admin will verify your profile within 1 operational cycle.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">Full Name</label>
                  <input
                    required
                    type="text"
                    value={requestData.name}
                    onChange={(e) => setRequestData({ ...requestData, name: e.target.value })}
                    placeholder="e.g. Marcus Thorne"
                    className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                  />
                </div>
                <div>
                  <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">Work Email</label>
                  <input
                    required
                    type="email"
                    value={requestData.email}
                    onChange={(e) => setRequestData({ ...requestData, email: e.target.value })}
                    placeholder="name@facility.com"
                    className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                  />
                </div>
                <div>
                  <label className="font-montserrat text-xs text-[#c6c6c7] uppercase font-bold block mb-1">Role Designation</label>
                  <select
                    value={requestData.roleInterest}
                    onChange={(e) => setRequestData({ ...requestData, roleInterest: e.target.value })}
                    className="w-full bg-[#201f1f] border border-white/20 p-2.5 text-white font-inter text-sm focus:border-[#E2FF00] outline-none"
                  >
                    <option value="Trainer">Head / Elite Trainer</option>
                    <option value="FrontDesk">Front Desk Coordinator</option>
                    <option value="Operations">Operations & Inventory Lead</option>
                    <option value="Member">VIP Member Access</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="mt-2 w-full bg-[#E2FF00] text-[#111111] font-bebas text-2xl py-3 uppercase hover:bg-white transition-colors cursor-pointer"
                >
                  TRANSMIT REQUEST
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#131313] border border-white/20 w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="absolute top-4 right-4 text-[#c6c6c7] hover:text-white font-mono text-xl"
            >
              ✕
            </button>
            <h3 className="font-bebas text-3xl text-white tracking-wider mb-2">RECOVER SECURITY KEY</h3>
            <p className="font-inter text-xs text-[#c6c9ab] mb-4">
              Enter your email to receive an instant temporary biometric reset token.
            </p>
            <input
              type="email"
              defaultValue={email}
              className="w-full bg-[#201f1f] border border-white/20 p-3 text-white font-inter text-sm focus:border-[#E2FF00] outline-none mb-4"
              placeholder="user@example.com"
            />
            <button
              onClick={() => {
                alert('Reset instructions dispatched to ' + email);
                setShowForgotPassword(false);
              }}
              className="w-full bg-[#E2FF00] text-[#111111] font-bebas text-2xl py-3 uppercase hover:bg-white transition-colors"
            >
              SEND RESET INSTRUCTIONS
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
