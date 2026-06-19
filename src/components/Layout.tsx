/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Ticket, 
  Users, 
  LogOut, 
  Building2, 
  User, 
  Menu, 
  X,
  Briefcase,
  Database
} from 'lucide-react';
import { Usuario, Notificacao } from '../types';
import NotificationBell from './NotificationBell';

interface LayoutProps {
  currentUser: Usuario;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
  notifications: Notificacao[];
  onRefreshNotifications: () => void;
}

export default function Layout({ 
  currentUser, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  children,
  notifications,
  onRefreshNotifications
}: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, allowedProfiles: ['Administrador', 'Atendente', 'Solicitante'] },
    { id: 'novo', label: 'Novo Atendimento', icon: PlusCircle, allowedProfiles: ['Administrador', 'Solicitante'] },
    { id: 'atendimentos', label: 'Atendimentos', icon: Ticket, allowedProfiles: ['Administrador', 'Atendente', 'Solicitante'] },
    { id: 'usuarios', label: 'Gestão de Usuários', icon: Users, allowedProfiles: ['Administrador'] },
    { id: 'opcoes', label: 'Opções', icon: Database, allowedProfiles: ['Administrador'] }
  ];

  const visibleMenuItems = menuItems.filter(item => item.allowedProfiles.includes(currentUser.perfil));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex md:w-64 flex-col bg-indigo-900 text-slate-100 border-r border-indigo-800/80 shrink-0">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-indigo-800/80 flex items-center space-x-3">
          <div className="p-2 bg-amber-500 rounded-lg text-white">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">Portal DP</h1>
            <p className="text-xs text-indigo-200/90">Departamento Pessoal</p>
          </div>
        </div>

        {/* User Card */}
        <div className="px-6 py-5 border-b border-indigo-800/80 bg-indigo-950/40">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-indigo-950 border border-indigo-750 flex items-center justify-center text-amber-550 font-semibold uppercase">
              {currentUser.nome.substring(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100 truncate">{currentUser.nome}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold tracking-wide uppercase ${
                  currentUser.perfil === 'Administrador' 
                    ? 'bg-indigo-950 border border-indigo-800 text-indigo-300' 
                    : currentUser.perfil === 'Atendente' 
                    ? 'bg-amber-900/55 text-amber-300 border border-amber-800'
                    : 'bg-emerald-900/55 text-emerald-300 border border-emerald-800'
                }`}>
                  {currentUser.perfil}
                </span>
                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase bg-indigo-950 text-indigo-200 border border-indigo-800`}>
                  {currentUser.empresa === 'Ambas' ? 'Radar & Proativa' : currentUser.empresa}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Area */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10' 
                    : 'text-indigo-200/90 hover:text-white hover:bg-indigo-800/40'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-indigo-300'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Log out */}
        <div className="p-4 border-t border-indigo-800/80">
          <button
            id="sidebar-btn-logout"
            onClick={onLogout}
            className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/25 transition-colors border border-transparent hover:border-rose-900/40 cursor-pointer"
          >
            <LogOut className="mr-3 h-5 w-5 text-rose-400" />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* MOBILE BAR */}
      <header className="md:hidden bg-indigo-900 text-white flex items-center justify-between px-4 py-3 border-b border-indigo-800 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500 rounded-md">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-md tracking-tight">Portal DP</span>
        </div>
        <div className="flex items-center space-x-3">
          <NotificationBell 
            currentUser={currentUser}
            notifications={notifications}
            onRefresh={onRefreshNotifications}
            alignEnd={true}
          />
          <span className="text-xs text-indigo-150 max-w-[120px] truncate">{currentUser.nome}</span>
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md hover:bg-indigo-800 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
          </button>
        </div>
      </header>      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex bg-indigo-950/80 backdrop-blur-xs">
          <div className="w-4/5 max-w-sm bg-indigo-900 text-slate-100 flex flex-col p-6 h-full border-r border-indigo-800">
            <div className="flex items-center justify-between pb-6 border-b border-indigo-800">
              <div className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-amber-400" />
                <span className="font-bold text-white">Portal DP</span>
              </div>
              <button 
                id="close-mobile-menu"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-md text-indigo-300 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="py-4 border-b border-indigo-800">
              <p className="text-sm font-semibold text-white">{currentUser.nome}</p>
              <p className="text-xs text-indigo-250 mt-0.5">{currentUser.email} • {currentUser.empresa === 'Ambas' ? 'Radar & Proativa' : currentUser.empresa}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                currentUser.perfil === 'Administrador' 
                  ? 'bg-indigo-950 border border-indigo-800 text-indigo-300' 
                  : currentUser.perfil === 'Atendente'
                  ? 'bg-amber-950 text-amber-300 border border-amber-900/50'
                  : 'bg-emerald-900 text-emerald-300'
              }`}>
                {currentUser.perfil}
              </span>
            </div>

            <nav className="flex-1 py-6 space-y-1">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`mobile-nav-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                      isActive 
                        ? 'bg-amber-500 text-white' 
                        : 'text-indigo-200 hover:text-white hover:bg-indigo-800/40'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <button
              id="mobile-logout"
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/35 transition-colors cursor-pointer mt-auto"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair do Sistema
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="hidden md:flex bg-white h-16 border-b border-slate-200 px-8 items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">
              {menuItems.find(item => item.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-500 text-sm font-medium">Empresa: <strong className="text-slate-700">{currentUser.empresa === 'Ambas' ? 'Radar & Proativa' : currentUser.empresa}</strong></span>
            <div className="h-4 w-px bg-slate-300"></div>
            
            <NotificationBell 
              currentUser={currentUser}
              notifications={notifications}
              onRefresh={onRefreshNotifications}
              alignEnd={true}
            />

            <div className="h-4 w-px bg-slate-300"></div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-semibold uppercase">{currentUser.perfil}</p>
              <p className="text-sm font-semibold text-slate-800">{currentUser.nome}</p>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div id="main-scroll-container" className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

    </div>
  );
}
