import React, { useEffect, useState } from 'react';
import { Link as LinkIcon, Mail, Shield, Twitter } from 'lucide-react';
import { getSettings, updateSettings } from '../lib/api';

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
  const [twitterHandle, setTwitterHandle] = useState('');
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');

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
        setTwitterHandle(settings.twitterHandle || '');
        setIsTwitterConnected(settings.isTwitterConnected);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleTwitterConnect = () => {
    if (!isTwitterConnected) {
      setIsTwitterConnected(true);
      if (!twitterHandle) {
        setTwitterHandle('@stxworx');
      }
      return;
    }

    setIsTwitterConnected(false);
    setTwitterHandle('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateSettings({
        notificationsEnabled,
        emailNotifications,
        messagingOption,
        profileVisibility,
        email,
        twitterHandle,
        isTwitterConnected,
      });

      setNotificationsEnabled(updated.notificationsEnabled);
      setEmailNotifications(updated.emailNotifications);
      setMessagingOption(updated.messagingOption);
      setProfileVisibility(updated.profileVisibility);
      setEmail(updated.email || '');
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

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-muted">Email Binding</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email for notifications"
                    className="flex-1 bg-ink/5 border border-border rounded-[15px] px-4 py-3 text-sm focus:ring-1 focus:ring-accent-orange outline-none"
                  />
                  <button className="btn-primary w-full sm:w-auto px-6 py-3 shrink-0">Bind</button>
                </div>
                <p className="text-xs text-muted">Used for important account notifications and updates.</p>
              </div>
            </section>
            
            {/* Connections */}
            <section id="settings-connections" className="card p-6 space-y-6 scroll-mt-36">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <LinkIcon size={20} className="text-accent-orange" />
                Connections
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-[15px] bg-bg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-full flex items-center justify-center">
                      <Twitter size={20} />
                    </div>
                    <div>
                      <p className="font-bold">X / Twitter</p>
                      <p className="text-xs text-muted">{isTwitterConnected ? twitterHandle : 'Not connected'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleTwitterConnect}
                    className={`px-4 py-2 rounded-[15px] text-xs font-bold transition-colors ${
                      isTwitterConnected 
                        ? 'bg-ink/5 text-ink hover:bg-red-500/10 hover:text-red-500' 
                        : 'bg-[#1DA1F2] text-white hover:bg-[#1a8cd8]'
                    }`}
                  >
                    {isTwitterConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
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

                <label className="flex items-center justify-between cursor-pointer group p-2 hover:bg-ink/5 rounded-[15px] transition-colors -mx-2">
                  <div>
                    <span className="font-bold block">Email Notifications</span>
                    <span className="text-xs text-muted">Receive daily summaries and alerts</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${emailNotifications ? 'bg-accent-cyan' : 'bg-ink/20'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${emailNotifications ? 'left-7' : 'left-1'}`} />
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
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
                onClick={() => {
                  setEmail('');
                  setTwitterHandle('');
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
