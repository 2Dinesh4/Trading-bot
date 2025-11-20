import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, TrendingUp, Moon, Sun } from 'lucide-react';
import { ThemeContext } from '../contexts/ThemeContext';
import UserProfile from '../components/UserProfile';

export default function TradingBot() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUserData(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };
  
  const [params, setParams] = useState({
    symbol: '',
    entryValue: 0,
    initialStopLoss: 5,
    exitPercent: 3
  });
  
  const [popularSymbols] = useState([
    { name: 'BTCUSDT', price: 50000, type: 'crypto', currency: 'USDT', exchange: 'Binance' },
    { name: 'ETHUSDT', price: 3000, type: 'crypto', currency: 'USDT', exchange: 'Binance' },
    { name: 'SOLUSDT', price: 200, type: 'crypto', currency: 'USDT', exchange: 'Binance' },
    { name: 'DOGEUSDT', price: 0.4, type: 'crypto', currency: 'USDT', exchange: 'Binance' },
    { name: 'ADAUSDT', price: 1.2, type: 'crypto', currency: 'USDT', exchange: 'Binance' },
    { name: 'BNBUSDT', price: 600, type: 'crypto', currency: 'USDT', exchange: 'Binance' },
    { name: 'RELIANCE', price: 2950, type: 'stock', currency: 'INR', exchange: 'Upstox' },
    { name: 'TCS', price: 3850, type: 'stock', currency: 'INR', exchange: 'Upstox' },
    { name: 'INFY', price: 1780, type: 'stock', currency: 'INR', exchange: 'Upstox' },
    { name: 'HDFCBANK', price: 1650, type: 'stock', currency: 'INR', exchange: 'Upstox' },
    { name: 'ICICIBANK', price: 1020, type: 'stock', currency: 'INR', exchange: 'Upstox' },
    { name: 'SBIN', price: 625, type: 'stock', currency: 'INR', exchange: 'Upstox' },
    { name: 'ITC', price: 450, type: 'stock', currency: 'INR', exchange: 'Upstox' },
    { name: 'BHARTIARTL', price: 1285, type: 'stock', currency: 'INR', exchange: 'Upstox' },
  ]);
  
  const [botState, setBotState] = useState({
    isRunning: false,
    position: null,
    currentPrice: 0,
    stopLossPrice: 0,
    targetPrice: 0,
    tradeHistory: []
  });
  
  const [logs, setLogs] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const intervalRef = useRef(null);
  const priceIntervalRef = useRef(null);
  
  const detectCurrency = (symbol) => {
    if (!symbol) return '$';
    const symbolUpper = symbol.toUpperCase();
    
    if (symbolUpper.includes('USDT') || symbolUpper.includes('BTC') || symbolUpper.includes('ETH')) return '$';
    if (symbolUpper.includes('RELIANCE') || symbolUpper.includes('TCS') || 
        symbolUpper.includes('INFY') || symbolUpper.includes('HDFC') || 
        symbolUpper.includes('ICICI') || symbolUpper.includes('SBIN') || 
        symbolUpper.includes('ITC') || symbolUpper.includes('BHARTI')) {
      return '₹';
    }
    if (symbolUpper.includes('INR')) return '₹';
    if (symbolUpper.includes('EUR')) return '€';
    if (symbolUpper.includes('GBP')) return '£';
    if (symbolUpper.includes('JPY')) return '¥';
    
    return '$';
  };
  
  const currentCurrency = detectCurrency(params.symbol);
  
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{timestamp, message, type}, ...prev].slice(0, 100));
  };

  // --- WALLET FUNCTIONS ---
  const startTradeWithWallet = async (symbol, amount, entryPrice) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        addLog('❌ No auth token', 'error');
        return { success: false, error: 'Not authenticated' };
      }
      addLog(`💰 Deducting $${amount.toFixed(2)} from wallet...`, 'info');
      const response = await fetch('http://localhost:10152/api/trading/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol,
          amount: amount,
          entry_price: entryPrice
        })
      });
      const data = await response.json();
      if (data.success) {
        addLog(`✅ Deducted $${amount.toFixed(2)}`, 'success');
        addLog(`💵 Balance: $${data.new_balance.toFixed(2)}`, 'success');
        return { success: true, balance: data.new_balance };
      } else {
        addLog(`❌ Wallet error: ${data.error}`, 'error');
        return { success: false, error: data.error };
      }
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  };

  const closeTradeWithWallet = async (symbol, initialAmount, finalAmount, profitLoss) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { success: false };
      addLog(`💸 Adding $${finalAmount.toFixed(2)} to wallet...`, 'info');
      const response = await fetch('http://localhost:10152/api/trading/close', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol,
          initial_amount: initialAmount,
          final_amount: finalAmount,
          profit_loss: profitLoss
        })
      });
      const data = await response.json();
      if (data.success) {
        addLog(`✅ Added $${finalAmount.toFixed(2)}`, 'success');
        addLog(`💵 Balance: $${data.new_balance.toFixed(2)}`, 'success');
        addLog(`📈 P/L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)}`, 
           profitLoss >= 0 ? 'success' : 'error');
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      addLog(`❌ Error: ${error.message}`, 'error');
      return { success: false };
    }
  };
  // ---------------------------------------
  
  useEffect(() => {
    if (!params.symbol || params.symbol.trim() === '') {
      setCurrentPrice(0);
      return;
    }

    if (priceIntervalRef.current) {
      clearInterval(priceIntervalRef.current);
      priceIntervalRef.current = null;
    }

    const fetchRealPrice = async () => {
      try {
        let apiSymbol = params.symbol.trim();
        if (apiSymbol.includes('/')) {
          apiSymbol = apiSymbol.replace('/', '');
        }
        
        // console.log('Fetching price for:', apiSymbol);
        const response = await fetch(`http://localhost:10152/api/price/${apiSymbol}`);
        
        if (!response.ok) {
          return;
        }
        
        const data = await response.json();
        
        if (data.success) {
          const price = parseFloat(data.price);
          setCurrentPrice(price);
        }
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    };

    fetchRealPrice();
    priceIntervalRef.current = setInterval(fetchRealPrice, 2000);

    return () => {
      if (priceIntervalRef.current) {
        clearInterval(priceIntervalRef.current);
        priceIntervalRef.current = null;
      }
    };
  }, [params.symbol]);

  const simulatePrice = (basePrice) => {
    let volatility = 0.003;
    
    if (basePrice > 10000) {
      volatility = 0.0015;
    }
    if (basePrice > 100000) {
      volatility = 0.0008;
    }
    if (basePrice > 1000000) {
      volatility = 0.0005;
    }
    if (basePrice > 10000000) {
      volatility = 0.0003;
    }
    
    const trend = 0.0002;
    const change = (Math.random() - 0.4) * 2 * volatility + trend;
    return basePrice * (1 + change);
  };
  
  const startBot = async () => {
    if (botState.isRunning) return;
    
    if (!params.symbol || params.symbol.trim() === '') {
      addLog('Please select a trading symbol', 'error');
      return;
    }

    // --- ENTRY VALIDATION (Confirmed Fixed) ---
    if (!params.entryValue || params.entryValue <= 0) {
      addLog('⚠️ Please enter a valid entry amount (must be greater than 0)', 'error');
      return;
    }
    
    if (params.initialStopLoss < 0 || params.initialStopLoss >= 100) {
      addLog('Stop loss must be between 0-100%', 'error');
      return;
    }
    
    if (params.exitPercent <= 0) {
      addLog('Exit percentage must be greater than 0', 'error');
      return;
    }
    
    try {
      let apiSymbol = params.symbol.trim();
      if (params.symbol.includes('/')) {
        apiSymbol = params.symbol.replace('/', '');
      }
      
      addLog(`Fetching LIVE price for ${apiSymbol}...`, 'info');
      
      const response = await fetch(`http://localhost:10152/api/price/${apiSymbol}`);
      
      if (!response.ok) {
        addLog(`Failed to connect to API (Status: ${response.status})`, 'error');
        return;
      }
      
      const priceData = await response.json();
      
      if (!priceData.success) {
        addLog(`Failed to get real price from API: ${priceData.error}`, 'error');
        return;
      }
      
      const purchasePrice = parseFloat(priceData.price);
      const exchange = priceData.exchange === 'UPSTOX' ? 'Upstox' : 'Binance';
      addLog(`Got LIVE price from ${exchange}: ${currentCurrency}${purchasePrice.toFixed(2)}`, 'success');
      
      // --- WALLET DEDUCTION (Confirmed Fixed) ---
      const walletAmount = params.entryValue; 
      const walletResult = await startTradeWithWallet(apiSymbol, walletAmount, purchasePrice);
      if (!walletResult.success) {
        addLog(`❌ Cannot start: ${walletResult.error}`, 'error');
        return;
      }
      // ------------------------------------------

      const initialStopLoss = purchasePrice * (1 - params.initialStopLoss / 100);
      const targetPrice = purchasePrice * (1 + params.exitPercent / 100);
      const adjustTriggerPrice = purchasePrice * (1 + 0.02);
      
      setBotState(prev => ({
        ...prev,
        isRunning: true,
        position: {
          entryPrice: purchasePrice,
          quantity: 1,
          entryTime: new Date(),
          stopLossAdjusted: false
        },
        currentPrice: purchasePrice,
        stopLossPrice: initialStopLoss,
        targetPrice: targetPrice
      }));
      
      addLog(`Bot Started for ${params.symbol} - Entry: ${currentCurrency}${purchasePrice.toFixed(2)}`, 'success');
      addLog(`Initial Stop Loss: ${currentCurrency}${initialStopLoss.toFixed(2)} (${params.initialStopLoss}%)`, 'info');
      addLog(`SL Adjust Trigger: ${currentCurrency}${adjustTriggerPrice.toFixed(2)} (+2%)`, 'info');
      addLog(`Target Price: ${currentCurrency}${targetPrice.toFixed(2)} (+${params.exitPercent}%)`, 'info');
      
      intervalRef.current = setInterval(() => {
        setBotState(prev => {
          if (!prev.isRunning || !prev.position) return prev;
          
          const newPrice = simulatePrice(prev.currentPrice);
          let newState = { ...prev, currentPrice: newPrice };
          
          // --- STOP LOSS CHECK ---
          if (newPrice <= prev.stopLossPrice) {
            const pnl = ((newPrice - prev.position.entryPrice) / prev.position.entryPrice * 100).toFixed(2);
            addLog(`STOP LOSS HIT at ${currentCurrency}${newPrice.toFixed(2)} - P&L: ${pnl}%`, 'error');
            
            const finalAmt = (params.entryValue || prev.position.entryPrice) * (1 + parseFloat(pnl) / 100);
            const plAmt = finalAmt - (params.entryValue || prev.position.entryPrice);
            closeTradeWithWallet(params.symbol, (params.entryValue || prev.position.entryPrice), finalAmt, plAmt);

            newState.tradeHistory = [{
              symbol: params.symbol,
              entry: prev.position.entryPrice,
              exit: newPrice,
              pnl: parseFloat(pnl),
              reason: 'Stop Loss',
              time: new Date()
            }, ...prev.tradeHistory];
            
            clearInterval(intervalRef.current);
            return {
              ...newState,
              isRunning: false,
              position: null
            };
          }
          
          // --- 🔥 TARGET CHECK WITH 99.95% BUFFER (FIXED) ---
          const targetThreshold = prev.targetPrice * 0.9995; // Trigger at 99.95% of target
          
          if (newPrice >= targetThreshold) {
            const pnl = ((newPrice - prev.position.entryPrice) / prev.position.entryPrice * 100).toFixed(2);
            
            addLog(`🎯 TARGET REACHED at ${currentCurrency}${newPrice.toFixed(2)} - P&L: ${pnl}%`, 'success');
            
            const finalAmt = (params.entryValue || prev.position.entryPrice) * (1 + parseFloat(pnl) / 100);
            const plAmt = finalAmt - (params.entryValue || prev.position.entryPrice);
            closeTradeWithWallet(params.symbol, (params.entryValue || prev.position.entryPrice), finalAmt, plAmt);

            newState.tradeHistory = [{
              symbol: params.symbol,
              entry: prev.position.entryPrice,
              exit: newPrice,
              pnl: parseFloat(pnl),
              reason: 'Target',
              time: new Date()
            }, ...prev.tradeHistory];
            
            clearInterval(intervalRef.current);
            return {
              ...newState,
              isRunning: false,
              position: null
            };
          }
          
          // --- SL ADJUSTMENT ---
          const priceIncrease = ((newPrice - prev.position.entryPrice) / prev.position.entryPrice) * 100;
          if (priceIncrease >= 2 && !prev.position.stopLossAdjusted) {
            const newStopLoss = prev.position.entryPrice * 1.01;
            addLog(`Price up ${priceIncrease.toFixed(2)}%! Stop Loss adjusted to ${currentCurrency}${newStopLoss.toFixed(2)} (+1% from entry)`, 'warning');
            newState.stopLossPrice = newStopLoss;
            newState.position = { ...newState.position, stopLossAdjusted: true };
          }
          
          return newState;
        });
      }, 1000);
    } catch (error) {
      addLog(`Error starting bot: ${error.message}`, 'error');
      console.error('Error:', error);
    }
  };
  
  const stopBot = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (botState.position) {
      const pnl = ((botState.currentPrice - botState.position.entryPrice) / botState.position.entryPrice * 100).toFixed(2);
      
      const finalAmt = (params.entryValue || botState.position.entryPrice) * (1 + parseFloat(pnl) / 100);
      const plAmt = finalAmt - (params.entryValue || botState.position.entryPrice);
      
      addLog(`Bot Stopped Manually - P&L: ${pnl}%`, 'warning');
      
      await closeTradeWithWallet(params.symbol, (params.entryValue || botState.position.entryPrice), finalAmt, plAmt);

      setBotState(prev => ({
        ...prev,
        tradeHistory: [{
          symbol: params.symbol,
          entry: prev.position.entryPrice,
          exit: prev.currentPrice,
          pnl: parseFloat(pnl),
          reason: 'Manual Stop',
          time: new Date()
        }, ...prev.tradeHistory],
        isRunning: false,
        position: null
      }));
    } else {
      setBotState(prev => ({ ...prev, isRunning: false }));
    }
  };

  const handleBuyOrder = async () => {
    try {
      if (!botState.position) {
        addLog('No active position. Start the bot first!', 'error');
        return;
      }

      let apiSymbol = params.symbol.trim();
      if (params.symbol.includes('/')) {
        apiSymbol = params.symbol.replace('/', '');
      }

      const quantity = 0.001;
      addLog(`Placing BUY order for ${quantity} ${apiSymbol}...`, 'info');
      
      const response = await fetch('http://localhost:10152/api/order/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: apiSymbol, quantity: quantity })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addLog(`BUY ORDER EXECUTED!`, 'success');
        addLog(`Order ID: ${data.order_id}`, 'success');
      } else {
        addLog(`Buy order failed: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`Error placing buy order: ${error.message}`, 'error');
    }
  };

  const handleSellOrder = async () => {
    try {
      if (!botState.position) {
        addLog('No active position. Start the bot first!', 'error');
        return;
      }

      let apiSymbol = params.symbol.trim();
      if (params.symbol.includes('/')) {
        apiSymbol = params.symbol.replace('/', '');
      }

      const quantity = 0.001;
      addLog(`Placing SELL order for ${quantity} ${apiSymbol}...`, 'info');
      
      const response = await fetch('http://localhost:10152/api/order/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: apiSymbol, quantity: quantity })
      });
      
      const data = await response.json();
      
      if (data.success) {
        addLog(`SELL ORDER EXECUTED!`, 'success');
        addLog(`Order ID: ${data.order_id}`, 'success');
      } else {
        addLog(`Sell order failed: ${data.error}`, 'error');
      }
    } catch (error) {
      addLog(`Error placing sell order: ${error.message}`, 'error');
    }
  };
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (priceIntervalRef.current) clearInterval(priceIntervalRef.current);
    };
  }, []);
  
  const currentPnL = botState.position 
    ? ((botState.currentPrice - botState.position.entryPrice) / botState.position.entryPrice * 100).toFixed(2)
    : 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 relative overflow-hidden ${
      isDark 
        ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900' 
        : 'bg-gradient-to-br from-gray-100 via-blue-50 to-gray-100'
    } p-6`}>
      
      {/* CLEAN BACKGROUND */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl"></div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className={`rounded-xl shadow-2xl overflow-hidden transition-colors duration-300 ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          
          {/* HEADER */}
          <div className={`bg-gradient-to-r transition-all duration-300 relative overflow-visible z-50 ${
            isDark 
              ? 'from-gray-900 via-slate-800 to-gray-900 border-b-4 border-yellow-500' 
              : 'from-yellow-400 to-yellow-500'
          } p-6 shadow-xl`}>
            
            <div className="relative z-[100] flex justify-between items-center">
              <div>
                <h1 className={`text-3xl font-bold flex items-center gap-3 ${
                  isDark ? 'text-yellow-400' : 'text-gray-900'
                }`}>
                  <TrendingUp className="w-8 h-8" />
                  Dynamic Stop Loss Trading Bot
                </h1>
                <p className={`mt-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-900'
                }`}>
                  Live Binance + Upstox Integration - Automated trailing stop loss with target exit strategy
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* THEME TOGGLE */}
                <button
                  onClick={toggleTheme}
                  className={`p-3 rounded-full transition-all duration-300 ${
                    isDark 
                      ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-lg' 
                      : 'bg-gray-900 hover:bg-gray-800 text-yellow-400 shadow-lg'
                  }`}
                  title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
                </button>
                {userData && <UserProfile user={userData} onLogout={handleLogout} />}
              </div>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* PARAMETERS */}
            <div className="lg:col-span-1 space-y-4">
              <div className={`rounded-lg p-4 transition-colors duration-300 border-l-4 ${
                isDark 
                  ? 'bg-gray-700 border-yellow-500' 
                  : 'bg-slate-50 border-yellow-400'
              }`}>
                <h2 className={`text-xl font-semibold mb-4 ${
                  isDark ? 'text-yellow-400' : 'text-yellow-600'
                }`}>
                  Trading Parameters
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDark ? 'text-gray-200' : 'text-slate-700'
                    }`}>Select Trading Symbol</label>
                    <input
                      type="text"
                      value={params.symbol}
                      onChange={(e) => setParams({...params, symbol: e.target.value.toUpperCase()})}
                      disabled={botState.isRunning}
                      placeholder="e.g. BTCUSDT or RELIANCE"
                      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'border-yellow-300 bg-white text-slate-900'
                      }`}
                    />
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${
                          isDark ? 'text-gray-300' : 'text-slate-600'
                        }`}>Crypto (Binance):</p>
                        <div className="flex flex-wrap gap-1">
                          {popularSymbols.filter(s => s.type === 'crypto').map((sym) => (
                            <button
                              key={sym.name}
                              onClick={() => setParams({...params, symbol: sym.name})}
                              disabled={botState.isRunning}
                              className={`text-xs px-2 py-1 rounded disabled:opacity-50 font-semibold transition-colors ${
                                isDark
                                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                  : 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
                              }`}
                            >
                              {sym.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold mb-1 ${
                          isDark ? 'text-gray-300' : 'text-slate-600'
                        }`}>Stocks (Upstox/NSE):</p>
                        <div className="flex flex-wrap gap-1">
                          {popularSymbols.filter(s => s.type === 'stock').map((sym) => (
                            <button
                              key={sym.name}
                              onClick={() => setParams({...params, symbol: sym.name})}
                              disabled={botState.isRunning}
                              className={`text-xs px-2 py-1 rounded disabled:opacity-50 font-semibold transition-colors ${
                                isDark
                                  ? 'bg-green-600 hover:bg-green-500 text-white'
                                  : 'bg-green-200 hover:bg-green-300 text-green-900'
                              }`}
                            >
                              {sym.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDark ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Entry Value ({currentCurrency})
                    </label>
                    <input
                      type="number"
                      value={params.entryValue}
                      onChange={(e) => setParams({...params, entryValue: parseFloat(e.target.value)})}
                      disabled={botState.isRunning}
                      placeholder="Use LIVE price or set custom"
                      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'border-yellow-300 bg-white text-slate-900'
                      }`}
                    />
                    {currentPrice > 0 && (
                      <p className={`text-xs mt-1 font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                        Live Price: {currentCurrency}{currentPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDark ? 'text-gray-200' : 'text-slate-700'
                    }`}>Initial Stop Loss (%)</label>
                    <input
                      type="number"
                      value={params.initialStopLoss}
                      onChange={(e) => setParams({...params, initialStopLoss: parseFloat(e.target.value)})}
                      disabled={botState.isRunning}
                      step="0.1"
                      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'border-yellow-300 bg-white text-slate-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDark ? 'text-gray-200' : 'text-slate-700'
                    }`}>Exit Target (%)</label>
                    <input
                      type="number"
                      value={params.exitPercent}
                      onChange={(e) => setParams({...params, exitPercent: parseFloat(e.target.value)})}
                      disabled={botState.isRunning}
                      step="0.1"
                      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'border-yellow-300 bg-white text-slate-900'
                      }`}
                    />
                  </div>
                </div>
                
                <button
                  onClick={botState.isRunning ? stopBot : startBot}
                  className={`w-full mt-6 px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    botState.isRunning 
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg' 
                      : 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 shadow-lg'
                  }`}
                >
                  {botState.isRunning ? (
                    <>
                      <Square className="w-5 h-5" />
                      Stop Bot
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Bot
                    </>
                  )}
                </button>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleBuyOrder}
                    disabled={!botState.isRunning}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
                  >
                    <TrendingUp className="w-5 h-5" />
                    BUY
                  </button>
                  
                  <button
                    onClick={handleSellOrder}
                    disabled={!botState.isRunning}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg"
                  >
                    <TrendingUp className="w-5 h-5" />
                    SELL
                  </button>
                </div>
              </div>
              
              {/* STRATEGY */}
              <div className={`border-l-4 rounded-lg p-4 transition-colors ${
                isDark
                  ? 'bg-slate-700 border-yellow-500'
                  : 'bg-yellow-50 border-yellow-400'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  isDark ? 'text-yellow-400' : 'text-yellow-700'
                }`}>
                  Strategy Rules
                </h3>
                <ul className={`text-sm space-y-1 ${
                  isDark ? 'text-gray-300' : 'text-yellow-800'
                }`}>
                  <li>Entry at LIVE price (Binance or Upstox)</li>
                  <li>Initial SL: Entry - {params.initialStopLoss}%</li>
                  <li>If price ≥ Entry+2%: SL moves Entry+1%</li>
                  <li>If price ≥ Entry+{params.exitPercent}%: Exit</li>
                </ul>
              </div>
            </div>
            
            {/* MAIN CONTENT */}
            <div className="lg:col-span-2 space-y-4">
              {/* ACTIVITY LOG */}
              <div className={`rounded-lg p-4 transition-colors border-l-4 ${
                isDark 
                  ? 'bg-gray-700 border-blue-500' 
                  : 'bg-slate-50 border-blue-400'
              }`}>
                <h2 className={`text-lg font-semibold mb-3 ${
                  isDark ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  Activity Log
                </h2>
                <div className={`rounded-lg p-3 h-56 overflow-y-auto font-mono text-xs transition-colors ${
                  isDark ? 'bg-gray-900' : 'bg-black'
                }`}>
                  {logs.length === 0 ? (
                    <p className="text-green-400">Waiting for bot to start...</p>
                  ) : (
                    logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`mb-1 animate-slideIn ${
                          log.type === 'success'
                            ? 'text-green-400'
                            : log.type === 'error'
                            ? 'text-red-400'
                            : log.type === 'warning'
                            ? 'text-yellow-400'
                            : 'text-blue-300'
                        }`}
                        style={{
                          animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`,
                        }}
                      >
                        <span className="text-slate-500">[{log.timestamp}]</span> {log.message}
                      </div>
                    ))
                  )}
                </div>

                <style>{`
                  @keyframes slideIn {
                    from {
                      opacity: 0;
                      transform: translateX(-20px);
                    }
                    to {
                      opacity: 1;
                      transform: translateX(0);
                    }
                  }
                  .animate-slideIn {
                    animation-timing-function: ease-out;
                  }
                `}</style>
              </div>

              {/* LIVE POSITION */}
              {botState.position && (
                <div className="space-y-4">
                  <div className={`rounded-lg p-6 text-white bg-gradient-to-r shadow-xl ${
                    isDark
                      ? 'from-yellow-600 to-yellow-700'
                      : 'from-yellow-500 to-yellow-600'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold opacity-90">Trading Status</p>
                        <h2 className="text-2xl font-bold">{params.symbol}</h2>
                      </div>
                      <span className="bg-white text-yellow-600 px-4 py-2 rounded-full text-sm font-bold">
                        LIVE
                      </span>
                    </div>
                  </div>

                  <div className={`rounded-lg shadow-lg p-8 border-4 transition-colors ${
                    isDark
                      ? 'bg-gray-700 border-yellow-500'
                      : 'bg-white border-yellow-400'
                  }`}>
                    <p className={`text-center text-sm font-semibold mb-3 uppercase tracking-widest ${
                      isDark ? 'text-gray-300' : 'text-slate-500'
                    }`}>Current Market Price</p>
                    <p className={`text-center text-6xl font-bold ${
                      isDark ? 'text-yellow-400' : 'text-yellow-600'
                    }`}>{currentCurrency}{botState.currentPrice.toFixed(4)}</p>
                    <p className={`text-center text-sm mt-3 ${
                      isDark ? 'text-gray-400' : 'text-slate-500'
                    }`}>Updates every second</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className={`rounded-lg shadow p-4 border-t-4 transition-colors ${
                      isDark
                        ? 'bg-gray-700 border-slate-500'
                        : 'bg-white border-slate-400'
                    }`}>
                      <div className="text-center">
                        <p className="text-2xl mb-2">Entry</p>
                        <p className={`text-xs font-bold mb-2 uppercase ${
                          isDark ? 'text-gray-300' : 'text-slate-600'
                        }`}>Entry Price</p>
                        <p className={`text-2xl font-bold break-words ${
                          isDark ? 'text-white' : 'text-slate-800'
                        }`}>{currentCurrency}{botState.position.entryPrice.toFixed(4)}</p>
                        <p className={`text-xs mt-2 ${
                          isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>Your position</p>
                      </div>
                    </div>

                    <div className={`rounded-lg shadow p-4 border-t-4 transition-colors ${
                      isDark
                        ? 'bg-red-900 border-red-600'
                        : 'bg-red-50 border-red-500'
                    }`}>
                      <div className="text-center">
                        <p className="text-2xl mb-2">SL</p>
                        <p className={`text-xs font-bold mb-2 uppercase ${
                          isDark ? 'text-red-200' : 'text-red-700'
                        }`}>Stop Loss</p>
                        <p className={`text-2xl font-bold break-words ${
                          isDark ? 'text-red-300' : 'text-red-600'
                        }`}>{currentCurrency}{botState.stopLossPrice.toFixed(4)}</p>
                        <p className={`text-xs mt-2 ${
                          isDark ? 'text-red-300' : 'text-red-500'
                        }`}>Danger level</p>
                      </div>
                    </div>

                    <div className={`rounded-lg shadow p-4 border-t-4 transition-colors ${
                      isDark
                        ? 'bg-green-900 border-green-600'
                        : 'bg-green-50 border-green-500'
                    }`}>
                      <div className="text-center">
                        <p className="text-2xl mb-2">Target</p>
                        <p className={`text-xs font-bold mb-2 uppercase ${
                          isDark ? 'text-green-200' : 'text-green-700'
                        }`}>Target</p>
                        <p className={`text-2xl font-bold break-words ${
                          isDark ? 'text-green-300' : 'text-green-600'
                        }`}>{currentCurrency}{botState.targetPrice.toFixed(4)}</p>
                        <p className={`text-xs mt-2 ${
                          isDark ? 'text-green-300' : 'text-green-500'
                        }`}>Profit goal</p>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-lg shadow-lg p-6 border-l-4 transition-colors ${
                    isDark
                      ? 'bg-gray-700 border-yellow-500'
                      : 'bg-white border-yellow-400'
                  }`}>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className={`text-sm font-semibold mb-3 ${
                          isDark ? 'text-gray-300' : 'text-slate-600'
                        }`}>Unrealized P&L</p>
                        <div className={`text-4xl font-bold ${parseFloat(currentPnL) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {currentPnL > 0 ? '+' : ''}{currentPnL}%
                        </div>
                        <p className={`text-xs mt-2 ${
                          isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>
                          {currentPnL > 0 ? 'Profit' : 'Loss'}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold mb-3 ${
                          isDark ? 'text-gray-300' : 'text-slate-600'
                        }`}>Stop Loss Status</p>
                        <div className={`text-lg font-bold ${botState.position.stopLossAdjusted ? 'text-green-600' : 'text-orange-600'}`}>
                          {botState.position.stopLossAdjusted ? 'Adjusted' : 'Waiting'}
                        </div>
                        <p className={`text-xs mt-2 ${
                          isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>
                          {botState.position.stopLossAdjusted ? 'SL moved to +1%' : 'Need +2% increase'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-lg shadow p-6 transition-colors border-l-4 ${
                    isDark 
                      ? 'bg-gray-700 border-blue-500' 
                      : 'bg-slate-50 border-blue-400'
                  }`}>
                    <p className={`text-sm font-bold mb-4 ${
                      isDark ? 'text-white' : 'text-slate-800'
                    }`}>Price Distance Analysis</p>
                    <div className="space-y-3">
                      <div className={`rounded p-3 transition-colors ${
                        isDark ? 'bg-gray-600' : 'bg-white'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-xs font-semibold ${
                            isDark ? 'text-gray-200' : 'text-slate-600'
                          }`}>Distance from Entry:</span>
                          <span className={`text-sm font-bold ${botState.currentPrice > botState.position.entryPrice ? 'text-green-600' : 'text-red-600'}`}>
                            {botState.currentPrice > botState.position.entryPrice ? 'UP' : 'DOWN'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`text-xs ${
                            isDark ? 'text-gray-300' : 'text-slate-500'
                          }`}>Amount:</span>
                          <span className={`text-sm font-bold ${botState.currentPrice > botState.position.entryPrice ? 'text-green-600' : 'text-red-600'}`}>
                            {botState.currentPrice > botState.position.entryPrice ? '+' : ''}{(botState.currentPrice - botState.position.entryPrice).toFixed(4)} ({(((botState.currentPrice - botState.position.entryPrice) / botState.position.entryPrice) * 100).toFixed(2)}%)
                          </span>
                        </div>
                      </div>

                      <div className={`rounded p-3 transition-colors ${
                        isDark ? 'bg-gray-600' : 'bg-white'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-xs font-semibold ${
                            isDark ? 'text-gray-200' : 'text-slate-600'
                          }`}>Distance to Target:</span>
                          <span className="text-sm font-bold text-blue-600">{(botState.targetPrice - botState.currentPrice).toFixed(4)}</span>
                        </div>
                        <div className={`w-full rounded h-2 ${
                          isDark ? 'bg-gray-500' : 'bg-gray-200'
                        }`}>
                          <div 
                            className="bg-blue-600 h-2 rounded" 
                            style={{width: `${Math.min(100, Math.max(0, ((botState.currentPrice - botState.position.entryPrice) / (botState.targetPrice - botState.position.entryPrice)) * 100))}%`}}
                          ></div>
                        </div>
                        <p className={`text-xs mt-1 ${
                          isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>{Math.min(100, Math.max(0, ((botState.currentPrice - botState.position.entryPrice) / (botState.targetPrice - botState.position.entryPrice)) * 100)).toFixed(0)}% to target</p>
                      </div>

                      <div className={`rounded p-3 transition-colors ${
                        isDark ? 'bg-gray-600' : 'bg-white'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-xs font-semibold ${
                            isDark ? 'text-gray-200' : 'text-slate-600'
                          }`}>Distance to Stop Loss:</span>
                          <span className="text-sm font-bold text-red-600">{(botState.currentPrice - botState.stopLossPrice).toFixed(4)}</span>
                        </div>
                        <div className={`w-full rounded h-2 ${
                          isDark ? 'bg-gray-500' : 'bg-gray-200'
                        }`}>
                          <div 
                            className="bg-red-600 h-2 rounded" 
                            style={{width: `${Math.min(100, Math.max(0, ((botState.currentPrice - botState.stopLossPrice) / (botState.position.entryPrice - botState.stopLossPrice)) * 100))}%`}}
                          ></div>
                        </div>
                        <p className={`text-xs mt-1 ${
                          isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>Safety margin: {Math.min(100, Math.max(0, ((botState.currentPrice - botState.stopLossPrice) / (botState.position.entryPrice - botState.stopLossPrice)) * 100)).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* TRADE HISTORY */}
              {botState.tradeHistory.length > 0 && (
                <div className={`rounded-lg p-4 transition-colors border-l-4 ${
                  isDark 
                    ? 'bg-gray-700 border-green-500' 
                    : 'bg-slate-50 border-green-400'
                }`}>
                  <h2 className={`text-xl font-semibold mb-4 ${
                    isDark ? 'text-green-400' : 'text-green-600'
                  }`}>Trade History</h2>
                  <div className="overflow-x-auto">
                    <table className={`w-full text-sm ${
                      isDark ? 'text-gray-200' : 'text-slate-900'
                    }`}>
                      <thead className={isDark ? 'bg-gray-600' : 'bg-slate-200'}>
                        <tr>
                          <th className="px-4 py-2 text-left">SYMBOL</th>
                          <th className="px-4 py-2 text-right">Entry</th>
                          <th className="px-4 py-2 text-right">Exit</th>
                          <th className="px-4 py-2 text-right">P&L %</th>
                          <th className="px-4 py-2 text-left">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {botState.tradeHistory.map((trade, idx) => (
                          <tr key={idx} className={`border-t ${
                            isDark ? 'border-gray-600' : 'border-slate-200'
                          }`}>
                            <td className="px-4 py-2">{trade.symbol}</td>
                            <td className="px-4 py-2 text-right">{detectCurrency(trade.symbol)}{trade.entry.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{detectCurrency(trade.symbol)}{trade.exit.toFixed(2)}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trade.pnl > 0 ? '+' : ''}{trade.pnl}%
                            </td>
                            <td className="px-4 py-2">{trade.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}