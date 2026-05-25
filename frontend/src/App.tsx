import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Trophy, TrendingUp, Hash, Settings, RefreshCw, BarChart3, Zap,
  Info, Layers, LayoutDashboard, Grid3X3, Download, LogIn, LogOut,
  Moon, Sun, Trash2, Plus, BookOpen, ChevronRight, CheckCircle2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const API_BASE = "http://localhost:8000";

interface GameStats {
  game: string;
  total_draws: number;
  frequency: Record<string, number>;
  hot_numbers: Record<string, number>;
  cold_numbers: Record<string, number>;
}

interface CoOccurrence {
  game: string;
  m: number;
  matrix: number[][];
}

interface PredictionRun {
  id: number;
  game: string;
  method: string;
  picks: number[];
  created_at: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeGame, setActiveGame] = useState('Lotto');
  const [engine, setEngine] = useState('combined');
  
  const [stats, setStats] = useState<GameStats | null>(null);
  const [coOccurrence, setCoOccurrence] = useState<CoOccurrence | null>(null);
  const [runs, setRuns] = useState<PredictionRun[]>([]);
  const [loading, setLoading] = useState(false);
  
  // System parameters
  const [sysN, setSysN] = useState(6);
  const [sysM, setSysM] = useState(49);
  const [sysP, setSysP] = useState(6);
  const [sysK, setSysK] = useState(4);
  const [sysLines, setSysLines] = useState(10);
  const [systemResult, setSystemResult] = useState<number[][]>([]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStats();
      fetchRuns();
      if (activeTab === 'visualizations') fetchCoOccurrence();
    }
  }, [activeGame, activeTab, isLoggedIn, token]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats/${activeGame}`);
      setStats(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchCoOccurrence = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats/${activeGame}/co-occurrence`);
      setCoOccurrence(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchRuns = async () => {
    try {
      const res = await axios.get(`${API_BASE}/runs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRuns(res.data);
    } catch (err) { 
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const res = await axios.post(`${API_BASE}/token`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const newToken = res.data.access_token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setIsLoggedIn(true);
    } catch (err) { 
      console.error(err);
      alert("Login failed: Incorrect username or password"); 
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      alert("Please enter both username and password");
      return;
    }
    setLoading(true);
    try {
      // Body as JSON
      await axios.post(`${API_BASE}/register`, { 
        username: username, 
        password: password 
      });
      alert("Successfully registered! You can now sign in.");
    } catch (err) { 
      console.error(err);
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        alert(`Registration failed: ${err.response.data.detail}`);
      } else {
        alert("Registration failed: Connection error or server issue");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setToken('');
    setRuns([]);
  };

  const getPrediction = async () => {
    setLoading(true);
    try {
      await axios.get(`${API_BASE}/predict/${activeGame}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { method: engine }
      });
      fetchRuns();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const deleteRun = async (id: number) => {
    try {
      await axios.delete(`${API_BASE}/runs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRuns();
    } catch (err) { console.error(err); }
  };

  const generateSystem = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/system/exclusive`, {
        params: { n: sysN, m: sysM, p: sysP, k: sysK, lines: sysLines }
      });
      setSystemResult(res.data.system);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const chartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.frequency).map(([num, freq]) => ({
      number: num, frequency: freq
    })).sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [stats]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500 rounded-full blur-[120px] animate-pulse"></div>
           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="z-10 w-full max-w-md space-y-8 glass-card p-10 border-white/10 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 bg-gold-500 rounded-2xl flex items-center justify-center shadow-lg shadow-gold-500/20 mx-auto mb-6">
              <Trophy className="text-slate-950" size={32} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">LottoWise</h1>
            <p className="text-slate-400 font-medium italic">Precision Lottery Analytics & Engineering</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-5 py-3 focus:border-gold-500 outline-none transition-all placeholder:text-slate-700 font-medium" placeholder="stronkoner" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-5 py-3 focus:border-gold-500 outline-none transition-all placeholder:text-slate-700 font-medium" placeholder="••••••••" />
            </div>
            <div className="pt-4 flex gap-4">
              <button type="submit" disabled={loading} className="flex-1 bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-gold-500/10 disabled:opacity-50">
                {loading ? 'Processing...' : 'Sign In'}
              </button>
              <button type="button" onClick={handleRegister} disabled={loading} className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all border border-white/10 disabled:opacity-50">Register</button>
            </div>
          </form>
          
          <p className="text-center text-[10px] text-slate-500 leading-relaxed px-4 uppercase font-bold tracking-widest opacity-50">
            Secure Cryptographic Infrastructure Active
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} font-sans transition-colors duration-300`}>
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 border-r p-6 flex flex-col gap-8 transition-colors ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20 shrink-0">
            <Trophy className="text-slate-950" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">LottoWise</h1>
        </div>

        <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 ml-4">Navigation</p>
            <nav className="flex flex-col gap-1">
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'dashboard' ? (theme === 'dark' ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200') : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <LayoutDashboard size={18} />
                <span className="font-medium">Dashboard</span>
              </button>
              <button onClick={() => setActiveTab('visualizations')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'visualizations' ? (theme === 'dark' ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200') : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Grid3X3 size={18} />
                <span className="font-medium">Heatmap</span>
              </button>
              <button onClick={() => setActiveTab('builder')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'builder' ? (theme === 'dark' ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200') : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Layers size={18} />
                <span className="font-medium">System Builder</span>
              </button>
              <button onClick={() => setActiveTab('howto')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'howto' ? (theme === 'dark' ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-100 text-slate-900 border border-slate-200') : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <BookOpen size={18} />
                <span className="font-medium">How-To Guide</span>
              </button>
            </nav>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 ml-4">Active Game</p>
            <nav className="flex flex-col gap-1">
              {['Lotto', 'Powerball', 'Daily Lotto'].map((game) => (
                <button
                  key={game} onClick={() => setActiveGame(game)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    activeGame === game ? 'text-gold-500 bg-gold-500/10 border border-gold-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Hash size={18} />
                  <span className="font-medium">{game}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white w-full transition-all">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 w-full transition-all hover:bg-red-500/5 rounded-lg">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="ml-64 p-8 max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2 capitalize">{activeTab}</h2>
            <p className={theme === 'dark' ? "text-slate-400" : "text-slate-500"}>Analysis for <span className="text-gold-500 font-semibold">{activeGame}</span></p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 p-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
               <p className="text-[10px] font-bold text-slate-500 uppercase px-3">Engine:</p>
               {['combined', 'isaac'].map(e => (
                 <button key={e} onClick={() => setEngine(e)} className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${engine === e ? 'bg-gold-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>{e}</button>
               ))}
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-12">
            {/* Action Bar */}
            <div className={`glass-card p-8 border-gold-500/20 bg-gold-500/5 relative overflow-hidden`}>
              <div className="absolute -right-12 -top-12 opacity-5 text-gold-500">
                <Zap size={200} />
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold flex items-center gap-3">
                    <Zap className="text-gold-500" /> Generate Fresh Picks
                  </h3>
                  <p className="text-slate-400 max-w-md">Runs the {engine} engine seeded with current system entropy and historical Markov transitions.</p>
                </div>
                <button onClick={getPrediction} disabled={loading} className="w-full md:w-auto px-10 py-4 bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold rounded-2xl transition-all shadow-xl shadow-gold-500/20 active:scale-95 disabled:opacity-50">
                  {loading ? 'Processing...' : 'Run Generation'}
                </button>
              </div>
            </div>

            {/* Persistence List */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2 ml-4 text-slate-500 uppercase tracking-widest text-[12px]">Recent Run Logs</h3>
              <div className="grid grid-cols-1 gap-3">
                {runs.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 italic glass-card border-dashed">No recent runs found. Start generating picks to see history.</div>
                ) : runs.map((run) => (
                  <div key={run.id} className={`flex items-center justify-between p-5 glass-card group hover:border-gold-500/30 transition-all ${theme === 'dark' ? '' : 'bg-white shadow-md border-slate-100'}`}>
                    <div className="flex items-center gap-6">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                         <CheckCircle2 className="text-gold-500" size={24} />
                       </div>
                       <div>
                         <div className="flex gap-2 mb-1">
                           {run.picks.map((n, i) => (
                             <span key={i} className={`text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100 text-slate-700'}`}>{n}</span>
                           ))}
                         </div>
                         <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
                           {run.game} • {run.method} engine • {new Date(run.created_at).toLocaleString()}
                         </p>
                       </div>
                    </div>
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { 
                         setSysM(run.game === 'Daily Lotto' ? 36 : 49);
                         setSysN(run.game.includes('Lotto') && !run.game.includes('Daily') ? 6 : 5);
                         setActiveTab('builder');
                      }} className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-all" title="Add to System Builder">
                        <Plus size={20} />
                      </button>
                      <button onClick={() => deleteRun(run.id)} className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
              <div className="glass-card p-8">
                 <h3 className="text-xl font-bold mb-8">Hot vs Cold Numbers</h3>
                 <div className="space-y-6">
                    <div>
                      <div className="text-sm text-slate-500 font-semibold uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                        Sizzling Hot
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stats && Object.entries(stats.hot_numbers).map(([num, freq]) => (
                          <div key={num} className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-md text-sm font-bold">
                            {num} <span className="text-[10px] text-slate-500 ml-1">({freq}x)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500 font-semibold uppercase mb-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                        Frozen Cold
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {stats && Object.entries(stats.cold_numbers).map(([num, freq]) => (
                          <div key={num} className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-md text-sm font-bold">
                            {num} <span className="text-[10px] text-slate-500 ml-1">({freq}x)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
              </div>
              
              <div className="glass-card p-8">
                <h3 className="text-xl font-bold mb-8">Frequency Distribution</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? "#1e293b" : "#e2e8f0"} vertical={false} />
                      <XAxis dataKey="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="frequency" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visualizations' && (
          <div className="glass-card p-8">
            <h3 className="text-2xl font-bold mb-2">Pair Co-occurrence Heatmap</h3>
            <p className="text-slate-400 mb-12">Darker orange indicates pairs that appear together significantly more than average.</p>
            {!coOccurrence ? <div className="h-64 flex items-center justify-center italic text-slate-500">Analyzing matrix...</div> : (
              <div className="overflow-auto max-h-[600px] rounded-2xl bg-slate-950/50 p-6 border border-white/5">
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${coOccurrence.m}, 1fr)`, width: `${coOccurrence.m * 18}px` }}>
                  {coOccurrence.matrix.slice(1).map((row, i) => row.slice(1).map((val, j) => (
                    <div key={`${i}-${j}`} title={`${i+1} & ${j+1}: ${val}x`} className="h-4 w-4 rounded-[2px]" style={{ backgroundColor: val > 0 ? `rgba(245, 158, 11, ${val / 30 + 0.1})` : 'transparent', border: val > 0 ? 'none' : '1px solid rgba(255,255,255,0.02)' }} />
                  )))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 lg:col-span-1 h-fit space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings size={20} className="text-gold-500" /> Mathematical Params
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Draw Size (n)</label>
                  <input type="number" value={sysN} onChange={(e) => setSysN(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Urn Size (m)</label>
                  <input type="number" value={sysM} onChange={(e) => setSysM(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold-500 outline-none transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Win Threshold (k)</label>
                  <input type="number" value={sysK} onChange={(e) => setSysK(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Target Lines</label>
                  <input type="number" value={sysLines} onChange={(e) => setSysLines(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold-500 outline-none transition-all" />
                </div>
              </div>
              <button onClick={generateSystem} disabled={loading} className="w-full py-4 bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold rounded-2xl transition-all shadow-lg shadow-gold-500/10 active:scale-95 disabled:opacity-50">
                {loading ? 'Calculating...' : 'Build Exclusive System'}
              </button>
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
                 <Info size={24} className="text-blue-500 shrink-0" />
                 <p className="text-[11px] text-blue-400 leading-relaxed">
                   Enforcing $c_{"ij"} \le {2*sysK - sysN - 1}$ to ensure linear probability growth across all {sysLines} generated tickets.
                 </p>
              </div>
            </div>

            <div className="glass-card p-8 lg:col-span-2 min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold uppercase tracking-widest text-[12px] text-slate-500">System Blueprint</h3>
                {systemResult.length > 0 && <button className="flex items-center gap-2 text-xs text-gold-500 font-bold"><Download size={14} /> Export</button>}
              </div>
              {systemResult.length === 0 ? <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50"><Layers size={64} /><p className="italic">Blueprint area empty.</p></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-auto pr-4 custom-scrollbar">
                  {systemResult.map((line, idx) => (
                    <div key={idx} className={`flex items-center gap-4 p-4 border rounded-2xl transition-all hover:bg-white/5 ${theme === 'dark' ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <span className="text-[10px] font-bold text-slate-600">#{idx + 1}</span>
                      <div className="flex gap-1.5">
                        {line.map((num, i) => (
                          <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{num}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'howto' && (
          <div className="max-w-4xl space-y-12 pb-20">
            <section className="space-y-4">
              <h3 className="text-4xl font-bold tracking-tighter">The Science of LottoWise</h3>
              <p className="text-lg text-slate-400 leading-relaxed">LottoWise isn't a game of luck; it's a platform for mathematical engineering. We leverage three distinct layers to optimize your probability threshold.</p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 glass-card border-gold-500/20 space-y-4">
                <div className="w-12 h-12 bg-gold-500/10 rounded-xl flex items-center justify-center">
                   <Zap className="text-gold-500" />
                </div>
                <h4 className="text-xl font-bold">ISAAC Generator</h4>
                <p className="text-sm text-slate-400 leading-relaxed">Most PRNGs are limited by 32-bit seeds, reaching only 97% of combinations. ISAAC uses 1024 bytes of entropy to reach 100% of the ~14M combinations in a 6/49 game.</p>
              </div>
              <div className="p-8 glass-card border-blue-500/20 space-y-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                   <TrendingUp className="text-blue-500" />
                </div>
                <h4 className="text-xl font-bold">Markov Modeling</h4>
                <p className="text-sm text-slate-400 leading-relaxed">By analyzing the transition states of over 5,800 historical draws, we identify "probabilistic chains" where certain numbers tend to follow others in sequence.</p>
              </div>
            </div>

            <section className="p-10 glass-card bg-white/5 space-y-6">
              <h4 className="text-2xl font-bold flex items-center gap-3">
                <Layers className="text-gold-500" /> Understanding Exclusive Systems
              </h4>
              <p className="text-slate-400 leading-relaxed font-medium">The secret to exponential odds increase is the **Exclusiveness Condition**. Standard lottery tickets overlap too much, wasting your coverage.</p>
              <div className="p-6 bg-slate-900 rounded-2xl border border-white/5 font-mono text-gold-500 text-center text-xl">
                 c_ij ≤ 2k - n - 1
              </div>
              <ul className="space-y-4">
                {[
                  { t: 'c_ij', d: 'Maximum numbers two tickets can share.' },
                  { t: 'k', d: 'Your target win category (e.g. match 4 numbers).' },
                  { t: 'n', d: 'The draw size of your specific game.' }
                ].map((item, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="mt-1"><CheckCircle2 className="text-gold-500" size={16} /></div>
                    <p className="text-sm"><span className="font-bold text-white mr-2">{item.t}:</span> <span className="text-slate-400">{item.d}</span></p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-500 italic pt-4">LottoWise enforces this condition to ensure your winning probability grows **linearly** with every ticket played.</p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
