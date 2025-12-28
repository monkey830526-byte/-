
import React, { useState, useMemo, useRef } from 'react';
import { 
  BuildingInputs, 
  CalculationResults, 
  StructureCode 
} from './types';
import { STRUCT_MAP } from './constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';

// --- PDF Library Import ---
import html2pdf from 'https://esm.sh/html2pdf.js@0.10.1';

// --- Helper Components ---

const InputField: React.FC<{
  label: string;
  value: number | string;
  onChange: (val: any) => void;
  type?: string;
  suffix?: string;
  placeholder?: string;
}> = ({ label, value, onChange, type = "number", suffix, placeholder }) => (
  <div className="mb-4">
    <label className="block text-sm font-bold text-slate-700 mb-1">{label}</label>
    <div className="relative mt-1 rounded-md shadow-sm">
      <input
        type={type}
        className="block w-full rounded-xl border-slate-300 pl-4 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-11 border transition-all hover:border-slate-400 bg-slate-50/30"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <span className="text-slate-400 text-xs font-black">{suffix}</span>
        </div>
      )}
    </div>
  </div>
);

const ResultCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}> = ({ title, value, subtitle, color = "indigo", highlight = false, icon }) => (
  <div className={`p-6 rounded-[2rem] bg-white border ${highlight ? 'border-indigo-500 ring-4 ring-indigo-500/5 shadow-indigo-100' : 'border-slate-100'} shadow-sm flex flex-col justify-between transition-all hover:shadow-md group`}>
    <div className="flex justify-between items-start">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
      {icon && <div className={`text-${color}-500 opacity-50 group-hover:opacity-100 transition-opacity`}>{icon}</div>}
    </div>
    <div className="mt-3">
      <span className={`text-2xl font-black text-${color}-600 tracking-tight`}>{value}</span>
      {subtitle && <p className="text-[10px] text-slate-400 mt-1 font-bold leading-tight">{subtitle}</p>}
    </div>
  </div>
);

// --- Main Component ---

type ViewMode = 'dashboard' | 'schedule';
type CalcMode = 'comprehensive' | 'depreciation_only';

