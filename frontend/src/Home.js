// src/pages/Home.js
import React, { useState, useEffect } from "react";
import Card from "./Card"; // adjust path if your structure differs
import "./Home.css";

function Home() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [formError, setFormError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }
      
      const res = await fetch("http://localhost:5000/api/expense/users", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching users:", err.message);
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }
      
      const res = await fetch("http://localhost:5000/api/profile", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
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
    window.location.href = '/';
  };

  useEffect(() => {
    fetchUserProfile();
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Clear form error when user starts typing
    if (formError) setFormError("");
    
    // For phone field, only allow digits and limit to 10 characters
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setNewUser({ ...newUser, [name]: digitsOnly });
    } else {
      setNewUser({ ...newUser, [name]: value });
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError(""); // Clear previous errors
    
    if (!newUser.name.trim() || !newUser.phone.trim()) {
      setFormError("Please enter both Name and Phone number");
      return;
    }
    
    // Validate phone number is exactly 10 digits
    if (newUser.phone.length !== 10 || !/^\d{10}$/.test(newUser.phone)) {
      setFormError("Phone number must be exactly 10 digits and contain only numbers");
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/';
        return;
      }
      
      const res = await fetch("http://localhost:5000/api/expense/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newUser.name.trim(),
          phone: newUser.phone.trim(),
        }),
      });
      
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
      
      if (!res.ok) {
        const errorData = await res.json();
        setFormError(errorData.message || "Failed to add user");
        return;
      }
      
      setNewUser({ name: "", phone: "" });
      setShowForm(false);
      setFormError(""); // Clear any previous errors
      fetchUsers();
    } catch (err) {
      console.error("Error adding user:", err.message);
      setFormError(err.message || "Failed to add user");
    }
  };

  if (loading) {
    return (
      <div className="home-container">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <h2>Error</h2>
        <p>Failed to load users: {error}</p>
        <button onClick={fetchUsers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="header">
        <div className="profile-section">
          <h2>Users</h2>
          {userProfile && (
            <div className="user-info">
              <span className="welcome-text">Welcome, {userProfile.username}!</span>
              <span className="user-email">({userProfile.email})</span>
            </div>
          )}
        </div>
        <div className="header-actions">
          <button className="dashboard-btn" onClick={() => window.location.href = '/dashboard'}>
            Dashboard
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="user-list">
        {users && users.length > 0 ? (
          users.map((user) => (
            <Card key={user.id} user={user} onUserDeleted={fetchUsers} />
          ))
        ) : (
          <p>No users found. Add your first user below!</p>
        )}
      </div>

      <button className="add-user-btn" onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "+Add User"}
      </button>

      {showForm && (
        <form className="add-user-form" onSubmit={handleAddUser}>
          <h3>Add New User</h3>
          {formError && (
            <div className="error-message" style={{
              color: '#dc3545',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              padding: '8px 12px',
              marginBottom: '10px',
              fontSize: '14px'
            }}>
              {formError}
            </div>
          )}
          <input
            type="text"
            name="name"
            placeholder="Enter Name"
            value={newUser.name}
            onChange={handleInputChange}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Enter 10-digit Phone Number"
            value={newUser.phone}
            onChange={handleInputChange}
            pattern="[0-9]{10}"
            maxLength="10"
            title="Phone number must be exactly 10 digits"
            required
          />
          <button type="submit">Save User</button>
        </form>
      )}
    </div>
  );
}

export default Home;
