import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { SocketProvider } from "./socketContext";
import './styles/index.css';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