export default function App() {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [calcMode, setCalcMode] = useState<CalcMode>('comprehensive');
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const exportTargetRef = useRef<HTMLDivElement>(null);

  const [inputs, setInputs] = useState<BuildingInputs>({
    area: 64,
    costPerPing: 15,
    age: 0,
    structCode: StructureCode.B,
    landPingPrice: 50,
    landArea: 64,
    roiPercent: 3
  });

  const results = useMemo(() => {
    const { area, costPerPing, age, structCode, landPingPrice, landArea, roiPercent } = inputs;
    const lifeLimit = STRUCT_MAP[structCode].limit;
    const totalCost = area * (costPerPing || 0) * 10000;
    
    const usedRatio = Math.min(age / lifeLimit, 1);
    const residualValue = Math.max(0, totalCost * (1 - usedRatio));
    const depreciationAmount = totalCost - residualValue;
    
    const landTotalVal = landArea * (landPingPrice || 0) * 10000;
    
    const rentLandRoi = (landTotalVal * (roiPercent / 100)) / 12;
    const rentBuildRoi = (residualValue * (roiPercent / 100)) / 12;
    const rentBuildCost = age < lifeLimit ? (totalCost / lifeLimit / 12) : 0;
    
    const landRentSubtotal = rentLandRoi;
    const buildRentSubtotal = rentBuildRoi + rentBuildCost;
    const totalRent = landRentSubtotal + buildRentSubtotal;

    const yearlyData = Array.from({ length: lifeLimit + 1 }, (_, i) => {
      const dep = Math.min(i / lifeLimit, 1) * totalCost;
      return {
        year: i,
        value: Math.round(totalCost - dep),
        depreciation: Math.round(dep),
        yearlyDep: Math.round(totalCost / lifeLimit)
      };
    });

    return {
      lifeLimit,
      totalCost,
      usedRatio,
      depreciationAmount,
      residualValue,
      rentLandRoi,
      rentBuildRoi,
      rentBuildCost,
      landRentSubtotal,
      buildRentSubtotal,
      totalRent,
      yearlyData,
      landTotalVal
    };
  }, [inputs]);

  const handleExportPDF = () => {
    if (!exportTargetRef.current) return;
    setIsExporting(true);
    
    const element = exportTargetRef.current;
    const opt = {
      margin: 10,
      filename: `房地產估值精算報告_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
    });
  };

  const COLORS = ['#6366f1', '#f43f5e', '#10b981'];

  const rentPieData = [
    { name: '土地獲利', value: Math.round(results.rentLandRoi) },
    { name: '建物獲利', value: Math.round(results.rentBuildRoi) },
    { name: '造價攤提', value: Math.round(results.rentBuildCost) },
  ].filter(d => d.value > 0);

  const isExpired = inputs.age >= results.lifeLimit;

  return (
    <div className="min-h-screen pb-12 bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-xl shadow-indigo-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">
              {calcMode === 'comprehensive' ? '房地產綜合精算' : '建物折舊精算'} 
              <span className="text-indigo-600 ml-1">.Pro</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-slate-100 p-1 rounded-full border border-slate-200">
              <button 
                onClick={() => setCalcMode('comprehensive')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${calcMode === 'comprehensive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                綜合租金
              </button>
              <button 
                onClick={() => setCalcMode('depreciation_only')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${calcMode === 'depreciation_only' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                純折舊
              </button>
            </div>
            {view === 'schedule' && (
              <button 
                onClick={() => setView('dashboard')}
                className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-full shadow-lg uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                返回主介面
              </button>
            )}
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-full shadow-lg shadow-indigo-200 uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {isExporting ? '處理中...' : '匯出完整報告'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {view === 'dashboard' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isExpired && (
              <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-center gap-4 text-amber-800 shadow-sm border-l-8 border-l-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                <div className="text-sm">
                  <p className="font-black">建築結構已達耐用年限 ({results.lifeLimit} 年)</p>
                  <p className="opacity-80">建物殘值已歸零。目前的估算建議將排除建物收益，專注於土地價值。</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Input Panel */}
              <aside className="lg:col-span-4 space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                    核心資料輸入
                  </h2>
                  
                  <div className="space-y-2">
                    <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 mb-6 transition-all hover:bg-slate-50">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">建物資訊</p>
                      <InputField label="建物總坪數" value={inputs.area} onChange={(v) => setInputs(prev => ({ ...prev, area: parseFloat(v) || 0 }))} suffix="坪"/>
                      <InputField label="營造成本" value={inputs.costPerPing} onChange={(v) => setInputs(prev => ({ ...prev, costPerPing: parseFloat(v) || 0 }))} suffix="萬/坪"/>
                      <InputField label="目前屋齡" value={inputs.age} onChange={(v) => setInputs(prev => ({ ...prev, age: parseFloat(v) || 0 }))} suffix="年"/>
                      <div className="mb-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">建物構造</label>
                        <select 
                          className="block w-full rounded-xl border-slate-300 h-11 border pl-4 pr-4 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white transition-all hover:border-slate-400"
                          value={inputs.structCode}
                          onChange={(e) => setInputs(prev => ({ ...prev, structCode: e.target.value as StructureCode }))}
                        >
                          {Object.entries(STRUCT_MAP).map(([code, data]) => (
                            <option key={code} value={code}>{data.name} ({data.limit}年)</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {calcMode === 'comprehensive' && (
                      <div className="p-5 bg-indigo-50/30 rounded-3xl border border-indigo-100/50 transition-all hover:bg-indigo-50/50">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">土地與投報</p>
                        <InputField label="土地坪數" value={inputs.landArea} onChange={(v) => setInputs(prev => ({ ...prev, landArea: parseFloat(v) || 0 }))} suffix="坪"/>
                        <InputField label="土地單價" value={inputs.landPingPrice} onChange={(v) => setInputs(prev => ({ ...prev, landPingPrice: parseFloat(v) || 0 }))} suffix="萬/坪"/>
                        <InputField label="期望年投報率" value={inputs.roiPercent} onChange={(v) => setInputs(prev => ({ ...prev, roiPercent: parseFloat(v) || 0 }))} suffix="%"/>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                  <h3 className="font-black text-base flex items-center gap-3 mb-6 tracking-tight">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    折舊明細查詢
                  </h3>
                  <button 
                    onClick={() => setView('schedule')}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                  >
                    查看逐年折舊表
                  </button>
                </div>
              </aside>

              {/* Results Display */}
              <div className="lg:col-span-8 space-y-8" ref={reportRef}>
                
                {/* Top Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {calcMode === 'comprehensive' ? (
                    <>
                      <ResultCard title="建物分攤租金" value={`$${Math.round(results.buildRentSubtotal).toLocaleString()}`} subtitle="利潤 + 攤提" color="indigo" />
                      <ResultCard title="土地分攤租金" value={`$${Math.round(results.landRentSubtotal).toLocaleString()}`} subtitle="土地持有獲利" color="indigo" />
                      <ResultCard title="建議總月租金" value={`$${Math.round(results.totalRent).toLocaleString()}`} subtitle="資產收益總和" color="rose" highlight={true} />
                    </>
                  ) : (
                    <>
                      <ResultCard title="原始造價總額" value={`$${Math.round(results.totalCost).toLocaleString()}`} subtitle="建物初始投入本金" color="slate" />
                      <ResultCard title="當前建物殘值" value={`$${Math.round(results.residualValue).toLocaleString()}`} subtitle={`屋齡 ${inputs.age} 年估值`} color="indigo" highlight={true} />
                      <ResultCard title="累計折舊金額" value={`$${Math.round(results.depreciationAmount).toLocaleString()}`} subtitle={`折舊率 ${(results.usedRatio * 100).toFixed(1)}%`} color="rose" />
                    </>
                  )}
                </div>

                {/* Calculation Detail Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between px-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">土地總價值</p>
                        <p className="text-[9px] text-slate-400 font-bold italic underline">土地坪數 × 土地單價</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-800 tracking-tighter">${Math.round(results.landTotalVal).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between px-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">造價攤提 (月)</p>
                        <p className="text-[9px] text-slate-400 font-bold italic underline">總造價 ÷ 耐用年限 ÷ 12</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-indigo-700 tracking-tighter">${Math.round(results.rentBuildCost).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between px-8 md:col-span-2">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m19 8.5-4-4-4 4"/><path d="m5 15.5 4 4 4-4"/><path d="M15 4.5v15"/><path d="M9 19.5v-15"/></svg>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">建物獲利 (月)</p>
                        <p className="text-[9px] text-slate-400 font-bold italic underline">當前建物殘值 × 投報率 ÷ 12</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-rose-600 tracking-tighter">${Math.round(results.rentBuildRoi).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {calcMode === 'comprehensive' && (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 flex flex-col">
                      <h2 className="text-base font-black text-slate-800 mb-8 flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
                        租金組成比例
                      </h2>
                      <div className="h-64 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={rentPieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                              {rentPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} formatter={(val: number) => `$${val.toLocaleString()}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-8 space-y-4">
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex justify-between">
                          <span className="text-xs font-bold text-slate-700">土地獲利 (利潤)</span>
                          <span className="font-black text-slate-800">${Math.round(results.rentLandRoi).toLocaleString()}</span>
                        </div>
                        <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 flex justify-between">
                          <span className="text-xs font-bold text-indigo-700">建物部分 (獲利+攤提)</span>
                          <span className="font-black text-indigo-700">${Math.round(results.buildRentSubtotal).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 flex flex-col ${calcMode !== 'comprehensive' ? 'md:col-span-2' : ''}`}>
                    <h2 className="text-base font-black text-slate-800 mb-8 flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                      建物價值遞減趨勢
                    </h2>
                    <div className="h-80 grow">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={results.yearlyData}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(v) => `$${(v/10000).toFixed(0)}萬`} />
                          <RechartsTooltip contentStyle={{ borderRadius: '20px' }} formatter={(val: number) => [`$${val.toLocaleString()}`, '建物殘值']} />
                          <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#colorValue)" strokeWidth={4} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Final Dashboard Summary */}
                <div className="bg-slate-900 p-10 sm:p-14 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden border border-slate-800">
                   <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[140px] -mr-60 -mt-60"></div>
                   <div className="relative z-10 flex flex-col lg:flex-row gap-16 items-center">
                     <div className="flex-1 space-y-12">
                        <div>
                          <h2 className="text-4xl font-black mb-6 tracking-tighter leading-none text-white">資產評估與收益總表</h2>
                          <p className="text-slate-400 text-base font-medium leading-relaxed max-w-xl">
                            本報告基於 <span className="text-white font-black">{STRUCT_MAP[inputs.structCode].name}</span> 之直線折舊法精算。
                            目前建物殘值為 <span className="text-indigo-400 font-black">${Math.round(results.residualValue).toLocaleString()}</span>。
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-10">
                          <div>
                            <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">資產端</p>
                            <p className="text-2xl font-black tracking-tighter">${Math.round(results.residualValue + results.landTotalVal).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">房地總現值</p>
                          </div>
                          {calcMode === 'comprehensive' && (
                            <div>
                              <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-4">收益端</p>
                              <p className="text-2xl font-black tracking-tighter">${Math.round(results.totalRent).toLocaleString()}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">建議月租金</p>
                            </div>
                          )}
                        </div>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Depreciation Schedule View */
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200/60 overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter mb-2">直線折舊明細表</h2>
                <p className="text-slate-500 text-sm font-medium">結構：{STRUCT_MAP[inputs.structCode].name} | 耐用年限：{results.lifeLimit} 年</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-10 py-5">年度 (屋齡)</th>
                    <th className="px-10 py-5">當期折舊金額</th>
                    <th className="px-10 py-5">累計折舊額</th>
                    <th className="px-10 py-5 text-right">建物剩餘價值</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.yearlyData.map((row) => (
                    <tr key={row.year} className={`hover:bg-indigo-50/30 transition-colors ${row.year === inputs.age ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${row.year === inputs.age ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{row.year}</span>
                          <span className="font-bold text-slate-700">第 {row.year} 年</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-sm font-bold text-slate-500">{row.year === 0 ? '-' : `$${row.yearlyDep.toLocaleString()}`}</td>
                      <td className="px-10 py-6 text-sm font-bold text-rose-500">${row.depreciation.toLocaleString()}</td>
                      <td className="px-10 py-6 text-right font-black text-slate-800">${row.value.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* --- Hidden Export Template --- */}
      <div className="hidden">
        <div ref={exportTargetRef} className="p-10 bg-white text-slate-900 font-sans" style={{ width: '210mm' }}>
          <div className="border-b-4 border-indigo-600 pb-6 mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-800">房地產估值精算報告</h1>
              <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs mt-1">Professional Valuation Report</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[10px] font-black uppercase">Report ID: VAL-{Math.floor(Math.random() * 1000000)}</p>
              <p className="text-slate-400 text-[10px] font-black uppercase">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 mb-12">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">評估對象與參數</h3>
              <ul className="space-y-3 text-sm font-medium">
                <li className="flex justify-between"><span className="text-slate-500">建物坪數</span><span className="font-black">{inputs.area} 坪</span></li>
                <li className="flex justify-between"><span className="text-slate-500">營造成本</span><span className="font-black">{inputs.costPerPing} 萬/坪</span></li>
                <li className="flex justify-between"><span className="text-slate-500">建物原始造價</span><span className="font-black">${Math.round(results.totalCost).toLocaleString()}</span></li>
                <li className="flex justify-between"><span className="text-slate-500">目前屋齡</span><span className="font-black">{inputs.age} 年</span></li>
                <li className="flex justify-between"><span className="text-slate-500">建物構造</span><span className="font-black">{STRUCT_MAP[inputs.structCode].name}</span></li>
                {calcMode === 'comprehensive' && (
                  <>
                    <li className="flex justify-between border-t border-slate-50 pt-3"><span className="text-slate-500">土地坪數</span><span className="font-black">{inputs.landArea} 坪</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">土地單價</span><span className="font-black">{inputs.landPingPrice} 萬/坪</span></li>
                    <li className="flex justify-between font-black text-indigo-600"><span className="text-slate-500">土地總價值</span><span className="font-black">${Math.round(results.landTotalVal).toLocaleString()}</span></li>
                    <li className="text-[9px] text-slate-400 italic text-right -mt-2">(公式：土地坪數 × 土地單價)</li>
                  </>
                )}
              </ul>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl">
              <h3 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-6">估值總結摘要</h3>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">當前建物殘值</p>
                  <p className="text-3xl font-black text-slate-800">${Math.round(results.residualValue).toLocaleString()}</p>
                </div>
                {calcMode === 'comprehensive' && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">房地總現值</p>
                    <p className="text-3xl font-black text-indigo-600">${Math.round(results.residualValue + results.landTotalVal).toLocaleString()}</p>
                  </div>
                )}
                {calcMode === 'comprehensive' && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">建議月租金</p>
                    <p className="text-3xl font-black text-rose-600">${Math.round(results.totalRent).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">月建議收益細項 (租金組成)</h3>
            <div className="space-y-4 px-2">
              <div className="border-l-4 border-slate-200 pl-4">
                <div className="flex justify-between text-sm font-bold">
                  <span>月造價攤提</span>
                  <span>${Math.round(results.rentBuildCost).toLocaleString()}</span>
                </div>
                <p className="text-[9px] text-slate-400 italic">(公式：原始總造價 ÷ 耐用年限 ÷ 12個月)</p>
              </div>
              
              <div className="border-l-4 border-slate-200 pl-4">
                <div className="flex justify-between text-sm font-bold">
                  <span>月預期獲利 (建物)</span>
                  <span>${Math.round(results.rentBuildRoi).toLocaleString()}</span>
                </div>
                <p className="text-[9px] text-slate-400 italic">(公式：當前建物殘值 × 年投報率 ÷ 12個月)</p>
              </div>

              <div className="border-l-4 border-slate-200 pl-4">
                <div className="flex justify-between text-sm font-bold">
                  <span>月預期獲利 (土地)</span>
                  <span>${Math.round(results.rentLandRoi).toLocaleString()}</span>
                </div>
                <p className="text-[9px] text-slate-400 italic">(公式：土地總價值 × 年投報率 ÷ 12個月)</p>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-6">折舊明細清單 (逐年)</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                  <th className="py-3 px-4 text-left">年度</th>
                  <th className="py-3 px-4 text-left">當期折舊</th>
                  <th className="py-3 px-4 text-left">累計折舊</th>
                  <th className="py-3 px-4 text-right">剩餘價值</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.yearlyData.filter((_, i) => i % 5 === 0 || i === results.lifeLimit || i === inputs.age).map((row) => (
                  <tr key={row.year} className={row.year === inputs.age ? 'bg-indigo-50 font-bold' : ''}>
                    <td className="py-3 px-4">第 {row.year} 年</td>
                    <td className="py-3 px-4 text-slate-500">${row.year === 0 ? '0' : row.yearlyDep.toLocaleString()}</td>
                    <td className="py-3 px-4 text-rose-500">${row.depreciation.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-black">${row.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[9px] text-slate-400 mt-4 italic">* 明細表僅顯示關鍵年份、目前屋齡節點。完整清單請參閱系統線上版。</p>
          </div>

          <div className="mt-20 border-t border-slate-100 pt-8 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">End of Valuation Report</p>
          </div>
        </div>
      </div>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 text-center no-print">
        <div className="h-px w-full bg-slate-200 mb-12"></div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.6em] mb-4">Professional Real Estate Valuation Engine</p>
        <p className="text-slate-300 text-[10px] font-bold italic">PRECISION FINANCIAL TOOLS FOR PROPERTY INVESTORS. © 2024</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}
