import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Shield, Zap, Globe, Heart, TrendingUp, AlertTriangle, 
  ChevronRight, ArrowRight, Layers, Cpu, Users, Award 
} from 'lucide-react';
import * as Shared from '../shared';

export const WhitepaperPage = () => {
  const [activeSection, setActiveSection] = useState('abstract');

  const sections = [
    { id: 'abstract', label: 'Abstract' },
    { id: 'introduction', label: '1. Introduction' },
    { id: 'problem', label: '2. The Problem' },
    { id: 'solution', label: '3. The Solution' },
    { id: 'fees', label: '4. Fee Structure' },
    { id: 'architecture', label: '5. Architecture' },
    { id: 'social', label: '6. Social Layer' },
    { id: 'roadmap', label: '7. Roadmap' },
    { id: 'conclusion', label: 'Conclusion' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(s => document.getElementById(s.id));
      const currentSection = sectionElements.find(el => {
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= 400;
      });
      if (currentSection) {
        setActiveSection(currentSection.id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-bg text-white/90 selection:bg-accent-orange/30">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-orange/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-cyan/20 blur-[120px] rounded-full" />
      </div>

      <div className="px-6 md:pl-[92px]">
        <div className="pt-32 pb-32">
          <div className="container-custom relative max-w-4xl">
            {/* Main Content */}
            <main>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {/* Header */}
                <header className="mb-24">
                  <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                    STXWORX Protocols
                  </h1>
                  <p className="text-xl md:text-2xl text-muted leading-relaxed mb-8 max-w-2xl font-light">
                    Redefining the creative economy through Bitcoin security and Stacks smart contracts.
                  </p>
                  <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-white/5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Version</p>
                      <p className="text-sm font-medium">1.7 – April 2026</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Author</p>
                      <p className="text-sm font-medium text-accent-cyan">White Fintech</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Ecosystem</p>
                      <p className="text-sm font-medium">Stacks Mainnet</p>
                    </div>
                  </div>
                </header>

                {/* Abstract */}
                <section id="abstract" className="mb-32 scroll-mt-32">
                  <div className="relative">
                    <div className="absolute -left-8 top-0 bottom-0 w-[1px] bg-gradient-to-b from-accent-orange via-transparent to-transparent" />
                    <h2 className="text-3xl font-bold mb-8">Abstract</h2>
                    <div className="space-y-6 text-lg text-muted leading-relaxed">
                      <p>
                        STXWORX represents a paradigm shift in the digital workforce. By leveraging the security of Bitcoin and the programmability of Stacks, we've built a decentralized ecosystem where creative work is fairly valued and instantaneously compensated.
                      </p>
                      <p>
                        At its core, STXWORX utilizes Clarity smart contracts to manage escrow, milestone-based releases, and a transparent fee distribution system. This ensures that trust is built into the code, not the institution.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Introduction */}
                <section id="introduction" className="mb-32 scroll-mt-32">
                  <h2 className="text-3xl font-bold mb-12 flex items-center gap-4">
                    <span className="text-accent-orange text-sm font-mono tracking-widest">01</span>
                    Introduction
                  </h2>
                  <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                      <p className="text-muted leading-relaxed">
                        The current freelance landscape is fragmented by high fees, opaque dispute resolutions, and restrictive payment gateways. Creators in emerging markets are often excluded by mandatory KYC or withdrawal barriers.
                      </p>
                      <p className="text-muted leading-relaxed font-bold text-white">
                        Bitcoin security + Stacks programmability + USDCx stability = real creative utility on-chain.
                      </p>
                    </div>
                    <div className="p-8 rounded-3xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05]">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-accent-cyan" />
                        </div>
                        <h4 className="font-bold">Utility Driven</h4>
                      </div>
                      <p className="text-sm text-muted leading-relaxed">
                        STXWORX is not just a marketplace; it's a social workspace where reputation is earned on-chain and impact is measurable through every transaction.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Problem */}
                <section id="problem" className="mb-32 scroll-mt-32">
                  <h2 className="text-3xl font-bold mb-12 flex items-center gap-4">
                    <span className="text-accent-orange text-sm font-mono tracking-widest">02</span>
                    The Problem
                  </h2>
                  <div className="space-y-4">
                    {[
                      { title: 'Identity Barriers', desc: 'Mandatory KYC excludes talented creators from restrictive jurisdictions.', icon: Shield },
                      { title: 'Fund Custody', desc: 'Centralized platforms hold user funds for weeks, leading to liquidity issues.', icon: Zap },
                      { title: 'Arbitrary Governance', desc: 'Account suspensions occur without transparent explanation or recourse.', icon: AlertTriangle },
                      { title: 'Value Leaks', desc: 'Excessive platform fees (10-20%) plus payment processor charges erode creator earnings.', icon: TrendingUp }
                    ].map((item, idx) => (
                      <div key={idx} className="group p-6 rounded-2xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-white/[0.1] transition-all duration-300">
                        <div className="flex gap-6">
                          <div className="mt-1 w-10 h-10 rounded-xl bg-white/[0.05] group-hover:bg-accent-orange/10 flex items-center justify-center transition-colors">
                            <item.icon className="w-5 h-5 text-muted group-hover:text-accent-orange" />
                          </div>
                          <div>
                            <h4 className="font-bold mb-1">{item.title}</h4>
                            <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Solution */}
                <section id="solution" className="mb-32 scroll-mt-32">
                  <h2 className="text-3xl font-bold mb-12 flex items-center gap-4">
                    <span className="text-accent-orange text-sm font-mono tracking-widest">03</span>
                    The STXWORX Solution
                  </h2>
                  <div className="p-10 rounded-[40px] bg-gradient-to-br from-accent-cyan/10 via-bg to-bg border border-accent-cyan/20">
                    <p className="text-xl leading-relaxed text-white/90 mb-8">
                      We offer a censorship-resistant, low-fee, Bitcoin-secured experience. By moving the core marketplace logic to Clarity smart contracts, we eliminate the need for centralized intermediaries.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan flex-shrink-0" />
                        <p className="text-sm text-muted"><span className="text-white font-medium">No KYC Required</span> for core access and participation.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan flex-shrink-0" />
                        <p className="text-sm text-muted"><span className="text-white font-medium">Instant Withdrawals</span> directly to user-controlled wallets.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan flex-shrink-0" />
                        <p className="text-sm text-muted"><span className="text-white font-medium">On-chain Reputation</span> via immutable NFT records.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan flex-shrink-0" />
                        <p className="text-sm text-muted"><span className="text-white font-medium">Transparent Governance</span> through admin moderation with on-chain logs.</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Fee Structure */}
                <section id="fees" className="mb-32 scroll-mt-32">
                  <h2 className="text-3xl font-bold mb-12 flex items-center gap-4">
                    <span className="text-accent-orange text-sm font-mono tracking-widest">04</span>
                    Fee Structure & Impact
                  </h2>
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 p-8 rounded-3xl bg-accent-orange/5 border border-accent-orange/10 flex flex-col items-center justify-center text-center">
                      <p className="text-sm font-bold uppercase tracking-widest text-accent-orange mb-2">Platform Fee</p>
                      <h3 className="text-6xl font-black">10%</h3>
                      <p className="text-xs text-muted mt-4 uppercase tracking-tighter">Charged per contract</p>
                    </div>
                    <div className="md:col-span-2 space-y-6">
                      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-6">
                        <div className="text-4xl font-black text-white/20">09%</div>
                        <div>
                          <h4 className="font-bold mb-1">Growth & Sustainability</h4>
                          <p className="text-sm text-muted leading-relaxed">Development, hosting, marketing, and community rewards.</p>
                        </div>
                      </div>
                      <div className="p-6 rounded-2xl bg-accent-cyan/5 border border-accent-cyan/10 flex items-center gap-6">
                        <div className="text-4xl font-black text-accent-cyan/20">01%</div>
                        <div>
                          <h4 className="font-bold mb-1 text-accent-cyan flex items-center gap-2">
                            Stacks Africa <Heart className="w-4 h-4" />
                          </h4>
                          <p className="text-sm text-muted leading-relaxed italic">Hard-coded via smart contract for youth empowerment and tech education.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Technical Architecture */}
                <section id="architecture" className="mb-32 scroll-mt-32">
                  <h2 className="text-3xl font-bold mb-12 flex items-center gap-4">
                    <span className="text-accent-orange text-sm font-mono tracking-widest">05</span>
                    Technical Architecture
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-8">
                    <div className="space-y-4 p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="w-12 h-12 rounded-2xl bg-accent-orange/10 flex items-center justify-center mb-6">
                        <Cpu className="w-6 h-6 text-accent-orange" />
                      </div>
                      <h4 className="text-xl font-bold">Logic Layer</h4>
                      <p className="text-sm text-muted leading-relaxed">
                        Clarity smart contracts handle the heavy lifting. Unlike Solidity, Clarity is non-Turing complete and interpreted, making it more secure and predictable.
                      </p>
                      <ul className="text-xs space-y-2 pt-4">
                        <li className="flex items-center gap-2 font-mono text-white/50"><div className="w-1 h-1 rounded-full bg-accent-orange" /> Escrow Management</li>
                        <li className="flex items-center gap-2 font-mono text-white/50"><div className="w-1 h-1 rounded-full bg-accent-orange" /> Multi-asset Payments</li>
                        <li className="flex items-center gap-2 font-mono text-white/50"><div className="w-1 h-1 rounded-full bg-accent-orange" /> Fee Split Protocols</li>
                      </ul>
                    </div>
                    <div className="space-y-4 p-8 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 flex items-center justify-center mb-6">
                        <Layers className="w-6 h-6 text-accent-cyan" />
                      </div>
                      <h4 className="text-xl font-bold">Storage & Identity</h4>
                      <p className="text-sm text-muted leading-relaxed">
                        We prioritize data sovereignty. User assets are stored on decentralized storage networks while identity is tied to Hiro/Xverse wallet signatures.
                      </p>
                      <ul className="text-xs space-y-2 pt-4">
                        <li className="flex items-center gap-2 font-mono text-white/50"><div className="w-1 h-1 rounded-full bg-accent-cyan" /> Gaia / IPFS Storage</li>
                        <li className="flex items-center gap-2 font-mono text-white/50"><div className="w-1 h-1 rounded-full bg-accent-cyan" /> BNS Identity Integration</li>
                        <li className="flex items-center gap-2 font-mono text-white/50"><div className="w-1 h-1 rounded-full bg-accent-cyan" /> NFT-based Reputation</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Social Layer */}
                <section id="social" className="mb-32 scroll-mt-32">
                  <h2 className="text-3xl font-bold mb-12 flex items-center gap-4">
                    <span className="text-accent-orange text-sm font-mono tracking-widest">06</span>
                    The Social Layer
                  </h2>
                  <p className="text-lg text-muted leading-relaxed mb-12">
                    Work doesn't happen in a vacuum. STXWORX integrates a deep social layer to foster community and discovery.
                  </p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: 'Timeline', desc: 'Real-time feed of activity and achievements.', icon: Users },
                      { label: 'Chat', desc: 'Peer-to-peer messaging for project scoping.', icon: Globe },
                      { label: 'Network', desc: 'On-chain connections and endorsements.', icon: Heart },
                      { label: 'Social Proof', desc: 'X/Twitter integration for verified trust.', icon: Award }
                    ].map((feat, idx) => (
                      <div key={idx} className="text-center p-6 space-y-4">
                        <div className="mx-auto w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5">
                          <feat.icon className="w-5 h-5 text-accent-purple" />
                        </div>
                        <h5 className="font-bold">{feat.label}</h5>
                        <p className="text-xs text-muted leading-relaxed">{feat.desc}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Roadmap */}
                <section id="roadmap" className="mb-32 scroll-mt-32">
                  <h2 className="text-3xl font-bold mb-12 flex items-center gap-4">
                    <span className="text-accent-orange text-sm font-mono tracking-widest">07</span>
                    Roadmap
                  </h2>
                  <div className="relative space-y-12">
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-white/5" />
                    {[
                      { q: 'Q2 2026', title: 'Mainnet Stability', desc: 'Focus on social layer strengthening and core UI refinements.', status: 'active', color: 'accent-cyan' },
                      { q: 'Q3 2026', title: 'Mobile & DAO', desc: 'Release of native mobile apps and initial governance proposal framework.', status: 'upcoming', color: 'accent-orange' },
                      { q: 'Q4 2026', title: 'Expansion', desc: 'BNB Chain integration and full rollout of 50+ AI-enhanced creator tools.', status: 'upcoming', color: 'accent-purple' }
                    ].map((step, idx) => (
                      <div key={idx} className="relative pl-16 group">
                        <div className={`absolute left-5 top-1.5 w-2 h-2 rounded-full bg-${step.color} border-4 border-bg ring-4 ring-${step.color}/20 z-10 transition-transform duration-500 group-hover:scale-125`} />
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest text-${step.color} mb-1 block`}>{step.q}</span>
                          <h4 className="text-xl font-bold mb-2">{step.title}</h4>
                          <p className="text-sm text-muted leading-relaxed max-w-lg">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Conclusion */}
                <section id="conclusion" className="mb-32 scroll-mt-32">
                  <div className="p-12 rounded-[48px] bg-gradient-to-br from-accent-orange/10 via-white/[0.02] to-accent-cyan/10 border border-white/[0.05] relative overflow-hidden text-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-orange/10 blur-3xl rounded-full" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-cyan/10 blur-3xl rounded-full" />
                    
                    <h2 className="text-3xl font-bold mb-6">Conclusion</h2>
                    <p className="text-xl text-muted leading-relaxed mb-8 max-w-2xl mx-auto italic">
                      "STXWORX is utility with purpose — work that earns, connects, and gives back. We are building the ultimate decentralized hub for creators, secured by the strongest blockchain on Earth."
                    </p>
                    <div className="pt-8 flex flex-col items-center gap-6">
                      <Shared.Logo className="scale-150" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">STXWORX Core Protocol</p>
                    </div>
                  </div>
                </section>

                <footer className="pt-24 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                  <p className="text-xs text-muted">© 2026 White Fintech. Built on Stacks.</p>
                  <div className="flex items-center gap-8">
                    <a href="https://stxworx.com" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-widest hover:text-accent-orange transition-colors">App</a>
                    <a href="https://x.com/stxworx" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-widest hover:text-accent-orange transition-colors">X / Twitter</a>
                    <a href="https://discord.gg/kwwSHtBdNK" target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-widest hover:text-accent-orange transition-colors">Discord</a>
                  </div>
                </footer>
              </motion.div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};
