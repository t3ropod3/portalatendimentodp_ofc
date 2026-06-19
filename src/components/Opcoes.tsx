import React, { useState } from 'react';
import { Database, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { getApiUrl } from '../apiConfig';

export default function Opcoes() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string, error?: string, details?: string, hint?: string} | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    try {
      const resp = await fetch(getApiUrl('/api/test-db-connection'));
      const data = await resp.json();
      setResult({
        success: resp.ok,
        message: resp.ok ? data.message : data.error,
        details: data.details,
        hint: data.hint
      });
    } catch (err: any) {
      setResult({
        success: false,
        message: "Erro na requisição ao servidor.",
        details: err.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Opções</h2>
            <p className="text-sm text-slate-500">Configurações e diagnósticos do sistema.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Diagnóstico de Banco de Dados</h3>
            <p className="text-sm text-slate-600">
              Verifique se a aplicação está conseguindo se comunicar com o banco de dados Neon (PostgreSQL).
            </p>
            
            <button
              onClick={testConnection}
              disabled={testing}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-lg text-sm font-bold flex items-center shadow-sm cursor-pointer transition-colors"
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              {testing ? 'Testando...' : 'Testar Conexão com Banco'}
            </button>

            {result && (
              <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-start">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="ml-3">
                    <h4 className={`font-semibold ${result.success ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {result.success ? 'Conexão Bem-Sucedida' : 'Falha na Conexão'}
                    </h4>
                    <p className={`text-sm mt-1 ${result.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {result.message}
                    </p>
                    {result.details && (
                      <p className="text-xs text-rose-600 mt-2 font-mono bg-white p-2 border border-rose-100 rounded">
                        <strong>Detalhes:</strong> {result.details}
                      </p>
                    )}
                    {result.hint && (
                      <p className="text-xs text-slate-600 mt-2">
                        <strong>Dica:</strong> {result.hint}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
