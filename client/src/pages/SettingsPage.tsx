import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, Mail, Shield, Twitter, CheckCircle, Clock, X, Loader2 } from 'lucide-react';
import {
  getSettings,
  updateSettings,
  requestEmailVerification,
  resendEmailVerification,
  removeEmail,
  initiateTwitterAuth,
  disconnectTwitter,
  type ApiSettings,
} from '../lib/api';

type SettingsSection = 'general' | 'notifications' | 'privacy' | 'connections';

const settingsSections: Array<{ id: SettingsSection; label: string }> = [
  { id: 'general', label: 'General' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'connections', label: 'Connections' },
];

export const SettingsPage = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [messagingOption, setMessagingOption] = useState<'everyone' | 'clients_only' | 'connections_only'>('everyone');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('public');
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationSentAt, setEmailVerificationSentAt] = useState<string | null>(null);
  const [twitterHandle, setTwitterHandle] = useState('');
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [twitterVerified, setTwitterVerified] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

  // Email verification states
  const [emailInput, setEmailInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Twitter connection messages
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const [twitterSuccess, setTwitterSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const settings = await getSettings();
        setNotificationsEnabled(settings.notificationsEnabled);
        setEmailNotifications(settings.emailNotifications);
        setMessagingOption(settings.messagingOption);
        setProfileVisibility(settings.profileVisibility);
        setEmail(settings.email || '');
        setEmailInput(settings.email || '');
        setEmailVerified(settings.emailVerified);
        setEmailVerificationSentAt(settings.emailVerificationSentAt || null);
        setTwitterHandle(settings.twitterHandle || '');
        setIsTwitterConnected(settings.isTwitterConnected);
        setTwitterVerified(settings.twitterVerified);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Clear email messages after 5 seconds
  useEffect(() => {
    if (emailError || emailSuccess) {
      const timer = setTimeout(() => {
        setEmailError(null);
        setEmailSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [emailError, emailSuccess]);

  // Handle OAuth callback params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const twitterStatus = params.get('twitter');
    const verified = params.get('verified');

    if (twitterStatus === 'connected') {
      setTwitterSuccess(verified === 'true' 
        ? 'Twitter connected successfully! Your account is verified.' 
        : 'Twitter connected successfully!');
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      // Reload settings to get updated state
      getSettings().then(settings => {
        setTwitterHandle(settings.twitterHandle || '');
        setIsTwitterConnected(settings.isTwitterConnected);
        setTwitterVerified(settings.twitterVerified);
      });
    } else if (twitterStatus === 'error') {
      const msg = params.get('msg');
      setTwitterError(
        msg === 'not_configured' ? 'Twitter OAuth is not configured on the server.' :
        msg === 'oauth_failed' ? 'Failed to connect Twitter. Please try again.' :
        msg === 'state_mismatch' ? 'Security check failed. Please try again.' :
        'Failed to connect Twitter.'
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Clear Twitter messages after 5 seconds
  useEffect(() => {
    if (twitterError || twitterSuccess) {
      const timer = setTimeout(() => {
        setTwitterError(null);
        setTwitterSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [twitterError, twitterSuccess]);

  const handleTwitterConnect = () => {
    if (!isTwitterConnected) {
      // Initiate real OAuth flow
      initiateTwitterAuth();
      return;
    }

    // Disconnect is handled separately
  };

  const handleTwitterDisconnect = async () => {
    setTwitterLoading(true);
    setTwitterError(null);
    setTwitterSuccess(null);

    try {
      await disconnectTwitter();
      setIsTwitterConnected(false);
      setTwitterHandle('');
      setTwitterVerified(false);
      setTwitterSuccess('Twitter account disconnected');
    } catch (error: any) {
      setTwitterError(error.message || 'Failed to disconnect Twitter');
    } finally {
      setTwitterLoading(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsVerifying(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const response = await requestEmailVerification(emailInput);
      setEmailSuccess(response.message);
      setEmail(emailInput);
      setEmailVerified(false);
      setEmailVerificationSentAt(new Date().toISOString());
    } catch (error: any) {
      setEmailError(error.message || 'Failed to send verification email');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setIsVerifying(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const response = await resendEmailVerification();
      setEmailSuccess(response.message);
      setEmailVerificationSentAt(new Date().toISOString());
    } catch (error: any) {
      setEmailError(error.message || 'Failed to resend verification email');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveEmail = async () => {
    setIsVerifying(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {
      const response = await removeEmail();
      setEmailSuccess(response.message);
      setEmail('');
      setEmailInput('');
      setEmailVerified(false);
      setEmailVerificationSentAt(null);
      // Disable email notifications when email is removed
      if (emailNotifications) {
        setEmailNotifications(false);
        await updateSettings({ emailNotifications: false });
      }
    } catch (error: any) {
      setEmailError(error.message || 'Failed to remove email');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prevent enabling email notifications without verified email
      const newEmailNotifications = emailNotifications && !emailVerified ? false : emailNotifications;
      if (emailNotifications && !emailVerified) {
        setEmailNotifications(false);
      }

      const updated = await updateSettings({
        notificationsEnabled,
        emailNotifications: newEmailNotifications,
        messagingOption,
        profileVisibility,
        // Note: email is not included here - it's handled via verification flow
        twitterHandle,
        isTwitterConnected,
      });

      setNotificationsEnabled(updated.notificationsEnabled);
      setEmailNotifications(updated.emailNotifications);
      setMessagingOption(updated.messagingOption);
      setProfileVisibility(updated.profileVisibility);
      setTwitterHandle(updated.twitterHandle || '');
      setIsTwitterConnected(updated.isTwitterConnected);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSectionClick = (section: SettingsSection) => {
    setActiveSection(section);
    const target = document.getElementById(`settings-${section}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="pt-28 pb-20 px-6 md:pl-[92px] min-h-screen">
      <div className="container-custom max-w-4xl">
        <div className="mb-12">
          <h1 className="text-5xl font-black tracking-tighter mb-2">Settings</h1>
          <p className="text-muted text-lg">Manage your account, identity, and preferences.</p>
        </div>

        <div className="md:hidden mb-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionClick(section.id)}
              className={`shrink-0 px-4 py-2 rounded-[12px] text-xs font-bold transition-colors border ${
                activeSection === section.id
                  ? 'bg-ink text-bg border-ink'
                  : 'bg-transparent border-border text-muted hover:text-ink hover:bg-ink/5'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Sidebar Navigation (Optional, for larger screens) */}
          <div className="hidden md:block col-span-1 space-y-2">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionClick(section.id)}
                className={`w-full text-left px-4 py-3 rounded-[15px] font-bold transition-colors border ${
                  activeSection === section.id
                    ? 'bg-ink text-bg border-ink'
                    : 'bg-transparent border-transparent text-muted hover:bg-ink/5 hover:text-ink'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="col-span-1 md:col-span-2 space-y-8">
            {loading ? (
              <div className="card p-6 text-sm text-muted">Loading settings...</div>
            ) : (
              <>

            {/* General */}
            <section id="settings-general" className="card p-6 space-y-6 scroll-mt-36">
              <h2 className="text-xl font-black mb-4">General</h2>

              {/* Email Verification Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted">Email Binding</label>
                  {emailVerified && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                      <CheckCircle size={14} />
                      Verified
                    </span>
                  )}
                  {email && !emailVerified && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 font-bold">
                      <Clock size={14} />
                      Pending Verification
                    </span>
                  )}
                </div>

                {/* Error/Success Messages */}
                {emailError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600">
                    {emailError}
                  </div>
                )}
                {emailSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-[10px] text-sm text-green-600">
                    {emailSuccess}
                  </div>
                )}

                {/* Verified Email Display */}
                {emailVerified ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border border-border rounded-[15px] bg-bg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                          <Mail size={20} />
                        </div>
                        <div>
                          <p className="font-bold">{email}</p>
                          <p className="text-xs text-muted">Verified email address</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEmailVerified(false);
                            setEmailInput(email);
                          }}
                          className="px-4 py-2 rounded-[15px] text-xs font-bold bg-ink/5 text-ink hover:bg-ink/10 transition-colors"
                        >
                          Change
                        </button>
                        <button
                          onClick={handleRemoveEmail}
                          disabled={isVerifying}
                          className="px-4 py-2 rounded-[15px] text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {isVerifying ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Unverified/Pending Email Input */
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Enter email for notifications"
                        disabled={isVerifying}
                        className="flex-1 bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange outline-none disabled:opacity-50"
                      />
                      <button
                        onClick={emailVerificationSentAt ? handleResendVerification : handleRequestVerification}
                        disabled={isVerifying || !emailInput}
                        className="btn-primary w-full sm:w-auto px-6 py-3 shrink-0 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Sending...
                          </>
                        ) : emailVerificationSentAt ? (
                          'Resend'
                        ) : (
                          'Send Verification'
                        )}
                      </button>
                    </div>

                    {/* Pending State Info */}
                    {emailVerificationSentAt && !emailVerified && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-[10px] text-sm">
                        <p className="text-amber-700">
                          Verification email sent to <strong>{email}</strong>. Click the link in the email to verify.
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          Didn&apos;t receive it? Check your spam folder or click Resend above.
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-muted">
                      {emailNotifications && !emailVerified
                        ? 'Email notifications are disabled until you verify your email address.'
                        : 'Used for important account notifications and updates.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
            
            {/* Connections */}
            <section id="settings-connections" className="card p-6 space-y-6 scroll-mt-36">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <LinkIcon size={20} className="text-accent-orange" />
                Connections
              </h2>
              
              <div className="space-y-4">
                {/* Twitter Error/Success Messages */}
                {twitterError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[10px] text-sm text-red-600">
                    {twitterError}
                  </div>
                )}
                {twitterSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-[10px] text-sm text-green-600">
                    {twitterSuccess}
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border border-border rounded-[15px] bg-bg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-full flex items-center justify-center">
                      <Twitter size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold">X / Twitter</p>
                        {isTwitterConnected && twitterVerified && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle size={12} />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        {isTwitterConnected 
                          ? `@${twitterHandle}` 
                          : 'Link your account for reputation and NFT eligibility'}
                      </p>
                    </div>
                  </div>
                  {isTwitterConnected ? (
                    <button 
                      onClick={handleTwitterDisconnect}
                      disabled={twitterLoading}
                      className="px-4 py-2 rounded-[15px] text-xs font-bold transition-colors bg-ink/5 text-ink hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                    >
                      {twitterLoading ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  ) : (
                    <button 
                      onClick={handleTwitterConnect}
                      className="px-4 py-2 rounded-[15px] text-xs font-bold transition-colors bg-[#1DA1F2] text-white hover:bg-[#1a8cd8]"
                    >
                      Connect
                    </button>
                  )}
                </div>

                {/* Verified Badge Info */}
                {isTwitterConnected && twitterVerified && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-[15px]">
                    <div className="flex items-center gap-2 text-green-700 font-bold text-sm mb-1">
                      <CheckCircle size={16} />
                      Twitter Verified Account
                    </div>
                    <p className="text-xs text-green-600">
                      Your account has a blue checkmark. You are eligible for verified NFT minting.
                    </p>
                  </div>
                )}

                {isTwitterConnected && !twitterVerified && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-[15px]">
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-1">
                      <Clock size={16} />
                      Not Verified
                    </div>
                    <p className="text-xs text-amber-600">
                      Your Twitter account does not have a blue checkmark. 
                      <a 
                        href="https://twitter.com/i/premium_sign_up" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-amber-800 ml-1"
                      >
                        Upgrade to Premium
                      </a> to get verified status.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Notifications */}
            <section id="settings-notifications" className="card p-6 space-y-6 scroll-mt-36">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <Mail size={20} className="text-accent-cyan" />
                Notifications
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-ink/5 rounded-[15px] transition-colors -mx-2">
                  <div>
                    <span className="font-bold block">Push Notifications</span>
                    <span className="text-xs text-muted">Receive push notifications in browser</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-accent-cyan' : 'bg-ink/20'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'left-7' : 'left-1'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  />
                </label>

                <label className={`flex items-center justify-between cursor-pointer group p-2 rounded-[15px] transition-colors -mx-2 ${emailVerified ? 'hover:bg-ink/5' : 'opacity-60 cursor-not-allowed'}`}>
                  <div>
                    <span className="font-bold block">Email Notifications</span>
                    <span className="text-xs text-muted">
                      {emailVerified
                        ? 'Receive daily summaries and alerts'
                        : 'Verify your email to enable notifications'}
                    </span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${emailNotifications && emailVerified ? 'bg-accent-cyan' : 'bg-ink/20'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${emailNotifications && emailVerified ? 'left-7' : 'left-1'}`} />
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={emailNotifications}
                    disabled={!emailVerified}
                    onChange={(e) => emailVerified && setEmailNotifications(e.target.checked)}
                  />
                </label>
              </div>
            </section>

            {/* Privacy & Security */}
            <section id="settings-privacy" className="card p-6 space-y-6 scroll-mt-36">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <Shield size={20} className="text-accent-pink" />
                Privacy & Security
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted">Profile Visibility</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setProfileVisibility('public')}
                      className={`py-3 px-4 rounded-[15px] text-sm font-bold border transition-colors ${
                        profileVisibility === 'public' ? 'bg-accent-pink text-white border-transparent' : 'bg-transparent border-border text-muted hover:border-ink/30'
                      }`}
                    >
                      Public
                    </button>
                    <button 
                      onClick={() => setProfileVisibility('private')}
                      className={`py-3 px-4 rounded-[15px] text-sm font-bold border transition-colors ${
                        profileVisibility === 'private' ? 'bg-accent-pink text-white border-transparent' : 'bg-transparent border-border text-muted hover:border-ink/30'
                      }`}
                    >
                      Private
                    </button>
                  </div>
                  <p className="text-xs text-muted">Public profiles are visible on the leaderboard and search.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-widest text-muted">Who can message me</label>
                  <div className="space-y-2">
                    {(['everyone', 'clients_only', 'connections_only'] as const).map((option) => (
                      <label key={option} className="flex items-center gap-3 p-3 border border-border rounded-[15px] cursor-pointer hover:bg-ink/5 transition-colors">
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${messagingOption === option ? 'border-accent-pink' : 'border-muted'}`}>
                          {messagingOption === option && <div className="w-3 h-3 rounded-full bg-accent-pink" />}
                        </div>
                        <span className="text-sm font-bold capitalize">{option.replace('_', ' ')}</span>
                        <input 
                          type="radio" 
                          name="messaging" 
                          value={option} 
                          checked={messagingOption === option}
                          onChange={() => setMessagingOption(option)}
                          className="hidden"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-4 pt-4">
              <button
                onClick={async () => {
                  // Reload settings from server to reset all state
                  setLoading(true);
                  try {
                    const settings = await getSettings();
                    setNotificationsEnabled(settings.notificationsEnabled);
                    setEmailNotifications(settings.emailNotifications);
                    setMessagingOption(settings.messagingOption);
                    setProfileVisibility(settings.profileVisibility);
                    setEmail(settings.email || '');
                    setEmailInput(settings.email || '');
                    setEmailVerified(settings.emailVerified);
                    setEmailVerificationSentAt(settings.emailVerificationSentAt || null);
                    setTwitterHandle(settings.twitterHandle || '');
                    setIsTwitterConnected(settings.isTwitterConnected);
                    setTwitterVerified(settings.twitterVerified);
                    setEmailError(null);
                    setEmailSuccess(null);
                    setTwitterError(null);
                    setTwitterSuccess(null);
                  } catch (error) {
                    console.error('Failed to reload settings:', error);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-6 py-3 rounded-[15px] font-bold text-muted hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8 py-3 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
