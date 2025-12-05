import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, TrendingUp, Moon, Sun } from 'lucide-react';
import { ThemeContext } from '../contexts/ThemeContext';
import UserProfile from '../components/UserProfile';
import LiveChart from '../components/LiveChart';  // ← ADDED THIS IMPORT

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
    exitPercent: 3,
    trailingDistance: 2  // ✅ NEW: Trailing distance
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
  
  // Trade History Filters
  const [filters, setFilters] = useState({
    dateRange: 'all', // 'today', 'week', 'month', 'all'
    status: 'all', // 'all', 'target', 'stop_loss', 'manual_stop'
    currencyType: 'all', // 'all', 'crypto', 'stocks'
    pnlFilter: 'all' // 'all', 'profit', 'loss'
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
  
  // ========== TRADE HISTORY DATABASE FUNCTIONS ==========
  const saveTradeToDatabase = async (tradeData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token - skipping trade save');
        return null;
      }
      const response = await fetch('http://localhost:10152/api/trades', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scrip: tradeData.symbol,
          entry_price: tradeData.entry,
          entry_time: tradeData.entry_time || new Date().toISOString(),
          quantity: 1,
          stop_loss_price: tradeData.stop_loss_price,
          target_price: tradeData.target_price
        })
      });
      const data = await response.json();
      if (data.success) {
        addLog(`✅ Trade #${data.trade_id} saved to database`, 'success');
        return data.trade_id;
      }
    } catch (error) {
      console.error('Error saving trade:', error);
      addLog(`⚠️ Failed to save trade: ${error.message}`, 'warning');
    }
    return null;
  };

  const closeTradeInDatabase = async (tradeId, closeData) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !tradeId) return;
      const response = await fetch(`http://localhost:10152/api/trades/${tradeId}/close`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          exit_price: closeData.exit,
          exit_time: new Date().toISOString(),
          pnl_percent: closeData.pnl,
          pnl_amount: closeData.pnl_amount || 0,
          status: closeData.reason.toLowerCase().replace(' ', '_')
        })
      });
      const data = await response.json();
      if (data.success) {
        addLog('✅ Trade closed in database', 'success');
      }
    } catch (error) {
      console.error('Error closing trade:', error);
      addLog(`⚠️ Failed to close trade in DB: ${error.message}`, 'warning');
    }
  };

  const loadTradeHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      addLog('📥 Loading trade history...', 'info');

          const response = await fetch('http://localhost:10152/api/trades?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

        if (data.success && data.trades) {
      // Ensure that trade history data uses the same keys as the simulation data for rendering
      const formattedTrades = data.trades.map(t => ({
        symbol: t.scrip || t.symbol,
        entry: parseFloat(t.entry_price || t.entry || 0),
        exit: parseFloat(t.exit_price || t.exit || 0),
        pnl: parseFloat(t.pnl_percent || t.pnl || 0),
        reason: t.status 
           ? t.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          : (t.reason || 'Unknown'),
        time: t.exit_time ? new Date(t.exit_time) : (t.entry_time ? new Date(t.entry_time) : new Date())
      }));

            setBotState(prev => ({
        ...prev,
        tradeHistory: formattedTrades
      }));

            addLog(`✅ Loaded ${data.trades.length} past trades from database`, 'success');
    } else {
      addLog('⚠️ No trades found or API error', 'warning');
    }
    } catch (error) {
      console.error('Error loading trade history:', error);
      addLog(`⚠️ Failed to load trade history: ${error.message}`, 'warning');
    }
  };
  
  // Filter trades based on current filter settings
  const getFilteredTrades = () => {
    let filtered = [...botState.tradeHistory];

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.time);

        if (filters.dateRange === 'today') {
          return tradeDate >= today;
        } else if (filters.dateRange === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return tradeDate >= weekAgo;
        } else if (filters.dateRange === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return tradeDate >= monthAgo;
        }
        return true;
      });
    }

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(trade => {
        // Convert 'Stop Loss' or 'Manual Stop' to lower_case for matching
        const status = trade.reason.toLowerCase().replace(' ', '_'); 
        
        // Handle 'stop' filter to match 'stop_loss' and 'manual_stop' for convenience
        if (filters.status === 'stop') {
             return status.includes('stop');
        } 
        
        return status === filters.status || status.includes(filters.status);
      });
    }

    // Filter by currency type
    if (filters.currencyType !== 'all') {
      filtered = filtered.filter(trade => {
        const symbol = trade.symbol.toUpperCase();
        const isCrypto = symbol.includes('USDT') || symbol.includes('BTC') || symbol.includes('ETH');
        const isStock = symbol.includes('RELIANCE') || symbol.includes('TCS') ||
                        symbol.includes('INFY') || symbol.includes('HDFC') ||
                        symbol.includes('ICICI') || symbol.includes('SBIN') ||
                        symbol.includes('ITC') || symbol.includes('BHARTI');

        return filters.currencyType === 'crypto' ? isCrypto : isStock;
      });
    }

    // Filter by P&L
    if (filters.pnlFilter !== 'all') {
      filtered = filtered.filter(trade => {
        return filters.pnlFilter === 'profit' ? trade.pnl > 0 : trade.pnl < 0;
      });
    }

    return filtered;
  };

  // Calculate statistics
  const getTradeStats = () => {
    const filtered = getFilteredTrades();

    if (filtered.length === 0) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnL: 0,
        bestTrade: 0,
        worstTrade: 0
      };
    }

    const wins = filtered.filter(t => t.pnl > 0).length;
    const losses = filtered.filter(t => t.pnl < 0).length;
    const totalPnL = filtered.reduce((sum, t) => sum + t.pnl, 0);
    const bestTrade = Math.max(...filtered.map(t => t.pnl));
    const worstTrade = Math.min(...filtered.map(t => t.pnl));

    return {
      total: filtered.length,
      wins,
      losses,
      winRate: (wins / filtered.length * 100).toFixed(1),
      totalPnL: totalPnL.toFixed(2),
      bestTrade: bestTrade.toFixed(2),
      worstTrade: worstTrade.toFixed(2)
    };
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

      // Close in database
      if (botState.position.tradeId) {
        await closeTradeInDatabase(botState.position.tradeId, {
          exit: botState.currentPrice,
          pnl: parseFloat(pnl),
          pnl_amount: plAmt,
          reason: 'Manual Stop'
        });
      }

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

  const startBot = async () => {
    if (botState.isRunning) return;
    
    if (!params.symbol || params.symbol.trim() === '') {
      addLog('Please select a trading symbol', 'error');
      return;
    }

    // --- ENTRY VALIDATION ---
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

    // ✅ NEW: Trailing validation
    if (params.trailingDistance <= 0 || params.trailingDistance >= 100) {
      addLog('Trailing distance must be between 0-100%', 'error');
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
      
      // --- WALLET DEDUCTION ---
      const walletAmount = params.entryValue; 
      const walletResult = await startTradeWithWallet(apiSymbol, walletAmount, purchasePrice);
      if (!walletResult.success) {
        addLog(`❌ Cannot start: ${walletResult.error}`, 'error');
        return;
      }
      // ------------------------------------------

      const initialStopLoss = purchasePrice * (1 - params.initialStopLoss / 100);
      const targetPrice = purchasePrice * (1 + params.exitPercent / 100);
      // const adjustTriggerPrice = purchasePrice * (1 + 0.02); // ❌ DELETED THIS LINE
      
      // Save trade to database
      const entryTime = new Date();
      const tradeId = await saveTradeToDatabase({
        symbol: params.symbol,
        entry: purchasePrice,
        entry_time: entryTime.toISOString(),
        stop_loss_price: initialStopLoss,
        target_price: targetPrice
      });

      // ✅ UPDATED: Add highestPrice and trailingActive
      setBotState(prev => ({
        ...prev,
        isRunning: true,
        position: {
          entryPrice: purchasePrice,
          quantity: 1,
          entryTime: entryTime,
          highestPrice: purchasePrice,    // ✅ NEW: Track highest price
          trailingActive: false,           // ✅ NEW: Trailing activation flag
          tradeId: tradeId
        },
        currentPrice: purchasePrice,
        stopLossPrice: initialStopLoss,
        targetPrice: targetPrice
      }));
      
      // ✅ UPDATED: Startup logs
      addLog(`🚀 Bot Started for ${params.symbol} - Entry: ${currentCurrency}${purchasePrice.toFixed(2)}`, 'success');
      addLog(`📉 Initial Stop Loss: ${currentCurrency}${initialStopLoss.toFixed(2)} (-${params.initialStopLoss}%)`, 'info');
      addLog(`🔄 Trailing Activates at: ${currentCurrency}${(purchasePrice * 1.02).toFixed(2)} (+2%)`, 'info');
      addLog(`📊 Trailing Distance: ${params.trailingDistance}%`, 'info');
      addLog(`🎯 Target Price: ${currentCurrency}${targetPrice.toFixed(2)} (+${params.exitPercent}%)`, 'info');
      
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
            
            // Close in database
            if (prev.position.tradeId) {
              closeTradeInDatabase(prev.position.tradeId, {
                exit: newPrice,
                pnl: parseFloat(pnl),
                pnl_amount: plAmt,
                reason: 'Stop Loss'
              });
            }

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

            // Close in database
            if (prev.position.tradeId) {
              closeTradeInDatabase(prev.position.tradeId, {
                exit: newPrice,
                pnl: parseFloat(pnl),
                pnl_amount: plAmt,
                reason: 'Target'
              });
            }

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
          
          // ✅ NEW: TRAILING STOP LOSS LOGIC (REPLACED OLD SL ADJUSTMENT)
          // Track highest price
          const highestPrice = Math.max(prev.position.highestPrice, newPrice);
          newState.position = { ...prev.position, highestPrice: highestPrice };

          const priceIncrease = ((newPrice - prev.position.entryPrice) / prev.position.entryPrice) * 100;

          // Activate trailing when price hits +2%
          if (priceIncrease >= 2) {
            if (!prev.position.trailingActive) {
              addLog(`🔄 Trailing Stop Loss ACTIVATED at +${priceIncrease.toFixed(2)}%`, 'warning');
              newState.position.trailingActive = true;
            }

            // Calculate trailing stop loss
            const trailingSL = highestPrice * (1 - params.trailingDistance / 100);

            // Only move SL UP, never down
            if (trailingSL > prev.stopLossPrice) {
              const slChange = ((trailingSL - prev.stopLossPrice) / prev.stopLossPrice * 100).toFixed(2);
              addLog(`📈 Trailing SL moved to ${currentCurrency}${trailingSL.toFixed(2)} (+${slChange}% from previous SL)`, 'info');
              newState.stopLossPrice = trailingSL;
            }
          }
          
          return newState;
        });
      }, 1000);
    } catch (error) {
      addLog(`Error starting bot: ${error.message}`, 'error');
      console.error('Error:', error);
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
  
  // Load trade history when component mounts
  useEffect(() => {
    loadTradeHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount
  
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
                      onChange={e => setParams({...params, exitPercent: parseFloat(e.target.value)})}
                      disabled={botState.isRunning}
                      step="0.1"
                      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'border-yellow-300 bg-white text-slate-900'
                      }`}
                    />
                  </div>
                  
                  {/* ✅ NEW: TRAILING DISTANCE INPUT */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      isDark ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Trailing Distance (%)
                    </label>
                    <input
                      type="number"
                      value={params.trailingDistance}
                      onChange={(e) => setParams({...params, trailingDistance: parseFloat(e.target.value)})}
                      disabled={botState.isRunning}
                      step="0.1"
                      min="0.1"
                      max="10"
                      className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors ${
                        isDark 
                          ? 'bg-gray-600 border-gray-500 text-white' 
                          : 'border-yellow-300 bg-white text-slate-900'
                      }`}
                    />
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      SL follows price at {params.trailingDistance}% distance
                    </p>
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
                <ul className={`text-sm space-y-1 ${isDark ? 'text-gray-300' : 'text-yellow-800'}`}>
                  <li>✅ Entry at LIVE price (Binance or Upstox)</li>
                  <li>📉 Initial SL: Entry - {params.initialStopLoss}%</li>
                  <li>🔄 Trailing activates at +2% profit</li>
                  <li>📊 SL trails price at {params.trailingDistance}% distance</li>
                  <li>🎯 Exit if price ≥ Entry+{params.exitPercent}%</li>
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
                        <div className={`text-lg font-bold ${botState.position.trailingActive ? 'text-green-600' : 'text-orange-600'}`}>
                          {botState.position.trailingActive ? 'Trailing Active' : 'Waiting'}
                        </div>
                        <p className={`text-xs mt-2 ${
                          isDark ? 'text-gray-400' : 'text-slate-500'
                        }`}>
                          {botState.position.trailingActive ? `Trailing @ ${params.trailingDistance}%` : 'Need +2% increase'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* LIVE PRICE CHART (Replaced Price Distance Analysis) */}
                  <div className={`rounded-lg shadow p-6 transition-colors border-l-4 ${isDark ? 'bg-gray-700 border-blue-500' : 'bg-slate-50 border-blue-400'}`}>
                    <p className={`text-sm font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      Live Price Chart
                    </p>

                    <LiveChart
                      isDark={isDark}
                      currentPrice={botState.currentPrice}
                      entryPrice={botState.position?.entryPrice || 0}
                      stopLossPrice={botState.stopLossPrice}
                      targetPrice={botState.targetPrice}
                    />

                    {/* Mini Stats Below Chart */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      <div className={`rounded p-3 ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                        <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Entry</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          {currentCurrency}{botState.position?.entryPrice.toFixed(4) || '0.0000'}
                        </p>
                      </div>

                      <div className={`rounded p-3 ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                        <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Stop Loss</p>
                        <p className="text-sm font-bold text-red-600">
                          {currentCurrency}{botState.stopLossPrice.toFixed(4)}
                        </p>
                      </div>

                      <div className={`rounded p-3 ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                        <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Target</p>
                        <p className="text-sm font-bold text-green-600">
                          {currentCurrency}{botState.targetPrice.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* TRADE HISTORY */}
              {botState.tradeHistory.length > 0 && (
                <div className={`rounded-lg p-4 transition-colors border-l-4 ${isDark ? 'bg-gray-700 border-green-500' : 'bg-slate-50 border-green-400'}`}>
                  <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    Trade History & Analytics
                  </h2>

                  {/* STATISTICS CARDS */}
                  {(() => {
                    const stats = getTradeStats();
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {/* Total Trades */}
                        <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-600' : 'bg-white'} shadow`}>
                          <p className={`text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total Trades</p>
                          <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
                        </div>

                        {/* Win Rate */}
                        <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-600' : 'bg-white'} shadow`}>
                          <p className={`text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Win Rate</p>
                          <p className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.winRate}%
                          </p>
                        </div>

                        {/* Total P&L */}
                        <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-600' : 'bg-white'} shadow`}>
                          <p className={`text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Total P&L</p>
                          <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stats.totalPnL > 0 ? '+' : ''}{stats.totalPnL}%
                          </p>
                        </div>

                        {/* Best Trade */}
                        <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-600' : 'bg-white'} shadow`}>
                          <p className={`text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Best Trade</p>
                          <p className="text-2xl font-bold text-green-500">+{stats.bestTrade}%</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* FILTER CONTROLS */}
                  <div className="space-y-3 mb-4">
                    {/* Date Range Filter */}
                    <div>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Date Range:</p>
                      <div className="flex gap-2 flex-wrap">
                        {['all', 'today', 'week', 'month'].map(range => (
                          <button
                            key={range}
                            onClick={() => setFilters({...filters, dateRange: range})}
                            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                              filters.dateRange === range
                                ? 'bg-blue-600 text-white'
                                : isDark ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {range === 'all' ? 'All Time' : range === 'today' ? 'Today' : range === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Status:</p>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'target', label: 'Target Hit' },
                          { value: 'stop', label: 'Stop Loss' },
                          { value: 'manual', label: 'Manual Stop' }
                        ].map(item => (
                          <button
                            key={item.value}
                            onClick={() => setFilters({...filters, status: item.value})}
                            className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                              filters.status === item.value
                                ? 'bg-green-600 text-white'
                                : isDark ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Currency Type & P/L Filter */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Type:</p>
                        <div className="flex gap-2">
                          {['all', 'crypto', 'stocks'].map(type => (
                            <button
                              key={type}
                              onClick={() => setFilters({...filters, currencyType: type})}
                              className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                                filters.currencyType === type
                                  ? 'bg-yellow-600 text-white'
                                  : isDark ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {type === 'all' ? 'All' : type === 'crypto' ? 'Crypto' : 'Stocks'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>P&L:</p>
                        <div className="flex gap-2">
                          {['all', 'profit', 'loss'].map(pnl => (
                            <button
                              key={pnl}
                              onClick={() => setFilters({...filters, pnlFilter: pnl})}
                              className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                                filters.pnlFilter === pnl
                                  ? pnl === 'profit' ? 'bg-green-600 text-white' : pnl === 'loss' ? 'bg-red-600 text-white' : 'bg-purple-600 text-white'
                                  : isDark ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              {pnl === 'all' ? 'All' : pnl === 'profit' ? 'Profit' : 'Loss'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TABLE */}
                  <div className="overflow-x-auto">
                    <table className={`w-full text-sm ${isDark ? 'text-gray-200' : 'text-slate-900'}`}>
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
                        {getFilteredTrades().map((trade, idx) => (
                          <tr key={idx} className={`border-t ${isDark ? 'border-gray-600' : 'border-slate-200'}`}>
                            <td className="px-4 py-2">{trade.symbol}</td>
                            <td className="px-4 py-2 text-right">{detectCurrency(trade.symbol)}{trade.entry.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{detectCurrency(trade.symbol)}{(trade.exit || 0).toFixed(2)}</td>
                            <td className={`px-4 py-2 text-right font-semibold ${trade.pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trade.pnl > 0 ? '+' : ''}{(trade.pnl || 0).toFixed(2)}%
                            </td>
                            <td className="px-4 py-2">{trade.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* No Results Message */}
                    {getFilteredTrades().length === 0 && (
                      <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        No trades match the selected filters
                      </div>
                    )}
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