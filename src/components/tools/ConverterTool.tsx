import { useShallow } from 'zustand/react/shallow';
import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../../store';
import { ToolCard } from './ToolCard';
import { useT } from '../../i18n/context';

interface ConversionUnit {
    label: string;
    toBase: (v: number) => number;
    fromBase: (v: number) => number;
}

interface ConversionCategory {
    name: string;
    icon: string;
    units: ConversionUnit[];
}

const CATEGORIES: ConversionCategory[] = [
    {
        name: 'Length', icon: 'straighten',
        units: [
            { label: 'Meters', toBase: v => v, fromBase: v => v },
            { label: 'Kilometers', toBase: v => v * 1000, fromBase: v => v / 1000 },
            { label: 'Centimeters', toBase: v => v / 100, fromBase: v => v * 100 },
            { label: 'Millimeters', toBase: v => v / 1000, fromBase: v => v * 1000 },
            { label: 'Miles', toBase: v => v * 1609.344, fromBase: v => v / 1609.344 },
            { label: 'Yards', toBase: v => v * 0.9144, fromBase: v => v / 0.9144 },
            { label: 'Feet', toBase: v => v * 0.3048, fromBase: v => v / 0.3048 },
            { label: 'Inches', toBase: v => v * 0.0254, fromBase: v => v / 0.0254 }]},
    {
        name: 'Weight', icon: 'scale',
        units: [
            { label: 'Kilograms', toBase: v => v, fromBase: v => v },
            { label: 'Grams', toBase: v => v / 1000, fromBase: v => v * 1000 },
            { label: 'Milligrams', toBase: v => v / 1e6, fromBase: v => v * 1e6 },
            { label: 'Pounds', toBase: v => v * 0.45359237, fromBase: v => v / 0.45359237 },
            { label: 'Ounces', toBase: v => v * 0.028349523, fromBase: v => v / 0.028349523 },
            { label: 'Tonnes', toBase: v => v * 1000, fromBase: v => v / 1000 }]},
    {
        name: 'Temperature', icon: 'thermostat',
        units: [
            { label: '°Celsius', toBase: v => v, fromBase: v => v },
            { label: '°Fahrenheit', toBase: v => (v - 32) * 5 / 9, fromBase: v => v * 9 / 5 + 32 },
            { label: 'Kelvin', toBase: v => v - 273.15, fromBase: v => v + 273.15 }]},
    {
        name: 'Volume', icon: 'water_drop',
        units: [
            { label: 'Liters', toBase: v => v, fromBase: v => v },
            { label: 'Milliliters', toBase: v => v / 1000, fromBase: v => v * 1000 },
            { label: 'Gallons (US)', toBase: v => v * 3.78541178, fromBase: v => v / 3.78541178 },
            { label: 'Quarts', toBase: v => v * 0.946352946, fromBase: v => v / 0.946352946 },
            { label: 'Cups', toBase: v => v * 0.236588236, fromBase: v => v / 0.236588236 },
            { label: 'Fl Oz', toBase: v => v * 0.029573529, fromBase: v => v / 0.029573529 }]},
    {
        name: 'Currency', icon: 'payments',
        units: [
            { label: 'USD', toBase: v => v, fromBase: v => v },
            { label: 'EUR', toBase: v => v, fromBase: v => v },
            { label: 'GBP', toBase: v => v, fromBase: v => v },
            { label: 'INR', toBase: v => v, fromBase: v => v },
            { label: 'JPY', toBase: v => v, fromBase: v => v },
            { label: 'CAD', toBase: v => v, fromBase: v => v },
            { label: 'AUD', toBase: v => v, fromBase: v => v }]},
    {
        name: 'Speed', icon: 'speed',
        units: [
            { label: 'm/s', toBase: v => v, fromBase: v => v },
            { label: 'km/h', toBase: v => v / 3.6, fromBase: v => v * 3.6 },
            { label: 'mph', toBase: v => v * 0.44704, fromBase: v => v / 0.44704 },
            { label: 'knots', toBase: v => v * 0.514444, fromBase: v => v / 0.514444 }]}];

