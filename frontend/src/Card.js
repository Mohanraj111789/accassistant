// src/components/Card.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTrashAlt } from "react-icons/fa";
import "./Card.css";

function Card({ user, onUserDeleted }) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [balance, setBalance] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  
  // Set default date to today when form is opened
  useEffect(() => {
    if (showForm) {
      const today = new Date();
      // Format as YYYY-MM-DD for date input
      const formattedDate = today.toISOString().split('T')[0];
      setTransactionDate(formattedDate);
    } else {
      setTransactionDate("");
    }
  }, [showForm]);

  const fetchBalance = async () => {
    if (!user?.id) {
      console.log("No user ID available for fetching balance");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }
      
      console.log(`Fetching balance for user ID: ${user.id}`);
      // Fetch all transactions for the user
      const res = await axios.get(
        `http://localhost:5000/api/expense/transactions/user/${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log("Transactions fetched:", res.data);
      // Calculate balance
      let total = 0;
      console.log("🧮 Calculating balance from transactions:", res.data);
      res.data.forEach((t) => {
        const amt = Number(t.amount);
        const contribution = t.type.toLowerCase() === "expense" ? -amt : amt;
        console.log(`📊 Transaction: ${t.type} ₹${amt} → Balance contribution: ${contribution}`);
        total += contribution;
      });
      setBalance(total);
      console.log(`💰 Final balance calculated: ${total}`);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
      console.error("Error fetching balance:", err?.response?.data || err.message);
      setBalance(0);
    }
  };

  useEffect(() => {
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleTransaction = async (type) => {
    console.log("🔄 Starting transaction:", { type, amount, date: transactionDate, user: user?.id });
    
    if (!amount || amount.trim() === "") {
      alert("Please enter an amount");
      return;
    }
    
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      alert("Please enter a valid positive amount");
      return;
    }
    
    if (!user || !user.id) {
      alert("User information is missing");
      console.error("❌ User data missing:", user);
      return;
    }
    
    // Validate date if provided
    let dateToSend = null;
    if (transactionDate) {
      const selectedDate = new Date(transactionDate);
      if (isNaN(selectedDate.getTime())) {
        alert("Please enter a valid date");
        return;
      }
      dateToSend = selectedDate.toISOString();
    }
    
    try {
      console.log("📤 Sending transaction request:", {
        user_id: user.id,
        type: type,
        amount: num,
        date: dateToSend
      });
      
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }
      
      const response = await axios.post("http://localhost:5000/api/expense/transactions", {
        user_id: user.id,
        type: type,
        amount: num,
        date: dateToSend
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("✅ Transaction response:", response.data);
      setAmount("");
      setTransactionDate("");
      setShowForm(false);
      await fetchBalance(); // Refresh balance
      alert(`${type.charAt(0).toUpperCase() + type.slice(1)} of ₹${num.toFixed(2)} added successfully!`);
    } catch (err) {
      console.error("❌ Transaction error:", err);
      console.error("❌ Error response:", err?.response?.data);
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to add transaction";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm(`Are you sure you want to delete ${user.name} and all their transactions? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }

      await axios.delete(`http://localhost:5000/api/expense/users/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      alert(`${user.name} and all their transactions have been deleted successfully!`);
      
      // Call the parent component's callback to refresh the user list
      if (onUserDeleted) {
        onUserDeleted();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-info">
          <h3>{user.name}</h3>
          <p>📞 {user.phone}</p>
          <p>
            💰 Balance:{" "}
            <strong className={balance >= 0 ? "positive-balance" : "negative-balance"}>
              ₹{balance.toFixed(2)}
            </strong>
          </p>
        </div>
        <button 
          className="delete-user-btn" 
          onClick={handleDeleteUser}
          disabled={isDeleting}
          title={`Delete ${user.name} and all transactions`}
        >
          <FaTrashAlt />
        </button>
      </div>

      <button className="transaction-btn" onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "+ Add Transaction"}
      </button>

      {showForm && (
        <div className="transaction-form">
          <div className="form-group">
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter Amount (e.g., 100.50)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (amount && parseFloat(amount) > 0) {
                    handleTransaction("income");
                  }
                }
              }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="transaction-date">Date:</label>
            <input
              id="transaction-date"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // Prevent future dates
            />
          </div>
          <div className="btn-group">
            <button 
              className="income-btn" 
              onClick={() => handleTransaction("income")}
              disabled={!amount || parseFloat(amount) <= 0 || !transactionDate}
            >
              + Income
            </button>
            <button 
              className="expense-btn" 
              onClick={() => handleTransaction("expense")}
              disabled={!amount || parseFloat(amount) <= 0 || !transactionDate}
            >
              - Expense
            </button>
          </div>
        </div>
      )}

      <button className="details-btn" onClick={() => navigate(`/transactions/${user.id}`)}>
        View Details
      </button>
    </div>
  );
}

export default Card;
