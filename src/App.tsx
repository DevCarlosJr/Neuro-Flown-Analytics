import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  BookOpen, 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Info, 
  Plus, 
  Search, 
  Download, 
  Brain, 
  ChevronRight, 
  LogOut,
  User as UserIcon,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  FileDown,
  RefreshCw,
  Microscope,
  Stethoscope,
  Trash2,
  Edit,
  Camera,
  ArrowLeft,
  ClipboardList,
  History,
  Menu,
  X,
  Flag,
  MousePointer2,
  Layers,
  Zap,
  Moon,
  Sun,
  Box
} from 'lucide-react';
import { BioimpedanceDashboard } from './components/BioimpedanceDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Toaster, toast } from 'sonner';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit,
  getDocFromServer
} from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import ReactMarkdown from 'react-markdown';
import { cn, formatDate } from './lib/utils';
import { analyzeSessionData, generateCustomReport, analyzeScientificReference, calculateAutomaticResults } from './lib/gemini';
import { Paciente, Sessao, Referencia, Jornada, Laudo, Profissional } from './types';

// --- Types & Enums ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Error Boundary ---

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error && parsed.operationType) {
          errorMessage = `Erro no Firestore (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="h-screen w-full flex items-center justify-center bg-red-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Algo deu errado</h2>
            <p className="text-slate-600">{errorMessage}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Recarregar Aplicativo
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-300 relative",
      active 
        ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20" 
        : "text-[var(--text-muted)] hover:bg-white/50 hover:text-[var(--text-main)] hover:shadow-sm"
    )}
  >
    <div className={cn(
      "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
      active ? "bg-white/20" : "bg-slate-50 group-hover:bg-white"
    )}>
      <Icon size={18} className={active ? "text-white" : "text-[var(--primary)]"} />
    </div>
    <span className="font-semibold text-sm tracking-tight">{label}</span>
    {active && (
      <motion.div 
        layoutId="active-pill"
        className="absolute -left-1 w-1.5 h-6 bg-white rounded-full"
      />
    )}
  </button>
);

const Card = ({ children, className, title, action, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, action?: React.ReactNode, icon?: any }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden", className)}>
    {(title || action) && (
      <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
        {title && (
          <div className="flex items-center gap-2">
            {Icon && <Icon size={18} className="text-[var(--primary)]" />}
            <h3 className="font-semibold text-[var(--text-main)]">{title}</h3>
          </div>
        )}
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className, disabled, icon: Icon, type = 'button', loading }: any) => {
  const variants = {
    primary: "bg-[var(--primary)] text-white hover:opacity-90 shadow-md",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    outline: "bg-transparent text-[var(--primary)] border border-[var(--primary)] hover:bg-slate-50",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
  };
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:pointer-events-none",
        variants[variant as keyof typeof variants],
        className
      )}
    >
      {loading ? (
        <RefreshCw className="animate-spin" size={18} />
      ) : (
        <>
          {Icon && <Icon size={18} />}
          {children}
        </>
      )}
    </motion.button>
  );
};

const Input = ({ label, ...props }: any) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-medium text-[var(--text-main)]">{label}</label>}
    <input
      {...props}
      className="w-full px-4 py-2 rounded-lg border border-[var(--border-color)] bg-white text-[var(--text-main)] focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all"
    />
  </div>
);

const Select = ({ label, options, ...props }: any) => (
  <div className="space-y-1.5 w-full">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <select
      {...props}
      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const PatientSearchSelect = ({ label, pacientes, value, onChange, required, showAllOption = false, dark = false }: { label: string, pacientes: Paciente[], value: string, onChange: (val: string) => void, required?: boolean, showAllOption?: boolean, dark?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPacientes, setFilteredPacientes] = useState<Paciente[]>([]);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedPaciente = pacientes.find(p => p.id === value);
  const isAllSelected = showAllOption && value === 'all';

  useEffect(() => {
    let list = [...pacientes];
    if (searchTerm.trim() === '') {
      setFilteredPacientes(list.slice(0, 10)); 
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = list.filter(p => 
        p.nome.toLowerCase().includes(term) || 
        p.id_paciente.toLowerCase().includes(term)
      );
      setFilteredPacientes(filtered);
    }
  }, [searchTerm, pacientes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 w-full relative" ref={dropdownRef}>
      {label && <label className={cn("text-sm font-medium", dark ? "text-slate-400" : "text-slate-700")}>{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
      <div 
        className={cn(
          "w-full px-4 py-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all",
          dark ? "bg-black border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900",
          isOpen ? "ring-2 ring-indigo-500 border-indigo-500" : ""
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={cn("truncate", (!selectedPaciente && !isAllSelected) ? (dark ? "text-slate-600" : "text-slate-400") : (dark ? "text-white font-black" : "text-slate-900 font-medium"))}>
          {isAllSelected ? 'Todos os Pacientes' : (selectedPaciente ? `${selectedPaciente.nome} (${selectedPaciente.id_paciente})` : 'Selecione ou busque...')}
        </span>
        <Search size={16} className={cn("shrink-0 ml-2", dark ? "text-indigo-500" : "text-slate-400")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "absolute z-50 left-0 right-0 mt-2 rounded-xl shadow-2xl border overflow-hidden",
              dark ? "bg-black border-slate-800" : "bg-white border-slate-100"
            )}
          >
            <div className={cn("p-2 border-b", dark ? "border-slate-800" : "border-slate-50")}>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar por nome ou ID..."
                  className={cn(
                    "w-full pl-9 pr-4 py-2 text-sm rounded-lg border-none focus:ring-2 focus:ring-indigo-500 outline-none",
                    dark ? "bg-slate-900 text-white placeholder:text-slate-600" : "bg-slate-50 text-slate-900"
                  )}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {showAllOption && !searchTerm && (
                <button
                  type="button"
                  className={cn(
                    "w-full px-4 py-3 text-left transition-colors border-b",
                    dark ? "hover:bg-slate-900 border-slate-800" : "hover:bg-slate-50 border-slate-50",
                    value === 'all' ? (dark ? "bg-indigo-900/20" : "bg-indigo-50") : ""
                  )}
                  onClick={() => {
                    onChange('all');
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className={cn("text-sm font-bold", dark ? "text-indigo-400" : "text-indigo-600")}>Todos os Pacientes</span>
                </button>
              )}
              {filteredPacientes.length > 0 ? (
                filteredPacientes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors border-b last:border-none",
                      dark ? "hover:bg-slate-900 border-slate-800 text-slate-300" : "hover:bg-slate-50 border-slate-50 text-slate-700",
                      value === p.id ? (dark ? "bg-indigo-900/20 text-white" : "bg-indigo-50 text-indigo-700") : ""
                    )}
                    onClick={() => {
                      onChange(p.id!);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex flex-col">
                      <span className={cn("text-sm font-bold", value === p.id ? (dark ? "text-indigo-400" : "text-indigo-600") : (dark ? "text-white" : "text-slate-900"))}>{p.nome}</span>
                      <span className="text-[10px] opacity-60 uppercase tracking-wider">{p.id_paciente}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className={cn("px-4 py-8 text-center", dark ? "text-slate-600" : "text-slate-400")}>
                  <p className="text-sm">Nenhum paciente encontrado</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [referencias, setReferencias] = useState<Referencia[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [laudos, setLaudos] = useState<Laudo[]>([]);
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
  const [theme, setTheme] = useState('theme-indigo');
  const [hoverEffects, setHoverEffects] = useState(true);
  const [blurredBackground, setBlurredBackground] = useState(true);
  const [microInteractions, setMicroInteractions] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [glassEffect, setGlassEffect] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');

  // Auth & Connection Test
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setDbStatus('connected');
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          setDbStatus('error');
          toast.error("Erro de Conexão", {
            description: "Não foi possível conectar ao banco de dados. Verifique sua internet ou a configuração do Firebase."
          });
        } else {
          // If it's just a permission error or "not found", it's still "connected" to the service
          setDbStatus('connected');
        }
      }
    };
    testConnection();

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const handleLogin = () => signInWithPopup(auth, new GoogleAuthProvider());
  const handleLogout = () => signOut(auth);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (loginMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error(error);
      setAuthError(error.message);
    }
  };

  // Data Fetching
  useEffect(() => {
    if (!user) return;

    const qPacientes = query(collection(db, 'pacientes'), where('uid', '==', user.uid));
    const unsubPacientes = onSnapshot(qPacientes, (snap) => {
      setPacientes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Paciente)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'pacientes'));

    const qSessoes = query(collection(db, 'sessoes'), where('uid', '==', user.uid));
    const unsubSessoes = onSnapshot(qSessoes, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sessao));
      // Ordenação client-side para evitar a necessidade de índice composto no Firestore
      data.sort((a, b) => new Date(b.data_sessao).getTime() - new Date(a.data_sessao).getTime());
      setSessoes(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'sessoes'));

    const qRefs = query(collection(db, 'referencias'));
    const unsubRefs = onSnapshot(qRefs, (snap) => {
      setReferencias(snap.docs.map(d => ({ id: d.id, ...d.data() } as Referencia)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'referencias'));

    const qProfissionais = query(collection(db, 'profissionais'), where('uid', '==', user.uid));
    const unsubProfissionais = onSnapshot(qProfissionais, (snap) => {
      setProfissionais(snap.docs.map(d => ({ id: d.id, ...d.data() } as Profissional)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'profissionais'));

    const qJornadas = query(collection(db, 'jornadas'), where('uid', '==', user.uid));
    const unsubJornadas = onSnapshot(qJornadas, (snap) => {
      setJornadas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Jornada)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'jornadas'));

    const qLaudos = query(collection(db, 'laudos'), where('uid', '==', user.uid));
    const unsubLaudos = onSnapshot(qLaudos, (snap) => {
      setLaudos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Laudo)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'laudos'));

    return () => {
      unsubPacientes();
      unsubSessoes();
      unsubRefs();
      unsubProfissionais();
      unsubJornadas();
      unsubLaudos();
    };
  }, [user]);

  const downloadSavedLaudo = (laudo: Laudo) => {
    const doc = new jsPDF();
    const paciente = pacientes.find(p => p.id === laudo.paciente_id);
    const profissional = profissionais.find(p => p.id === laudo.profissional_id);
    const sessao = sessoes.find(s => s.id === laudo.sessao_id);

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("Laudo Clínico NeuroFlow", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Paciente: ${paciente?.nome || 'N/A'}`, 20, 35);
    doc.text(`Data do Laudo: ${formatDate(laudo.data_geracao)}`, 20, 42);
    if (sessao) {
      doc.text(`Referente à Sessão nº: ${sessao.sessao_n} (${formatDate(sessao.data_sessao)})`, 20, 49);
    }
    
    doc.setDrawColor(200);
    doc.line(20, 55, 190, 55);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Conteúdo do Laudo", 20, 65);
    
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(laudo.conteudo, 170);
    doc.text(splitText, 20, 75);
    
    let y = 75 + (splitText.length * 5) + 20;

    if (profissional) {
      if (y > 250) {
        doc.addPage();
        y = 30;
      }
      
      doc.setDrawColor(150);
      doc.line(60, y, 150, y);
      y += 5;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(profissional.nome, 105, y, { align: "center" });
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${profissional.profissao} - ${profissional.conselho}: ${profissional.registro}`, 105, y, { align: "center" });
      y += 5;
      doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 105, y, { align: "center" });
    }
    
    const fileNameDate = formatDate(laudo.data_geracao).replace(/\//g, '-').replace(/:/g, '-').replace(/ /g, '_');
    doc.save(`laudo-${paciente?.nome || 'paciente'}-${fileNameDate}.pdf`);
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Carregando NeuroFlow...</p>
      </div>
    </div>
  );

  if (!user) return (
    <ErrorBoundary>
      <div className={cn(
        "h-screen w-full flex items-center justify-center relative overflow-hidden", 
        theme,
        darkMode && "dark",
        hoverEffects && "hover-effects-enabled",
        blurredBackground && "blurred-bg-enabled",
        microInteractions && "micro-interactions-enabled",
        glassEffect && "glass-effect-enabled"
      )} style={{ fontFamily: 'var(--font-family)' }}>
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105 hover:scale-100"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070")' }}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md p-8 mx-4"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-2xl p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl rotate-3 animate-bounce-slow">
              <Brain className="text-white" size={32} />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">NeuroFlow</h1>
            <p className="text-slate-500 text-sm font-medium">
              {loginMode === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta profissional'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <Input 
              label="E-mail" 
              type="email" 
              required 
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
            <Input 
              label="Senha" 
              type="password" 
              required 
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            
            {authError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 items-start">
                <AlertCircle className="text-red-500 shrink-0" size={16} />
                <p className="text-xs text-red-600 leading-tight">{authError}</p>
              </div>
            )}

            <Button type="submit" className="w-full py-3 rounded-xl shadow-lg">
              {loginMode === 'login' ? 'Entrar' : 'Criar Conta'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Ou</span></div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleLogin} 
              variant="outline"
              className="w-full py-3 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50" 
              icon={UserIcon}
            >
              Entrar com Google
            </Button>
            
            <button 
              onClick={() => {
                setLoginMode(loginMode === 'login' ? 'signup' : 'login');
                setAuthError('');
              }}
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {loginMode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Footer Info */}
      <div className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-sm font-medium">
        © 2026 NeuroFlow Analytics • Tecnologia para Saúde Autonômica
      </div>
    </div>
    </ErrorBoundary>
  );

  return (
    <ErrorBoundary>
      <div className={cn(
        "h-screen w-full flex bg-slate-50 overflow-hidden relative", 
        theme,
        darkMode && "dark",
        hoverEffects && "hover-effects-enabled",
        blurredBackground && "blurred-bg-enabled",
        microInteractions && "micro-interactions-enabled",
        glassEffect && "glass-effect-enabled"
      )} style={{ fontFamily: 'var(--font-family)' }}>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
            <Brain className="text-white" size={18} />
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tighter">NeuroFlow</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 w-72 bg-slate-50/50 backdrop-blur-md border-r border-slate-200/50 flex flex-col p-4 z-50 transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-8 px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-xl shadow-[var(--primary)]/30 rotate-3">
              <Brain className="text-white" size={24} />
            </div>
            <div>
              <h2 className="font-bold text-xl text-slate-900 tracking-tighter leading-none">NeuroFlow</h2>
              <p className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-widest mt-1 opacity-70">Clinical Intelligence</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-6">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Principal</p>
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} />
            <SidebarItem icon={Users} label="Pacientes" active={activeTab === 'pacientes'} onClick={() => { setActiveTab('pacientes'); setSidebarOpen(false); }} />
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Atendimento</p>
            <SidebarItem icon={Activity} label="Análise de Sessão" active={activeTab === 'nova_sessao'} onClick={() => { setActiveTab('nova_sessao'); setSidebarOpen(false); }} />
            <SidebarItem icon={RefreshCw} label="Histórico" active={activeTab === 'sessoes'} onClick={() => { setActiveTab('sessoes'); setSidebarOpen(false); }} />
            <SidebarItem icon={ChevronRight} label="Jornadas" active={activeTab === 'jornadas'} onClick={() => { setActiveTab('jornadas'); setSidebarOpen(false); }} />
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Conhecimento</p>
            <SidebarItem icon={BookOpen} label="Referências" active={activeTab === 'referencias'} onClick={() => { setActiveTab('referencias'); setSidebarOpen(false); }} />
            <SidebarItem icon={FileText} label="Relatórios" active={activeTab === 'relatorios'} onClick={() => { setActiveTab('relatorios'); setSidebarOpen(false); }} />
          </div>

          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gestão</p>
            <SidebarItem icon={Users} label="Equipe" active={activeTab === 'equipe'} onClick={() => { setActiveTab('equipe'); setSidebarOpen(false); }} />
            <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'configuracoes'} onClick={() => { setActiveTab('configuracoes'); setSidebarOpen(false); }} />
            <SidebarItem icon={Info} label="Instruções" active={activeTab === 'instrucoes'} onClick={() => { setActiveTab('instrucoes'); setSidebarOpen(false); }} />
          </div>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-200/50">
          <div className="flex items-center gap-2 px-4 py-2 mb-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              dbStatus === 'connected' ? "bg-emerald-500" : dbStatus === 'error' ? "bg-red-500" : "bg-amber-500"
            )} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {dbStatus === 'connected' ? "Banco Conectado" : dbStatus === 'error' ? "Erro de Conexão" : "Conectando..."}
            </span>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white/40 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <img src={user.photoURL} alt={user.displayName} className="w-9 h-9 rounded-xl border-2 border-white shadow-sm" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user.displayName}</p>
                <p className="text-[10px] text-slate-500 truncate font-medium">{user.email}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 h-9 text-xs font-bold" icon={LogOut}>
              Sair do Sistema
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 pt-20 lg:pt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView 
                pacientes={pacientes} 
                sessoes={sessoes} 
                profissionais={profissionais}
                user={user}
                onNewSession={(p) => {
                  setSelectedPacienteId(p.id!);
                  setActiveTab('nova_sessao');
                }}
              />
            )}
            {activeTab === 'pacientes' && (
              <PacientesView 
                pacientes={pacientes} 
                user={user} 
                onViewProntuario={(id) => {
                  setSelectedPacienteId(id);
                  setActiveTab('prontuario');
                }}
              />
            )}
            {activeTab === 'prontuario' && (
              <ProntuarioView 
                pacienteId={selectedPacienteId!} 
                pacientes={pacientes}
                sessoes={sessoes}
                jornadas={jornadas}
                laudos={laudos}
                profissionais={profissionais}
                onDownloadLaudo={downloadSavedLaudo}
                onBack={() => setActiveTab('pacientes')}
              />
            )}
            {activeTab === 'nova_sessao' && <FormularioSessaoView pacientes={pacientes} jornadas={jornadas} profissionais={profissionais} user={user} pacienteId={selectedPacienteId || undefined} />}
            {activeTab === 'sessoes' && (
              <SessoesView 
                sessoes={sessoes} 
                pacientes={pacientes} 
                user={user} 
                references={referencias} 
                laudos={laudos}
                onDownloadLaudo={downloadSavedLaudo}
              />
            )}
            {activeTab === 'jornadas' && <JornadasView pacientes={pacientes} jornadas={jornadas} sessoes={sessoes} user={user} />}
            {activeTab === 'referencias' && <ReferenciasView referencias={referencias} />}
            {activeTab === 'relatorios' && <RelatoriosView pacientes={pacientes} sessoes={sessoes} profissionais={profissionais} user={user} />}
            {activeTab === 'equipe' && <EquipeView profissionais={profissionais} user={user} />}
            {activeTab === 'configuracoes' && (
              <SettingsView 
                theme={theme} 
                setTheme={setTheme}
                hoverEffects={hoverEffects}
                setHoverEffects={setHoverEffects}
                blurredBackground={blurredBackground}
                setBlurredBackground={setBlurredBackground}
                microInteractions={microInteractions}
                setMicroInteractions={setMicroInteractions}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                glassEffect={glassEffect}
                setGlassEffect={setGlassEffect}
                profissionais={profissionais}
                user={user}
              />
            )}
            {activeTab === 'instrucoes' && <InstrucoesView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
      <Toaster position="top-right" richColors closeButton />
    </ErrorBoundary>
  );
}

// --- Views ---

const Speedometer = ({ value }: { value: number }) => {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const rotation = (clampedValue / 100) * 180 - 90; // -90 to 90 degrees

  return (
    <div className="relative w-64 h-36 flex flex-col items-center justify-end overflow-hidden">
      <svg viewBox="0 0 100 55" className="w-full">
        <defs>
          {/* Gradients for 3D effect */}
          <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="100%" stopColor="#b30000" />
          </linearGradient>
          <linearGradient id="gradYellow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffd633" />
            <stop offset="100%" stopColor="#cc9900" />
          </linearGradient>
          <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#66cc66" />
            <stop offset="100%" stopColor="#2d862d" />
          </linearGradient>
          <linearGradient id="gradBlue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4d79ff" />
            <stop offset="100%" stopColor="#0033cc" />
          </linearGradient>
          
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
            <feOffset dx="1" dy="1" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Segments with 3D-like look */}
        {/* Ruim: 0-25% */}
        <path
          d="M 10 50 A 40 40 0 0 1 21.7 21.7 L 35.8 35.8 A 20 20 0 0 0 30 50 Z"
          fill="url(#gradRed)"
          stroke="#800000"
          strokeWidth="0.5"
        />
        {/* Regular: 25-60% */}
        <path
          d="M 21.7 21.7 A 40 40 0 0 1 62.4 12 L 56.2 31 A 20 20 0 0 0 35.8 35.8 Z"
          fill="url(#gradYellow)"
          stroke="#997300"
          strokeWidth="0.5"
        />
        {/* Bom: 60-85% */}
        <path
          d="M 62.4 12 A 40 40 0 0 1 88.3 40 L 69.1 45 A 20 20 0 0 0 56.2 31 Z"
          fill="url(#gradGreen)"
          stroke="#1e5c1e"
          strokeWidth="0.5"
        />
        {/* Ótimo: 85-100% */}
        <path
          d="M 88.3 40 A 40 40 0 0 1 90 50 L 70 50 A 20 20 0 0 0 69.1 45 Z"
          fill="url(#gradBlue)"
          stroke="#001a66"
          strokeWidth="0.5"
        />

        {/* Labels inside segments */}
        <text x="18" y="42" fontSize="4" fill="white" fontWeight="bold" textAnchor="middle" filter="url(#shadow)">Ruim</text>
        <text x="40" y="25" fontSize="5" fill="white" fontWeight="bold" textAnchor="middle" filter="url(#shadow)">Regular</text>
        <text x="75" y="30" fontSize="5" fill="white" fontWeight="bold" textAnchor="middle" filter="url(#shadow)">Bom</text>
        <text x="82" y="45" fontSize="4" fill="white" fontWeight="bold" textAnchor="middle" filter="url(#shadow)">Ótimo</text>

        {/* Needle (Yellow Arrow) */}
        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: rotation }}
          style={{ originX: "50px", originY: "50px" }}
          transition={{ type: "spring", stiffness: 40, damping: 12 }}
        >
          {/* Arrow body */}
          <path
            d="M 50 50 L 48.5 50 L 50 15 L 51.5 50 Z"
            fill="#ffcc00"
            stroke="#cc9900"
            strokeWidth="0.5"
          />
          {/* Arrow head */}
          <path
            d="M 50 10 L 46 18 L 54 18 Z"
            fill="#ffcc00"
            stroke="#cc9900"
            strokeWidth="0.5"
          />
          {/* Center point */}
          <rect x="48.5" y="48.5" width="3" height="3" fill="white" stroke="#3b82f6" strokeWidth="0.5" />
        </motion.g>
      </svg>
      
      <div className="absolute -bottom-1 text-center">
        <p className="text-xl font-bold text-slate-900 leading-none">{value.toFixed(2).replace('.', ',')}</p>
      </div>
    </div>
  );
};

function DashboardView({ 
  pacientes, 
  sessoes, 
  profissionais,
  user,
  onNewSession 
}: { 
  pacientes: Paciente[], 
  sessoes: Sessao[], 
  profissionais: Profissional[],
  user: any,
  onNewSession: (p: Paciente) => void 
}) {
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>('');
  const [showReportOptions, setShowReportOptions] = useState(false);
  const [profissionalId, setProfissionalId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const filteredSessoes = (selectedPacienteId 
    ? sessoes.filter(s => s.paciente_id === selectedPacienteId)
    : sessoes).sort((a, b) => new Date(b.data_sessao).getTime() - new Date(a.data_sessao).getTime());

  const selectedPaciente = pacientes.find(p => p.id === selectedPacienteId);
  const [selectedSessaoId, setSelectedSessaoId] = useState<string>('');

  const latestSessao = filteredSessoes[0];
  const latestBioSessao = filteredSessoes.find(s => 
    (s.contexto_clinico?.massa_gorda || 0) > 0 || 
    (s.contexto_clinico?.percentual_gordura || 0) > 0 ||
    (s.contexto_clinico?.angulo_fase || 0) > 0
  ) || latestSessao;

  const currentSessao = selectedSessaoId 
    ? filteredSessoes.find(s => s.id === selectedSessaoId) || latestBioSessao
    : latestBioSessao;

  const firstSessao = filteredSessoes[filteredSessoes.length - 1];
  const previousSessao = filteredSessoes[1];

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getSauaColor = (score: number) => {
    if (score >= 70) return "text-indigo-500";
    if (score >= 40) return "text-emerald-500";
    if (score >= 20) return "text-amber-500";
    return "text-red-500";
  };

  if (!selectedPacienteId) {
    return (
      <div className="space-y-8 bg-black -m-8 p-8 min-h-screen text-white font-sans">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-black p-8 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md bg-black/80 sticky top-0 z-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Dashboard <span className="text-indigo-500">Clínico</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Selecione um paciente para visualizar a análise detalhada.</p>
          </div>
          <div className="w-full md:w-80">
            <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800">
              <PatientSearchSelect 
                label=""
                pacientes={pacientes}
                value={selectedPacienteId}
                onChange={(val: string) => setSelectedPacienteId(val)}
                dark={true}
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: "Total Pacientes", value: pacientes.length, icon: Users, color: "text-indigo-500", bg: "bg-indigo-500/10" },
            { label: "Sessões Realizadas", value: sessoes.length, icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { label: "Média de Idade", value: pacientes.length ? Math.round(pacientes.reduce((acc, p) => acc + calculateAge(p.data_nascimento), 0) / pacientes.length) : 0, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "Alertas Ativos", value: 3, icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
          ].map((stat, i) => (
            <Card key={i} className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8 relative overflow-hidden group hover:border-slate-700 transition-all">
              <div className={cn("absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-5 blur-2xl transition-all group-hover:opacity-10", stat.bg)} />
              <div className="flex items-center gap-6">
                <div className={cn("p-4 rounded-2xl border border-white/5", stat.bg, stat.color)}>
                  <stat.icon size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
                  <p className="text-4xl font-black text-white tracking-tighter">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-10">Distribuição de Pacientes por Sexo</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Masculino', count: pacientes.filter(p => p.sexo === 'M').length },
                { name: 'Feminino', count: pacientes.filter(p => p.sexo === 'F').length },
                { name: 'Outros', count: pacientes.filter(p => p.sexo === 'O').length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip 
                  cursor={{fill: '#ffffff05'}}
                  contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #1e293b' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  }

  const sauaAtual = latestSessao?.resultados_automaticos?.saua_pos ? parseInt(latestSessao.resultados_automaticos.saua_pos) : 0;
  const sauaPre = latestSessao?.resultados_automaticos?.saua_pre ? parseInt(latestSessao.resultados_automaticos.saua_pre) : 0;
  const das = latestSessao?.resultados_automaticos?.das ? parseFloat(latestSessao.resultados_automaticos.das) : 0;
  const ira = latestSessao?.resultados_automaticos?.ira ? parseFloat(latestSessao.resultados_automaticos.ira) : 0;
  const iet = latestSessao?.resultados_automaticos?.iet ? parseFloat(latestSessao.resultados_automaticos.iet) : 0;
  const isc = latestSessao?.resultados_automaticos?.isc ? parseFloat(latestSessao.resultados_automaticos.isc) : 0;
  const ir = latestSessao?.resultados_automaticos?.ir ? parseFloat(latestSessao.resultados_automaticos.ir) : 0;

  const handleDownloadPDF = () => {
    if (!selectedPaciente) return;
    const doc = new jsPDF();
    const profissional = profissionais.find(p => p.id === profissionalId);

    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("Relatório de Dashboard NeuroFlow", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Paciente: ${selectedPaciente.nome}`, 20, 35);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 20, 42);
    doc.text(`Idade: ${calculateAge(selectedPaciente.data_nascimento)} anos`, 20, 49);
    
    doc.setDrawColor(200);
    doc.line(20, 55, 190, 55);
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Resumo do Estado Atual", 20, 65);
    
    doc.setFontSize(10);
    doc.text(`SAUA Atual: ${sauaAtual}`, 20, 75);
    doc.text(`Classificação: ${latestSessao?.resultados_automaticos?.classificacao || 'N/A'}`, 20, 82);
    doc.text(`RMSSD: ${latestSessao?.vfc_pre_pos?.rmssd?.pos || 0} ms`, 20, 89);
    doc.text(`FC Média: ${latestSessao?.vfc_pre_pos?.fc_media?.pos || 0} bpm`, 20, 96);
    doc.text(`Total Power: ${latestSessao?.vfc_pre_pos?.total_power?.pos || 0} ms²`, 20, 103);
    
    doc.text("Status Integrado:", 20, 115);
    const splitStatus = doc.splitTextToSize(latestSessao?.resultados_automaticos?.integrado || 'Modulação autonômica em análise.', 170);
    doc.text(splitStatus, 20, 122);
    
    let y = 122 + (splitStatus.length * 5) + 15;
    
    if (profissional) {
      if (y > 250) {
        doc.addPage();
        y = 30;
      }
      doc.setDrawColor(150);
      doc.line(60, y, 150, y);
      y += 5;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(profissional.nome, 105, y, { align: "center" });
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${profissional.profissao} - ${profissional.conselho}: ${profissional.registro}`, 105, y, { align: "center" });
      y += 5;
      doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 105, y, { align: "center" });
    }

    doc.save(`relatorio-dashboard-${selectedPaciente.nome}-${new Date().toISOString().split('T')[0]}.pdf`);
    setShowReportOptions(false);
  };

  const handleSaveToRecord = async () => {
    if (!selectedPaciente) return;
    setSaving(true);
    try {
      const content = `RELATÓRIO DE DASHBOARD - ${new Date().toLocaleDateString('pt-BR')}
      
SAUA Atual: ${sauaAtual}
Classificação: ${latestSessao?.resultados_automaticos?.classificacao || 'N/A'}
RMSSD: ${latestSessao?.vfc_pre_pos?.rmssd?.pos || 0} ms
FC Média: ${latestSessao?.vfc_pre_pos?.fc_media?.pos || 0} bpm
Total Power: ${latestSessao?.vfc_pre_pos?.total_power?.pos || 0} ms²

Status Integrado:
${latestSessao?.resultados_automaticos?.integrado || 'Modulação autonômica em análise.'}`;

      await addDoc(collection(db, 'laudos'), {
        paciente_id: selectedPaciente.id,
        paciente_nome: selectedPaciente.nome,
        profissional_id: profissionalId || null,
        data_geracao: new Date().toISOString(),
        tipo: 'Relatório de Dashboard',
        conteudo: content,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      toast.success("Relatório salvo no prontuário e histórico!");
      setShowReportOptions(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar relatório");
    } finally {
      setSaving(false);
    }
  };

  const chartData = filteredSessoes.slice(0, 10).reverse().map(s => ({
    date: new Date(s.data_sessao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    saua: parseInt(s.resultados_automaticos?.saua_pos || "0"),
    rmssd: s.vfc_pre_pos?.rmssd?.pos || 0,
    rmssd_pre: s.vfc_pre_pos?.rmssd?.pre || 0,
  }));

  return (
    <div className="space-y-8 pb-12 bg-black -m-8 p-8 min-h-screen text-white font-sans">
      {/* 1. HEADER SUPERIOR */}
      <header className="bg-black p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sticky top-0 z-10 backdrop-blur-md bg-black/80">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedPacienteId('')} className="p-2 hover:bg-slate-800 rounded-full transition-all border border-transparent hover:border-slate-700">
              <ArrowLeft size={20} className="text-slate-400" />
            </button>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{selectedPaciente.nome}</h1>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-indigo-500"></span>Idade: {calculateAge(selectedPaciente.data_nascimento)} anos</span>
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-emerald-500"></span>Data: {new Date().toLocaleDateString('pt-BR')}</span>
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-amber-500"></span>Sessão nº: {filteredSessoes.length}</span>
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-indigo-500"></span>Jornada: Ativa</span>
          </div>
        </div>
        <div className="flex gap-3 w-full md:w-auto relative">
          <Button onClick={() => onNewSession(selectedPaciente)} icon={Plus} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 border-none rounded-xl font-bold uppercase tracking-wider text-xs px-6">Nova Sessão</Button>
          <div className="relative flex-1 md:flex-none">
            <Button variant="secondary" icon={FileDown} className="w-full bg-slate-900 text-white border-slate-800 hover:bg-slate-800 rounded-xl font-bold uppercase tracking-wider text-xs px-6" onClick={() => setShowReportOptions(!showReportOptions)}>Relatório</Button>
            
            <AnimatePresence>
              {showReportOptions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-4 z-20 space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Profissional Responsável</label>
                    <select 
                      value={profissionalId}
                      onChange={(e: any) => setProfissionalId(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-slate-700 bg-black text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                      <option value="">Selecione o Profissional...</option>
                      {profissionais.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" icon={Download} onClick={handleDownloadPDF} className="justify-start text-xs h-9 border-slate-700 text-slate-300 hover:bg-slate-800">Baixar em PDF</Button>
                    <Button variant="outline" icon={ClipboardList} onClick={handleSaveToRecord} disabled={saving} className="justify-start text-xs h-9 border-slate-700 text-slate-300 hover:bg-slate-800">
                      {saving ? 'Salvando...' : 'Salvar no Prontuário'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 2. BLOCO PRINCIPAL — ESTADO ATUAL */}
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <div className="space-y-8 text-center">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">SAUA ATUAL</h3>
            <div className="space-y-2">
              <p className={cn("text-8xl font-black tracking-tighter leading-none", getSauaColor(sauaAtual))}>{sauaAtual}</p>
              <p className="text-sm font-bold text-white uppercase tracking-widest">{latestSessao?.resultados_automaticos?.classificacao || 'N/A'}</p>
            </div>
            <div className="flex justify-center gap-8 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <div className="text-center space-y-1">
                <p>RMSSD</p>
                <p className="text-white text-lg font-black">{latestSessao?.vfc_pre_pos?.rmssd?.pos || 0}</p>
              </div>
              <div className="text-center space-y-1">
                <p>FC</p>
                <p className="text-white text-lg font-black">{latestSessao?.vfc_pre_pos?.fc_media?.pos || 0}</p>
              </div>
              <div className="text-center space-y-1">
                <p>TP</p>
                <p className="text-white text-lg font-black">{latestSessao?.vfc_pre_pos?.total_power?.pos || 0}</p>
              </div>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50">
              <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase tracking-wider">
                <span className="text-indigo-500">STATUS:</span> {latestSessao?.resultados_automaticos?.integrado || 'Modulação autonômica em análise.'}
              </p>
            </div>
          </div>
        </Card>

        {/* 3. RESPOSTA AGUDA DA SESSÃO */}
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">RESPOSTA DA SESSÃO</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">SAUA</p>
                  <p className="text-3xl font-black text-white tracking-tighter">{sauaPre} → {sauaAtual}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-2xl font-black tracking-tighter", das >= 0 ? "text-emerald-500" : "text-red-500")}>
                    DAS: {das >= 0 ? '+' : ''}{das}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{das >= 0 ? 'Positiva' : 'Negativa'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 py-6 border-y border-slate-900">
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">RMSSD</p>
                  <p className="text-sm font-black text-white">{latestSessao?.vfc_pre_pos?.rmssd?.pre} → {latestSessao?.vfc_pre_pos?.rmssd?.pos}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">SDNN</p>
                  <p className="text-sm font-black text-white">{latestSessao?.vfc_pre_pos?.sdnn?.pre} → {latestSessao?.vfc_pre_pos?.sdnn?.pos}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">TP</p>
                  <p className="text-sm font-black text-white">{latestSessao?.vfc_pre_pos?.total_power?.pre} → {latestSessao?.vfc_pre_pos?.total_power?.pos}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">IRA</p>
                  <p className="text-2xl font-black text-white tracking-tighter">{ira >= 0 ? '+' : ''}{ira}</p>
                </div>
                <div className="bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Favorável</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 4. DECISÃO CLÍNICA (AÇÃO) */}
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">DECISÃO CLÍNICA</h3>
            <div className="bg-amber-500/5 p-5 rounded-2xl border border-amber-500/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm font-bold text-amber-200 leading-tight">{latestSessao?.contexto_clinico?.conduta || 'Manter conduta atual com monitoramento.'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">JUSTIFICATIVA:</p>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                {latestSessao?.resultados_automaticos?.analise_texto || 'Boa resposta autonômica aguda com tendência de estabilização.'}
              </p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-900">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">RISCO:</p>
              <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.2em]">Baixo</span>
            </div>
          </div>
        </Card>

        {/* 5. EVOLUÇÃO DA JORNADA */}
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">EVOLUÇÃO DA JORNADA</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">SAUA Inicial → Atual</p>
                <p className="text-3xl font-black text-white tracking-tighter">
                  {firstSessao?.resultados_automaticos?.saua_pre || '0'} → {sauaAtual}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-indigo-500 tracking-tighter">IET: {iet >= 0 ? '+' : ''}{iet}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Evolução Positiva</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-900">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">TENDÊNCIA:</p>
              <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">Melhora Consistente</p>
            </div>
          </div>
        </Card>

        {/* 6. SUSTENTAÇÃO CLÍNICA */}
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">SUSTENTAÇÃO CLÍNICA</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">ISC (Sustentação)</p>
                <p className="text-3xl font-black text-white tracking-tighter">{isc >= 0 ? '+' : ''}{isc}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Pré Atual vs Anterior</p>
                <p className="text-2xl font-black text-slate-400 tracking-tighter">
                  {sauaPre} → {previousSessao?.resultados_automaticos?.saua_pre || sauaPre}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-900">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">CLASSIFICAÇÃO:</p>
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest">Sustentação Parcial</p>
            </div>
          </div>
        </Card>

        {/* 7. ANÁLISE LONGITUDINAL */}
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">ANÁLISE LONGITUDINAL</h3>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">IR (Recorrência)</p>
                <p className="text-3xl font-black text-white tracking-tighter">{ir >= 0 ? '+' : ''}{ir}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Última Alta vs Atual</p>
                <p className="text-2xl font-black text-slate-400 tracking-tighter">68 → {sauaAtual}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-900">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">CLASSIFICAÇÃO:</p>
              <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">Retorno Estável</p>
            </div>
          </div>
        </Card>

        {/* 8. CONTEXTO FUNCIONAL */}
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">CONTEXTO FUNCIONAL</h3>
          <div className="grid grid-cols-2 gap-y-8 gap-x-4">
            <div className="space-y-1">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Dor (EVA)</p>
              <p className="text-lg font-black text-white">{latestSessao?.contexto_clinico?.dor_eva || 0}/10</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Mobilidade</p>
              <p className="text-lg font-black text-white">{latestSessao?.contexto_clinico?.mobilidade || 0}/10</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Força</p>
              <p className="text-lg font-black text-white">{latestSessao?.contexto_clinico?.forca || 0}/10</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Controle Motor</p>
              <p className="text-lg font-black text-white">{latestSessao?.contexto_clinico?.controle_motor || 0}/10</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-900 flex justify-between items-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">SCORE LOCOMOTOR:</p>
            <p className="text-2xl font-black text-indigo-500 tracking-tighter">{latestSessao?.resultados_automaticos?.locomotor || 0}/10</p>
          </div>
        </Card>

        {/* 9. CONTEXTO METABÓLICO */}
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">CONTEXTO METABÓLICO</h3>
          <div className="grid grid-cols-2 gap-y-8 gap-x-4">
            <div className="space-y-1">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Gordura Corp.</p>
              <p className="text-lg font-black text-white">{latestSessao?.contexto_clinico?.gordura_corporal || 0}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Água (ICE)</p>
              <p className="text-lg font-black text-white">{latestSessao?.contexto_clinico?.agua_ice || 0}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Idade Celular</p>
              <p className="text-lg font-black text-white">{latestSessao?.contexto_clinico?.idade_celular || 0} <span className="text-[10px] font-normal text-slate-500">anos</span></p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Sono (Horas)</p>
              <p className="text-lg font-black text-white">{latestSessao?.contexto_clinico?.horas_sono || 0}h</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-900 flex justify-between items-center">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">SCORE METABÓLICO:</p>
            <p className="text-2xl font-black text-emerald-500 tracking-tighter">{latestSessao?.resultados_automaticos?.metabolico || 'Moderado'}</p>
          </div>
        </Card>

        {/* 10. ALERTAS CLÍNICOS */}
        <Card className="bg-red-500/5 border-red-500/20 rounded-3xl shadow-2xl p-8">
          <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] mb-8">ALERTAS CLÍNICOS</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-red-400">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wider">Sustentação parcial entre sessões</p>
            </div>
            <div className="flex items-start gap-3 text-amber-400">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wider">Total Power ainda reduzido</p>
            </div>
            <div className="pt-4 border-t border-red-500/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Nenhum alerta crítico no momento</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 11. GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-10">Evolução SAUA (Linha do Tempo)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSaua" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="saua" name="SAUA" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorSaua)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-10">Evolução RMSSD (Pré vs Pós)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', borderRadius: '16px', border: '1px solid #1e293b' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="rmssd_pre" name="RMSSD Pré" stroke="#475569" strokeWidth={2} dot={{ r: 4, fill: '#475569', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="rmssd" name="RMSSD Pós" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 12. PLANO TERAPÊUTICO */}
      <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-10">PLANO TERAPÊUTICO</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <div className="space-y-4">
            <p className="text-[10px] text-indigo-500 uppercase font-black tracking-[0.2em]">Acupuntura / Eletro</p>
            <ul className="text-sm text-slate-300 space-y-2 font-bold">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>VG20, YT, IG4, F3, BP6, R3</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>Eletro: VG20–YT 2Hz</li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] text-emerald-500 uppercase font-black tracking-[0.2em]">Moxa / Auriculo</p>
            <ul className="text-sm text-slate-300 space-y-2 font-bold">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Moxa: VC6, R3</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Auriculo: Shenmen, Rim, Simpático</li>
            </ul>
          </div>
          <div className="space-y-4">
            <p className="text-[10px] text-amber-500 uppercase font-black tracking-[0.2em]">Manual / Exercício</p>
            <ul className="text-sm text-slate-300 space-y-2 font-bold">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Liberação miofascial lombar</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Eletropilates: controle motor</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mt-12 mb-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter">Dashboard <span className="text-indigo-500">Bioimpedância</span></h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Análise de Composição Corporal e Celular</p>
        </div>
        {filteredSessoes.length > 1 && (
          <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Sessão:</span>
            <select 
              className="text-[10px] font-black bg-black border border-slate-800 text-white rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={selectedSessaoId || currentSessao?.id || ''}
              onChange={(e) => setSelectedSessaoId(e.target.value)}
            >
              {filteredSessoes.map(s => (
                <option key={s.id} value={s.id} className="bg-black">
                  {new Date(s.data_sessao).toLocaleDateString('pt-BR')} - Sessão {s.sessao_n}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <BioimpedanceDashboard 
        sessao={currentSessao} 
        paciente={selectedPaciente} 
        profissional={profissionais.find(p => p.id === profissionalId)} 
      />

      {/* 13. LINHA FINAL (PRONTUÁRIO) */}
      <Card className="bg-black border-slate-800 rounded-3xl shadow-2xl p-8">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">LINHA FINAL (PRONTUÁRIO)</h3>
        <div className="space-y-6">
          <div className="bg-slate-900/30 p-6 rounded-2xl border border-slate-800/50">
            <p className="text-sm text-slate-300 leading-relaxed font-bold font-mono whitespace-pre-wrap">
              {latestSessao?.contexto_clinico?.conduta || 'Paciente apresenta melhora nos índices de variabilidade da frequência cardíaca. Mantida conduta de acupuntura sistêmica e eletroestimulação.'}
              {"\n\n"}
              Pontos: VG20, YT, IG4, F3, BP6, R3. Eletro: 2Hz.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" className="bg-slate-900 text-white border-slate-800 hover:bg-slate-800 rounded-xl font-bold uppercase tracking-wider text-xs px-8 h-12" icon={Download}>Copiar Prontuário</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PacientesView({ pacientes, user, onViewProntuario }: { pacientes: Paciente[], user: any, onViewProntuario: (id: string) => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ 
    id_paciente: '',
    nome: '', 
    sexo: 'M', 
    data_nascimento: '',
    telefone: '',
    primeira_avaliacao: new Date().toISOString().split('T')[0],
    diagnostico_principal: '',
    observacoes: '',
    status: 'Ativo',
    proxima_jornada: 1
  });

  useEffect(() => {
    if (editingPaciente) {
      setFormData({
        id_paciente: editingPaciente.id_paciente,
        nome: editingPaciente.nome,
        sexo: editingPaciente.sexo,
        data_nascimento: editingPaciente.data_nascimento,
        telefone: editingPaciente.telefone,
        primeira_avaliacao: editingPaciente.primeira_avaliacao,
        diagnostico_principal: editingPaciente.diagnostico_principal,
        observacoes: editingPaciente.observacoes,
        status: editingPaciente.status,
        proxima_jornada: editingPaciente.proxima_jornada
      });
    } else {
      const nextId = pacientes.length > 0 
        ? Math.max(...pacientes.map(p => {
            const match = p.id_paciente?.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          })) + 1 
        : 1;
      
      setFormData({ 
        id_paciente: `PAC-${String(nextId).padStart(4, '0')}`,
        nome: '', 
        sexo: 'M', 
        data_nascimento: '',
        telefone: '',
        primeira_avaliacao: new Date().toISOString().split('T')[0],
        diagnostico_principal: '',
        observacoes: '',
        status: 'Ativo',
        proxima_jornada: 1
      });
    }
  }, [editingPaciente, pacientes, showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const path = 'pacientes';
    try {
      if (editingPaciente) {
        await updateDoc(doc(db, path, editingPaciente.id!), {
          ...formData,
          proxima_jornada: Number(formData.proxima_jornada),
        });
        toast.success('Paciente atualizado com sucesso!', {
          description: `${formData.nome} foi atualizado no sistema.`,
          icon: <CheckCircle2 className="text-emerald-500" size={20} />,
        });
      } else {
        const patientRef = await addDoc(collection(db, path), {
          ...formData,
          proxima_jornada: Number(formData.proxima_jornada),
          data_criacao: new Date().toISOString(),
          uid: user.uid
        });

        // Automatically create the first journey
        await addDoc(collection(db, 'jornadas'), {
          paciente_id: patientRef.id,
          nome: 'Jornada Inicial',
          status: 'Ativo',
          etapa: 1,
          data_inicio: new Date().toISOString(),
          motivo_entrada: formData.diagnostico_principal || 'Avaliação Inicial',
          objetivos: 'Estabelecer baseline e plano terapêutico inicial.',
          uid: user.uid
        });

        toast.success('Paciente cadastrado com sucesso!', {
          description: `${formData.nome} foi adicionado à sua base de dados e a primeira jornada foi iniciada.`,
          icon: <CheckCircle2 className="text-emerald-500" size={20} />,
        });
      }
      setShowModal(false);
      setEditingPaciente(null);
    } catch (error) {
      handleFirestoreError(error, editingPaciente ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'pacientes';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const calculateAge = (birthDateStr: string) => {
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return 'N/A';
    const age = new Date().getFullYear() - birthDate.getFullYear();
    return age;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Gestão de Pacientes</h1>
          <p className="text-slate-500 text-sm md:text-base">Cadastre e acompanhe o histórico dos seus pacientes.</p>
        </div>
        <Button onClick={() => { setEditingPaciente(null); setShowModal(true); }} icon={Plus} className="w-full sm:w-auto">Novo Paciente</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pacientes.map((p) => (
          <Card key={p.id} title={p.nome} className="hover:shadow-lg transition-shadow group">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <UserIcon size={16} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ID: {p.id_paciente}</span>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  p.status === 'Ativo' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                )}>
                  {p.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs">Idade</p>
                  <p className="font-semibold text-slate-700">{calculateAge(p.data_nascimento)} anos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 text-xs">Sexo</p>
                  <p className="font-semibold text-slate-700">{p.sexo}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-slate-500 text-xs">Diagnóstico</p>
                <p className="text-slate-700 font-medium truncate">{p.diagnostico_principal || 'Não informado'}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <Button variant="secondary" className="flex-1 text-xs py-2 h-auto" onClick={() => onViewProntuario(p.id!)}>Prontuário</Button>
                <Button variant="ghost" className="p-2 h-auto text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => { setEditingPaciente(p); setShowModal(true); }}>
                  <Edit size={16} />
                </Button>
                <Button variant="ghost" className="p-2 h-auto text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(p.id!)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 sm:p-8 space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {editingPaciente ? 'Editar Paciente' : 'Cadastrar Novo Paciente'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="ID Paciente" value={formData.id_paciente} onChange={(e: any) => setFormData({...formData, id_paciente: e.target.value})} required />
                  <Input label="Nome Completo" value={formData.nome} onChange={(e: any) => setFormData({...formData, nome: e.target.value})} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Sexo" value={formData.sexo} onChange={(e: any) => setFormData({...formData, sexo: e.target.value})} options={[
                    { value: 'M', label: 'Masculino' },
                    { value: 'F', label: 'Feminino' },
                    { value: 'O', label: 'Outro' },
                  ]} />
                  <Input label="Data de Nascimento" type="date" value={formData.data_nascimento} onChange={(e: any) => setFormData({...formData, data_nascimento: e.target.value})} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Telefone" value={formData.telefone} onChange={(e: any) => setFormData({...formData, telefone: e.target.value})} />
                  <Input label="Primeira Avaliação" type="date" value={formData.primeira_avaliacao} onChange={(e: any) => setFormData({...formData, primeira_avaliacao: e.target.value})} />
                </div>
                <Input label="Diagnóstico Principal" value={formData.diagnostico_principal} onChange={(e: any) => setFormData({...formData, diagnostico_principal: e.target.value})} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Status" value={formData.status} onChange={(e: any) => setFormData({...formData, status: e.target.value})} options={[
                    { value: 'Ativo', label: 'Ativo' },
                    { value: 'Inativo', label: 'Inativo' },
                  ]} />
                  <Input label="Próxima Jornada" type="number" value={formData.proxima_jornada} onChange={(e: any) => setFormData({...formData, proxima_jornada: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Observações</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancelar</Button>
                  <Button type="submit" className="flex-1" loading={isSubmitting}>Salvar Paciente</Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SessoesView({ 
  sessoes, 
  pacientes, 
  user, 
  references, 
  laudos, 
  onDownloadLaudo 
}: { 
  sessoes: Sessao[], 
  pacientes: Paciente[], 
  user: any, 
  references: Referencia[], 
  laudos: Laudo[], 
  onDownloadLaudo: (laudo: Laudo) => void 
}) {
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSessao, setSelectedSessao] = useState<Sessao | null>(null);
  const [laudo, setLaudo] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState({ 
    paciente_id: '', 
    rmssd: '', 
    hrv: '', 
    observacoes: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const path = 'sessoes';
    try {
      await addDoc(collection(db, path), {
        paciente_id: formData.paciente_id,
        data_sessao: new Date().toISOString(),
        vfc_pre_pos: {
          rmssd: { pre: parseFloat(formData.rmssd), pos: parseFloat(formData.hrv) }
        },
        observacoes: formData.observacoes,
        uid: user.uid
      });
      toast.success('Sessão registrada!', {
        description: 'Os dados fisiológicos foram salvos com sucesso.'
      });
      setShowModal(false);
      setFormData({ paciente_id: '', rmssd: '', hrv: '', observacoes: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async (sessao: Sessao) => {
    setAnalyzing(true);
    setSelectedSessao(sessao);
    try {
      const paciente = pacientes.find(p => p.id === sessao.paciente_id);
      const result = await analyzeSessionData(paciente, sessao, references);
      setLaudo(result);
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Banco de Sessões</h1>
          <p className="text-slate-500 text-sm md:text-base">Registro e análise automática de dados fisiológicos.</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={Plus} className="w-full sm:w-auto">Nova Sessão</Button>
      </header>

      <div className="space-y-4">
        {sessoes.map((s) => {
          const p = pacientes.find(pac => pac.id === s.paciente_id);
          return (
            <Card key={s.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 line-clamp-1">{p?.nome || 'Paciente não encontrado'}</h4>
                  <p className="text-xs text-slate-500">{formatDate(s.data_sessao)}</p>
                </div>
              </div>
                <div className="flex items-center justify-between w-full sm:w-auto gap-4 sm:gap-4 border-t sm:border-t-0 pt-4 sm:pt-0">
                  <div className="text-left sm:text-center">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase">RMSSD (Pré/Pós)</p>
                    <p className="text-base sm:text-lg font-bold text-indigo-600">
                      {s.vfc_pre_pos?.rmssd?.pre || (s as any).dados_fisiologicos?.rmssd || 0} / {s.vfc_pre_pos?.rmssd?.pos || (s as any).dados_fisiologicos?.hrv || 0}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {laudos.find(l => l.sessao_id === s.id) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        icon={FileText} 
                        onClick={() => onDownloadLaudo(laudos.find(l => l.sessao_id === s.id)!)} 
                        className="text-xs border-indigo-200 text-indigo-600"
                      >
                        Laudo
                      </Button>
                    )}
                    <Button variant="outline" size="sm" icon={Brain} onClick={() => handleAnalyze(s)} className="text-xs">Analisar</Button>
                  </div>
                </div>
            </Card>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 sm:p-8 space-y-6">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Registrar Sessão</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <PatientSearchSelect 
                  label="Paciente" 
                  pacientes={pacientes}
                  value={formData.paciente_id} 
                  onChange={(val: string) => setFormData({...formData, paciente_id: val})} 
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="RMSSD (ms)" type="number" step="0.1" value={formData.rmssd} onChange={(e: any) => setFormData({...formData, rmssd: e.target.value})} required />
                  <Input label="HRV (Score)" type="number" step="0.1" value={formData.hrv} onChange={(e: any) => setFormData({...formData, hrv: e.target.value})} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Observações</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)} disabled={isSubmitting}>Cancelar</Button>
                  <Button type="submit" className="flex-1" loading={isSubmitting}>Salvar Sessão</Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {selectedSessao && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Análise Clínica IA</h2>
              <Button variant="ghost" className="p-2" onClick={() => { setSelectedSessao(null); setLaudo(null); }}>Fechar</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-500 animate-pulse">O cérebro da IA está processando os dados...</p>
                </div>
              ) : laudo ? (
                <div className="prose prose-indigo max-w-none">
                  <ReactMarkdown>{laudo}</ReactMarkdown>
                </div>
              ) : null}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => { setSelectedSessao(null); setLaudo(null); }}>Fechar</Button>
              <Button icon={Download} onClick={() => {
                const doc = new jsPDF();
                doc.text("Laudo Clínico - NeuroFlow", 10, 10);
                doc.text(`Paciente: ${pacientes.find(p => p.id === selectedSessao.paciente_id)?.nome}`, 10, 20);
                doc.text(`Data: ${formatDate(selectedSessao.data_sessao)}`, 10, 30);
                const lines = doc.splitTextToSize(laudo || "", 180);
                doc.text(lines, 10, 40);
                doc.save(`laudo-${selectedSessao.id}.pdf`);
              }}>Exportar PDF</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ReferenciasView({ referencias }: { referencias: Referencia[] }) {
  const [showModal, setShowModal] = useState(false);
  const [articleText, setArticleText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);

  const handleAnalyzeArticle = async () => {
    if (!articleText) return;
    setAnalyzing(true);
    try {
      const result = await analyzeScientificReference(articleText);
      setSuggestion(result);
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveReference = async () => {
    if (!suggestion) return;
    setIsSubmitting(true);
    const path = 'referencias';
    try {
      await addDoc(collection(db, path), {
        ...suggestion,
        data_atualizacao: new Date().toISOString()
      });
      toast.success('Referência salva!', {
        description: 'A base científica foi atualizada com sucesso.'
      });
      setShowModal(false);
      setSuggestion(null);
      setArticleText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Referências Científicas</h1>
          <p className="text-slate-500 text-sm md:text-base">Base de parâmetros clínicos atualizada por IA.</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={Microscope} className="w-full sm:w-auto">Analisar Artigo</Button>
      </header>

      {/* Tabelas de Referência SAUA */}
      <div className="space-y-10">
        <div className="bg-indigo-950 text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-xl">
          <h2 className="text-xl font-bold tracking-tight uppercase">Upon Action | Referências do Modelo SAUA</h2>
          <Brain className="opacity-50" size={24} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Tabela 1: RMSSD por Idade */}
          <div className="xl:col-span-2">
            <Card title="Faixas por idade para RMSSD esperado" className="h-full">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 font-semibold text-slate-500">Idade mín</th>
                      <th className="pb-3 font-semibold text-slate-500">Idade máx</th>
                      <th className="pb-3 font-semibold text-slate-500">RMSSD masc</th>
                      <th className="pb-3 font-semibold text-slate-500">RMSSD fem</th>
                      <th className="pb-3 font-semibold text-slate-500">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[
                      { min: 20, max: 29, m: "52,5", f: "57,5" },
                      { min: 30, max: 39, m: "47,5", f: "52,5" },
                      { min: 40, max: 49, m: "40,0", f: "45,0" },
                      { min: 50, max: 59, m: "32,5", f: "36,0" },
                      { min: 60, max: 69, m: "25,0", f: "29,0" },
                      { min: 70, max: 120, m: "20,0", f: "24,0" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-medium text-slate-700">{row.min}</td>
                        <td className="py-3 text-slate-600">{row.max}</td>
                        <td className="py-3 font-bold text-indigo-600">{row.m}</td>
                        <td className="py-3 font-bold text-indigo-600">{row.f}</td>
                        <td className="py-3 text-slate-400 text-xs italic">5 min em repouso</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Tabela 2: Pesos SAUA */}
          <div>
            <Card title="Pesos do SAUA 0-100" className="h-full">
              <div className="space-y-4">
                {[
                  { label: "RMSSD", weight: "30%", desc: "Prioridade vagal" },
                  { label: "SDNN", weight: "20%", desc: "Variabilidade global" },
                  { label: "Total Power", weight: "15%", desc: "Reserva autonômica" },
                  { label: "LF/HF", weight: "15%", desc: "Balanço autonômico" },
                  { label: "pNN50", weight: "10%", desc: "Vagal rápida" },
                  { label: "FC média", weight: "10%", desc: "Carga de repouso" },
                ].map((row, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">{row.label}</p>
                      <p className="text-xs text-slate-500">{row.desc}</p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-600 text-white text-sm font-bold rounded-lg">{row.weight}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Tabela 3: Regras Clínicas */}
        <Card title="Regras clínicas resumidas">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">RMSSD</h4>
              <p className="text-sm text-slate-700">
                <span className="text-red-500 font-bold">{"<20"}</span> baixo | 
                <span className="text-amber-500 font-bold"> 20-40</span> moderado | 
                <span className="text-emerald-500 font-bold"> {">40"}</span> bom
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SDNN</h4>
              <p className="text-sm text-slate-700">
                <span className="text-red-500 font-bold">{"<30"}</span> baixo | 
                <span className="text-amber-500 font-bold"> 30-50</span> moderado | 
                <span className="text-emerald-500 font-bold"> {">50"}</span> bom
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Power</h4>
              <p className="text-sm text-slate-700">
                <span className="text-red-500 font-bold">{"<500"}</span> baixa reserva | 
                <span className="text-amber-500 font-bold"> 500-1000</span> reduzido | 
                <span className="text-indigo-500 font-bold"> 1000-2000</span> moderado | 
                <span className="text-emerald-500 font-bold"> {">2000"}</span> bom
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">LF/HF</h4>
              <p className="text-sm text-slate-700">
                <span className="text-emerald-500 font-bold">0,5-2</span> ideal | 
                <span className="text-red-500 font-bold"> {">3"}</span> simpaticotonia | 
                <span className="text-amber-500 font-bold"> {"<0,5"}</span> baixa responsividade
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">FC média</h4>
              <p className="text-sm text-slate-700">
                <span className="text-emerald-500 font-bold">50-65</span> excelente | 
                <span className="text-blue-500 font-bold"> 66-75</span> boa | 
                <span className="text-amber-500 font-bold"> 76-85</span> atenção | 
                <span className="text-red-500 font-bold"> {">85"}</span> sobrecarga
              </p>
            </div>
          </div>
        </Card>

        {/* Fontes */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BookOpen size={16} /> Fontes Científicas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Task Force of the European Society of Cardiology and the North American Society of Pacing and Electrophysiology, 1996.",
              "Shaffer F, Ginsberg JP. An overview of heart rate variability metrics and norms. Front Public Health. 2017.",
              "Laborde S, Mosley E, Thayer JF. Heart rate variability and cardiac vagal tone in psychophysiological research. 2017.",
              "Voss A et al. Short-term heart rate variability - age and gender dependence in healthy subjects. 2015."
            ].map((source, i) => (
              <p key={i} className="text-xs text-slate-400 leading-relaxed border-l-2 border-slate-200 pl-4">{source}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-10 border-t border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Brain className="text-indigo-600" size={24} /> Descobertas Recentes da IA
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {referencias.map((r) => (
          <Card key={r.id} className="border-l-4 border-l-indigo-600">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-900">{r.tipo}</h3>
              <span className={cn(
                "px-2 py-1 rounded-lg text-xs font-bold uppercase",
                r.relevancia === 'Alta' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
              )}>
                Relevância {r.relevancia || 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Valor Ref.</p>
                <p className="text-xl font-bold text-indigo-600">{r.valor_referencia}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xs font-bold text-slate-400 uppercase">Faixa Etária</p>
                <p className="text-xl font-bold text-indigo-600">{r.idade_min}-{r.idade_max}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 italic">"{r.justificativa}"</p>
          </Card>
        ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Analisar Evidência Científica</h2>
              {!suggestion ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Texto do Artigo ou Resumo</label>
                    <textarea 
                      className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-64"
                      placeholder="Cole aqui o texto do artigo científico para a IA extrair parâmetros..."
                      value={articleText}
                      onChange={(e) => setArticleText(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button className="flex-1" onClick={handleAnalyzeArticle} disabled={analyzing || !articleText} icon={Brain}>
                      {analyzing ? 'Analisando...' : 'Analisar com IA'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-indigo-900 text-lg">Sugestão da IA</h3>
                      <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">Relevância {suggestion.relevancia}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase">Parâmetro</p>
                        <p className="font-bold text-indigo-900">{suggestion.tipo}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase">Valor Sugerido</p>
                        <p className="font-bold text-indigo-900">{suggestion.valor_referencia}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-400 uppercase">Justificativa Clínica</p>
                      <p className="text-sm text-indigo-800">{suggestion.justificativa}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => setSuggestion(null)}>Refazer</Button>
                    <Button className="flex-1" onClick={handleSaveReference}>Adicionar à Base</Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function RelatoriosView({ pacientes, sessoes, profissionais, user }: { pacientes: Paciente[], sessoes: Sessao[], profissionais: Profissional[], user: any }) {
  const [filters, setFilters] = useState({ patientId: 'all', period: '30', analysisType: 'evolution' });
  const [profissionalId, setProfissionalId] = useState<string>('');
  const [report, setReport] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const filteredPacientes = filters.patientId === 'all' ? pacientes : pacientes.filter(p => p.id === filters.patientId);
      const filteredSessoes = filters.patientId === 'all' ? sessoes : sessoes.filter(s => s.paciente_id === filters.patientId);
      
      const result = await generateCustomReport(filteredPacientes, filteredSessoes, filters);
      setReport(result);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToRecord = async () => {
    if (!report) return;
    if (filters.patientId === 'all') {
      toast.error("Selecione um paciente específico para salvar no prontuário.");
      return;
    }

    setSaving(true);
    const path = 'laudos';
    try {
      const paciente = pacientes.find(p => p.id === filters.patientId);
      await addDoc(collection(db, path), {
        paciente_id: filters.patientId,
        paciente_nome: paciente?.nome || 'N/A',
        profissional_id: profissionalId || null,
        data_laudo: new Date().toISOString().split('T')[0],
        tipo_laudo: `Relatório IA - ${filters.analysisType}`,
        analise_texto: report,
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
      toast.success("Relatório salvo no prontuário do paciente!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSaving(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Relatório NeuroFlow Analytics", 10, 20);
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 10, 30);
    doc.text(`Filtros: ${filters.analysisType} - ${filters.period} dias`, 10, 40);
    
    const lines = doc.splitTextToSize(report || "", 180);
    doc.text(lines, 10, 50);

    // Assinatura do Profissional
    const profissional = profissionais.find(p => p.id === profissionalId);
    if (profissional) {
      let y = 60 + (lines.length * 5);
      if (y > 250) {
        doc.addPage();
        y = 30;
      } else {
        y += 20;
      }
      
      doc.setDrawColor(150);
      doc.line(60, y, 150, y);
      y += 5;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(profissional.nome, 105, y, { align: "center" });
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${profissional.profissao} - ${profissional.conselho}: ${profissional.registro}`, 105, y, { align: "center" });
      y += 5;
      doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 105, y, { align: "center" });
    }

    doc.save(`relatorio-${new Date().getTime()}.pdf`);
  };

  const exportCSV = () => {
    const data = sessoes.map(s => ({
      paciente: pacientes.find(p => p.id === s.paciente_id)?.nome,
      data: s.data_sessao,
      rmssd_pre: s.vfc_pre_pos?.rmssd?.pre || (s as any).dados_fisiologicos?.rmssd,
      rmssd_pos: s.vfc_pre_pos?.rmssd?.pos || (s as any).dados_fisiologicos?.hrv,
      obs: s.observacoes
    }));
    
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(val => `"${val}"`).join(",")
    ).join("\n");
    
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "dados_clinicos.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Gerador de Relatórios IA</h1>
        <p className="text-slate-500 text-sm md:text-base">Crie análises customizadas e exporte dados para laudos externos.</p>
      </header>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <PatientSearchSelect 
            label="Paciente" 
            pacientes={pacientes}
            value={filters.patientId} 
            onChange={(val: string) => setFilters({...filters, patientId: val})} 
            showAllOption
          />
          <Select 
            label="Período" 
            value={filters.period} 
            onChange={(e: any) => setFilters({...filters, period: e.target.value})} 
            options={[
              { value: '7', label: 'Últimos 7 dias' },
              { value: '30', label: 'Últimos 30 dias' },
              { value: '90', label: 'Últimos 90 dias' },
              { value: 'all', label: 'Todo o histórico' },
            ]} 
          />
          <Select 
            label="Tipo de Análise" 
            value={filters.analysisType} 
            onChange={(e: any) => setFilters({...filters, analysisType: e.target.value})} 
            options={[
              { value: 'evolution', label: 'Evolução Longitudinal' },
              { value: 'comparison', label: 'Comparação com Referências' },
              { value: 'anomalies', label: 'Detecção de Anomalias' },
              { value: 'summary', label: 'Sumário Executivo' },
            ]} 
          />
          <Select 
            label="Profissional Responsável" 
            value={profissionalId} 
            onChange={(e: any) => setProfissionalId(e.target.value)} 
            options={[
              { value: '', label: 'Selecione para assinatura...' },
              ...profissionais.map(p => ({ value: p.id, label: p.nome }))
            ]} 
          />
          <Button onClick={handleGenerate} disabled={generating} icon={RefreshCw} className={cn("w-full", generating ? 'animate-spin' : '')}>
            {generating ? 'Gerando...' : 'Gerar Relatório'}
          </Button>
        </div>
      </Card>

      {report && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button variant="outline" icon={FileDown} onClick={exportCSV} className="w-full sm:w-auto">Exportar CSV</Button>
            <Button variant="outline" icon={Download} onClick={exportPDF} className="w-full sm:w-auto">Exportar PDF</Button>
            <Button 
              icon={FileText} 
              onClick={handleSaveToRecord} 
              loading={saving}
              disabled={filters.patientId === 'all'}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? 'Salvando...' : 'Salvar no Prontuário'}
            </Button>
          </div>
          <Card className="prose prose-indigo max-w-none p-6 sm:p-10">
            <ReactMarkdown>{report}</ReactMarkdown>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function JornadasView({ pacientes, jornadas, sessoes, user }: { pacientes: Paciente[], jornadas: Jornada[], sessoes: Sessao[], user: any }) {
  const [selectedPacienteId, setSelectedPacienteId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    motivo_entrada: '',
    objetivos: '',
    data_inicio: new Date().toISOString().split('T')[0]
  });
  const [dischargeData, setDischargeData] = useState({
    data_fim: new Date().toISOString().split('T')[0],
    saua_final: '',
    ganho_total: '',
    evolucao_global: ''
  });

  const paciente = pacientes.find(p => p.id === selectedPacienteId);
  const pacienteJornadas = jornadas.filter(j => j.paciente_id === selectedPacienteId).sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime());
  const activeJornada = pacienteJornadas.find(j => j.status === 'Ativo');

  const handleCreateJornada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPacienteId) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'jornadas'), {
        paciente_id: selectedPacienteId,
        nome: formData.nome,
        status: 'Ativo',
        etapa: pacienteJornadas.length + 1,
        data_inicio: formData.data_inicio,
        motivo_entrada: formData.motivo_entrada,
        objetivos: formData.objetivos,
        uid: user.uid
      });
      toast.success('Nova jornada iniciada!');
      setIsModalOpen(false);
      setFormData({ nome: '', motivo_entrada: '', objetivos: '', data_inicio: new Date().toISOString().split('T')[0] });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'jornadas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJornada) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'jornadas', activeJornada.id!), {
        status: 'Encerrado',
        data_fim: dischargeData.data_fim,
        saua_final: dischargeData.saua_final,
        ganho_total: dischargeData.ganho_total,
        evolucao_global: dischargeData.evolucao_global
      });
      toast.success('Alta clínica registrada com sucesso!');
      setIsDischargeModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'jornadas');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Jornadas Clínicas</h1>
          <p className="text-slate-500 text-sm md:text-base">Acompanhamento longitudinal e ciclos de tratamento.</p>
        </div>
        <div className="w-full md:w-72">
          <PatientSearchSelect 
            label="Selecionar Paciente"
            pacientes={pacientes}
            value={selectedPacienteId}
            onChange={(val: string) => setSelectedPacienteId(val)}
          />
        </div>
      </header>

      {!selectedPacienteId ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-200">
          <Users size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">Selecione um paciente para visualizar sua jornada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Jornada Ativa */}
            <Card 
              title="Jornada Atual" 
              icon={Activity}
              action={activeJornada ? (
                <Button variant="danger" className="h-8 text-xs px-3" onClick={() => setIsDischargeModalOpen(true)}>Dar Alta</Button>
              ) : (
                <Button className="h-8 text-xs px-3" onClick={() => setIsModalOpen(true)} icon={Plus}>Nova Jornada</Button>
              )}
            >
              {activeJornada ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{activeJornada.nome}</h3>
                      <p className="text-sm text-slate-500">Iniciada em {formatDate(activeJornada.data_inicio)}</p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">
                      Em Andamento
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Motivo de Entrada</p>
                      <p className="text-slate-700 font-medium">{activeJornada.motivo_entrada}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Objetivos</p>
                      <p className="text-slate-700 font-medium">{activeJornada.objetivos}</p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <History size={16} className="text-indigo-600" />
                      Sessões Vinculadas ({sessoes.filter(s => s.jornada_id === activeJornada.id).length})
                    </h4>
                    <div className="space-y-3">
                      {sessoes.filter(s => s.jornada_id === activeJornada.id).map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs border border-slate-100">
                              #{s.sessao_n}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">{formatDate(s.data_sessao)}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{s.fase}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-indigo-600">{s.resultados_automaticos?.saua_pos || 'N/A'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">SAUA Pós</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-slate-400 italic">O paciente não possui uma jornada ativa no momento.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsModalOpen(true)}>Iniciar Nova Jornada</Button>
                </div>
              )}
            </Card>

            {/* Histórico Longitudinal */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={20} />
                Histórico Longitudinal
              </h3>
              <div className="space-y-4">
                {pacienteJornadas.filter(j => j.status === 'Encerrado').map(j => (
                  <Card key={j.id} className="border-l-4 border-l-slate-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900">{j.nome}</h4>
                        <p className="text-xs text-slate-500">{formatDate(j.data_inicio)} — {formatDate(j.data_fim!)}</p>
                      </div>
                      <div className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase">
                        Encerrada
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">SAUA Final</p>
                        <p className="text-lg font-bold text-slate-900">{j.saua_final || 'N/A'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Ganho Total</p>
                        <p className="text-lg font-bold text-slate-900">{j.ganho_total || 'N/A'}</p>
                      </div>
                      <div className="col-span-2 p-3 bg-slate-50 rounded-xl">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Evolução Global</p>
                        <p className="text-sm font-medium text-slate-700 line-clamp-2">{j.evolucao_global || 'N/A'}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card title="Visão Geral do Paciente" icon={UserIcon}>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl">
                    {paciente.nome.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{paciente.nome}</p>
                    <p className="text-xs text-slate-500">ID: {paciente.id_paciente}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-50 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total de Jornadas</span>
                    <span className="font-bold text-slate-700">{pacienteJornadas.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total de Sessões</span>
                    <span className="font-bold text-slate-700">{sessoes.filter(s => s.paciente_id === selectedPacienteId).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Status Atual</span>
                    <span className={cn("font-bold", activeJornada ? "text-emerald-600" : "text-amber-600")}>
                      {activeJornada ? "Em Tratamento" : "Aguardando Retorno"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="p-6 bg-indigo-600 rounded-3xl text-white space-y-4 shadow-xl shadow-indigo-200">
              <Flag size={32} className="opacity-50" />
              <h4 className="text-lg font-bold leading-tight">Acompanhamento Vitalício</h4>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Este sistema garante que nenhum dado seja perdido. Mesmo após a alta, o histórico do paciente permanece disponível para comparações futuras.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Jornada */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Iniciar Nova Jornada</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateJornada} className="space-y-4">
                <Input label="Nome da Jornada (ex: Reabilitação Lombar)" required value={formData.nome} onChange={(e: any) => setFormData({...formData, nome: e.target.value})} />
                <Input label="Data de Início" type="date" required value={formData.data_inicio} onChange={(e: any) => setFormData({...formData, data_inicio: e.target.value})} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Motivo de Entrada</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    value={formData.motivo_entrada}
                    onChange={(e) => setFormData({...formData, motivo_entrada: e.target.value})}
                    placeholder="Descreva a queixa principal ou motivo do novo ciclo..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Objetivos Terapêuticos</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    value={formData.objetivos}
                    onChange={(e) => setFormData({...formData, objetivos: e.target.value})}
                    placeholder="Quais os principais objetivos para este ciclo?"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1" loading={isSubmitting}>Iniciar Jornada</Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Alta Clínica */}
      {isDischargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Registrar Alta Clínica</h2>
                <button onClick={() => setIsDischargeModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleDischarge} className="space-y-4">
                <Input label="Data de Alta" type="date" required value={dischargeData.data_fim} onChange={(e: any) => setDischargeData({...dischargeData, data_fim: e.target.value})} />
                <Input label="SAUA Final" value={dischargeData.saua_final} onChange={(e: any) => setDischargeData({...dischargeData, saua_final: e.target.value})} />
                <Input label="Ganho Total (ex: +40% Vagal)" value={dischargeData.ganho_total} onChange={(e: any) => setDischargeData({...dischargeData, ganho_total: e.target.value})} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Evolução Global</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    value={dischargeData.evolucao_global}
                    onChange={(e) => setDischargeData({...dischargeData, evolucao_global: e.target.value})}
                    placeholder="Resumo da evolução do paciente ao longo desta jornada..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="secondary" className="flex-1" onClick={() => setIsDischargeModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" variant="danger" className="flex-1" loading={isSubmitting}>Confirmar Alta</Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ProntuarioView({ 
  pacienteId, 
  pacientes, 
  sessoes, 
  jornadas, 
  laudos, 
  profissionais,
  onDownloadLaudo,
  onBack 
}: { 
  pacienteId: string, 
  pacientes: Paciente[], 
  sessoes: Sessao[], 
  jornadas: Jornada[], 
  laudos: Laudo[], 
  profissionais: Profissional[],
  onDownloadLaudo: (laudo: Laudo) => void,
  onBack: () => void 
}) {
  const paciente = pacientes.find(p => p.id === pacienteId);
  const pacienteSessoes = sessoes.filter(s => s.paciente_id === pacienteId).sort((a, b) => new Date(b.data_sessao).getTime() - new Date(a.data_sessao).getTime());
  const pacienteJornadas = jornadas.filter(j => j.paciente_id === pacienteId);
  const pacienteLaudos = laudos.filter(l => l.paciente_id === pacienteId).sort((a, b) => new Date(b.data_geracao).getTime() - new Date(a.data_geracao).getTime());

  // Agrupar laudos por sessão
  const laudosAgrupados = pacienteLaudos.reduce((acc, laudo) => {
    const sessao = sessoes.find(s => s.id === laudo.sessao_id);
    const key = sessao ? `Sessão #${sessao.sessao_n} - ${formatDate(sessao.data_sessao)}` : 'Relatórios Gerais / Outros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(laudo);
    return acc;
  }, {} as Record<string, Laudo[]>);

  if (!paciente) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <AlertCircle size={48} className="text-slate-300" />
      <p className="text-slate-500 font-medium">Paciente não encontrado.</p>
      <Button onClick={onBack} variant="secondary">Voltar para Lista</Button>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        <button onClick={onBack} className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">
          <ArrowLeft size={24} />
        </button>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{paciente.nome}</h1>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase",
              paciente.status === 'Ativo' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {paciente.status}
            </span>
          </div>
          <p className="text-slate-500 text-sm md:text-base">Prontuário Clínico Digital • ID: {paciente.id_paciente}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Lateral: Info do Paciente */}
        <div className="space-y-6">
          <Card title="Dados do Paciente" icon={UserIcon}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Sexo</p>
                  <p className="text-slate-700 font-medium">{paciente.sexo === 'M' ? 'Masculino' : paciente.sexo === 'F' ? 'Feminino' : 'Outro'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nascimento</p>
                  <p className="text-slate-700 font-medium">{formatDate(paciente.data_nascimento)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Telefone</p>
                <p className="text-slate-700 font-medium">{paciente.telefone || 'Não informado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Primeira Avaliação</p>
                <p className="text-slate-700 font-medium">{formatDate(paciente.primeira_avaliacao)}</p>
              </div>
              <div className="pt-4 border-t border-slate-50">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Diagnóstico Principal</p>
                <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 italic">
                  "{paciente.diagnostico_principal || 'Sem diagnóstico registrado'}"
                </div>
              </div>
              {paciente.observacoes && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Observações</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{paciente.observacoes}</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Jornadas Clínicas" icon={ChevronRight}>
            <div className="space-y-4">
              {pacienteJornadas.length > 0 ? pacienteJornadas.sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()).map(j => (
                <div key={j.id} className="p-4 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{j.nome}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        {formatDate(j.data_inicio)} {j.data_fim ? `— ${formatDate(j.data_fim)}` : '(Ativa)'}
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      j.status === 'Ativo' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                    )}>
                      {j.status}
                    </span>
                  </div>
                  {j.status === 'Encerrado' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">SAUA Final</p>
                        <p className="text-xs font-bold text-slate-700">{j.saua_final || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Ganho</p>
                        <p className="text-xs font-bold text-emerald-600">{j.ganho_total || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma jornada registrada.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Coluna Central: Timeline de Sessões */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="text-indigo-600" size={20} />
              Histórico de Sessões
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{pacienteSessoes.length} Sessões</span>
          </div>

          <div className="space-y-4 relative before:absolute before:left-6 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-100">
            {pacienteSessoes.length > 0 ? pacienteSessoes.map((s, idx) => (
              <div key={s.id} className="relative pl-12">
                <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 z-10" />
                <Card className="hover:border-indigo-100 transition-all cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Sessão #{s.sessao_n}</p>
                      <h4 className="font-bold text-slate-900 text-lg">{formatDate(s.data_sessao)}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium">Qualidade do Sinal</p>
                      <span className={cn(
                        "text-xs font-bold",
                        s.qualidade_sinal === 'Excelente' ? "text-emerald-500" : "text-amber-500"
                      )}>{s.qualidade_sinal}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-slate-50 rounded-2xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">RMSSD Pré</p>
                      <p className="text-lg font-bold text-slate-900">{s.vfc_pre_pos?.rmssd.pre.toFixed(1)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-2xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">RMSSD Pós</p>
                      <p className="text-lg font-bold text-slate-900">{s.vfc_pre_pos?.rmssd.pos.toFixed(1)}</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-2xl text-center">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Delta</p>
                      <p className="text-lg font-bold text-indigo-600">
                        {((s.vfc_pre_pos?.rmssd.pos! - s.vfc_pre_pos?.rmssd.pre!) / s.vfc_pre_pos?.rmssd.pre! * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fase:</span>
                      <span className="text-xs font-semibold text-slate-600">{s.fase}</span>
                    </div>
                    <div className="flex gap-2">
                      {pacienteLaudos.find(l => l.sessao_id === s.id) && (
                        <Button 
                          variant="outline" 
                          className="text-[10px] h-7 px-2 border-indigo-200 text-indigo-600" 
                          icon={FileText}
                          onClick={(e: any) => {
                            e.stopPropagation();
                            onDownloadLaudo(pacienteLaudos.find(l => l.sessao_id === s.id)!);
                          }}
                        >
                          Laudo
                        </Button>
                      )}
                      <Button variant="ghost" className="text-xs h-8 px-3">Ver Detalhes</Button>
                    </div>
                  </div>
                </Card>
              </div>
            )) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 ml-12">
                <Activity size={40} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">Nenhuma sessão realizada para este paciente.</p>
              </div>
            )}
          </div>

          {/* Laudos */}
          <div className="pt-10">
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
              <ClipboardList className="text-indigo-600" size={20} />
              Laudos e Relatórios
            </h3>
            <div className="space-y-8">
              {Object.keys(laudosAgrupados).length > 0 ? Object.entries(laudosAgrupados).map(([grupo, items]) => (
                <div key={grupo} className="space-y-4">
                  <div className="flex items-center gap-2 px-4 py-1 bg-slate-100 rounded-full w-fit">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{grupo}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map(l => (
                      <Card key={l.id} className="hover:shadow-md transition-shadow border-l-4 border-l-indigo-500">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <FileText size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{formatDate(l.data_geracao)}</p>
                            <h4 className="font-bold text-slate-900 truncate">Laudo de Sessão</h4>
                            <p className="text-sm text-slate-500 line-clamp-2 mt-2">{l.conteudo}</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                          <Button variant="ghost" className="text-xs h-8 px-3" icon={Download} onClick={() => onDownloadLaudo(l)}>Baixar PDF</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="bg-slate-50 rounded-3xl p-8 text-center border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm italic">Nenhum laudo gerado ainda.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EquipeView({ profissionais, user }: { profissionais: Profissional[], user: any }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    profissao: '',
    conselho: '',
    registro: '',
    email: '',
    telefone: '',
    foto_url: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64 in Firestore
        console.error("A imagem é muito grande. Por favor, escolha uma imagem menor que 500KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, foto_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (editingProfissional) {
      setFormData({
        nome: editingProfissional.nome,
        profissao: editingProfissional.profissao,
        conselho: editingProfissional.conselho,
        registro: editingProfissional.registro,
        email: editingProfissional.email,
        telefone: editingProfissional.telefone,
        foto_url: editingProfissional.foto_url || ''
      });
    } else {
      setFormData({
        nome: '',
        profissao: '',
        conselho: '',
        registro: '',
        email: '',
        telefone: '',
        foto_url: ''
      });
    }
  }, [editingProfissional]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const path = 'profissionais';
    try {
      if (editingProfissional) {
        await updateDoc(doc(db, path, editingProfissional.id!), {
          ...formData,
        });
        toast.success('Profissional atualizado!', {
          description: `${formData.nome} foi atualizado com sucesso.`
        });
      } else {
        await addDoc(collection(db, path), {
          ...formData,
          data_cadastro: new Date().toISOString(),
          uid: user.uid
        });
        toast.success('Profissional cadastrado!', {
          description: `${formData.nome} foi adicionado à equipe.`
        });
      }
      setIsModalOpen(false);
      setEditingProfissional(null);
    } catch (error) {
      handleFirestoreError(error, editingProfissional ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'profissionais';
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Equipe Multidisciplinar</h2>
          <p className="text-slate-500 text-sm md:text-base">Gerencie os profissionais que atendem em sua clínica.</p>
        </div>
        <Button onClick={() => { setEditingProfissional(null); setIsModalOpen(true); }} icon={Plus} className="w-full sm:w-auto">
          Novo Profissional
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profissionais.map((prof) => (
          <Card key={prof.id} className="hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="relative group">
                {prof.foto_url ? (
                  <img src={prof.foto_url} alt={prof.nome} className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-100" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border-2 border-indigo-100">
                    <UserIcon size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 truncate">{prof.nome}</h3>
                <p className="text-indigo-600 font-medium text-sm">{prof.profissao}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    {prof.conselho}: {prof.registro}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{prof.email}</p>
                  <p className="text-xs text-slate-500">{prof.telefone}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2">
              <Button variant="ghost" className="p-2 h-auto" onClick={() => { setEditingProfissional(prof); setIsModalOpen(true); }}>
                <Edit size={16} className="text-slate-400" />
              </Button>
              <Button variant="ghost" className="p-2 h-auto text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(prof.id!)}>
                <Trash2 size={16} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {editingProfissional ? 'Editar Profissional' : 'Novo Profissional'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input
                      label="Nome Completo"
                      required
                      value={formData.nome}
                      onChange={(e: any) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Dr. João Silva"
                    />
                  </div>
                  <Input
                    label="Profissão"
                    required
                    value={formData.profissao}
                    onChange={(e: any) => setFormData({ ...formData, profissao: e.target.value })}
                    placeholder="Ex: Fisioterapeuta"
                  />
                  <Input
                    label="Conselho"
                    required
                    value={formData.conselho}
                    onChange={(e: any) => setFormData({ ...formData, conselho: e.target.value })}
                    placeholder="Ex: CREFITO"
                  />
                  <Input
                    label="Registro"
                    required
                    value={formData.registro}
                    onChange={(e: any) => setFormData({ ...formData, registro: e.target.value })}
                    placeholder="Ex: 12345-F"
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    value={formData.email}
                    onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="joao@exemplo.com"
                  />
                  <Input
                    label="Telefone"
                    value={formData.telefone}
                    onChange={(e: any) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-slate-700 mb-1.5 block">Foto do Profissional</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                        {formData.foto_url ? (
                          <img src={formData.foto_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="text-slate-400" size={24} />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                          id="foto-upload"
                        />
                        <label
                          htmlFor="foto-upload"
                          className="inline-flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <Plus size={16} className="mr-2" />
                          Selecionar Foto
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">Máximo 500KB. Recomendado 1:1.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" loading={isSubmitting}>
                    {editingProfissional ? 'Salvar Alterações' : 'Cadastrar Profissional'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsView({ 
  theme, 
  setTheme,
  hoverEffects,
  setHoverEffects,
  blurredBackground,
  setBlurredBackground,
  microInteractions,
  setMicroInteractions,
  darkMode,
  setDarkMode,
  glassEffect,
  setGlassEffect,
  profissionais, 
  user 
}: { 
  theme: string, 
  setTheme: (t: string) => void,
  hoverEffects: boolean,
  setHoverEffects: (b: boolean) => void,
  blurredBackground: boolean,
  setBlurredBackground: (b: boolean) => void,
  microInteractions: boolean,
  setMicroInteractions: (b: boolean) => void,
  darkMode: boolean,
  setDarkMode: (b: boolean) => void,
  glassEffect: boolean,
  setGlassEffect: (b: boolean) => void,
  profissionais: Profissional[], 
  user: any 
}) {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    profissionalId: '',
    role: 'Profissional'
  });

  const themes = [
    { id: 'theme-indigo', name: 'NeuroFlow (Padrão)', color: '#4f46e5', font: 'Inter' },
    { id: 'theme-emerald', name: 'Natureza (Verde)', color: '#059669', font: 'Outfit' },
    { id: 'theme-rose', name: 'Elegante (Rosa)', color: '#e11d48', font: 'Playfair Display' },
    { id: 'theme-amber', name: 'Acolhedor (Âmbar)', color: '#d97706', font: 'Montserrat' },
    { id: 'theme-midnight', name: 'Meia-Noite (Escuro)', color: '#0ea5e9', font: 'Space Grotesk' },
  ];

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'users_config';
    try {
      // In a real app, you'd use Firebase Admin or a backend to create the user
      // For this prototype, we'll store the intent in a 'users_config' collection
      await addDoc(collection(db, path), {
        ...newUser,
        clinicId: user.uid,
        createdAt: new Date().toISOString()
      });
      console.log("Configuração de novo usuário salva! Nota: Para habilitar o login por e-mail/senha, é necessário ativar o provedor no Console do Firebase.");
      setIsUserModalOpen(false);
      setNewUser({ email: '', password: '', profissionalId: '', role: 'Profissional' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Configurações do Sistema</h1>
        <p className="text-slate-500 text-sm md:text-base">Personalize o visual e gerencie acessos da sua clínica.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Temas */}
        <Card title="Personalização Visual" icon={Settings}>
          <div className="space-y-6">
            <p className="text-sm text-slate-500">Escolha um tema para alterar cores e fontes de todo o sistema.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md",
                    theme === t.id ? "border-[var(--primary)] bg-slate-50" : "border-slate-100 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="font-bold text-slate-900">{t.name}</span>
                  </div>
                  <p className="text-xs text-slate-400">Fonte: {t.font}</p>
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-slate-100 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recursos Visuais</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                      <MousePointer2 size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Efeitos de Passar o Mouse</p>
                      <p className="text-[10px] text-slate-400">Animações suaves ao interagir com elementos.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setHoverEffects(!hoverEffects)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      hoverEffects ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      hoverEffects ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                      <Layers size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Desfoque (Blurred Background)</p>
                      <p className="text-[10px] text-slate-400">Efeito de profundidade em modais e menus.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setBlurredBackground(!blurredBackground)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      blurredBackground ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      blurredBackground ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                      <Zap size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Microinterações</p>
                      <p className="text-[10px] text-slate-400">Pequenas animações de feedback visual.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setMicroInteractions(!microInteractions)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      microInteractions ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      microInteractions ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                      {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Modo Escuro (Dark Mode)</p>
                      <p className="text-[10px] text-slate-400">Alternar entre tema claro e escuro.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      darkMode ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      darkMode ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                      <Box size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Efeito de Vidro (Glass Effect)</p>
                      <p className="text-[10px] text-slate-400">Transparência moderna em elementos da interface.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setGlassEffect(!glassEffect)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      glassEffect ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      glassEffect ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Gestão de Usuários */}
        <Card title="Gestão de Acessos" icon={Users} action={
          <Button onClick={() => setIsUserModalOpen(true)} icon={Plus} variant="outline" className="text-xs">
            Novo Usuário
          </Button>
        }>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Crie logins para os profissionais da sua equipe.</p>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Nota Técnica:</strong> O sistema utiliza Google Auth por padrão. Para habilitar logins manuais (E-mail/Senha), você deve ativar o provedor "Email/Password" no seu Console do Firebase.
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Usuários Configurados</h4>
              <div className="p-4 bg-slate-50 rounded-2xl text-center">
                <p className="text-sm text-slate-500 italic">Os usuários aparecerão aqui após a ativação do serviço.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 sm:px-8 py-4 sm:py-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">Criar Novo Login</h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-8 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Vincular Profissional</label>
                  <select 
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newUser.profissionalId}
                    onChange={(e) => setNewUser({ ...newUser, profissionalId: e.target.value })}
                    required
                  >
                    <option value="">Selecione um profissional...</option>
                    {profissionais.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.profissao})</option>
                    ))}
                  </select>
                </div>

                <Input 
                  label="E-mail de Login" 
                  type="email" 
                  required 
                  value={newUser.email}
                  onChange={(e: any) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="exemplo@clinica.com"
                />
                
                <Input 
                  label="Senha Provisória" 
                  type="password" 
                  required 
                  value={newUser.password}
                  onChange={(e: any) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                />

                <div className="pt-4 flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setIsUserModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1">Criar Acesso</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InstrucoesView() {
  const steps = [
    { title: "1. Cadastrar Paciente", desc: "Inicie criando o perfil do paciente com dados demográficos e histórico clínico.", icon: Users },
    { title: "2. Registrar Sessão", desc: "Insira os dados fisiológicos coletados (RMSSD, HRV) após o atendimento.", icon: Activity },
    { title: "3. Analisar com IA", desc: "Use o motor de cálculos e a IA para gerar insights automáticos sobre a sessão.", icon: Brain },
    { title: "4. Acompanhar Evolução", desc: "Visualize o dashboard longitudinal para identificar tendências e alertas.", icon: TrendingUp },
    { title: "5. Gerar Relatórios", desc: "Exporte laudos e relatórios customizados para o paciente ou outros profissionais.", icon: FileText },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Guia de Onboarding</h1>
        <p className="text-slate-500 text-sm md:text-base">Aprenda a utilizar todo o potencial do NeuroFlow Analytics.</p>
      </header>

      <div className="space-y-6">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm items-start">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <step.icon size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm md:text-base">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormularioSessaoView({ pacientes, jornadas, profissionais, user, pacienteId }: { pacientes: Paciente[], jornadas: Jornada[], profissionais: Profissional[], user: any, pacienteId?: string }) {
  const moods = [
    { emoji: '😞', label: 'Péssimo' },
    { emoji: '🙁', label: 'Ruim' },
    { emoji: '😐', label: 'Neutro' },
    { emoji: '🙂', label: 'Bom' },
    { emoji: '😄', label: 'Excelente' },
  ];

  const evaOptions = [
    { value: 0, color: '#10b981', label: 'Sem Dor' },
    { value: 1, color: '#34d399', label: 'Mínima' },
    { value: 2, color: '#6ee7b7', label: 'Leve' },
    { value: 3, color: '#a3e635', label: 'Leve' },
    { value: 4, color: '#fde047', label: 'Moderada' },
    { value: 5, color: '#facc15', label: 'Moderada' },
    { value: 6, color: '#fdba74', label: 'Forte' },
    { value: 7, color: '#fb923c', label: 'Forte' },
    { value: 8, color: '#f87171', label: 'Muito Forte' },
    { value: 9, color: '#ef4444', label: 'Muito Forte' },
    { value: 10, color: '#dc2626', label: 'Insuportável' },
  ];
  const [analyzing, setAnalyzing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showBioPreview, setShowBioPreview] = useState(false);
  const [savingLaudo, setSavingLaudo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Sessao>>({
    paciente_id: pacienteId || '',
    jornada_id: '',
    sessao_n: 1,
    data_sessao: new Date().toISOString().split('T')[0],
    fase: '',
    qualidade_sinal: 'Boa',
    queixa_principal: '',
    vfc_pre_pos: {
      fc_media: { pre: 0, pos: 0 },
      rmssd: { pre: 0, pos: 0 },
      sdnn: { pre: 0, pos: 0 },
      pnn50: { pre: 0, pos: 0 },
      lfhf: { pre: 0, pos: 0 },
      total_power: { pre: 0, pos: 0 },
    },
    contexto_clinico: {
      dor_eva: 0,
      mobilidade: 10,
      forca: 10,
      controle_motor: 10,
      gordura_corporal: 0,
      agua_ice: 0,
      idade_celular: 0,
      horas_sono: 0,
      qualidade_sono: 0,
      nivel_stress: 0,
      estado_humor: '',
      conduta: '',
      massa_gorda: 0,
      percentual_gordura: 0,
      agua_corporal_total: 0,
      indice_hidratacao: 0,
      agua_massa_magra: 0,
      intracelular: 0,
      agua_intracelular_percentual: 0,
      extracelular: 0,
      massa_magra: 0,
      razao_musculo_gordura: 0,
      massa_muscular: 0,
      imc: 0,
      idade: 0,
      taxa_metabolica_basal: 0,
      angulo_fase: 0,
    },
    resposta_subjetiva: '',
    resultados_automaticos: {
      saua_pre: '',
      classificacao: '',
      saua_pos: '',
      das: '',
      ira: '',
      metabolico: '',
      locomotor: 0,
      integrado: '',
      iet: '',
      isc: '',
      ir: '',
    },
    observacoes: '',
    profissional_id: '',
  });

  useEffect(() => {
    if (pacienteId) {
      setFormData(prev => ({ ...prev, paciente_id: pacienteId }));
    }
  }, [pacienteId]);

  // Auto-select active journey when patient changes
  useEffect(() => {
    if (formData.paciente_id) {
      const activeJornada = jornadas.find(j => j.paciente_id === formData.paciente_id && j.status === 'Ativo');
      if (activeJornada) {
        setFormData(prev => ({ ...prev, jornada_id: activeJornada.id }));
      } else {
        setFormData(prev => ({ ...prev, jornada_id: '' }));
      }
    }
  }, [formData.paciente_id, jornadas]);

  const handleAnalyzeIA = async () => {
    if (!formData.paciente_id) {
      console.error("Selecione um paciente primeiro.");
      return;
    }
    setAnalyzing(true);
    try {
      const results = await calculateAutomaticResults(formData);
      setFormData(prev => ({
        ...prev,
        resultados_automaticos: results
      }));
    } catch (error) {
      console.error("Erro ao processar análise com IA:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const paciente = pacientes.find(p => p.id === formData.paciente_id);
    
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text("Relatório de Sessão NeuroFlow", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Paciente: ${paciente?.nome || 'N/A'}`, 20, 35);
    doc.text(`Data: ${formData.data_sessao}`, 20, 42);
    doc.text(`Sessão nº: ${formData.sessao_n}`, 20, 49);
    
    doc.setDrawColor(200);
    doc.line(20, 55, 190, 55);
    
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Resultados SAUA", 20, 65);
    
    const res = formData.resultados_automaticos!;
    let y = 75;
    const items = [
      ["SAUA Pré", res.saua_pre],
      ["Classificação", res.classificacao],
      ["SAUA Pós", res.saua_pos],
      ["DAS", res.das],
      ["IRA", res.ira],
      ["Metabólico", res.metabolico],
      ["Locomotor", res.locomotor?.toString()],
      ["Integrado", res.integrado],
      ["IET", res.iet],
      ["ISC", res.isc],
      ["IR", res.ir],
    ];
    
    const contextItems = [
      ["Dor EVA", formData.contexto_clinico?.dor_eva?.toString()],
      ["Mobilidade", formData.contexto_clinico?.mobilidade?.toString()],
      ["Força", formData.contexto_clinico?.forca?.toString()],
      ["Controle Motor", formData.contexto_clinico?.controle_motor?.toString()],
      ["Horas de Sono", formData.contexto_clinico?.horas_sono?.toString()],
      ["Qualidade do Sono", formData.contexto_clinico?.qualidade_sono?.toString()],
      ["Nível de Stress", formData.contexto_clinico?.nivel_stress?.toString()],
      ["Estado de Humor", formData.contexto_clinico?.estado_humor],
      ["Massa Gorda", formData.contexto_clinico?.massa_gorda?.toString()],
      ["% Gordura", formData.contexto_clinico?.percentual_gordura?.toString()],
      ["Água Corporal Total", formData.contexto_clinico?.agua_corporal_total?.toString()],
      ["Índice de Hidratação", formData.contexto_clinico?.indice_hidratacao?.toString()],
      ["Água na Massa Magra", formData.contexto_clinico?.agua_massa_magra?.toString()],
      ["Intracelular", formData.contexto_clinico?.intracelular?.toString()],
      ["Água Intracelular %", formData.contexto_clinico?.agua_intracelular_percentual?.toString()],
      ["Extracelular", formData.contexto_clinico?.extracelular?.toString()],
      ["Massa Magra", formData.contexto_clinico?.massa_magra?.toString()],
      ["Razão Músculo Gordura", formData.contexto_clinico?.razao_musculo_gordura?.toString()],
      ["Massa Muscular", formData.contexto_clinico?.massa_muscular?.toString()],
      ["IMC", formData.contexto_clinico?.imc?.toString()],
      ["Idade", formData.contexto_clinico?.idade?.toString()],
      ["TMB", formData.contexto_clinico?.taxa_metabolica_basal?.toString()],
      ["Ângulo de Fase", formData.contexto_clinico?.angulo_fase?.toString()],
      ["Idade Celular", formData.contexto_clinico?.idade_celular?.toString()],
    ].filter(([_, value]) => value && value !== '0' && value !== '');
    
    items.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.text(`${label}:`, 20, y);
      doc.setFont("helvetica", "bold");
      doc.text(value || 'N/A', 60, y);
      doc.setFont("helvetica", "normal");
      y += 7;
    });
    
    y += 5;
    doc.setFontSize(14);
    doc.text("Contexto Clínico", 20, y);
    y += 10;
    
    contextItems.forEach(([label, value]) => {
      doc.setFontSize(10);
      doc.text(`${label}:`, 20, y);
      doc.setFont("helvetica", "bold");
      doc.text(value || 'N/A', 60, y);
      doc.setFont("helvetica", "normal");
      y += 7;
    });
    
    if ((res as any).analise_texto) {
      y += 10;
      doc.setFontSize(14);
      doc.text("Análise Clínica IA", 20, y);
      y += 10;
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize((res as any).analise_texto, 170);
      doc.text(splitText, 20, y);
      y += splitText.length * 5 + 10;
    }

    // Assinatura do Profissional
    const profissional = profissionais.find(p => p.id === formData.profissional_id);
    if (profissional) {
      if (y > 250) {
        doc.addPage();
        y = 30;
      } else {
        y += 20;
      }
      
      doc.setDrawColor(150);
      doc.line(60, y, 150, y);
      y += 5;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(profissional.nome, 105, y, { align: "center" });
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`${profissional.profissao} - ${profissional.conselho}: ${profissional.registro}`, 105, y, { align: "center" });
      y += 5;
      doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 105, y, { align: "center" });
    }
    
    doc.save(`relatorio-${paciente?.nome || 'sessao'}-${formData.data_sessao}.pdf`);
  };

  const handleSaveLaudo = async () => {
    if (!formData.paciente_id) {
      toast.error("Selecione um paciente");
      return;
    }
    if (!(formData.resultados_automaticos as any)?.analise_texto) {
      toast.error("Gere a análise IA primeiro");
      return;
    }

    setSavingLaudo(true);
    const pathSessoes = 'sessoes';
    const pathLaudos = 'laudos';
    try {
      // 1. Save the session first to get the ID
      const sessionRef = await addDoc(collection(db, pathSessoes), {
        ...formData,
        uid: user.uid,
        data_sessao: new Date(formData.data_sessao!).toISOString(),
      });

      // 2. Save the laudo
      await addDoc(collection(db, pathLaudos), {
        sessao_id: sessionRef.id,
        paciente_id: formData.paciente_id,
        profissional_id: formData.profissional_id || null,
        conteudo: (formData.resultados_automaticos as any).analise_texto,
        data_geracao: new Date().toISOString(),
        uid: user.uid
      });

      toast.success('Sessão e Laudo salvos!', {
        description: 'Os dados foram registrados no prontuário do paciente.'
      });
      setShowReport(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, pathLaudos);
    } finally {
      setSavingLaudo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.paciente_id) {
      toast.error("Selecione um paciente");
      return;
    }
    
    setIsSubmitting(true);
    const path = 'sessoes';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        uid: user.uid,
        data_sessao: new Date(formData.data_sessao!).toISOString(),
      });
      toast.success('Sessão salva com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="bg-indigo-950 text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-xl">
        <h2 className="text-xl font-bold tracking-tight uppercase">UPON ACTION | FORMULÁRIO DE ENTRADA E ANÁLISE DA SESSÃO ATUAL</h2>
        <Activity className="opacity-50" size={24} />
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        <div className="lg:col-span-2 space-y-8">
          {/* Identificação */}
          <Card title="Identificação">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PatientSearchSelect 
                label="Paciente" 
                required
                pacientes={pacientes}
                value={formData.paciente_id || ''} 
                onChange={(val: string) => setFormData({...formData, paciente_id: val})}
              />
              <Select 
                label="Jornada Clínica" 
                required
                value={formData.jornada_id} 
                onChange={(e: any) => setFormData({...formData, jornada_id: e.target.value})}
                options={[
                  { value: '', label: 'Selecione uma jornada...' },
                  ...jornadas.filter(j => j.paciente_id === formData.paciente_id).map(j => ({ value: j.id, label: `${j.nome} (${j.status})` }))
                ]}
              />
              <Select 
                label="Profissional Responsável" 
                required
                value={formData.profissional_id} 
                onChange={(e: any) => setFormData({...formData, profissional_id: e.target.value})}
                options={[
                  { value: '', label: 'Selecione um profissional...' },
                  ...profissionais.map(p => ({ value: p.id, label: p.nome }))
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <Input label="Sessão nº" type="number" value={formData.sessao_n} onChange={(e: any) => setFormData({...formData, sessao_n: parseInt(e.target.value)})} />
              <Input label="Data avaliação" type="date" value={formData.data_sessao} onChange={(e: any) => setFormData({...formData, data_sessao: e.target.value})} />
              <Input label="Fase" value={formData.fase} onChange={(e: any) => setFormData({...formData, fase: e.target.value})} />
              <Select 
                label="Qualidade do sinal" 
                value={formData.qualidade_sinal} 
                onChange={(e: any) => setFormData({...formData, qualidade_sinal: e.target.value})}
                options={[
                  { value: 'Excelente', label: 'Excelente' },
                  { value: 'Boa', label: 'Boa' },
                  { value: 'Regular', label: 'Regular' },
                  { value: 'Ruim', label: 'Ruim' },
                ]}
              />
            </div>
            <div className="mt-4">
              <Input label="Queixa principal" value={formData.queixa_principal} onChange={(e: any) => setFormData({...formData, queixa_principal: e.target.value})} />
            </div>
          </Card>

          {/* VFC pré e pós */}
          <Card title="VFC pré e pós">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2">Parâmetro</th>
                    <th className="px-4 py-2">Pré</th>
                    <th className="px-4 py-2">Pós</th>
                    <th className="px-4 py-2">Unid.</th>
                    <th className="px-4 py-2">Comentário clínico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { id: 'fc_media', label: 'FC média', unit: 'bpm', comment: 'Menor em repouso costuma refletir' },
                    { id: 'rmssd', label: 'RMSSD', unit: 'ms', comment: 'Principal marcador de recuperação vagal' },
                    { id: 'sdnn', label: 'SDNN', unit: 'ms', comment: 'Variabilidade global' },
                    { id: 'pnn50', label: 'pNN50', unit: '%', comment: 'Modulação vagal rápida' },
                    { id: 'lfhf', label: 'LF/HF', unit: '-', comment: 'Equilíbrio simpato-vagal' },
                    { id: 'total_power', label: 'Total Power', unit: 'ms²', comment: 'Reserva autonômica global' },
                  ].map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-2 font-medium">{row.label}</td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          className="w-20 px-2 py-1 border rounded" 
                          value={(formData.vfc_pre_pos as any)?.[row.id]?.pre} 
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFormData({
                              ...formData,
                              vfc_pre_pos: {
                                ...formData.vfc_pre_pos!,
                                [row.id]: { ...(formData.vfc_pre_pos as any)?.[row.id], pre: val }
                              }
                            });
                          }}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          className="w-20 px-2 py-1 border rounded" 
                          value={(formData.vfc_pre_pos as any)?.[row.id]?.pos} 
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFormData({
                              ...formData,
                              vfc_pre_pos: {
                                ...formData.vfc_pre_pos!,
                                [row.id]: { ...(formData.vfc_pre_pos as any)?.[row.id], pos: val }
                              }
                            });
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 text-slate-500">{row.unit}</td>
                      <td className="px-4 py-2 text-xs text-slate-400 italic">{row.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Contexto clínico complementar */}
          <Card title="Contexto clínico complementar">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="col-span-1 md:col-span-4 space-y-2">
                <label className="text-sm font-medium text-[var(--text-main)]">Escala de Dor (EVA)</label>
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  {evaOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, dor_eva: opt.value}})}
                      className={cn(
                        "flex-1 min-w-[40px] h-12 flex flex-col items-center justify-center rounded-lg transition-all border-2",
                        formData.contexto_clinico?.dor_eva === opt.value 
                          ? "scale-105 shadow-md border-slate-400" 
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                      style={{ backgroundColor: opt.color }}
                      title={opt.label}
                    >
                      <span className="text-white font-bold text-lg leading-none">{opt.value}</span>
                      <span className="text-[8px] text-white/90 font-medium uppercase tracking-tighter">{opt.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Mobilidade 0-10" type="number" value={formData.contexto_clinico?.mobilidade} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, mobilidade: parseFloat(e.target.value)}})} />
              <Input label="Força 0-10" type="number" value={formData.contexto_clinico?.forca} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, forca: parseFloat(e.target.value)}})} />
              <Input label="Controle motor 0-10" type="number" value={formData.contexto_clinico?.controle_motor} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, controle_motor: parseFloat(e.target.value)}})} />
              <Input label="Horas de Sono" type="number" value={formData.contexto_clinico?.horas_sono} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, horas_sono: parseFloat(e.target.value)}})} />
              <Input label="Qualidade do Sono (0-10)" type="number" value={formData.contexto_clinico?.qualidade_sono} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, qualidade_sono: parseFloat(e.target.value)}})} />
              <Input label="Nível de Stress" type="number" value={formData.contexto_clinico?.nivel_stress} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, nivel_stress: parseFloat(e.target.value)}})} />
              
              <div className="col-span-1 md:col-span-4 mt-4 border-t pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Gordura</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Massa Gorda (kg)" type="number" value={formData.contexto_clinico?.massa_gorda} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, massa_gorda: parseFloat(e.target.value)}})} />
                  <Input label="% Gordura" type="number" value={formData.contexto_clinico?.percentual_gordura} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, percentual_gordura: parseFloat(e.target.value)}})} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-4 mt-4 border-t pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Hidratação</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Água Corporal Total (L)" type="number" value={formData.contexto_clinico?.agua_corporal_total} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, agua_corporal_total: parseFloat(e.target.value)}})} />
                  <Input label="Índice de Hidratação" type="number" value={formData.contexto_clinico?.indice_hidratacao} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, indice_hidratacao: parseFloat(e.target.value)}})} />
                  <Input label="Água na Massa Magra" type="number" value={formData.contexto_clinico?.agua_massa_magra} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, agua_massa_magra: parseFloat(e.target.value)}})} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-4 mt-4 border-t pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Água Intra e Extra Celular</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Intracelular (L)" type="number" value={formData.contexto_clinico?.intracelular} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, intracelular: parseFloat(e.target.value)}})} />
                  <Input label="Água Intracelular %" type="number" value={formData.contexto_clinico?.agua_intracelular_percentual} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, agua_intracelular_percentual: parseFloat(e.target.value)}})} />
                  <Input label="Extracelular (L)" type="number" value={formData.contexto_clinico?.extracelular} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, extracelular: parseFloat(e.target.value)}})} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-4 mt-4 border-t pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Massa Magra e Muscular</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Massa Magra (kg)" type="number" value={formData.contexto_clinico?.massa_magra} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, massa_magra: parseFloat(e.target.value)}})} />
                  <Input label="Razão Músculo Gordura" type="number" value={formData.contexto_clinico?.razao_musculo_gordura} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, razao_musculo_gordura: parseFloat(e.target.value)}})} />
                  <Input label="Massa Muscular (kg)" type="number" value={formData.contexto_clinico?.massa_muscular} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, massa_muscular: parseFloat(e.target.value)}})} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-4 mt-4 border-t pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Peso, Altura e TMB</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="IMC" type="number" value={formData.contexto_clinico?.imc} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, imc: parseFloat(e.target.value)}})} />
                  <Input label="Idade" type="number" value={formData.contexto_clinico?.idade} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, idade: parseFloat(e.target.value)}})} />
                  <Input label="Taxa Metabólica Basal (kcal)" type="number" value={formData.contexto_clinico?.taxa_metabolica_basal} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, taxa_metabolica_basal: parseFloat(e.target.value)}})} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-4 mt-4 border-t pt-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Análise Celular</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Ângulo de Fase" type="number" value={formData.contexto_clinico?.angulo_fase} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, angulo_fase: parseFloat(e.target.value)}})} />
                  <Input label="Idade" type="number" value={formData.contexto_clinico?.idade} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, idade: parseFloat(e.target.value)}})} />
                  <Input label="Idade Celular" type="number" value={formData.contexto_clinico?.idade_celular} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, idade_celular: parseFloat(e.target.value)}})} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-4 mt-4 border-t pt-4">
                <label className="text-sm font-medium text-[var(--text-main)]">Estado de Humor</label>
                <div className="flex gap-2 p-1 bg-slate-50 rounded-lg border border-slate-200 w-fit">
                  {moods.map((m) => (
                    <button
                      key={m.label}
                      type="button"
                      title={m.label}
                      onClick={() => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, estado_humor: m.label}})}
                      className={cn(
                        "w-10 h-10 flex items-center justify-center text-2xl rounded-md transition-all",
                        formData.contexto_clinico?.estado_humor === m.label 
                          ? "bg-white shadow-sm scale-110 border border-indigo-100" 
                          : "hover:bg-white/50 grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
                      )}
                    >
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Input label="Conduta" value={formData.contexto_clinico?.conduta} onChange={(e: any) => setFormData({...formData, contexto_clinico: {...formData.contexto_clinico!, conduta: e.target.value}})} />
            </div>
          </Card>

          <Card title="Resposta subjetiva">
            <textarea 
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none h-24"
              value={formData.resposta_subjetiva}
              onChange={(e) => setFormData({...formData, resposta_subjetiva: e.target.value})}
            />
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setShowBioPreview(true)} icon={LayoutDashboard} disabled={!formData.paciente_id}>Pré-visualizar Bioimpedância</Button>
            <Button type="button" variant="outline" onClick={() => setShowReport(true)} disabled={!formData.resultados_automaticos?.classificacao || formData.resultados_automaticos.classificacao === ''}>Visualizar Relatório Completo</Button>
            <Button type="submit" className="px-8 py-3 text-lg" loading={isSubmitting}>Salvar na Ficha do Paciente</Button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Resultados automáticos */}
          <Card title="Resultados automáticos" className="bg-slate-50" action={
            <Button size="sm" variant="outline" onClick={handleAnalyzeIA} disabled={analyzing} icon={Brain}>
              {analyzing ? 'Analisando...' : 'Gerar Análise IA'}
            </Button>
          }>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'SAUA pré', value: formData.resultados_automaticos?.saua_pre },
                { label: 'Classificação', value: formData.resultados_automaticos?.classificacao },
                { label: 'SAUA pós', value: formData.resultados_automaticos?.saua_pos },
                { label: 'DAS', value: formData.resultados_automaticos?.das },
                { label: 'IRA', value: formData.resultados_automaticos?.ira },
                { label: 'Metabólico', value: formData.resultados_automaticos?.metabolico },
                { label: 'Locomotor', value: formData.resultados_automaticos?.locomotor },
                { label: 'Integrado', value: formData.resultados_automaticos?.integrado },
                { label: 'IET', value: formData.resultados_automaticos?.iet },
                { label: 'ISC', value: formData.resultados_automaticos?.isc },
                { label: 'IR', value: formData.resultados_automaticos?.ir },
              ].filter(res => res.value && res.value !== '#VALOR!' && res.value !== 0).map((res, i) => (
                <div key={i} className="group flex flex-col p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{res.label}</span>
                  <span className="text-sm font-bold text-indigo-600 group-hover:text-indigo-700">{res.value}</span>
                </div>
              ))}
              {(!formData.resultados_automaticos?.classificacao || formData.resultados_automaticos.classificacao === '') && !analyzing && (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <Brain className="text-slate-300" size={24} />
                  </div>
                  <p className="text-xs text-slate-400 italic">Clique em "Gerar Análise IA" para processar os resultados.</p>
                </div>
              )}
            </div>
          </Card>

          {(formData.resultados_automaticos as any)?.analise_texto && (
            <>
              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900 text-sm leading-relaxed">
                <p className="font-bold mb-2 flex items-center gap-2"><Brain size={16} /> Insight da IA:</p>
                {(formData.resultados_automaticos as any).analise_texto}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={exportPDF} 
                  icon={Download} 
                  className="bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                >
                  Baixar PDF
                </Button>
                <Button 
                  onClick={handleSaveLaudo} 
                  icon={FileText} 
                  loading={savingLaudo}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {savingLaudo ? 'Salvando...' : 'Salvar no Prontuário'}
                </Button>
              </div>
            </>
          )}

          <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl text-amber-800 text-sm font-medium">
            {(!formData.resultados_automaticos?.classificacao || formData.resultados_automaticos.classificacao === '') ? 'Aguardando processamento de dados...' : `Estado: ${formData.resultados_automaticos?.classificacao}`}
          </div>
        </div>
      </form>

      {/* Bioimpedance Preview Modal */}
      <AnimatePresence>
        {showBioPreview && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowBioPreview(false)}
                className="absolute top-6 right-6 text-white/50 hover:text-white z-10 p-2 bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <div className="p-4">
                <BioimpedanceDashboard 
                  sessao={formData as Sessao} 
                  paciente={pacientes.find(p => p.id === formData.paciente_id)!} 
                  profissional={profissionais.find(p => p.id === formData.profissional_id)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-2 sm:p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-600 text-white">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Relatório Clínico NeuroFlow</h2>
                  <p className="text-indigo-100 text-sm">Análise gerada por Inteligência Artificial</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button variant="secondary" size="sm" onClick={handleSaveLaudo} icon={FileText} disabled={savingLaudo} className="text-xs sm:text-sm">
                    {savingLaudo ? 'Salvando...' : 'Arquivar'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={exportPDF} icon={Download} className="text-xs sm:text-sm">PDF</Button>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 text-xs sm:text-sm" onClick={() => setShowReport(false)}>Fechar</Button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 sm:space-y-10 bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12">
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dados do Paciente</h3>
                    <div className="space-y-2">
                      <p className="text-xl sm:text-2xl font-bold text-slate-800">{pacientes.find(p => p.id === formData.paciente_id)?.nome}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <span>Data: {formData.data_sessao}</span>
                        <span>Sessão: #{formData.sessao_n}</span>
                      </div>
                    </div>
                  </section>
                  
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status Autonômico</h3>
                    <div className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                      {formData.resultados_automaticos?.classificacao}
                    </div>
                  </section>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {[
                    { label: 'SAUA Pré', value: formData.resultados_automaticos?.saua_pre },
                    { label: 'SAUA Pós', value: formData.resultados_automaticos?.saua_pos },
                    { label: 'IRA', value: formData.resultados_automaticos?.ira },
                    { label: 'ISC', value: formData.resultados_automaticos?.isc },
                    { label: 'IET', value: formData.resultados_automaticos?.iet },
                    { label: 'IR', value: formData.resultados_automaticos?.ir },
                  ].map((item, i) => (
                    <div key={i} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</p>
                      <p className="text-xl font-bold text-indigo-600">{item.value}</p>
                    </div>
                  ))}
                </div>

                <section className="p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Brain className="text-indigo-600" size={20} />
                    Análise Clínica Detalhada
                  </h3>
                  <div className="text-slate-600 leading-relaxed space-y-4">
                    {(formData.resultados_automaticos as any)?.analise_texto ? (
                      <p>{(formData.resultados_automaticos as any).analise_texto}</p>
                    ) : (
                      <p className="italic text-slate-400">Nenhuma análise adicional disponível.</p>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-8">
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <h4 className="text-sm font-bold text-emerald-800 mb-2">Pontos Positivos</h4>
                    <p className="text-xs text-emerald-700">Recuperação vagal dentro dos parâmetros esperados para a fase {formData.fase}.</p>
                  </div>
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                    <h4 className="text-sm font-bold text-amber-800 mb-2">Observações</h4>
                    <p className="text-xs text-amber-700">Monitorar SDNN nas próximas 48h devido à carga de treino relatada.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
