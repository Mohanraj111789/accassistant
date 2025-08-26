import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // eye icons
import "./Login.css";
import { useNavigate } from "react-router-dom";

function Login() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleInput = (e) => {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 👇 mark as async
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Login submitted with values:", values);

    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Login successful!");
        localStorage.setItem("token", data.token); // store JWT
        navigate("/home"); // redirect to Home
      } else {
        alert(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong. Check backend connection.");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            placeholder="Enter Email"
            name="email"
            required
            onChange={handleInput}
          />
        </div>

        <div className="form-group password-group">
          <label>Password:</label>
          <input
            type={showPassword ? "text" : "password"} // toggle visibility
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

        <button type="submit">Login</button>
        <p>
          Don't have an account? <a href="/signup">Register here</a>
        </p>
      </form>
    </div>
  );
}

export default Login;
