// src/app/page.tsx

'use client'; 

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; 
import { useAuth } from '@/components/AuthContext';
import AiPlanModal from '@/components/AiPlanModal';
import { marked } from 'marked';
import { 
    BrainCircuit, BookOpenText, Target, BarChart, X, Menu, ChevronDown, 
    Home, LayoutGrid, Trophy, LogIn, Settings, LogOut, LayoutDashboard, 
    User as UserIcon, Lock, AtSign, CheckCircle2, AlertTriangle, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Reusable AnimatedSection Component ---
const AnimatedSection = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { setIsVisible(true); observer.disconnect(); } }, { threshold: 0.1 });
        const currentRef = ref.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);
    return <div ref={ref} className={`${className} transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>{children}</div>;
};

// --- Integrated AdvancedAuth Component ---
const GoogleIcon = () => (<svg className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.131,44,30.023,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>);
const AdvancedAuth = ({ initialMode = 'login' }: { initialMode: 'login' | 'signup' }) => {
    const [authMode, setAuthMode] = useState(initialMode);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => { setAuthMode(initialMode); setMessage(null); }, [initialMode]);
    
    const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setMessage(null); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) { setMessage({ text: error.message, type: 'error' }); setLoading(false); } else { setMessage({ text: 'Login successful! Redirecting...', type: 'success' }); setTimeout(() => { window.location.href = '/home'; }, 1500); } };
    const handleSignup = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); setMessage(null); const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }); if (error) { setMessage({ text: error.message, type: 'error' }); } else { setMessage({ text: 'Signup successful! Please check your email.', type: 'success' }); } setLoading(false); };
    const handleGoogleLogin = async () => { setLoading(true); setMessage(null); await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/home` } }); };

    const formVariants = { hidden: { opacity: 0, x: 25 }, visible: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -25 } };
    const inputIconClasses = "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500";

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-slate-800/50 rounded-2xl shadow-2xl border border-slate-700/60 backdrop-blur-sm">
            <div><h1 className="text-3xl font-bold text-center text-white">{authMode === 'login' ? 'Welcome Back!' : 'Create an Account'}</h1><p className="text-center text-gray-400 mt-2">{authMode === 'login' ? 'Log in to continue your journey.' : 'Join the community of learners.'}</p></div>
            <div className="flex bg-slate-900/50 p-1 rounded-full border border-slate-700"><button onClick={() => setAuthMode('login')} className={`w-1/2 py-2.5 rounded-full text-sm font-semibold transition-colors ${authMode === 'login' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-slate-700/50'}`}>Login</button><button onClick={() => setAuthMode('signup')} className={`w-1/2 py-2.5 rounded-full text-sm font-semibold transition-colors ${authMode === 'signup' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-slate-700/50'}`}>Sign Up</button></div>
            <AnimatePresence mode="wait">
                <motion.form key={authMode} variants={formVariants} initial="hidden" animate="visible" exit="exit" transition={{ duration: 0.3 }} onSubmit={authMode === 'login' ? handleLogin : handleSignup} className="space-y-4">
                    {authMode === 'signup' && (<div className="relative"><UserIcon className={inputIconClasses} /><input id="fullName-signup" type="text" placeholder="Full Name" value={fullName} required onChange={(e) => setFullName(e.target.value)} className="w-full pl-10 pr-3 py-2 text-white bg-slate-700/50 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>)}
                    <div className="relative"><AtSign className={inputIconClasses} /><input id="email" type="email" placeholder="you@example.com" value={email} required onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-3 py-2 text-white bg-slate-700/50 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
                    <div className="relative"><Lock className={inputIconClasses} /><input id="password" type="password" placeholder="••••••••" value={password} required onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-3 py-2 text-white bg-slate-700/50 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" /></div>
                    <button type="submit" className="w-full px-4 py-3 font-bold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-slate-600 shadow-lg" disabled={loading}>{loading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Create Account')}</button>
                </motion.form>
            </AnimatePresence>
            <div className="relative flex py-3 items-center"><div className="flex-grow border-t border-slate-600"></div><span className="flex-shrink mx-4 text-gray-400 text-xs uppercase">Or</span><div className="flex-grow border-t border-slate-600"></div></div>
            <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 font-semibold text-white bg-slate-700/50 rounded-md border border-slate-600 hover:bg-slate-700 transition-colors disabled:opacity-50"><GoogleIcon />Sign in with Google</button>
            {message && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 flex items-center justify-center gap-2 text-center text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{message.text}</motion.p>}
        </div>
    );
};

// --- Navbar Component ---
const Navbar = ({ onLoginClick, onRegisterClick }: { onLoginClick: () => void, onRegisterClick: () => void }) => {
    const { session } = useAuth();
    const isAuthenticated = !!session;
    return (
        <header className="bg-slate-900/60 backdrop-blur-lg fixed top-0 left-0 right-0 z-50 border-b border-slate-700/60">
            <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <Link href={isAuthenticated ? "/home" : "/"} className="flex items-center gap-2 text-xl font-extrabold text-white hover:text-cyan-400 transition-colors"><BrainCircuit size={28} className="text-cyan-400" />Khojney</Link>
                    <nav className="hidden md:flex items-center space-x-6">
                        <a href="#features" className="px-3 py-2 rounded-lg font-medium transition-colors text-gray-300 hover:bg-slate-800 hover:text-white">Features</a>
                        <a href="#ai-planner" className="px-3 py-2 rounded-lg font-medium transition-colors text-gray-300 hover:bg-slate-800 hover:text-white">✨ AI Planner</a>
                        <a href="#faq" className="px-3 py-2 rounded-lg font-medium transition-colors text-gray-300 hover:bg-slate-800 hover:text-white">FAQ</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? ( 
                            <Link href="/home" className="hidden md:flex items-center gap-2 bg-cyan-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-cyan-500">Go to App <ArrowRight size={18}/></Link>
                        ) : (
                            <div className="hidden md:flex items-center space-x-4">
                                <button onClick={onLoginClick} className="text-gray-300 hover:text-white font-medium transition-colors">Login</button>
                                <button onClick={onRegisterClick} className="bg-cyan-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-cyan-500 transition-all duration-300">Register</button>
                            </div>
                        )}
                        <div className="md:hidden"><button className="p-2 text-gray-300"><Menu size={24} /></button></div>
                    </div>
                </div>
            </div>
        </header>
    );
};

