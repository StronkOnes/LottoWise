import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Trophy, 
  TrendingUp, 
  Hash, 
  Settings, 
  RefreshCw, 
  BarChart3, 
  Zap,
  Info,
  Layers,
  LayoutDashboard,
  Grid3X3,
  Download
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeGame, setActiveGame] = useState('Lotto');
  const [stats, setStats] = useState<GameStats | null>(null);
  const [coOccurrence, setCoOccurrence] = useState<CoOccurrence | null>(null);
  const [prediction, setPrediction] = useState<number[]>([]);
  const [systemResult, setSystemResult] = useState<number[][]>([]);
  const [loading, setLoading] = useState(false);
  
  // System parameters
  const [sysN, setSysN] = useState(6);
  const [sysM, setSysM] = useState(49);
  const [sysP, setSysP] = useState(6);
  const [sysK, setSysK] = useState(4);
  const [sysLines, setSysLines] = useState(10);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'visualizations') fetchCoOccurrence();
  }, [activeGame, activeTab]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats/${activeGame}`);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchCoOccurrence = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats/${activeGame}/co-occurrence`);
      setCoOccurrence(res.data);
    } catch (err) {
      console.error("Failed to fetch co-occurrence", err);
    }
  };

  const getPrediction = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/predict/${activeGame}`);
      setPrediction(res.data.picks);
    } catch (err) {
      console.error("Failed to get prediction", err);
    } finally {
      setLoading(false);
    }
  };

  const generateSystem = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/system/exclusive`, {
        params: { n: sysN, m: sysM, p: sysP, k: sysK, lines: sysLines }
      });
      setSystemResult(res.data.system);
    } catch (err) {
      console.error("Failed to generate system", err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.frequency).map(([num, freq]) => ({
      number: num,
      frequency: freq
    })).sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [stats]);

  const maxCoOccur = useMemo(() => {
    if (!coOccurrence) return 1;
    let max = 0;
    coOccurrence.matrix.forEach(row => {
      row.forEach(val => { if (val > max) max = val; });
    });
    return max;
  }, [coOccurrence]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-gold-500/30">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-900 border-r border-white/5 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20">
            <Trophy className="text-slate-950" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">LottoWise</h1>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 ml-4">Navigation</p>
            <nav className="flex flex-col gap-1">
              <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <LayoutDashboard size={18} />
                <span className="font-medium">Dashboard</span>
              </button>
              <button onClick={() => setActiveTab('visualizations')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'visualizations' ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Grid3X3 size={18} />
                <span className="font-medium">Visualizations</span>
              </button>
              <button onClick={() => setActiveTab('builder')} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${activeTab === 'builder' ? 'bg-white/10 text-white border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Layers size={18} />
                <span className="font-medium">System Builder</span>
              </button>
            </nav>
          </div>

          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 ml-4">Active Game</p>
            <nav className="flex flex-col gap-1">
              {['Lotto', 'Powerball', 'Daily Lotto'].map((game) => (
                <button
                  key={game}
                  onClick={() => setActiveGame(game)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                    activeGame === game 
                      ? 'text-gold-500 bg-gold-500/10 border border-gold-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Hash size={18} />
                  <span className="font-medium">{game}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white w-full">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="ml-64 p-8 max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2 capitalize">{activeTab}</h2>
            <p className="text-slate-400">Analysis for <span className="text-gold-500 font-semibold">{activeGame}</span></p>
          </div>
          <button 
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </header>

        {activeTab === 'dashboard' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                    <TrendingUp size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Draws</span>
                </div>
                <div className="text-3xl font-bold">{stats?.total_draws || 0}</div>
                <p className="text-sm text-slate-400 mt-1">Live data from official sources</p>
              </div>

              <div className="glass-card p-6 border-gold-500/20 bg-gold-500/5">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-gold-500/10 text-gold-500 rounded-lg">
                    <Zap size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Hot Prediction</span>
                </div>
                <div className="flex gap-2">
                  {prediction.length > 0 ? prediction.map((n, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gold-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-lg shadow-gold-500/20">
                      {n}
                    </div>
                  )) : (
                    <div className="text-slate-500 italic">Generate to see picks</div>
                  )}
                </div>
                <button 
                  onClick={getPrediction}
                  disabled={loading}
                  className="mt-4 w-full py-2 bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Picks'}
                </button>
              </div>

              <div className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                    <BarChart3 size={20} />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Engine Type</span>
                </div>
                <div className="text-2xl font-bold">Markov-ISAAC</div>
                <p className="text-sm text-slate-400 mt-1">1024-bit entropy source active</p>
              </div>
            </div>

            {/* Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold">Number Frequencies</h3>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="number" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                      <Bar dataKey="frequency" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={prediction.includes(parseInt(entry.number)) ? '#f59e0b' : '#3b82f6'} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

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
            </div>
          </>
        )}

        {activeTab === 'visualizations' && (
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold mb-2">Number Co-occurrence Heatmap</h3>
                <p className="text-slate-400">Visualizing how often numbers are drawn together in pairs.</p>
              </div>
            </div>
            
            {!coOccurrence ? (
              <div className="flex items-center justify-center h-64 italic text-slate-500">Loading heatmap data...</div>
            ) : (
              <div className="overflow-auto max-h-[600px] border border-white/5 rounded-xl bg-slate-950/50 p-4">
                <div 
                  className="grid gap-px" 
                  style={{ 
                    gridTemplateColumns: `repeat(${coOccurrence.m}, 1fr)`,
                    width: `${coOccurrence.m * 20}px`
                  }}
                >
                  {coOccurrence.matrix.slice(1).map((row, i) => (
                    row.slice(1).map((val, j) => {
                      const opacity = val / maxCoOccur;
                      return (
                        <div 
                          key={`${i}-${j}`}
                          title={`Numbers ${i+1} & ${j+1}: ${val} times`}
                          className="h-5 w-5 rounded-sm"
                          style={{ 
                            backgroundColor: val > 0 ? `rgba(245, 158, 11, ${opacity * 0.8 + 0.2})` : 'transparent',
                            border: val > 0 ? 'none' : '1px solid rgba(255,255,255,0.02)'
                          }}
                        />
                      );
                    })
                  ))}
                </div>
                {/* Labels */}
                <div className="mt-4 flex justify-between text-[10px] text-slate-500 px-4">
                  <span>Number 1</span>
                  <span>Number {coOccurrence.m}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'builder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="glass-card p-8 lg:col-span-1 h-fit">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Settings size={20} className="text-gold-500" />
                Parameters
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Draw Size (n)</label>
                  <input type="number" value={sysN} onChange={(e) => setSysN(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 focus:border-gold-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Urn Size (m)</label>
                  <input type="number" value={sysM} onChange={(e) => setSysM(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 focus:border-gold-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Ticket Size (p)</label>
                  <input type="number" value={sysP} onChange={(e) => setSysP(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 focus:border-gold-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Win Threshold (k)</label>
                  <input type="number" value={sysK} onChange={(e) => setSysK(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 focus:border-gold-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Lines</label>
                  <input type="number" value={sysLines} onChange={(e) => setSysLines(parseInt(e.target.value))} className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 focus:border-gold-500 outline-none transition-all" />
                </div>
                <button 
                  onClick={generateSystem}
                  className="w-full py-3 bg-gold-500 hover:bg-gold-600 text-slate-950 font-bold rounded-lg transition-all mt-4"
                >
                  Generate Exclusive System
                </button>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3">
                  <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-400 leading-relaxed">
                    System builder enforces $c_{"ij"} \le {2*sysK - sysN - 1}$ (Exclusiveness Condition) to ensure linear probability growth.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 lg:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Generated System</h3>
                {systemResult.length > 0 && (
                  <button className="flex items-center gap-2 text-xs text-gold-500 hover:text-gold-400 transition-all font-bold">
                    <Download size={14} />
                    Export CSV
                  </button>
                )}
              </div>
              
              {systemResult.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-4">
                  <Layers size={48} className="opacity-20" />
                  <p className="italic">No system generated yet. Configure parameters and click generate.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-auto pr-4 custom-scrollbar">
                  {systemResult.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-xl hover:border-white/10 transition-all">
                      <span className="text-[10px] font-bold text-slate-600 w-8">#{idx + 1}</span>
                      <div className="flex gap-2">
                        {line.map((num, i) => (
                          <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold">
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
