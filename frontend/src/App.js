import logo from './logo.svg';
import './App.css';
import Login from './Login';
import Signup from './Signup';
import Home from './Home';
import Dashboard from './Dashboard';
import TransactionDetails from "./TransactionDetails";

import { BrowserRouter,Routes,Route} from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/home" element={<Home />} />
          <Route path="/transactions/:userId" element={<TransactionDetails />} />

        </Routes>
      </BrowserRouter>
    </div>
  );
}


export default App;
