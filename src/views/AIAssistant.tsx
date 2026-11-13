
import React, { useState, useRef, useEffect } from 'react';
import {
  CrewMember,
  HealthReading,
  HealthAlert,
  AIChatMessage
} from '../types/astramed';

import {
  Bot,
  Send,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  ArrowRight
} from 'lucide-react';

interface AIAssistantProps {
  activeSection: string;
  selectedCrew: CrewMember | null;
  readings: HealthReading[];
  alerts: HealthAlert[];
  isGeminiActive: boolean;
  onExecuteAction: (action: {
    type: string;
    targetSection?: string;
    params?: Record<string, string>;
  }) => void;
  initialPrompt?: string;
}

const KEYWORD_BANK: Record<string, string[]> = {
  heartRate: ['heart rate', 'pulse', 'bpm'],
  bloodPressure: ['blood pressure', 'bp', 'systolic', 'diastolic'],
  oxygen: ['oxygen', 'spo2', 'saturation'],
  temperature: ['temperature', 'body temperature'],
  muscle: ['muscle', 'atrophy', 'muscle loss'],
  bone: ['bone', 'bone loss', 'bone density'],
  radiation: ['radiation', 'exposure', 'cosmic rays'],
  microgravity: ['microgravity', 'weightlessness', 'zero gravity'],
  alerts: ['alerts', 'warnings', 'critical', 'risk'],
  crew: ['crew', 'astronaut', 'commander', 'astronaut profile']
};

const NAVIGATION_KEYWORDS = [
  'navigate',
  'go to',
  'open section',
  'open dashboard',
  'take me to',
  'switch to',
  'show dashboard',
  'show health trends',
  'open research library',
  'enter readings'
];

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();

