import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Lock, CheckCircle, ArrowRight, Eye, EyeOff, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { validateStrongPassword } from '../../utils/authHash';

export const MustChangePasswordModal: React.FC = () => {
  const { currentUser, changeTempPassword } = useApp();

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setErrorMsg('');
    setSuccess(false);
  }, [currentUser?.id]);

  if (!currentUser?.mustChangePassword) {
    return null;
  }

  const strength = validateStrongPassword(newPass);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPass.trim() || !newPass.trim() || !confirmPass.trim()) {
      setErrorMsg('Please complete all fields.');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    if (!strength.valid) {
      setErrorMsg(strength.message || 'Password does not meet complexity requirements.');
      return;
    }

    if (newPass === currentPass) {
      setErrorMsg('New password cannot be identical to your temporary password.');
      return;
    }

    const result = changeTempPassword(currentUser.id, currentPass, newPass);
    if (result.success) {
      setSuccess(true);
    } else {
      setErrorMsg(result.error || 'Failed to update password.');
    }
  };

  const rules = [
    { label: 'At least 8 characters', ok: newPass.length >= 8 },
    { label: 'Uppercase letter (A-Z)', ok: /[A-Z]/.test(newPass) },
    { label: 'Lowercase letter (a-z)', ok: /[a-z]/.test(newPass) },
    { label: 'Number (0-9)', ok: /[0-9]/.test(newPass) },
  ];

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // Cannot close until password is changed!
      title="Security Requirement: Update Temporary Password"
      subtitle="Your account was provisioned with a temporary password by your Organization Administrator."
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs text-[#F2EFE6]">
        <div className="p-3.5 rounded-xl bg-[#E0A93B]/15 border border-[#E0A93B]/40 text-[#E0A93B] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            For organizational security, you must replace your temporary login credentials with a confidential strong password before accessing system tools.
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-[#D9534F]/20 border border-[#D9534F]/40 text-[#D9534F] text-xs">
            {errorMsg}
          </div>
        )}

        {success ? (
          <div className="p-5 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#3FB67A]/20 border border-[#3FB67A] flex items-center justify-center text-[#3FB67A] mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-[#F2EFE6]">Password Successfully Updated</h4>
            <p className="text-xs text-[#A8B5AB]">
              Your account is now secured. You are entering the dashboard under role{' '}
              <strong className="text-[#D4AF37]">{currentUser.role}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[#A8B5AB] font-medium mb-1">
                Current Temporary Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter temporary password"
                  className="w-full pl-9 pr-10 py-2 rounded-xl bg-[#07130E] border border-[#1F3A2D] text-[#F2EFE6] focus:border-[#D4AF37] outline-none font-mono"
                />
                <KeyRound className="w-4 h-4 text-[#A8B5AB] absolute left-3 top-2.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#A8B5AB] hover:text-[#F2EFE6]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#A8B5AB] font-medium mb-1">
                New Permanent Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Min 8 chars, upper, lower & number"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#07130E] border border-[#1F3A2D] text-[#F2EFE6] focus:border-[#D4AF37] outline-none font-mono"
                />
                <Lock className="w-4 h-4 text-[#A8B5AB] absolute left-3 top-2.5" />
              </div>
            </div>

            {/* Password Strength Checklist */}
            <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-[#07130E] border border-[#1F3A2D]">
              {rules.map((r) => (
                <div
                  key={r.label}
                  className={`flex items-center gap-1.5 text-[10px] ${
                    r.ok ? 'text-[#3FB67A] font-semibold' : 'text-[#A8B5AB]'
                  }`}
                >
                  <Check className={`w-3 h-3 shrink-0 ${r.ok ? 'opacity-100' : 'opacity-30'}`} />
                  <span>{r.label}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[#A8B5AB] font-medium mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#07130E] border border-[#1F3A2D] text-[#F2EFE6] focus:border-[#D4AF37] outline-none font-mono"
                />
                <Lock className="w-4 h-4 text-[#A8B5AB] absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1F6F4A] to-[#0F3D2A] border border-[#D4AF37] text-[#F2EFE6] font-semibold flex items-center justify-center gap-2 shadow hover:brightness-110 active:scale-95 transition-all"
              >
                Secure Account & Continue <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
