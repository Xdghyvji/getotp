import React, { useState, useEffect, useRef, createContext, useContext } from 'react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    onAuthStateChanged,
    signOut,
    updateProfile,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection,
    addDoc,
    onSnapshot,
    query,
    updateDoc,
    serverTimestamp,
    where,
    orderBy,
    limit,
    runTransaction
} from 'firebase/firestore';


// --- FIREBASE CONFIGURATION ---
// IMPORTANT: In a real project, these should be stored in environment variables (.env file)
const firebaseConfig = {
  apiKey: "AIzaSyBVruE0hRVZisHlnnyuWBl-PZp3-DMp028",
  authDomain: "pakages-provider.firebaseapp.com",
  projectId: "pakages-provider",
  storageBucket: "pakages-provider.appspot.com",
  messagingSenderId: "109547136506",
  appId: "1:109547136506:web:c9d34657d73b0fcc3ef043",
  measurementId: "G-672LC3842S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- CURRENCY CONTEXT ---
const CurrencyContext = createContext();

const conversionRates = {
    USD: { rate: 1, symbol: '$' },
    PKR: { rate: 278, symbol: 'Rs' },
    INR: { rate: 83, symbol: '₹' },
};

const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState('USD');

    const convertCurrency = (amountInUsd) => {
        if (typeof amountInUsd !== 'number') return '0.00';
        const { rate } = conversionRates[currency];
        return (amountInUsd * rate).toFixed(2);
    };

    const currencySymbol = conversionRates[currency].symbol;

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, convertCurrency, currencySymbol }}>
            {children}
        </CurrencyContext.Provider>
    );
};

const useCurrency = () => useContext(CurrencyContext);