const findSupportedCategories = (message: string): string[] => {
  const query = normalize(message);
  const matched: string[] = [];

  Object.entries(KEYWORD_BANK).forEach(([category, keywords]) => {
    const found = keywords.some(keyword => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|\\s)${escaped}(?=$|\\s)`, 'i').test(query);
    });

    if (found) matched.push(category);
  });

  return matched;
};

const isNavigationRequest = (message: string) => {
  const query = normalize(message);
  return NAVIGATION_KEYWORDS.some(keyword => query.includes(keyword));
};

const createAssistantMessage = (text: string): AIChatMessage => ({
  id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  sender: 'assistant',
  text,
  timestamp: new Date().toISOString()
});

export const AIAssistant: React.FC<AIAssistantProps> = ({
  activeSection,
  selectedCrew,
  readings,
  alerts,
  onExecuteAction,
  initialPrompt
}) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text:
        `Greetings. I am **ASTRAMED AI**.\n\n` +
        `I am a restricted aerospace biomedical information assistant.\n\n` +
        `**Supported knowledge categories:**\n` +
        `• Heart rate\n• Blood pressure\n• Oxygen\n• Temperature\n` +
        `• Muscle health\n• Bone health\n• Radiation\n• Microgravity\n` +
        `• Health alerts\n• Crew profiles\n\n` +
        `I only answer questions within these supported categories. ` +
        `I do not generate medical diagnoses or invent health readings.\n\n` +
        `Current crew: **${selectedCrew?.name || 'No crew selected'}**\n` +
        `Registered alerts: **${alerts.length}**\n\n` +
        `How can I assist your mission analysis?`,
      timestamp: new Date().toISOString()
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const initialPromptRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const SUGGESTED_PROMPTS = [
    'Show heart rate',
    'Explain muscle atrophy',
    'Explain bone density loss',
    'What is microgravity?',
    'Show health alerts',
    'Show crew profiles'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (
      initialPrompt &&
      initialPrompt.trim() &&
      initialPromptRef.current !== initialPrompt
    ) {
      initialPromptRef.current = initialPrompt;
      sendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakResponse = (text: string) => {
    if (!isSpeaking || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*#_`]/g, '');

    const utterance = new SpeechSynthesisUtterance(
      cleanText.slice(0, 500)
    );

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputPrompt).trim();

    if (!query || loadingRef.current) return;

    const userMessage: AIChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);

    if (!textToSend) setInputPrompt('');

    const categories = findSupportedCategories(query);
    const navigation = isNavigationRequest(query);

    // Reject unsupported topics before contacting the backend.
    if (categories.length === 0 && !navigation) {
      setMessages(prev => [
        ...prev,
        createAssistantMessage(
          'This topic is outside my current knowledge base.\n\n' +
          'I currently support only 10 categories: heart rate, blood pressure, ' +
          'oxygen, temperature, muscle health, bone health, radiation, ' +
          'microgravity, health alerts and crew profiles.'
        )
      ]);
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: query,
          activeSection,
          activeCrewId: selectedCrew?.id || undefined,
          activeParam: categories[0] || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const replyData = await response.json();

      if (!replyData || typeof replyData.text !== 'string') {
        throw new Error('Invalid assistant response received.');
      }

      const assistantMessage: AIChatMessage = {
        ...replyData,
        id: replyData.id || `ast_${Date.now()}`,
        sender: 'assistant',
        timestamp: replyData.timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      speakResponse(assistantMessage.text);

    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown network error';

      setMessages(prev => [
        ...prev,
        createAssistantMessage(
          `Unable to connect to ASTRAMED intelligence backend.\n\n` +
          `${message}\n\nPlease verify that the backend server is running.`
        )
      ]);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;

        if (transcript) setInputPrompt(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error('Voice recognition error:', error);
      setIsListening(false);
    }
  };

  const toggleSpeaking = () => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">

      {/* Intelligence Status */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-lg">
            <Bot className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">
                ASTRAMED AI Assistant
              </span>

              <span className="px-2 py-0.5 rounded text-[10px] font-mono border bg-cyan-950 text-cyan-300 border-cyan-800">
                RESTRICTED RULE-BASED ENGINE
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Active Screen: <strong className="text-slate-200">{activeSection}</strong>
              {' • '}
              Subject: <strong className="text-cyan-400">
                {selectedCrew?.name || 'Not selected'}
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">

          {isSpeaking && (
            <button
              onClick={() => {
                window.speechSynthesis?.cancel();
                setIsSpeaking(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 border border-amber-800 text-amber-300 rounded-lg text-xs font-mono"
            >
              <VolumeX className="w-3.5 h-3.5" />
              Stop Audio
            </button>
          )}

          <button
            onClick={toggleSpeaking}
            className={`p-2 rounded-lg border text-xs font-mono ${
              isSpeaking
                ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Toggle spoken responses"
          >
            {isSpeaking
              ? <Volume2 className="w-4 h-4" />
              : <VolumeX className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">

        {messages.map(msg => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isUser
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-cyan-400 border border-slate-700'
              }`}>
                {isUser ? 'U' : <Bot className="w-4 h-4" />}
              </div>

              <div className={`p-4 rounded-2xl space-y-2.5 ${
                isUser
                  ? 'bg-cyan-700/80 text-white rounded-tr-none'
                  : 'bg-slate-950/80 text-slate-200 border border-slate-800 rounded-tl-none shadow-md'
              }`}>

                <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </div>

                {msg.suggestedAction && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3 bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-800/60 font-mono text-[11px]">

                    <div className="flex items-center gap-2 text-cyan-300">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{msg.suggestedAction.label}</span>
                    </div>

                    <button
                      onClick={() => onExecuteAction(msg.suggestedAction!)}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-bold flex items-center gap-1"
                    >
                      Execute
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 font-mono text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center shrink-0 border border-slate-700">
              <Bot className="w-4 h-4" />
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-none text-xs font-mono text-cyan-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Analyzing supported biomedical information...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Queries */}
      <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto shrink-0">

        <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">
          Quick Queries:
        </span>

        {SUGGESTED_PROMPTS.map((prompt, index) => (
          <button
            key={index}
            onClick={() => sendMessage(prompt)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-300 hover:text-cyan-300 border border-slate-800 text-[11px] whitespace-nowrap font-sans"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={event => {
          event.preventDefault();
          sendMessage();
        }}
        className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3 shrink-0"
      >

        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`p-2.5 rounded-xl border ${
            isListening
              ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title="Voice Input"
        >
          {isListening
            ? <Mic className="w-4 h-4" />
            : <MicOff className="w-4 h-4" />
          }
        </button>

        <input
          type="text"
          value={inputPrompt}
          onChange={event => setInputPrompt(event.target.value)}
          placeholder="Ask about supported astronaut health topics..."
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
        />

        <button
          type="submit"
          disabled={!inputPrompt.trim() || isLoading}
          className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5"
        >
          SEND
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