const PRESETS = [
    { label: '°C ➔ °F', catName: 'Temperature', from: '°Celsius', to: '°Fahrenheit' },
    { label: 'kg ➔ lbs', catName: 'Weight', from: 'Kilograms', to: 'Pounds' },
    { label: 'mi ➔ km', catName: 'Length', from: 'Miles', to: 'Kilometers' },
    { label: 'USD ➔ EUR', catName: 'Currency', from: 'USD', to: 'EUR' }];

const ConverterTool: React.FC = () => {
    const {  toolWindows, minimizeToolWindow, closeToolWindow  } = useStore(useShallow(state => ({ toolWindows: state.toolWindows, minimizeToolWindow: state.minimizeToolWindow, closeToolWindow: state.closeToolWindow })));
    const tw = toolWindows.find(t => t.id === 'converter');
    if (!tw) return null;

    return <ConverterInner
        minimized={tw.minimized}
        minimizeToolWindow={minimizeToolWindow}
        closeToolWindow={closeToolWindow}
        index={toolWindows.filter(t => !t.minimized).findIndex(t => t.id === 'converter')}
    />;
};

const CATEGORY_LABELS: Record<string, string> = {
    Length: 'tools.converter.categories.length',
    Weight: 'tools.converter.categories.weight',
    Temperature: 'tools.converter.categories.temperature',
    Volume: 'tools.converter.categories.volume',
    Currency: 'tools.converter.categories.currency',
    Speed: 'tools.converter.categories.speed'};

const UNIT_LABELS: Record<string, string> = {
    Meters: 'tools.converter.units.meters',
    Kilometers: 'tools.converter.units.kilometers',
    Centimeters: 'tools.converter.units.centimeters',
    Millimeters: 'tools.converter.units.millimeters',
    Miles: 'tools.converter.units.miles',
    Yards: 'tools.converter.units.yards',
    Feet: 'tools.converter.units.feet',
    Inches: 'tools.converter.units.inches',
    Kilograms: 'tools.converter.units.kilograms',
    Grams: 'tools.converter.units.grams',
    Milligrams: 'tools.converter.units.milligrams',
    Pounds: 'tools.converter.units.pounds',
    Ounces: 'tools.converter.units.ounces',
    Tonnes: 'tools.converter.units.tonnes',
    '°Celsius': 'tools.converter.units.celsius',
    '°Fahrenheit': 'tools.converter.units.fahrenheit',
    Kelvin: 'tools.converter.units.kelvin',
    Liters: 'tools.converter.units.liters',
    Milliliters: 'tools.converter.units.milliliters',
    'Gallons (US)': 'tools.converter.units.gallonsUs',
    Quarts: 'tools.converter.units.quarts',
    Cups: 'tools.converter.units.cups',
    'Fl Oz': 'tools.converter.units.flOz'};

const PRESET_LABELS: Record<number, string> = {
    0: 'tools.converter.presets.celsiusToFahrenheit',
    1: 'tools.converter.presets.kilogramsToPounds',
    2: 'tools.converter.presets.milesToKilometers',
    3: 'tools.converter.presets.usdToEur'};