// --- ICONS (using inline SVGs for simplicity) ---
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const StarIcon = ({ isFavorite }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={isFavorite ? "#FFC107" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const GoogleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const FacebookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path></svg>;
const TwitterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-sky-500"><path d="M22.46 6c-.77.35-1.6.58-2.46.67.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98-3.56-.18-6.73-1.89-8.84-4.48-.37.63-.58 1.37-.58 2.15 0 1.49.76 2.81 1.91 3.58-.71 0-1.37-.22-1.95-.55v.05c0 2.08 1.48 3.82 3.44 4.21-.36.1-.74.15-1.14.15-.28 0-.55-.03-.81-.08.55 1.7 2.14 2.94 4.03 2.97-1.47 1.15-3.32 1.83-5.33 1.83-.35 0-.69-.02-1.03-.06 1.9 1.22 4.16 1.93 6.56 1.93 7.88 0 12.2-6.54 12.2-12.2 0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"></path></svg>;
const TelegramIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.69 6.6-2.51 11.3c-.15.68-.58.85-1.12.53l-3.6-2.65-1.74 1.67c-.2.2-.36.36-.72.36s-.52-.16-.72-.36L5.6 13.5c-.65-.41-.65-1.04.1-1.34l10.4-4.04c.54-.21 1.02.12.84.88z"></path></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>;
const ClipboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;


// --- Theme Hook ---
const useTheme = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return [theme, setTheme];
};

// --- Reusable UI Components ---
const Card = ({ children, className = '' }) => <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md ${className}`}>{children}</div>;
const Button = ({ children, onClick, className = '', variant = 'primary', ...props }) => {
    const base = 'px-4 py-2 font-semibold rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400',
    };
    return <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};
const Spinner = () => <div className="flex justify-center items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
const ThemeToggle = ({ theme, setTheme }) => {
    const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
    return (
        <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
    );
};
// A simple toast notification component
const Toast = ({ message, type, onDismiss }) => {
    const baseStyle = "fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white transition-opacity duration-300 z-50";
    const typeStyles = {
        success: "bg-green-500",
        error: "bg-red-500",
        info: "bg-blue-500",
    };

    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className={`${baseStyle} ${typeStyles[type]}`}>
            {message}
            <button onClick={onDismiss} className="ml-4 font-bold">X</button>
        </div>
    );
};


// --- Main Page Components ---

const Header = ({ user, profile, setPage, theme, setTheme }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileMenuRef = useRef(null);
    const { convertCurrency, currencySymbol } = useCurrency();

    const handleLogout = () => signOut(auth).catch(error => console.error("Sign out error", error));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) setIsProfileOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 text-2xl font-bold text-blue-600 cursor-pointer" onClick={() => setPage('home')}>
                        GetOTP.net
                    </div>
                    <nav className="hidden md:flex items-center space-x-8">
                        {['FAQ', 'API', 'How to buy?', 'Blog'].map(item => 
                            <a key={item} href="#" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">{item}</a>
                        )}
                    </nav>
                    <div className="flex items-center space-x-4">
                        <ThemeToggle theme={theme} setTheme={setTheme} />
                        {user ? (
                            <>
                                <div className="bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 font-bold p-2 rounded-lg text-sm">
                                    {currencySymbol}{convertCurrency(profile?.balance || 0)}
                                </div>
                                <Button onClick={() => setPage('recharge')} variant="primary">Recharge</Button>
                                <div className="relative" ref={profileMenuRef}>
                                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center">
                                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} alt="Profile" className="w-9 h-9 rounded-full" />
                                    </button>
                                    {isProfileOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg py-1 z-20">
                                            <div className="px-4 py-3 border-b dark:border-gray-600">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.displayName}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                            </div>
                                            <a href="#" onClick={(e) => { e.preventDefault(); setPage('history'); setIsProfileOpen(false); }} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"><ClockIcon /> <span className="ml-3">Order History</span></a>
                                            <a href="#" onClick={(e) => { e.preventDefault(); setPage('profile'); setIsProfileOpen(false); }} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"><SettingsIcon /> <span className="ml-3">Profile Settings</span></a>
                                            <div className="border-t border-gray-100 dark:border-gray-600"></div>
                                            <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); setIsProfileOpen(false); }} className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-600">Logout</a>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="space-x-2">
                                <Button onClick={() => setPage('login')} variant="secondary">Login</Button>
                                <Button onClick={() => setPage('login')}>Registration</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

const Footer = ({ setPage }) => (
    <footer className="bg-white dark:bg-gray-800 mt-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
                 <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Need help?</h3>
                    <Button onClick={() => {}} variant="secondary" className="w-full justify-center">Support</Button>
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Useful links</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('developers')}} className="hover:text-blue-600 dark:hover:text-blue-400">For developers</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">For users</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('cookies')}} className="hover:text-blue-600 dark:hover:text-blue-400">Cookies</a></li>
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('delivery')}} className="hover:text-blue-600 dark:hover:text-blue-400">Delivery policy</a></li>
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('terms')}} className="hover:text-blue-600 dark:hover:text-blue-400">Terms and conditions</a></li>
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('privacy')}} className="hover:text-blue-600 dark:hover:text-blue-400">Privacy policy</a></li>
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('refund')}} className="hover:text-blue-600 dark:hover:text-blue-400">Refund policy</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">GetOTP.net</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('about')}} className="hover:text-blue-600 dark:hover:text-blue-400">About the service</a></li>
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('contacts')}} className="hover:text-blue-600 dark:hover:text-blue-400">Contacts</a></li>
                        <li><a href="#" onClick={(e) => {e.preventDefault(); setPage('rules')}} className="hover:text-blue-600 dark:hover:text-blue-400">Rules</a></li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">Social networks</h3>
                    <div className="flex space-x-4">
                        <a href="#" className="hover:opacity-80"><FacebookIcon /></a>
                        <a href="#" className="hover:opacity-80"><TwitterIcon /></a>
                        <a href="#" className="hover:opacity-80"><TelegramIcon /></a>
                    </div>
                </div>
            </div>
            <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
                GetOTP.net © 2016-{new Date().getFullYear()}
            </div>
        </div>
    </footer>
);

const Sidebar = ({ user, setPage, onPurchase, showToast }) => {
    const [services, setServices] = useState([]);
    const [servers, setServers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { convertCurrency, currencySymbol } = useCurrency();
    const [selectedService, setSelectedService] = useState(null);
    const [selectedServer, setSelectedServer] = useState(null);
    const [showAllServices, setShowAllServices] = useState(false);
    const [showAllServers, setShowAllServers] = useState(false);

    useEffect(() => {
        // Mock data for available countries per service.
        // In a real app, this should come from your Firestore database.
        const servicesWithRegions = (service) => {
            const serviceName = service.name.toLowerCase();
            if (serviceName.includes('facebook') || serviceName.includes('google')) {
                return { ...service, available_countries: ['USA', 'Canada', 'UK'] };
            }
            if (serviceName.includes('telegram')) {
                return { ...service, available_countries: ['Germany', 'Russia'] };
            }
            // Default: all countries available
            return { ...service, available_countries: servers.map(s => s.name) };
        };

        const unsubServices = onSnapshot(collection(db, "services"), (snapshot) => {
            const servicesData = snapshot.docs.map(doc => servicesWithRegions({ id: doc.id, ...doc.data() }));
            setServices(servicesData);
        });
        
        const unsubServers = onSnapshot(collection(db, "servers"), (snapshot) => {
            const serverData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setServers(serverData);
        });

        setLoading(false);

        return () => { unsubServices(); unsubServers(); };
    }, []);

    const handleServiceSelect = (service) => {
        setSelectedService(service);
        setSelectedServer(null); // Reset server selection when service changes
        showToast(`Selected service: ${service.name}. Now select a country.`, 'info');
    };

    const handleServerSelect = (server) => {
        if (!selectedService) {
            showToast('Please select a service first.', 'error');
            return;
        }
        setSelectedServer(server);
        // Automatically trigger purchase when both are selected
        onPurchase(selectedService, server);
    };

    const displayedServices = showAllServices ? services : services.slice(0, 10);
    
    // Filter servers based on the selected service
    const availableServers = selectedService 
        ? servers.filter(server => selectedService.available_countries.includes(server.name))
        : servers;

    const displayedServers = showAllServers ? availableServers : availableServers.slice(0, 10);

    return (
        <aside className="w-full md:w-1/3 lg:w-1/4">
            <Card className="p-4 space-y-4">
                <div>
                    <h3 className="font-bold mb-2 text-gray-800 dark:text-gray-200">1. Select service</h3>
                    <div className="relative">
                        <input type="text" placeholder="Enter service name" className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-md bg-transparent" />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="mt-2 h-64 overflow-y-auto">
                        {loading ? <Spinner /> : displayedServices.map(service => (
                            <div key={service.id} onClick={() => handleServiceSelect(service)} 
                                 className={`flex items-center justify-between p-2 rounded-md cursor-pointer ${selectedService?.id === service.id ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-blue-50 dark:hover:bg-gray-700'}`}>
                                <div className="flex items-center space-x-3">
                                    <img src={`https://logo.clearbit.com/${service.name.toLowerCase().replace(/\s+/g, '')}.com`} onError={(e) => { e.target.onerror = null; e.target.src=`https://ui-avatars.com/api/?name=${service.name.charAt(0)}&background=random`}} alt={service.name} className="w-8 h-8 rounded-full" />
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{service.name}</span>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="text-gray-500 dark:text-gray-400">{service.qty || 0} pcs.</p>
                                    <p className="font-bold text-blue-600">{currencySymbol}{convertCurrency(service.price)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {!showAllServices && services.length > 10 && (
                        <button onClick={() => setShowAllServices(true)} className="text-blue-600 text-sm font-semibold mt-2">See More...</button>
                    )}
                </div>

                <div>
                    <h3 className="font-bold mb-2 text-gray-800 dark:text-gray-200">2. Select country</h3>
                    <div className="relative">
                        <input type="text" placeholder="Enter country name" className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-md bg-transparent" />
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="mt-2 h-48 overflow-y-auto">
                        {loading ? <Spinner /> : displayedServers.map(server => (
                            <div key={server.id} onClick={() => handleServerSelect(server)} 
                                 className={`flex items-center p-2 rounded-md cursor-pointer ${!selectedService ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50 dark:hover:bg-gray-700'}`}>
                                <span className="ml-3 font-medium text-gray-800 dark:text-gray-200">{server.name} ({server.location})</span>
                            </div>
                        ))}
                         {!selectedService && <div className="text-center text-sm text-gray-500 p-4">Please select a service to see available countries.</div>}
                    </div>
                     {!showAllServers && availableServers.length > 10 && (
                        <button onClick={() => setShowAllServers(true)} className="text-blue-600 text-sm font-semibold mt-2">See More...</button>
                    )}
                </div>
            </Card>
        </aside>
    );
};

const FeatureSection = ({ imgSrc, title, children }) => (
    <div className="flex items-start sm:items-center space-x-6">
        <img src={imgSrc} alt={title} className="w-16 h-16 flex-shrink-0" />
        <div>
            <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-gray-200">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{children}</p>
        </div>
    </div>
);

const LandingContent = ({ setPage }) => (
    <main className="w-full md:w-2/3 lg:w-3/4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Virtual Numbers for Receiving SMS</h1>
        <div className="space-y-8">
            <FeatureSection imgSrc="https://5sim.net/_next/static/media/first.9f71dbdf.png" title="Over 500,000 Numbers Originating from Around 180 Countries Online">
                Here you can find virtual numbers from more than 180 countries. You can find phone numbers originating from pretty much anywhere, including the UK, Sweden, Germany, France, India, Indonesia, Malaysia, Cambodia, Mongolia, Canada, Thailand, Netherlands, Spain, etc.
            </FeatureSection>
            <FeatureSection imgSrc="https://5sim.net/_next/static/media/second.176963f1.png" title="New Virtual Numbers Added Daily">
                Here, the pricing starts at one coin for a single number, and you will not have to pay for monthly SIM plans too.
            </FeatureSection>
            <FeatureSection imgSrc="https://5sim.net/_next/static/media/third.f4b6d3ce.png" title="Single-Use Numbers and Multiple SMS Deliveries">
                Get a phone number whenever you want. The process relies on automation heavily, so you should be able to receive an SMS instantly.
            </FeatureSection>
            <FeatureSection imgSrc="https://5sim.net/_next/static/media/fourth.71fe265c.png" title="API for Developers and Regular Users">
                Enable ensure uninterrupted operation via our SMS delivery service combined with quality proxy/VPN, in-browser user agent, and reliable software.
            </FeatureSection>
            <FeatureSection imgSrc="https://5sim.net/_next/static/media/fifth.c13daa5a.png" title="Low Commission Fees">
                Add funds to your balance while spending as little as you can on commission fees.
            </FeatureSection>
            <FeatureSection imgSrc="https://5sim.net/_next/static/media/sixth.fbc00ec6.png" title="Support Available 24/7">
                To find and purchase only the most fitting numbers, contact our support agents anytime.
            </FeatureSection>
        </div>

        <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">How to Receive an SMS using a Virtual Number</h2>
            <p className="mb-4 text-gray-600 dark:text-gray-400">Start off by <a href="#" onClick={(e) => {e.preventDefault(); setPage('login')}} className="text-blue-600 font-semibold hover:underline">Logging in</a> or <a href="#" onClick={(e) => {e.preventDefault(); setPage('login')}} className="text-blue-600 font-semibold hover:underline">Signing up</a></p>
            <div className="space-y-4">
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">1</div>
                    <p className="ml-4 font-medium text-gray-800 dark:text-gray-200">Choose country, service and get a virtual phone number</p>
                </div>
                 <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">2</div>
                    <p className="ml-4 font-medium text-gray-800 dark:text-gray-200">Use this virtual phone number to receive an SMS</p>
                </div>
                 <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl">3</div>
                    <p className="ml-4 font-medium text-gray-800 dark:text-gray-200">Use SMS for successful completion</p>
                </div>
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Purchase as many numbers as you need: We welcome both wholesale and retail customers.</p>
        </div>
    </main>
);

const HistoryTable = ({ title, headers, data, isLoading }) => (
    <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">{title}</h2>
        <div className="overflow-x-auto">
            {isLoading ? <Spinner /> : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>{headers.map(h => <th key={h} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>)}</tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {data.map((row, i) => (<tr key={i}>{Object.values(row).map((cell, j) => <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{cell}</td>)}</tr>))}
                    </tbody>
                </table>
            )}
            {!isLoading && data.length === 0 && <p className="text-center p-4 text-gray-500 dark:text-gray-400">No records found.</p>}
        </div>
    </Card>
);

