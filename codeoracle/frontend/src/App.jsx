import React, { useState, useEffect } from 'react';

function App() {
  const [backendStatus, setBackendStatus] = useState('connecting'); // connecting, connected, disconnected
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  useEffect(() => {
    let active = true;
    
    const checkHealth = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/health`);
        const data = await response.json();
        if (active) {
          if (data && data.status === 'healthy') {
            setBackendStatus('connected');
          } else {
            setBackendStatus('disconnected');
          }
        }
      } catch (err) {
        if (active) {
          setBackendStatus('disconnected');
        }
      }
    };

    checkHealth();
    // Poll every 5 seconds to keep status updated
    const interval = setInterval(checkHealth, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [apiBaseUrl]);

  return (
    <div className="app-container">
      <div className="bg-glow glow-1"></div>
      <div className="bg-glow glow-2"></div>

      <header className="hero">
        <div className="title-container">
          <span className="title-icon">🔮</span>
          <h1 className="title">CodeOracle</h1>
        </div>
        <p className="subtitle">Understand, test, and modernize legacy code.</p>
      </header>

      <main className="card">
        <h2 className="card-title">Initial Structure Ready</h2>
        <p className="card-desc">
          Frontend and Backend environments have been completely decoupled. The next step is building the legacy AI processing pipeline.
        </p>

        <div className="status-indicator">
          <span className={`status-dot ${backendStatus}`}></span>
          <span>
            API Status: {backendStatus === 'connected' && 'Connected'}
            {backendStatus === 'disconnected' && 'Disconnected'}
            {backendStatus === 'connecting' && 'Connecting...'}
          </span>
        </div>
      </main>

      <footer className="footer">
        CodeOracle • Hackathon Starter Template • Port 5173
      </footer>
    </div>
  );
}

export default App;
