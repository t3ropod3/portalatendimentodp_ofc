/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { Atendimento, Usuario, FilterType } from '../types';
import { getUserNameById } from '../apiServices';
import { 
  Clock, 
  Ticket, 
  CheckCircle, 
  Building2, 
  AlertCircle,
  FileText,
  User,
  HelpCircle,
  BarChart3
} from 'lucide-react';

interface DashboardProps {
  tickets: Atendimento[];
  users: Usuario[];
  onSelectMetricCard?: (filter: FilterType) => void;
}

export default function Dashboard({ tickets, users, onSelectMetricCard }: DashboardProps) {

  // Colors for charts aligned with Royal Blue (#4169e1) and Neon Orange (#ff5f1f) palette
  const COLORS = {
    aberto: '#ff5f1f', // Neon Orange
    emAtendimento: '#4169e1', // Royal Blue
    encerrado: '#10b981', // Emerald-500
  };

  const COMPANY_COLORS = {
    Radar: '#9c27b0', // Purple/Violet
    Proativa: '#4169e1', // Royal Blue
  };

  const statistics = useMemo(() => {
    const total = tickets.length;
    const abertos = tickets.filter(t => t.status === 'Aberto').length;
    const emAtendimento = tickets.filter(t => t.status === 'Em Atendimento').length;
    const encerrados = tickets.filter(t => t.status === 'Encerrado').length;
    
    // Average response time (only for closed tickets)
    const closedTickets = tickets.filter(t => t.status === 'Encerrado' && t.data_encerramento);
    let avgTimeText = '0h';
    
    if (closedTickets.length > 0) {
      let totalDiffMs = 0;
      closedTickets.forEach(t => {
        const openTime = new Date(t.data_abertura).getTime();
        const closeTime = new Date(t.data_encerramento!).getTime();
        const diff = closeTime - openTime;
        if (diff > 0) {
          totalDiffMs += diff;
        }
      });
      
      const avgMs = totalDiffMs / closedTickets.length;
      const avgHours = avgMs / (1000 * 60 * 60);
      
      if (avgHours < 24) {
        avgTimeText = `${avgHours.toFixed(1)}h`;
      } else {
        const avgDays = avgHours / 24;
        avgTimeText = `${avgDays.toFixed(1)} ${avgDays === 1 ? 'dia' : 'dias'}`;
      }
    }

    // Company split
    const radarCount = tickets.filter(t => t.empresa === 'Radar').length;
    const proativaCount = tickets.filter(t => t.empresa === 'Proativa').length;

    // Split by Category/Solicitacao
    const categories: Record<string, number> = {};
    tickets.forEach(t => {
      const cat = t.solicitacao || 'Outros';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    const categoryData = Object.entries(categories).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // Split by Status
    const statusData = [
      { name: 'Aberto', value: abertos, color: COLORS.aberto },
      { name: 'Em Atendimento', value: emAtendimento, color: COLORS.emAtendimento },
      { name: 'Encerrado', value: encerrados, color: COLORS.encerrado }
    ].filter(item => item.value > 0);

    // Split by Company
    const companyData = [
      { name: 'Radar', value: radarCount, color: COMPANY_COLORS.Radar },
      { name: 'Proativa', value: proativaCount, color: COMPANY_COLORS.Proativa }
    ];

    // Split by Requester/Solicitante (Top 5)
    const requesters: Record<string, number> = {};
    tickets.forEach(t => {
      requesters[t.solicitante_id] = (requesters[t.solicitante_id] || 0) + 1;
    });
    const requesterData = Object.entries(requesters).map(([id, count]) => ({
      name: getUserNameById(id),
      value: count
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    // Evolution Monthly (opened vs closed)
    // April (04), May (05), June (06) 2026
    const monthlySummary: Record<string, { name: string; abertos: number; encerrados: number }> = {
      '2026-04': { name: 'Abr/26', abertos: 0, encerrados: 0 },
      '2026-05': { name: 'Mai/26', abertos: 0, encerrados: 0 },
      '2026-06': { name: 'Jun/26', abertos: 0, encerrados: 0 }
    };

    tickets.forEach(t => {
      const dateOpen = new Date(t.data_abertura);
      const is2026 = dateOpen.getFullYear() === 2026;
      if (is2026) {
        const monthNum = String(dateOpen.getMonth() + 1).padStart(2, '0');
        const key = `2026-${monthNum}`;
        if (monthlySummary[key]) {
          monthlySummary[key].abertos += 1;
        }
      }

      if (t.status === 'Encerrado' && t.data_encerramento) {
        const dateClose = new Date(t.data_encerramento);
        if (dateClose.getFullYear() === 2026) {
          const monthNum = String(dateClose.getMonth() + 1).padStart(2, '0');
          const key = `2026-${monthNum}`;
          if (monthlySummary[key]) {
            monthlySummary[key].encerrados += 1;
          }
        }
      }
    });

    const monthlyData = Object.values(monthlySummary);

    return {
      total,
      abertos,
      emAtendimento,
      encerrados,
      avgTimeText,
      radarCount,
      proativaCount,
      statusData,
      companyData,
      requesterData,
      categoryData,
      monthlyData
    };
  }, [tickets]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Consolidado de Indicadores — DP
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Métricas de desempenho de chamados abertos e resolvidos para as empresas Radar e Proativa.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
          <Clock className="h-4 w-4 text-slate-500" />
          <span className="text-xs text-slate-700 font-semibold uppercase">Atualizado em tempo real</span>
        </div>
      </div>

      {/* METRIC INDEX CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* TOTAL CHAMADOS */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onSelectMetricCard?.('all')}
          onKeyDown={(e) => e.key === 'Enter' && onSelectMetricCard?.('all')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 hover:shadow-md hover:border-indigo-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group outline-hidden"
        >
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Geral</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{statistics.total}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-indigo-500 font-medium">Ver todas as solicitações →</p>
          </div>
        </div>

        {/* AGUARDANDO (ABERTO) */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onSelectMetricCard?.('open')}
          onKeyDown={(e) => e.key === 'Enter' && onSelectMetricCard?.('open')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 hover:shadow-md hover:border-amber-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group outline-hidden"
        >
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600 group-hover:bg-amber-100 transition-colors">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Abertos</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{statistics.abertos}</h3>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Filtrar por abertos →</p>
          </div>
        </div>

        {/* EM ATENDIMENTO */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onSelectMetricCard?.('inprogress')}
          onKeyDown={(e) => e.key === 'Enter' && onSelectMetricCard?.('inprogress')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 hover:shadow-md hover:border-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group outline-hidden"
        >
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Em Andamento</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{statistics.emAtendimento}</h3>
            <p className="text-[10px] text-blue-600 font-medium mt-0.5">Filtrar por em andamento →</p>
          </div>
        </div>

        {/* ENCERRADOS */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onSelectMetricCard?.('closed')}
          onKeyDown={(e) => e.key === 'Enter' && onSelectMetricCard?.('closed')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 hover:shadow-md hover:border-emerald-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group outline-hidden"
        >
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-100 transition-colors">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Encerrados</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{statistics.encerrados}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Filtrar por encerrados →</p>
          </div>
        </div>

        {/* TEMPO MEDIO */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onSelectMetricCard?.('closed')}
          onKeyDown={(e) => e.key === 'Enter' && onSelectMetricCard?.('closed')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-4 hover:shadow-md hover:border-cyan-500 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group outline-hidden"
        >
          <div className="p-3 bg-cyan-50 rounded-lg text-cyan-600 group-hover:bg-cyan-100 transition-colors">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tempo Médio</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{statistics.avgTimeText}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-cyan-500 font-medium">Retorno conclusivo →</p>
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER - FIRST ROW (EVOLUTION & STATUS SPLIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* EVOLUÇÃO MENSAL (Line Chart) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Evolução Mensal de Atendimentos (2026)</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={statistics.monthlyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                <YAxis fontSize={11} stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#f8fafc' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line 
                  name="Solicitações Abertas" 
                  type="monotone" 
                  dataKey="abertos" 
                  stroke={COLORS.aberto} 
                  strokeWidth={3} 
                  activeDot={{ r: 8 }} 
                />
                <Line 
                  name="Solicitações Encerradas" 
                  type="monotone" 
                  dataKey="encerrados" 
                  stroke={COLORS.encerrado} 
                  strokeWidth={3} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DISTRIBUIÇÃO STATUS (Pie Chart) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Distribuição por Status</h4>
          <div className="h-48 flex items-center justify-center relative">
            {statistics.statusData.length === 0 ? (
              <p className="text-xs text-slate-400">Sem chamados registrados.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statistics.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statistics.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#f8fafc' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Center Label inside Pie */}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-slate-800">{statistics.total}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Chamados</span>
            </div>
          </div>
          
          {/* Custom Status Legend */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {statistics.statusData.map((s, idx) => (
              <div key={idx} className="flex flex-col items-center p-2 rounded bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: s.color }}></span>
                  <span className="text-[11px] font-semibold text-slate-700">{s.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-800 mt-1">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER - SECOND ROW (COMPANY & TOP REQUEUSTERS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COMPARATIVO RADAR x PROATIVA */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Comparativo Radar x Proativa</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </h4>
          <div className="h-64 flex flex-col justify-between">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statistics.companyData} barSize={40} margin={{ top: 20, right: 30, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }} />
                  <Bar dataKey="value" name="Solicitações">
                    {statistics.companyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Visual breakdown progress bars */}
            <div className="flex items-center space-x-8 mt-4 pt-4 border-t border-slate-100">
              <div className="flex-1">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-indigo-600">Empresa Radar</span>
                  <span className="font-bold text-slate-705">{statistics.radarCount} chamados</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full" 
                    style={{ width: `${statistics.total > 0 ? (statistics.radarCount / statistics.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-semibold text-cyan-500">Empresa Proativa</span>
                  <span className="font-bold text-slate-705">{statistics.proativaCount} chamados</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 rounded-full" 
                    style={{ width: `${statistics.total > 0 ? (statistics.proativaCount / statistics.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TIPO DE SOLICITAÇÃO & SOLICITANTE */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6">
          
          {/* Top Categories */}
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Volume por Categoria</h4>
            <div className="space-y-3.5">
              {statistics.categoryData.slice(0, 4).map((cat, idx) => {
                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                const pct = statistics.total > 0 ? (cat.value / statistics.total) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs items-center">
                      <span className="font-semibold text-slate-700 truncate max-w-[150px]">{cat.name}</span>
                      <span className="text-slate-500 font-bold">{cat.value}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[idx % colors.length]}`} 
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {statistics.categoryData.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum chamado aberto ainda.</p>
              )}
            </div>
          </div>

          <div className="w-px bg-slate-100 hidden md:block"></div>

          {/* Solicitantes Engajados */}
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Top Solicitantes</h4>
            <div className="space-y-3">
              {statistics.requesterData.map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/60 transition-colors">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase shrink-0">
                      {user.name.substring(0, 2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate">{user.name}</span>
                  </div>
                  <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 shrink-0">
                    {user.value} {user.value === 1 ? 'chamado' : 'chamados'}
                  </span>
                </div>
              ))}
              {statistics.requesterData.length === 0 && (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum solicitante.</p>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