const NumbersHistory = ({ user }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "orders"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders = snapshot.docs.map(doc => {
                const data = doc.data();
                const statusMap = {
                    'PENDING': 'bg-yellow-100 text-yellow-800',
                    'FINISHED': 'bg-green-100 text-green-800',
                    'CANCELED': 'bg-red-100 text-red-800',
                    'EXPIRED': 'bg-gray-100 text-gray-800',
                };
                return {
                    phone: data.phone, 
                    product: data.product, 
                    price: `$${data.price.toFixed(2)}`,
                    status: <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusMap[data.status] || statusMap['EXPIRED']}`}>{data.status}</span>,
                    date: data.createdAt?.toDate().toLocaleString() || 'N/A',
                };
            });
            setHistory(orders); setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    return <HistoryTable title="Numbers History" headers={["Phone", "Product", "Price", "Status", "Date"]} data={history} isLoading={loading} />;
};

const ProfileSettings = ({ user, profile, showToast }) => {
    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setDisplayName(profile?.displayName || '');
    }, [profile]);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (displayName === profile?.displayName) return;
        
        setLoading(true);
        try {
            await updateProfile(auth.currentUser, { displayName });
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { displayName });
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error("Error updating profile: ", error);
            showToast('Failed to update profile.', 'error');
        }
        setLoading(false);
    };

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">Profile Settings</h2>
            <div className="flex items-center space-x-6 mb-8">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}&background=random`} alt="Profile" className="w-24 h-24 rounded-full" />
                <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{profile?.displayName}</h3>
                    <p className="text-gray-500 dark:text-gray-400">{profile?.email}</p>
                </div>
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                <div>
                    <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                    <input type="text" id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-transparent" />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input type="email" id="email" value={profile?.email || ''} disabled className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 cursor-not-allowed"/>
                </div>
                <div className="pt-2">
                    <Button type="submit" disabled={loading || displayName === profile?.displayName}>
                        {loading ? <Spinner /> : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid, email: user.email, displayName: user.email.split('@')[0],
                    photoURL: '', balance: 0, rating: 96, createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) {
                await setDoc(userDocRef, {
                    uid: user.uid, email: user.email, displayName: user.displayName,
                    photoURL: user.photoURL, balance: 0, rating: 96, createdAt: serverTimestamp()
                });
            }
        } catch (err) {
            setError(err.message);
        }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <Card className="p-8">
                <div className="flex justify-center mb-6">
                    <button onClick={() => setIsLogin(true)} className={`px-4 py-2 font-semibold ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>Login</button>
                    <button onClick={() => setIsLogin(false)} className={`px-4 py-2 font-semibold ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 dark:text-gray-400'}`}>Register</button>
                </div>
                <form onSubmit={handleAuthAction} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent" />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>{loading ? <Spinner/> : (isLogin ? 'Login' : 'Register')}</Button>
                </form>
                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300 dark:border-gray-600" /></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span></div>
                    </div>
                    <Button onClick={handleGoogleLogin} variant="secondary" className="w-full mt-6 flex items-center justify-center space-x-2" disabled={loading}>
                        <GoogleIcon /><span>Sign in with Google</span>
                    </Button>
                </div>
            </Card>
        </div>
    );
};

