// src/pages/TransactionDetails.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link, useNavigate } from "react-router-dom";
import { FaTrashAlt } from "react-icons/fa";
import "./TransactionDetails.css";

const TransactionDetails = () => {
  const { userId } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId) return;

        const token = localStorage.getItem('token');
        if (!token) {
          window.location.href = '/';
          return;
        }
        
        const headers = {
          'Authorization': `Bearer ${token}`
        };

        // fetch user directly by id
        const userRes = await axios.get(
          `http://localhost:5000/api/expense/users/${userId}`,
          { headers }
        );
        setUser(userRes.data);

        // fetch user transactions
        const txRes = await axios.get(
          `http://localhost:5000/api/expense/transactions/user/${userId}`,
          { headers }
        );
        setTransactions(txRes.data);

        // compute balance
        let total = 0;
        txRes.data.forEach((t) => {
          const amt = Number(t.amount);
          total += t.type.toLowerCase() === "expense" ? -amt : amt;
        });
        setBalance(total);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/';
          return;
        }
        console.error("Error fetching transactions:", err?.response?.data || err.message);
      }
    };

    fetchData();
  }, [userId]);

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }

      await axios.delete(`http://localhost:5000/api/expense/transactions/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Refresh the transactions list
      const txRes = await axios.get(
        `http://localhost:5000/api/expense/transactions/user/${userId}`,
        { 
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setTransactions(txRes.data);
      
      // Recalculate balance
      let total = 0;
      txRes.data.forEach((t) => {
        const amt = Number(t.amount);
        total += t.type.toLowerCase() === "expense" ? -amt : amt;
      });
      setBalance(total);
      
      alert('Transaction deleted successfully!');
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Failed to delete transaction. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="transaction-page">
      <div className="header">
        <h2>Transaction Details</h2>
        {user && (
          <p>
            User: <strong>{user.name}</strong> ({user.phone})
          </p>
        )}
        <p>
          💰 Current Balance:{" "}
          <strong className={balance >= 0 ? "positive-balance" : "negative-balance"}>
            ₹{balance.toFixed(2)}
          </strong>
        </p>
        <div className="header-actions">
          <Link to="/home" className="back-btn">
            ⬅ Back
          </Link>
        </div>
      </div>

      <table className="transaction-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <tr
                key={tx.id}
                className={tx.type === "expense" ? "expense-row" : "income-row"}
              >
                <td>
                  {tx.date
                    ? new Date(tx.date).toLocaleString()
                    : "-"}
                </td>
                <td>{tx.type}</td>
                <td>₹{Number(tx.amount).toFixed(2)}</td>
                <td className="actions-cell">
                  <button 
                    className="delete-btn" 
                    onClick={() => handleDeleteTransaction(tx.id)}
                    disabled={isDeleting}
                    title="Delete transaction"
                  >
                    <FaTrashAlt />
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" style={{ textAlign: "center" }}>
                No transactions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionDetails;
