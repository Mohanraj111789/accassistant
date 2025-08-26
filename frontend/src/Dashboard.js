// src/Dashboard.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      
      const res = await fetch("http://localhost:5000/api/expense/dashboard", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setDashboardData(data);
    } catch (err) {
      console.error("Error fetching dashboard data:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
      
      const res = await fetch("http://localhost:5000/api/profile", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/');
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.user);
      }
    } catch (err) {
      console.error("Error fetching profile:", err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const handleGoToUsers = () => {
    navigate('/home');
  };

  useEffect(() => {
    fetchUserProfile();
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <h2>Error</h2>
          <p>Failed to load dashboard: {error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="profile-section">
          <h1>Dashboard</h1>
          {userProfile && (
            <div className="user-info">
              <span className="welcome-text">Welcome, {userProfile.username}!</span>
              <span className="user-email">({userProfile.email})</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button className="users-btn" onClick={handleGoToUsers}>
            View Users
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {dashboardData && (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card total-balance">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>Total Balance</h3>
                <div className={`stat-value ${dashboardData.total_balance >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(dashboardData.total_balance)}
                </div>
              </div>
            </div>

            <div className="stat-card total-income">
              <div className="stat-icon">📈</div>
              <div className="stat-info">
                <h3>Total Income</h3>
                <div className="stat-value positive">
                  {formatCurrency(dashboardData.total_income)}
                </div>
              </div>
            </div>

            <div className="stat-card total-expenses">
              <div className="stat-icon">📉</div>
              <div className="stat-info">
                <h3>Total Expenses</h3>
                <div className="stat-value negative">
                  {formatCurrency(dashboardData.total_expenses)}
                </div>
              </div>
            </div>

            <div className="stat-card total-users">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h3>Total Users</h3>
                <div className="stat-value">
                  {dashboardData.total_users}
                </div>
              </div>
            </div>

            <div className="stat-card total-transactions">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <h3>Total Transactions</h3>
                <div className="stat-value">
                  {dashboardData.total_transactions}
                </div>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <h2>Financial Summary</h2>
            <div className="summary-content">
              <p>
                You have <strong>{dashboardData.total_users}</strong> users with a combined 
                <strong className={dashboardData.total_balance >= 0 ? 'positive' : 'negative'}>
                  {' '}{formatCurrency(dashboardData.total_balance)}
                </strong> balance.
              </p>
              <p>
                Total of <strong>{dashboardData.total_transactions}</strong> transactions recorded 
                with <strong className="positive">{formatCurrency(dashboardData.total_income)}</strong> in income 
                and <strong className="negative">{formatCurrency(dashboardData.total_expenses)}</strong> in expenses.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