const ConverterInner: React.FC<{
    minimized: boolean;
    minimizeToolWindow: (id: string) => void;
    closeToolWindow: (id: string) => void;
    index: number;
}> = ({ minimized, minimizeToolWindow, closeToolWindow, index }) => {
    const t = useT();
    const [catIdx, setCatIdx] = useState(0);
    const [fromIdx, setFromIdx] = useState(0);
    const [toIdx, setToIdx] = useState(1);
    const [inputVal, setInputVal] = useState('1');
    const [rotate, setRotate] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    // Dynamic conversion rates relative to USD
    const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({
        USD: 1.0,
        EUR: 0.92,
        GBP: 0.78,
        INR: 83.3,
        JPY: 156.4,
        CAD: 1.37,
        AUD: 1.51
    });

    const [, setHistory] = useState<Array<{
        category: string;
        fromVal: string;
        fromUnit: string;
        toVal: string;
        toUnit: string;
        timestamp: string;
    }>>([]);

    useEffect(() => {
        const loadHistory = () => {
            const stored = localStorage.getItem('thred_converter_history');
            if (stored) {
                try {
                    setHistory(JSON.parse(stored));
                } catch (e) {
                    console.error(e);
                }
            } else {
                setHistory([]);
            }
        };

        loadHistory();
        window.addEventListener('storage', loadHistory);
        return () => window.removeEventListener('storage', loadHistory);
    }, []);

    const saveConversion = useCallback((val: string, fUnit: string, res: string, tUnit: string, catName: string) => {
        if (!val || isNaN(parseFloat(val)) || !res || res === '—') return;
        
        const newItem = {
            category: catName,
            fromVal: val,
            fromUnit: fUnit,
            toVal: res,
            toUnit: tUnit,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setHistory(prev => {
            const isDuplicate = prev[0] && 
                               prev[0].fromVal === val && 
                               prev[0].fromUnit === fUnit && 
                               prev[0].toUnit === tUnit && 
                               prev[0].category === catName;
            if (isDuplicate) return prev;
            
            const updated = [newItem, ...prev].slice(0, 30); // Keep last 30
            localStorage.setItem('thred_converter_history', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
            return updated;
        });
    }, []);

    const cat = CATEGORIES[catIdx];
    const fromUnit = cat.units[fromIdx] || cat.units[0];
    const toUnit = cat.units[toIdx] || cat.units[1];

    const convert = useCallback(() => {
        const v = parseFloat(inputVal);
        if (isNaN(v)) return '—';
        if (cat.name === 'Currency') {
            const fromRate = currencyRates[fromUnit.label] || 1;
            const toRate = currencyRates[toUnit.label] || 1;
            // Convert to USD first, then to target currency
            const usdValue = v / fromRate;
            const result = usdValue * toRate;
            return parseFloat(result.toPrecision(8)).toString();
        } else {
            const base = fromUnit.toBase(v);
            const result = toUnit.fromBase(base);
            return parseFloat(result.toPrecision(8)).toString();
        }
    }, [inputVal, fromUnit, toUnit, cat, currencyRates]);

    // Debounce saving when inputVal or units change
    useEffect(() => {
        const timer = setTimeout(() => {
            const res = convert();
            saveConversion(inputVal, fromUnit.label, res, toUnit.label, cat.name);
        }, 1000);
        return () => clearTimeout(timer);
    }, [inputVal, fromIdx, toIdx, catIdx, convert, saveConversion, fromUnit.label, toUnit.label, cat.name]);

    const swap = () => {
        setRotate(prev => !prev);
        setFromIdx(toIdx);
        setToIdx(fromIdx);
    };

    const fetchLiveRates = useCallback(async (isManual = false) => {
        setIsRefreshing(true);
        try {
            let data;
            try {
                const res = await fetch('https://open.er-api.com/v6/latest/USD');
                if (!res.ok) throw new Error();
                data = await res.json();
            } catch (e) {
                // Fallback to secondary API
                const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                if (!res.ok) throw new Error('Both APIs failed');
                const rawData = await res.json();
                data = {
                    result: 'success',
                    rates: rawData.rates
                };
            }

            if (data && data.result === 'success' && data.rates) {
                setCurrencyRates(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(code => {
                        if (data.rates[code] !== undefined) {
                            next[code] = data.rates[code];
                        }
                    });
                    return next;
                });
                setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                if (isManual) {
                                        undefined;
                }
            } else {
                throw new Error('Invalid data format');
            }
        } catch (err) {
            console.error('Failed to fetch exchange rates:', err);
            if (isManual) {
                                        undefined;
            }
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchLiveRates(false);
    }, [fetchLiveRates]);

    const handleRefreshRates = () => {
        if (isRefreshing) return;
        void fetchLiveRates(true);
    };

    const applyPreset = (preset: typeof PRESETS[0]) => {
        const cIdx = CATEGORIES.findIndex(c => c.name === preset.catName);
        if (cIdx === -1) return;
        setCatIdx(cIdx);
        
        const targetCat = CATEGORIES[cIdx];
        const fIdx = targetCat.units.findIndex(u => u.label === preset.from);
        const tIdx = targetCat.units.findIndex(u => u.label === preset.to);
        
        if (fIdx !== -1) setFromIdx(fIdx);
        if (tIdx !== -1) setToIdx(tIdx);
    };

    return (
        <ToolCard
            toolId="converter"
            title={t('tools.converter.title')}
            icon={<span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--accent)' }}>swap_horiz</span>}
            width={320}
            height={510}
            isMinimized={minimized}
            onClose={() => closeToolWindow('converter')}
            onMinimize={() => minimizeToolWindow('converter')}
            index={index}
        >
            <div className="flex flex-col flex-1 min-h-0 w-full h-full select-none bg-[var(--bg-primary)]">
                {/* Category Tabs */}
                <div className="grid grid-cols-3 gap-1 px-2 pt-2.5 pb-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] shrink-0">
                    {CATEGORIES.map((c, i) => (
                        <button
                            key={c.name}
                            onClick={() => {
                                setCatIdx(i);
                                setFromIdx(0);
                                setToIdx(1);
                                setInputVal('1');
                            }}
                            className={`px-1 py-1.5 text-[10px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                                i === catIdx
                                    ? 'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] shadow-sm'
                                    : 'text-white/40 border border-transparent hover:bg-[var(--bg-hover)]'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[12px]">{c.icon}</span>
                            {t(CATEGORY_LABELS[c.name] as any)}
                        </button>
                    ))}
                </div>

                {/* Conversion Area */}
                <div className="flex-1 flex flex-col justify-center px-4 py-3 gap-3">
                    {/* From */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] text-white/40 font-medium px-0.5">
                            <span>{t('tools.converter.from')}</span>
                            {cat.name === 'Currency' && (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={handleRefreshRates}
                                        className="flex items-center gap-0.5 text-[var(--accent)] hover:underline active:scale-95 transition-all cursor-pointer"
                                        title={t('tools.converter.refreshRates')}
                                    >
                                        <span className={`material-symbols-outlined text-[11px] ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
                                        {isRefreshing ? t('tools.converter.syncing') : t('tools.converter.liveRate')}
                                    </button>
                                    {lastUpdated && !isRefreshing && (
                                        <span className="text-white/30 text-[9px] font-mono select-none">
                                            • {lastUpdated}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <select
                                value={fromIdx}
                                onChange={e => setFromIdx(Number(e.target.value))}
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg pl-3 pr-8 py-2 text-[12px] text-white/80 focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer appearance-none"
                            >
                                {cat.units.map((u, i) => <option key={i} value={i}>{t(UNIT_LABELS[u.label] as any)}</option>)}
                            </select>
                            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-[16px] pointer-events-none">expand_more</span>
                        </div>
                        <input
                            type="number"
                            value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-[16px] font-medium text-white font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                    </div>

                    {/* Swap Button Wrapper */}
                    <div className="flex justify-center -my-1">
                        <button
                            onClick={swap}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] active:scale-95 transition-all shadow-md"
                        >
                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${rotate ? 'rotate-180' : ''}`}>swap_vert</span>
                        </button>
                    </div>

                    {/* To */}
                    <div className="space-y-1.5">
                        <div className="text-[10px] text-white/40 font-medium px-0.5">{t('tools.converter.to')}</div>
                        <div className="relative">
                            <select
                                value={toIdx}
                                onChange={e => setToIdx(Number(e.target.value))}
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg pl-3 pr-8 py-2 text-[12px] text-white/80 focus:outline-none focus:border-[var(--accent)] transition-colors cursor-pointer appearance-none"
                            >
                                {cat.units.map((u, i) => <option key={i} value={i}>{t(UNIT_LABELS[u.label] as any)}</option>)}
                            </select>
                            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 text-[16px] pointer-events-none">expand_more</span>
                        </div>
                        <div className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-3 py-2.5 text-[16px] font-semibold text-[var(--accent)] font-mono flex items-center min-h-[42px] overflow-x-auto whitespace-nowrap scrollbar-none">
                            {convert()}
                        </div>
                    </div>
                </div>

                {/* Common Presets Toolbar */}
                <div className="px-3 py-2 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] shrink-0">
                    <div className="text-[9px] text-white/30 font-semibold mb-1 uppercase tracking-wider">{t('tools.converter.commonPresets')}</div>
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
                        {PRESETS.map((p, i) => (
                            <button
                                key={i}
                                onClick={() => applyPreset(p)}
                                className="px-2 py-1 text-[9px] font-medium rounded bg-[var(--bg-active)] hover:bg-[var(--bg-hover)] text-white/60 hover:text-white border border-[var(--border-primary)] transition-all shrink-0 active:scale-95"
                            >
                                {t(PRESET_LABELS[i] as any)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </ToolCard>
    );
};

export default ConverterTool;