// --- Page Sections ---
const HeroSection = ({ onRegisterClick }: { onRegisterClick: () => void }) => ( <section className="dark-gradient-bg pt-32 pb-20"><AnimatedSection className="container mx-auto px-6 text-center"><div className="max-w-3xl mx-auto"><h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">Unlock Your Potential.<span className="text-cyan-400"> Ace Your Exams in Nepal.</span></h1><p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">The most comprehensive quiz platform for Loksewa, CMAT, and entrance exams. Study smarter, track your progress, and achieve your goals.</p><div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4"><button onClick={onRegisterClick} className="w-full sm:w-auto bg-cyan-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-cyan-500 transition-all duration-300 shadow-lg">Get Started for Free</button><a href="#ai-planner" className="w-full sm:w-auto bg-slate-800/50 text-gray-200 px-8 py-3 rounded-lg font-bold text-lg hover:bg-slate-700/50 transition-all duration-300 border border-slate-700">✨ Try AI Planner</a></div></div></AnimatedSection></section> );
const FeaturesSection = () => { const features = [{ icon: <BookOpenText />, title: "Extensive Question Bank", description: "Access thousands of high-quality questions for Loksewa, CMAT, and more." },{ icon: <BrainCircuit />, title: "Nepali Language Focus", description: "Practice with verified content in both Nepali and English languages." },{ icon: <Target />, title: "Syllabus Aligned", description: "Study smarter with questions meticulously categorized by official exam syllabi." },{ icon: <BarChart />, title: "Track Your Progress", description: "Identify your strengths and weaknesses with our detailed analytics." }]; return (<section id="features" className="py-20 bg-slate-900"><div className="container mx-auto px-6"><AnimatedSection className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-bold text-white">A Smarter Way to Prepare</h2><p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">Everything you need to succeed in one powerful platform.</p></AnimatedSection><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">{features.map((feature, i) => (<AnimatedSection key={feature.title} className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/60 shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-500/50 hover:-translate-y-2 transition-all duration-300" style={{ transitionDelay: `${i * 100}ms` }}><div className="text-cyan-400 mb-4">{React.cloneElement(feature.icon, { size: 32 })}</div><h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3><p className="text-gray-400">{feature.description}</p></AnimatedSection>))}</div></div></section>); };
const AiPlannerSection = ({ onPlanGenerated }: { onPlanGenerated: (plan: string) => void }) => { const [exam, setExam] = useState('Loksewa (Officer)'); const [weeks, setWeeks] = useState(8); const [hours, setHours] = useState(10); const [isLoading, setIsLoading] = useState(false); const generatePlan = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (!weeks || !hours) { alert('Please fill in both weeks and hours.'); return; } setIsLoading(true); const prompt = `You are an expert academic advisor for students in Nepal preparing for competitive exams. A student is preparing for the "${exam}" exam. They have ${weeks} weeks to prepare and can study for ${hours} hours per week. Create a concise, actionable, and encouraging weekly study plan for them. The plan should be broken down by week. For each week, suggest key topics to cover (be specific to the exam they selected), a study strategy (e.g., focus on practice questions, review concepts), and a motivational tip. The output must be in simple Markdown format. Use headings for each week (e.g., ### Week 1: ...). Do not include any introductory or concluding sentences outside of the plan itself. Separate each week's plan with a horizontal rule (---).`; try { const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] }; const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY; if (!apiKey) throw new Error("API Key not found."); const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`; const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) { const errorBody = await response.json(); throw new Error(`API error: ${response.statusText} - ${errorBody.error?.message || 'Unknown error'}`); } const result = await response.json(); if (result.candidates?.[0]?.content?.parts?.[0]?.text) { onPlanGenerated(result.candidates[0].content.parts[0].text); } else { throw new Error('No content received from API.'); } } catch (error: any) { console.error("Error calling Gemini API:", error); onPlanGenerated(`<p class="text-red-400">An error occurred: ${error.message}</p>`); } finally { setIsLoading(false); } }; return (<section id="ai-planner" className="py-20 dark-gradient-bg"><AnimatedSection className="container mx-auto px-6"><div className="bg-slate-800/50 rounded-2xl shadow-2xl border border-slate-700/60 backdrop-blur-sm p-8 md:p-12 lg:flex items-center gap-12"><div className="lg:w-1/2"><h2 className="text-3xl md:text-4xl font-bold text-white"><span className="text-cyan-400">Free Personal Study Plan</span>, Generated by AI</h2><p className="mt-4 text-lg text-gray-400">Stop guessing, start planning. Tell our AI your exam goal and get a custom, week-by-week study schedule in seconds.</p></div><div className="lg:w-1/2 mt-8 lg:mt-0"><form onSubmit={generatePlan} className="space-y-4"><div><label htmlFor="exam" className="block text-sm font-medium text-gray-400 mb-1">Exam</label><select id="exam" value={exam} onChange={(e) => setExam(e.target.value)} className="w-full pl-3 pr-10 py-2.5 text-white bg-slate-700/50 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"><option>Loksewa (Officer)</option><option>Loksewa (Kharidar/Subba)</option><option>CMAT</option><option>Medical Entrance (MBBS/BDS)</option><option>Engineering Entrance (IOE)</option></select></div><div className="grid grid-cols-2 gap-4"><div><label htmlFor="weeks" className="block text-sm font-medium text-gray-400 mb-1">Weeks to Exam</label><input type="number" id="weeks" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} min="1" max="52" className="w-full pl-3 pr-2 py-2.5 text-white bg-slate-700/50 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="e.g., 8" /></div><div><label htmlFor="hours" className="block text-sm font-medium text-gray-400 mb-1">Hours/Week</label><input type="number" id="hours" value={hours} onChange={(e) => setHours(Number(e.target.value))} min="1" max="100" className="w-full pl-3 pr-2 py-2.5 text-white bg-slate-700/50 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="e.g., 10" /></div></div><div><button type="submit" disabled={isLoading} className="w-full flex justify-center items-center bg-cyan-600 text-white px-4 py-3 rounded-md font-bold hover:bg-cyan-500 disabled:bg-slate-600 transition-colors shadow-lg shadow-cyan-600/20">{isLoading ? (<span className="flex items-center"><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating...</span>) : ("Generate My Plan ✨")}</button></div></form></div></div></AnimatedSection></section>); };
const FaqItem = ({ question, answer, isOpen, onClick }: { question: string, answer: string, isOpen: boolean, onClick: () => void }) => (<div className="border-b border-slate-700 py-6"><button onClick={onClick} className="w-full flex justify-between items-center text-left text-lg font-semibold text-gray-200"><span>{question}</span><ChevronDown className={`w-5 h-5 text-cyan-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} /></button>{isOpen && (<div className="mt-4 text-gray-400"><p>{answer}</p></div>)}</div>);
const FaqSection = () => { const [openFaq, setOpenFaq] = useState<number | null>(1); const faqs = [{ q: 'Is Khojney free to use?', a: 'Yes! Khojney operates on a freemium model. You can access a large number of quizzes and features for free. For unlimited access and advanced features, we offer affordable premium plans tailored for Nepali students.' }, { q: 'Is the content available in the Nepali language?', a: 'Absolutely. A core part of our mission is to provide high-quality, OCR-verified content in both Nepali and English, which is often hard to find on other digital platforms.' }, { q: 'How are the questions sourced and verified?', a: 'Our questions are sourced from reputable textbooks, past papers, and official syllabi. We use an OCR process and have a team that manually verifies the questions and answers to ensure accuracy and relevance.'}]; return (<section id="faq" className="py-20 bg-slate-900"><div className="container mx-auto px-6"><AnimatedSection className="text-center mb-12"><h2 className="text-3xl md:text-4xl font-bold text-white">Frequently Asked Questions</h2></AnimatedSection><AnimatedSection className="max-w-3xl mx-auto">{faqs.map((faq, index) => (<FaqItem key={index} question={faq.q} answer={faq.a} isOpen={openFaq === index + 1} onClick={() => setOpenFaq(openFaq === index + 1 ? null : index + 1)} />))}</AnimatedSection></div></section>); };
const CtaSection = ({ onRegisterClick }: { onRegisterClick: () => void }) => ( <section className="dark-gradient-bg py-20"><AnimatedSection className="container mx-auto px-6 text-center"><h2 className="text-3xl md:text-4xl font-bold text-white">Ready to Start Your Success Story?</h2><p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">Join thousands of students across Nepal and take the first step towards achieving your dream career.</p><div className="mt-8"><button onClick={onRegisterClick} className="bg-cyan-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-cyan-500 transition-all duration-300 shadow-lg">Register Now for Free</button></div></AnimatedSection></section> );
const Footer = () => ( <footer className="bg-slate-900 border-t border-slate-800"><div className="container mx-auto px-6 py-8 text-center text-gray-500"><p>&copy; {new Date().getFullYear()} Khojney.com - All Rights Reserved.</p></div></footer> );

// --- Main App Component ---
export default function HomePage() {
    const [isAuthModalOpen, setAuthModalOpen] = useState(false);
    const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
    const [planResult, setPlanResult] = useState('');
    const [showAiModal, setShowAiModal] = useState(false);

    const handleOpenAuthModal = (mode: 'login' | 'signup') => {
        setAuthInitialMode(mode);
        setAuthModalOpen(true);
    };

    const handlePlanGenerated = (markdown: string) => {
        setPlanResult(markdown);
        setShowAiModal(true);
    };

    return (
        <div className="bg-slate-900">
            <Navbar onLoginClick={() => handleOpenAuthModal('login')} onRegisterClick={() => handleOpenAuthModal('signup')} />
            <main>
                <HeroSection onRegisterClick={() => handleOpenAuthModal('signup')} />
                <FeaturesSection />
                <AiPlannerSection onPlanGenerated={handlePlanGenerated} />
                <FaqSection />
                <CtaSection onRegisterClick={() => handleOpenAuthModal('signup')} />
            </main>
            <Footer />
            <AnimatePresence>
                {isAuthModalOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setAuthModalOpen(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -20 }} transition={{ duration: 0.2 }} onClick={(e) => e.stopPropagation()}>
                            <AdvancedAuth initialMode={authInitialMode} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
              {showAiModal && (
                  <AiPlanModal
                    markdownContent={planResult}
                    onClose={() => setShowAiModal(false)}
                    onRegisterClick={() => {
                        setShowAiModal(false);
                        handleOpenAuthModal('signup');
                    }}
                  />
              )}
            </AnimatePresence>
        </div>
    );
}