const RechargePage = ({ user, showToast }) => {
    const [amount, setAmount] = useState(1); // Default amount in PKR
    const [loading, setLoading] = useState(false);

    const handlePayment = async () => {
        if (amount <= 0) {
            showToast("Please enter a valid amount.", "error");
            return;
        }
        setLoading(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/.netlify/functions/initiate-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ amount: amount })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to initiate payment.');
            }

            const { paymentUrl } = await response.json();
            window.location.href = paymentUrl;

        } catch (error) {
            console.error("Payment initiation failed:", error);
            showToast(error.message, "error");
            setLoading(false);
        }
    };

    return (
        <div className="w-full">
            <Card className="p-6">
                <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">Recharge Account</h1>
                <div className="flex justify-center">
                    <div className="border dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:shadow-lg transition-shadow max-w-sm">
                        <img src="https://workuppay.co/assets/images/logo_icon/logo.png" alt="WorkupPay" className="h-12 mb-4" />
                        <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">WorkupPay</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Securely add funds to your account.</p>
                        <div className="w-full mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (PKR)</label>
                            <input 
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent text-center font-bold text-lg"
                                placeholder="e.g., 500"
                            />
                        </div>
                        <Button onClick={handlePayment} disabled={loading} className="w-full">
                            {loading ? <Spinner /> : 'Proceed to Payment'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};


const ContentPage = ({ title }) => (
    <div className="w-full">
        <Card className="p-6">
            <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-200">{title}</h1>
            <p className="text-gray-600 dark:text-gray-400">Content for this page is coming soon.</p>
        </Card>
    </div>
);

const ActiveOrder = ({ order, onUpdateStatus }) => {
    const [timeLeft, setTimeLeft] = useState(1);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const expiryTime = order.expires?.toDate ? order.expires.toDate().getTime() : new Date(order.expires).getTime();
        const now = Date.now();
        const initialTimeLeft = Math.round((expiryTime - now) / 1000);
        setTimeLeft(initialTimeLeft > 0 ? initialTimeLeft : 0);

        const timer = setInterval(() => {
            setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [order.expires]);

    // Effect for automatic cancellation when timer runs out
    useEffect(() => {
        if (timeLeft <= 0 && order.status === 'PENDING') {
            onUpdateStatus(order.id, 'EXPIRED');
        }
    }, [timeLeft, order.id, order.status, onUpdateStatus]);


    const formatTime = (seconds) => {
        if (seconds <= 0) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const handleCopy = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <main className="w-full md:w-2/3 lg:w-3/4">
            <Card className="p-6 animate-fade-in">
                 <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Active Order</h1>
                 <div className="space-y-4 text-gray-800 dark:text-gray-200">
                    <p><strong>Service:</strong> {order.product}</p>
                    <div className="flex items-center space-x-2">
                        <strong>Phone Number:</strong> 
                        <span className="font-mono bg-gray-200 dark:bg-gray-700 p-2 rounded">{order.phone}</span>
                        <button onClick={() => handleCopy(order.phone)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
                           {copied ? <CheckIcon /> : <ClipboardIcon />}
                        </button>
                    </div>
                    <p><strong>Status:</strong> <span className={`font-bold ${order.sms ? 'text-green-500' : 'text-yellow-500'}`}>{order.sms ? 'SMS Received' : 'Waiting for SMS...'}</span></p>
                    <div className="text-center my-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <p className="text-lg">Time Remaining</p>
                        <p className={`text-4xl font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-blue-600'}`}>{formatTime(timeLeft)}</p>
                    </div>
                    <div>
                        <h3 className="font-bold mb-2">Received SMS:</h3>
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md min-h-[100px] flex items-center justify-center font-mono text-lg tracking-widest">
                            {order.sms ? order.sms.text : <Spinner />}
                        </div>
                    </div>
                 </div>
                 <div className="mt-6 flex justify-end space-x-4">
                    <Button variant="secondary" onClick={() => onUpdateStatus(order.id, 'CANCELED')}>Cancel Order</Button>
                    <Button onClick={() => onUpdateStatus(order.id, 'FINISHED')}>Mark as Finished</Button>
                 </div>
            </Card>
        </main>
    );
};


const MainLayout = ({ user, page, setPage, profile, showToast }) => {
    const [activeOrder, setActiveOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const activeOrderUnsubscribe = useRef(null);

    useEffect(() => {
        if (!user) {
            setActiveOrder(null);
            if (activeOrderUnsubscribe.current) activeOrderUnsubscribe.current();
            return;
        }

        const ordersQuery = query(
            collection(db, "users", user.uid, "orders"),
            where("status", "==", "PENDING"),
            orderBy("createdAt", "desc"),
            limit(1)
        );

        activeOrderUnsubscribe.current = onSnapshot(ordersQuery, (snapshot) => {
            if (!snapshot.empty) {
                const latestOrder = snapshot.docs[0];
                setActiveOrder({ id: latestOrder.id, ...latestOrder.data() });
            } else {
                setActiveOrder(null);
            }
        });

        return () => {
            if (activeOrderUnsubscribe.current) activeOrderUnsubscribe.current();
        };
    }, [user]);

    const handlePurchase = async (service, server) => {
        if (activeOrder) {
            showToast("You already have an active order. Please complete or cancel it first.", "error");
            return;
        }
        
        setIsLoading(true);
        
        try {
            // Use a transaction to ensure balance check and deduction are atomic
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, "users", user.uid);
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists()) {
                    throw new Error("User document does not exist!");
                }

                const currentBalance = userDoc.data().balance;
                if (currentBalance < service.price) {
                    // This will abort the transaction and the error will be caught below
                    throw new Error("Insufficient balance. Please recharge your account.");
                }

                // TODO: Replace this with a real API call to your backend to get a number.
                const fakeNumberData = {
                    phone: `+${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                    expires: new Date(Date.now() + 15 * 60000), // 15 minutes from now
                };

                const newOrder = {
                    userId: user.uid,
                    phone: fakeNumberData.phone,
                    product: service.name,
                    price: service.price,
                    provider: service.provider,
                    server: server.name,
                    status: "PENDING",
                    createdAt: serverTimestamp(),
                    expires: fakeNumberData.expires,
                    sms: null,
                };

                const newBalance = currentBalance - service.price;
                
                const newOrderRef = doc(collection(db, "users", user.uid, "orders"));
                transaction.set(newOrderRef, newOrder);
                transaction.update(userRef, { balance: newBalance });
            });

            showToast(`Successfully purchased number for ${service.name}!`, 'success');

        } catch (e) {
            console.error("Error during transaction: ", e);
            showToast(e.message, 'error');
            if (e.message.includes("Insufficient balance")) {
                setPage('recharge');
            }
        }
        setIsLoading(false);
    };

    const handleOrderStatusChange = async (orderId, newStatus) => {
        if (!user || !orderId) return;
        const orderRef = doc(db, "users", user.uid, "orders", orderId);
        try {
            await updateDoc(orderRef, { status: newStatus });
            showToast(`Order marked as ${newStatus}.`, 'info');
        } catch (error) {
            console.error(`Failed to update order status:`, error);
            showToast('Could not update order status.', 'error');
        }
    };

    const renderContent = () => {
        if (activeOrder) return <ActiveOrder order={activeOrder} onUpdateStatus={handleOrderStatusChange} />;

        const contentPages = ['cookies', 'delivery', 'terms', 'privacy', 'refund', 'about', 'contacts', 'rules', 'developers'];
        if (contentPages.includes(page)) {
            return <ContentPage title={page.charAt(0).toUpperCase() + page.slice(1).replace('-', ' ')} />;
        }

        switch (page) {
            case 'history': return <NumbersHistory user={user} />;
            case 'profile': return <ProfileSettings user={user} profile={profile} showToast={showToast} />;
            case 'login': return <LoginPage />;
            case 'recharge': return <RechargePage user={user} showToast={showToast} />;
            case 'home':
            default: return <LandingContent setPage={setPage} />;
        }
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                <Sidebar user={user} setPage={setPage} onPurchase={handlePurchase} showToast={showToast} />
                {isLoading ? <div className="w-full flex justify-center items-center"><Spinner /></div> : renderContent()}
            </div>
        </div>
    );
};


// --- Main App Component ---

function App() {
    const [page, setPage] = useState('home');
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useTheme();
    const [toast, setToast] = useState(null);

    const showToast = (message, type) => {
        setToast({ message, type });
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                setProfile(null);
                if (['profile', 'history', 'recharge'].includes(page)) {
                    setPage('home');
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [page]);
    
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
            setProfile(doc.data());
        });
        return () => unsub();
    }, [user]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-900"><Spinner /></div>;
    }
    
    return (
        <CurrencyProvider>
            <div className="font-sans text-gray-900 bg-blue-50 dark:bg-gray-900 min-h-screen">
                {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
                <Header user={user} profile={profile} setPage={setPage} theme={theme} setTheme={setTheme} />
                <MainLayout user={user} page={page} setPage={setPage} profile={profile} showToast={showToast} />
                <Footer setPage={setPage} />
            </div>
        </CurrencyProvider>
    );
}



export default App;
