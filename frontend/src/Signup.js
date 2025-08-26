import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

function Signup() {
  const [values, setValues] = useState({ email: "", username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInput = (e) => {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const response = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }

      // If signup is successful, redirect to login
      alert("Signup successful!");
      navigate("/");
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <h2>Signup</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input type="email" placeholder="Enter Email" name="email" required onChange={handleInput} />
        </div>

        <div className="form-group">
          <label>Username:</label>
          <input type="text" placeholder="Enter Username" name="username" required onChange={handleInput} />
        </div>

        <div className="form-group password-group">
          <label>Password:</label>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter Password"
            name="password"
            required
            onChange={handleInput}
          />
          <span
            className="eye-icon"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </span>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Signing up..." : "Signup"}
        </button>
        <p>
          Already have an account? <a href="/">Login here</a>
        </p>
      </form>
    </div>
  );
}

export default Signup;
