import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Send, Loader2, BookOpen, AlertCircle, Paperclip, Book, Brain, Globe2, Clock, Mic } from 'lucide-react';
import { ChatMessage } from './components/ChatMessage';
import { LanguageToggle } from './components/LanguageToggle';
import { FunctionSquare } from 'lucide-react';
import { Message, ChatState } from './types';
import { Sidebar } from './components/Sidebar';

function App() {
    const [chatState, setChatState] = useState<ChatState>({
        messages: [],
        isLoading: false,
        selectedLanguage: 'en'
    });
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRecording, setIsRecording] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatState.messages]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);


    useEffect(() => {
        let recognition: SpeechRecognition | null = null;

        // Check if the SpeechRecognition API is supported
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();

            recognition.continuous = true; // Keep listening
            recognition.interimResults = true; // Get interim results
            recognition.maxAlternatives = 1;
            recognition.lang = chatState.selectedLanguage;

            recognition.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        setInput(prevInput => prevInput + event.results[i][0].transcript);
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                // Optionally display interimTranscript (e.g., in a separate UI element)
            };

            recognition.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);

                let errorMessage = chatState.selectedLanguage === 'en'
                    ? "Speech recognition error. Please try again."
                    : "خطأ في التعرف على الصوت. يرجى المحاولة مرة أخرى.";

                if (event.error === 'no-speech') {
                    errorMessage = chatState.selectedLanguage === 'en'
                        ? "No speech was detected. Please try again."
                        : "لم يتم الكشف عن أي كلام. يرجى المحاولة مرة أخرى.";
                } else if (event.error === 'network') {
                    errorMessage = chatState.selectedLanguage === 'en'
                        ? "Network error. Please check your internet connection."
                        : "خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.";
                } else if (event.error === 'not-allowed') {
                    errorMessage = chatState.selectedLanguage === 'en'
                        ? "Microphone access denied. Please check your browser settings."
                        : "تم رفض الوصول إلى الميكروفون. يرجى التحقق من إعدادات المتصفح الخاص بك.";
                } else {
                    errorMessage = chatState.selectedLanguage === 'en'
                        ? `Speech recognition error: ${event.error}. Please try again.`
                        : `خطأ في التعرف على الصوت: ${event.error}. يرجى المحاولة مرة أخرى.`;
                }

                setError(errorMessage);
            };

            recognition.onstart = () => {
                setIsRecording(true);
            };

            recognition.onend = () => {
                setIsRecording(false);
            };

            try {
                recognition.start();
            } catch (error) {
                console.error("Error starting speech recognition:", error);
                setError(chatState.selectedLanguage === 'en'
                    ? "Error starting speech recognition."
                    : "خطأ في بدء التعرف على الصوت.");
                setIsRecording(false);
            }

        } else {
            console.warn("Speech Recognition API is not supported in this browser.");
            setError(chatState.selectedLanguage === 'en'
                ? "Speech recognition is not supported in your browser."
                : "التعرف على الصوت غير مدعوم في متصفحك.");
        }

        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, [chatState.selectedLanguage]); // Re-initialize on language change

    const mindbot_api_url = "https://mindbotai.netlify.app/v1/models/mindbot1-4/request";
    const mindbot_api_key = "AIzaSyDqW-hIok?c9Q-D11uklsnK6M-M";
    console.log("Connect Succefully to ",mindbot_api_url);

    const generatePrompt = (userInput: string, fileDataBase64?: string) => {
        let prompt = `You are Maktabty AI, developed by Yaseen Al-Amawy and powered by MindBot Ai. You specialize in:
    - Book analysis and summaries
    - Quranic studies and interpretation
    - Literary discussion and recommendations
    - Academic research assistance
    - Always Respond With the prefered languaeg  to the user in each request

    Please respond in ${chatState.selectedLanguage === 'en' ? 'English' : 'Arabic'}.\n\n`;

        if (fileDataBase64) {
            prompt += `Analyze the content of the attached PDF document and answer the user's query.  Prioritize information from the document.\nUser query: ${userInput}\n`;
        } else {
            prompt += `User query: ${userInput}`;
        }

        return prompt;
    };

    const generatePromptgemini = (userInput: string, fileDataBase64?: string) => {
        let prompt = `You are Maktabty AI, developed by Yaseen Al-Amawy and powered by MindBot Ai. You specialize in:
    - Book analysis and summaries
    - Quranic studies and interpretation
    - Literary discussion and recommendations
    - Academic research assistance
    - Always Respond With the prefered languaeg  to the user in each request

    Please respond in ${chatState.selectedLanguage === 'en' ? 'English' : 'Arabic'}.\n\n`;

        if (fileDataBase64) {
            prompt += `Analyze the content of the attached PDF document and answer the user's query.  Prioritize information from the document.\nUser query: ${userInput}\n`;
        } else {
            prompt += `User query: ${userInput}`;
        }

        return prompt;
    };

    const handleSend = async () => {
        if ((!input.trim() && !file) || chatState.isLoading) return;

        const userMessage: Message = {
            content: file ? `Attached file: ${file.name}\n${input}` : input,
            role: 'user',
            timestamp: new Date()
        };

        setChatState(prev => ({
            ...prev,
            messages: [...prev.messages, userMessage],
            isLoading: true
        }));
        setInput('');
        setFile(null); // Reset file after sending

        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            let result;
            if (file) {
                const fileDataBase64 = await readFileAsBase64(file);
                const prompt = generatePrompt(input, fileDataBase64);

                const generationConfig = {
                    maxOutputTokens: 2048,
                };

                const parts = [
                    { text: prompt },
                    {
                        inlineData: {
                            data: fileDataBase64,
                            mimeType: "application/pdf",
                        },
                    },
                ];

                result = await model.generateContent({
                    contents: [{ role: "user", parts }],
                    generationConfig
                });

            } else {
                const prompt = generatePrompt(input);
                result = await model.generateContent(prompt);
            }

            const response = await result.response;
            const text = response.text();

            const assistantMessage: Message = {
                content: text,
                role: 'assistant',
                timestamp: new Date()
            };

            setChatState(prev => ({
                ...prev,
                messages: [...prev.messages, assistantMessage],
                isLoading: false
            }));
        } catch (error) {
            const errorMessage = chatState.selectedLanguage === 'en'
                ? 'Sorry, I encountered an error. Please try again.'
                : 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.';

            setError(errorMessage);
            console.error('Error:', error);

            setChatState(prev => ({
                ...prev,
                isLoading: false
            }));
        }
    };

    const readFileAsBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result?.toString().split(',')[1] || '';  // Remove data:image/jpeg;base64, prefix
                resolve(base64String);
            };
            reader.onerror = (error) => {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];

        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setError(null);
        } else {
            setFile(null);
            setError(chatState.selectedLanguage === 'en' ? "Please select a valid PDF file." : "الرجاء تحديد ملف PDF صالح.");
            if (event.target.value) {
                event.target.value = '';
            }
        }
    };

    const handleAttachmentClick = () => {
        fileInputRef.current?.click();
    };

    const handleNewChat = () => {
        setChatState(prev => ({ ...prev, messages: [] }));
        setInput(''); // Clear the input field as well
        setFile(null);  //Clear file
    };

    const handleClearChat = () => {
        setChatState(prev => ({ ...prev, messages: [] }));
        setInput(''); // Clear the input field
        setFile(null);  //Clear file
    };

   const toggleRecording = () => {
        if (isRecording) {
            // Stop the browser's speech recognition
            window.speechSynthesis.cancel(); // Stops any speech synthesis
            setIsRecording(false);

        } else {

            if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const recognition = new SpeechRecognition();

                recognition.continuous = true; // Keep listening
                recognition.interimResults = true; // Get interim results
                recognition.maxAlternatives = 1;
                recognition.lang = chatState.selectedLanguage;

                recognition.onresult = (event) => {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            setInput(prevInput => prevInput + event.results[i][0].transcript);
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                };

                recognition.onerror = (event) => {
                    console.error("Speech Recognition Error:", event.error);

                    let errorMessage = chatState.selectedLanguage === 'en'
                        ? "Speech recognition error. Please try again."
                        : "خطأ في التعرف على الصوت. يرجى المحاولة مرة أخرى.";

                    if (event.error === 'no-speech') {
                        errorMessage = chatState.selectedLanguage === 'en'
                            ? "No speech was detected. Please try again."
                            : "لم يتم الكشف عن أي كلام. يرجى المحاولة مرة أخرى.";
                    } else if (event.error === 'network') {
                        errorMessage = chatState.selectedLanguage === 'en'
                            ? "Network error. Please check your internet connection."
                            : "خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت.";
                    } else if (event.error === 'not-allowed') {
                        errorMessage = chatState.selectedLanguage === 'en'
                            ? "Microphone access denied. Please check your browser settings."
                            : "تم رفض الوصول إلى الميكروفون. يرجى التحقق من إعدادات المتصفح الخاص بك.";
                    } else {
                        errorMessage = chatState.selectedLanguage === 'en'
                            ? `Speech recognition error: ${event.error}. Please try again.`
                            : `خطأ في التعرف على الصوت: ${event.error}. يرجى المحاولة مرة أخرى.`;
                    }

                    setError(errorMessage);
                };

                recognition.onstart = () => {
                    setIsRecording(true);
                };

                recognition.onend = () => {
                    setIsRecording(false);
                };

                try {
                    recognition.start();
                } catch (error) {
                    console.error("Error starting speech recognition:", error);
                    setError(chatState.selectedLanguage === 'en'
                        ? "Error starting speech recognition."
                        : "خطأ في بدء التعرف على الصوت.");
                    setIsRecording(false);
                }

            }
        }
    };
    return (
        <div className="h-screen bg-gray-950 text-gray-100 font-sans flex flex-col"> {/* Updated dark background */}
            <div className="container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:space-x-6 flex-grow">
                {/* Sidebar */}
                <aside className="lg:w-64 flex-shrink-0 mb-6 lg:mb-0 hidden md:block">
                    <Sidebar onNewChat={handleNewChat} onClearChat={handleClearChat} />
                </aside>

                {/* Main Content */}
                <main className="flex-1 h-full">
                    <div className="bg-zinc-900 rounded-xl shadow-md flex flex-col overflow-hidden h-full">

                        {/* Header */}
                        <div className="bg-teal-800 p-6 flex items-center justify-between rounded-t-xl shadow-sm">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-8 h-8 text-white" />
                                <div>
                                    <h1 className="text-white text-2xl font-bold">Maktabty AI</h1>
                                    <p className="text-teal-200 text-sm">Developed by Yaseen Al-Amawy | MindBot Ai</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <LanguageToggle
                                    language={chatState.selectedLanguage}
                                    onToggle={(lang) => setChatState(prev => ({ ...prev, selectedLanguage: lang }))}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-900 border-l-4 border-red-300 p-4 flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-300" />
                                <p className="text-red-300">{error}</p>
                            </div>
                        )}

                        {/* Features Bar */}
                        <div className="bg-zinc-800 p-3 border-b border-gray-700 flex gap-4 overflow-x-auto">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors">
                                <Book className="w-5 h-5 text-teal-300" />
                                <span className="text-sm text-teal-300">Book Analysis</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors">
                                <Brain className="w-5 h-5 text-teal-300" />
                                <span className="text-sm text-teal-300">Literature Studies</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors">
                                <Globe2 className="w-5 h-5 text-teal-300" />
                                <span className="text-sm text-teal-300">History Studies</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors">
                                <Clock className="w-5 h-5 text-teal-300" />
                                <span className="text-sm text-teal-300">Science Studies</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors">
                                <FunctionSquare className="w-5 h-5 text-teal-300" />
                                <span className="text-sm text-teal-300">Math Studies</span>
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 p-6 space-y-4 overflow-y-auto"> {/* Scrollable messages section */}
                            {chatState.messages.map((message, index) => (
                                <ChatMessage key={index} message={message} />
                            ))}
                            {chatState.isLoading && (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                                    <span className="ml-2 text-gray-400">Loading...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-gray-700 p-4 bg-zinc-800">
                            <div className="flex gap-3 items-center">
                                {file ? (
                                    <div className="flex items-center gap-2">
                                        <Paperclip className="w-5 h-5 text-gray-400" />
                                        <span>{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            className="text-sm text-red-400 hover:text-red-200"
                                        >
                                            {chatState.selectedLanguage === 'en' ? 'Remove' : 'إزالة'}
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder={chatState.selectedLanguage === 'en' ?
                                            "Ask about books, Quran, or literature..." :
                                            "اسأل عن الكتب والقرآن أو الأدب..."}
                                        className="flex-1 rounded-xl border border-gray-700 bg-zinc-800 text-gray-200 px-4 py-3 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-sm"
                                        dir={chatState.selectedLanguage === 'ar' ? 'rtl' : 'ltr'}
                                    />
                                )}

                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    ref={fileInputRef}
                                />
                                <button
                                    type="button"
                                    onClick={handleAttachmentClick}
                                    className="p-3 rounded-xl hover:bg-zinc-700 transition-colors"
                                    title={chatState.selectedLanguage === 'en' ? 'Attach PDF' : 'إرفاق ملف PDF'}
                                >
                                    <Paperclip className="w-6 h-6 text-gray-400" />
                                </button>
                                 <button
                                    type="button"
                                    onClick={toggleRecording}
                                    className={`p-3 rounded-xl hover:bg-zinc-700 transition-colors`}
                                    title={chatState.selectedLanguage === 'en' ? 'Speech Recognition' : 'التعرف على الصوت'}
                                >
                                    <Mic className={`w-6 h-6 ${isRecording ? 'text-teal-500 animate-pulse' : 'text-gray-400'}`} />
                                </button>
                                <button
                                    onClick={handleSend}
                                    disabled={chatState.isLoading || (!(input.trim() || file))}
                                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    <Send className="w-5 h-5" />
                                    <span>{chatState.selectedLanguage === 'en' ? 'Send' : 'إرسال'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default App;
