
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  MessageSquareWarning, 
  Image as ImageIcon, 
  Globe, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  X,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Volume1,
  CheckCircle2,
  Waves,
  BrainCircuit,
  Flag,
  ChevronRight,
  Sparkles,
  Copy,
  ExternalLink
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { analyzeScam, getThinkingAnalysis } from './services/geminiService';
import { RiskLevel, AnalysisResponse, LanguageCode, SUPPORTED_LANGUAGES } from './types';
import RiskMeter from './components/RiskMeter';
import { OnboardingTour } from './components/OnboardingTour';
import { ChatBot } from './components/ChatBot';

// --- Audio Decoding Helpers ---
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [textInput, setTextInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [thinkingResult, setThinkingResult] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Volume state
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('guardian_volume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('guardian_muted') === 'true';
  });

  const lastAlertPlayedRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('guardian_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('guardian_muted', isMuted.toString());
  }, [isMuted]);

  // Audio Alert Logic
  const playAlertSound = (type: 'danger' | 'caution') => {
    if (isMuted || volume === 0) return;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = (freq: number, startTime: number, duration: number, baseVolume: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        const finalVolume = baseVolume * volume;
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(finalVolume, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      if (type === 'danger') {
        playTone(392, now, 0.4, 0.2); // G4
        playTone(311.13, now + 0.15, 0.6, 0.2); // Eb4
      } else {
        playTone(440, now, 0.3, 0.1); // A4
      }
    } catch (e) {
      console.warn("Audio alert failed:", e);
    }
  };

  useEffect(() => {
    if (result) {
      const resultKey = `${result.risk_level}-${result.summary}`;
      if (lastAlertPlayedRef.current !== resultKey) {
        if (result.risk_level === RiskLevel.DANGEROUS) {
          playAlertSound('danger');
        } else if (result.risk_level === RiskLevel.SUSPICIOUS) {
          playAlertSound('caution');
        }
        lastAlertPlayedRef.current = resultKey;
      }
    }
  }, [result]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleMute = () => setIsMuted(!isMuted);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearInputs = () => {
    setTextInput('');
    setPreviewUrl(null);
    setResult(null);
    setThinkingResult(null);
    setError(null);
    setCopied(false);
    lastAlertPlayedRef.current = null;
    stopSpeaking();
  };

  const stopSpeaking = () => {
    if (activeSourceRef.current) {
      activeSourceRef.current.stop();
      activeSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleAnalyze = async () => {
    if (!textInput && !previewUrl) {
      setError("Please paste a message or upload a screenshot so I can help you.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setThinkingResult(null);
    stopSpeaking();

    try {
      const analysis = await analyzeScam(
        { text: textInput, imageData: previewUrl || undefined },
        language
      );
      setResult(analysis);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeepThinking = async () => {
    if (isThinking || thinkingResult) return;
    setIsThinking(true);
    try {
      const deepExplanation = await getThinkingAnalysis(
        { text: textInput, imageData: previewUrl || undefined },
        language
      );
      setThinkingResult(deepExplanation);
    } catch (err) {
      console.error("Thinking Error:", err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleReport = () => {
    const portalMap: Record<string, string> = {
      'hi': 'https://cybercrime.gov.in',
      'bn': 'https://cybercrime.gov.in',
      'mr': 'https://cybercrime.gov.in',
      'ta': 'https://cybercrime.gov.in',
      'te': 'https://cybercrime.gov.in',
      'gu': 'https://cybercrime.gov.in',
      'pa': 'https://cybercrime.gov.in',
      'ur': 'https://cybercrime.gov.in',
      'en': 'https://cybercrime.gov.in',
      'en-IN': 'https://cybercrime.gov.in',
      'ar': 'https://www.amai.gov.ae/', 
      'fr': 'https://www.cybermalveillance.gouv.fr/',
      'de': 'https://www.bsi-fuer-buerger.de/',
      'en-US': 'https://www.ic3.gov/',
      'en-GB': 'https://www.actionfraud.police.uk/',
    };
    
    const url = portalMap[language] || 'https://cybercrime.gov.in';
    window.open(url, '_blank');
  };

  const copyToClipboard = () => {
    if (!result) return;
    const content = `[Kavach AI Security Report]\nStatus: ${result.risk_level}\nSummary: ${result.summary}\nExplanation: ${result.explanation}\nMessage: ${textInput || 'Screenshot shared'}`;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- High-Quality Soft & Gentle Male Voice Logic ---
  const speakText = async (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    setIsSpeaking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Speak in a very soft, gentle, caring, and protective tone, like a loving grandson. You are a young male speaking to a family member. Use the output language: ${language}. Text: ${text}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Voice data missing");

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const audioCtx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        audioCtx,
        24000,
        1,
      );

      const source = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      
      gainNode.gain.value = isMuted ? 0 : volume;
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      activeSourceRef.current = source;
      source.onended = () => {
        setIsSpeaking(false);
        activeSourceRef.current = null;
      };
      
      source.start();
    } catch (err) {
      console.error("TTS Error:", err);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-32 transition-colors duration-500">
      <OnboardingTour />
      <ChatBot language={language} />
      
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">KAVACH AI</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
              <button 
                onClick={toggleMute}
                className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : volume < 0.5 ? <Volume1 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={isMuted ? 0 : volume} 
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-16 h-1 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 hidden sm:block"
              />
            </div>

            <button 
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all active:scale-90"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div id="tour-language" className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-4">
              <Globe className="w-4 h-4 text-slate-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-sm font-bold border-none focus:ring-0 cursor-pointer text-slate-600 dark:text-slate-300 outline-none"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="dark:bg-slate-900">
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-12 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Your Digital Armor.</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium text-lg leading-snug">
            Paste suspicious messages or images. Our AI guardian will shield you from harm.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-800/50 p-8 space-y-8">
          <div className="space-y-6">
            <div id="tour-text" className="relative group">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste the suspicious text here..."
                className="w-full min-h-[180px] p-8 bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 resize-none text-slate-700 dark:text-slate-200 outline-none text-lg font-medium transition-all"
              />
              <MessageSquareWarning className="absolute top-8 right-8 w-6 h-6 text-slate-300 dark:text-slate-800 group-focus-within:text-indigo-500" />
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <label id="tour-image" className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group relative overflow-hidden">
                {previewUrl ? (
                  <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.preventDefault(); setPreviewUrl(null); }}
                      className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 backdrop-blur-md"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-3xl group-hover:bg-white transition-all">
                      <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Share Screenshot</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>

              <button
                id="tour-btn"
                onClick={handleAnalyze}
                disabled={loading}
                className="flex-none sm:w-56 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black rounded-[2.5rem] p-6 transition-all shadow-lg active:scale-95 group"
              >
                {loading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-[10px] uppercase tracking-widest">Scanning...</span>
                  </div>
                ) : (
                  <>
                    <ShieldCheck className="w-8 h-8 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-base tracking-tight uppercase">Analyze Message</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center space-y-6 py-16 animate-in fade-in slide-in-from-bottom-8">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin shadow-xl"></div>
              <ShieldCheck className="absolute inset-0 m-auto w-10 h-10 text-indigo-600 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-slate-900 dark:text-white font-black text-2xl tracking-tighter">Guarding Your Safety...</p>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Fast Scanning Active</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-6 rounded-[2.5rem] flex items-center gap-5">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="text-rose-900 dark:text-rose-400 font-black text-xs uppercase tracking-widest mb-0.5">Alert</p>
              <p className="text-rose-700 dark:text-rose-500 text-lg font-bold">{error}</p>
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-12 duration-1000 pb-20">
            <div className="flex flex-col sm:flex-row gap-6 items-stretch">
              <div className="flex-[3]">
                <RiskMeter level={result.risk_level} />
              </div>
              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col justify-center items-center shadow-2xl">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3">AI Verdict</p>
                <div className="relative flex items-center justify-center">
                   <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                      <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={219.9} strokeDashoffset={219.9 * (1 - result.confidence_score)} className="text-indigo-600 transition-all duration-1500 ease-out" strokeLinecap="round" />
                   </svg>
                   <span className="absolute text-lg font-black text-slate-900 dark:text-white">{Math.round(result.confidence_score * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Deep Thinking Mode Section */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[3.5rem] p-1 shadow-2xl">
              <div className="bg-white dark:bg-slate-950 rounded-[3.3rem] overflow-hidden">
                <div className="p-10 space-y-10">
                  <div className="space-y-8">
                    <div className="flex justify-between items-start gap-6">
                      <div className="space-y-3 flex-1">
                        <div className="w-16 h-1.5 bg-indigo-500 rounded-full mb-6"></div>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white leading-[1.05] tracking-tighter">
                          {result.summary}
                        </h3>
                      </div>
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={() => speakText(result.voice_ready_text)}
                          className={`p-6 ${isSpeaking ? 'bg-indigo-600 text-white' : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600'} rounded-[2rem] hover:bg-indigo-600 hover:text-white transition-all active:scale-90 relative overflow-hidden group`}
                          title={isSpeaking ? "Stop Guidance" : "Play Gentle Voice Guidance"}
                        >
                          {isSpeaking ? <Waves className="w-8 h-8 animate-pulse" /> : <Volume2 className="w-8 h-8" />}
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-8 bg-slate-50 dark:bg-slate-950/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                      <p className="text-2xl text-slate-700 dark:text-slate-300 font-bold italic tracking-tight opacity-90">
                        "{result.explanation}"
                      </p>
                    </div>

                    {/* Quick Report Action Section for High Risk */}
                    {(result.risk_level === RiskLevel.DANGEROUS || result.risk_level === RiskLevel.SUSPICIOUS) && (
                      <div className="bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-100 dark:border-rose-900/40 rounded-[2.5rem] p-8 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg">
                            <Flag className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-rose-700 dark:text-rose-400 tracking-tight">Report This Threat</h4>
                            <p className="text-xs font-bold text-rose-600/70 dark:text-rose-500 uppercase tracking-widest">National Cybercrime Protection</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                          <button 
                            onClick={handleReport}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-5 px-8 rounded-3xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-rose-600/20 group"
                          >
                            <ExternalLink className="w-5 h-5" />
                            Visit Reporting Portal
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </button>
                          
                          <button 
                            onClick={copyToClipboard}
                            className="flex-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-2 border-rose-100 dark:border-rose-800 font-black py-5 px-8 rounded-3xl flex items-center justify-center gap-3 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20 active:scale-95"
                          >
                            {copied ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Copy className="w-5 h-5" />
                            )}
                            {copied ? 'Copied Details' : 'Copy Summary'}
                          </button>
                        </div>
                        <p className="text-[10px] text-center text-rose-600/60 dark:text-rose-500/50 font-bold uppercase tracking-widest">Reporting helps protect thousands of others in your community.</p>
                      </div>
                    )}

                    {/* Thinking Mode Trigger */}
                    {!thinkingResult && (
                      <button 
                        onClick={handleDeepThinking}
                        disabled={isThinking}
                        className="w-full py-6 px-8 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all active:scale-[0.98]"
                      >
                        {isThinking ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            AI is Thinking Deeply...
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="w-5 h-5" />
                            Unlock Deep Analysis (Thinking Mode)
                          </>
                        )}
                      </button>
                    )}

                    {thinkingResult && (
                      <div className="animate-in fade-in slide-in-from-top-4 duration-700 p-8 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800/50">
                        <div className="flex items-center gap-3 mb-4">
                          <Sparkles className="w-5 h-5 text-indigo-500" />
                          <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest">Deep Insight Analysis</h4>
                        </div>
                        <p className="text-lg text-slate-700 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                          {thinkingResult}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800/50 w-full" />

                  <div className="space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg">
                         <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-[0.3em] text-[12px]">Your Protective Shield</h4>
                    </div>
                    <div className="grid gap-5">
                      {result.action_steps.map((step, idx) => (
                        <div key={idx} className="flex gap-6 p-7 bg-slate-50 dark:bg-slate-950/50 rounded-[2.5rem] items-center border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl group">
                          <span className="flex-none w-12 h-12 rounded-[1.2rem] bg-white dark:bg-slate-800 border border-slate-200 flex items-center justify-center font-black text-xl text-indigo-600 shadow-lg group-hover:scale-110 transition-all">
                            {idx + 1}
                          </span>
                          <p className="text-slate-800 dark:text-slate-200 font-black text-xl tracking-tight">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-8 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                     <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></div>
                     <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">Guardian Protocol Active</p>
                  </div>
                  <button
                    onClick={clearInputs}
                    className="text-xs font-black text-indigo-600 px-7 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-all"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    RESCAN NEW MESSAGE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-t border-slate-200 dark:border-slate-800 p-6 text-center z-40">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/30 rounded-full border border-rose-100 dark:border-rose-900/30">
             <AlertCircle className="w-4 h-4 text-rose-600" />
             <p className="text-xs text-rose-700 dark:text-rose-400 font-black uppercase tracking-widest">Emergency: Call 1930</p>
          </div>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em]">
            Reporting saves thousands. Visit <a href="https://cybercrime.gov.in" target="_blank" className="underline text-indigo-600">cybercrime.gov.in</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
