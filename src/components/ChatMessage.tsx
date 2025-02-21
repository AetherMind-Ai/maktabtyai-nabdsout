import React, { useState, useEffect } from 'react';
import { User, Bot, Pause, Play } from 'lucide-react'; // Import Pause and Play icons
import { Message } from '../types';

interface ChatMessageProps {
    message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === 'user';
    const [isPlaying, setIsPlaying] = useState(false); // State for play/pause
    const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null); // Store the utterance

    useEffect(() => {
        if (!isUser && message.role === 'assistant' && !utterance) {
            const newUtterance = createUtterance(message.content);
            setUtterance(newUtterance);
            speakMessage(newUtterance);
        }

        return () => {
            if (utterance) {
                speechSynthesis.cancel(); // Stop speaking when component unmounts or message changes
            }
        };
    }, [message]);

    const createUtterance = (text: string): SpeechSynthesisUtterance => {
        const newUtterance = new SpeechSynthesisUtterance(text);
        newUtterance.lang = isArabic(text) ? 'ar-SA' : 'en-US'; // Set language
        newUtterance.voice = getVoice(newUtterance.lang);  // Set voice based on language

        // Log the selected voice for debugging:
        console.log("Speaking with voice:", newUtterance.voice ? newUtterance.voice.name : 'Default');

        newUtterance.onstart = () => setIsPlaying(true);
        newUtterance.onend = () => setIsPlaying(false);
        newUtterance.onpause = () => setIsPlaying(false); // Update isPlaying on pause
        newUtterance.onresume = () => setIsPlaying(true);  // Update isPlaying on resume

        return newUtterance;
    };


    const speakMessage = (utterance: SpeechSynthesisUtterance) => {
        speechSynthesis.speak(utterance);
    };

    const pauseResumeSpeech = () => {
        if (utterance) {
            if (isPlaying) {
                speechSynthesis.pause();
                setIsPlaying(false);
            } else {
                speechSynthesis.resume();
                setIsPlaying(true);
            }
        }
    };

    const isArabic = (text: string): boolean => {
        // Basic check: look for Arabic characters
        return /[\u0600-\u06FF]/.test(text);
    };

    const getVoice = (lang: string): SpeechSynthesisVoice | null => {
        const voices = speechSynthesis.getVoices();
        const maleVoices = voices.filter(voice => voice.lang === lang && voice.name.toLowerCase().includes('male'));

        // Prefer a male voice, if available
        if (maleVoices.length > 0) {
            return maleVoices[0]; // Use the first male voice found
        }

        // Fallback to the first voice for the language
        const languageVoices = voices.filter(voice => voice.lang === lang);
        if (languageVoices.length > 0) {
            return languageVoices[0];
        }


        console.warn(`No male voice found for language: ${lang}. Using default.`);
        return null; // Or return a default voice if you have one
    };


    return (
        <div className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isUser ? 'bg-blue-500' : 'bg-gray-600'
            }`}>
                {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
            </div>
            <div className={`flex-1 max-w-[80%] rounded-2xl p-4 ${
                isUser ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-100'
            }`}>
                <div className="text-sm overflow-x-auto"> {/* Make content scrollable */}
                    {message.content}
                </div>
                <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                </span>
                {!isUser && (
                    <button onClick={pauseResumeSpeech} className="mt-2 text-gray-300 hover:text-white">
                        {isPlaying ? <Pause className="w-4 h-4 inline-block mr-1" /> : <Play className="w-4 h-4 inline-block mr-1" />}
                        {isPlaying ? 'Pause' : 'Resume'}
                    </button>
                )}
            </div>
        </div>
    );
};
