
import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

export const AIProposalGenerator = () => {
  const [role, setRole] = useState<'client' | 'freelancer'>('freelancer');
  const [prompt, setPrompt] = useState('');
  const [humanize, setHumanize] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter some details for the proposal.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API Key is missing. Please set VITE_GEMINI_API_KEY or GEMINI_API_KEY in your environment.');
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      let systemInstruction = '';
      if (role === 'freelancer') {
        systemInstruction = 'You are an expert freelance proposal writer. Write a compelling, professional proposal to win a job based on the provided details.';
      } else {
        systemInstruction = 'You are an expert project manager. Write a clear, comprehensive job description/proposal to attract top freelancers based on the provided details.';
      }
      
      if (humanize) {
        systemInstruction += ' Make the tone very conversational, empathetic, and human-like. Avoid overly corporate jargon and sound like a real person writing a thoughtful message.';
      } else {
        systemInstruction += ' Keep the tone professional, structured, and concise.';
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: humanize ? 0.7 : 0.3,
        }
      });
      
      setGeneratedText(response.text || 'No content generated.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate proposal. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pl-6 md:pl-[92px] pr-6 pt-24 pb-12 min-h-screen">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter mb-4 flex items-center gap-3">
            <Sparkles className="text-accent-orange" size={36} />
            AI Proposal Writer
          </h1>
          <p className="text-muted text-lg">
            Generate professional proposals, job descriptions, and pitches instantly using AI.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 xl:gap-8 items-start">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">1. Select Your Role</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => setRole('freelancer')}
                  className={`flex-1 py-3 px-4 rounded-[15px] font-bold transition-all border ${
                    role === 'freelancer' 
                      ? 'bg-accent-orange text-white border-transparent' 
                      : 'bg-transparent border-border text-muted hover:border-ink/30'
                  }`}
                >
                  Freelancer
                </button>
                <button
                  onClick={() => setRole('client')}
                  className={`flex-1 py-3 px-4 rounded-[15px] font-bold transition-all border ${
                    role === 'client' 
                      ? 'bg-accent-blue text-white border-transparent' 
                      : 'bg-transparent border-border text-muted hover:border-ink/30'
                  }`}
                >
                  Client
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">2. Proposal Details</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={role === 'freelancer' 
                  ? "Describe the job you're applying for, your relevant skills, and why you're a good fit..." 
                  : "Describe the project, required skills, timeline, and what you're looking for in a freelancer..."}
                className="w-full h-48 bg-bg border border-border rounded-[15px] p-4 text-ink focus:outline-none focus:border-accent-orange resize-none"
              />
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4">3. Options</h2>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${
                  humanize ? 'bg-accent-orange border-accent-orange' : 'border-border group-hover:border-ink/50'
                }`}>
                  {humanize && <CheckCircle2 size={16} className="text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={humanize}
                  onChange={(e) => setHumanize(e.target.checked)}
                />
                <div>
                  <span className="font-bold block">Humanize Text</span>
                  <span className="text-xs text-muted">Make the tone more conversational and empathetic</span>
                </div>
              </label>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full btn-primary justify-center py-4 text-lg"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Bot size={20} />
                  Generate Proposal
                </span>
              )}
            </button>
            
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-[15px] text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="card p-6 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Generated Result</h2>
              {generatedText && (
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedText)}
                  className="text-sm font-bold text-accent-orange hover:text-white transition-colors flex items-center gap-2"
                >
                  <FileText size={16} />
                  Copy Text
                </button>
              )}
            </div>
            
            <div className="flex-1 bg-bg border border-border rounded-[15px] p-6 overflow-y-auto whitespace-pre-wrap">
              {generatedText ? (
                <div className="text-ink leading-relaxed">
                  {generatedText}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted opacity-50">
                  <Sparkles size={48} className="mb-4" />
                  <p>Your generated proposal will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
