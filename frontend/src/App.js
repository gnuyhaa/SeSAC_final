import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Main from "./pages/Main";
import EmotionCheck from "./pages/EmotionCheck";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Auth from "./pages/Auth";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import GreenList from "./pages/GreenList";
import MyPage from "./pages/MyPage";
import WaitingPage from "./pages/WaitingPage";
import Map from "./pages/Map";
import React, { useState } from "react";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#35c06fff',
      contrastText: '#fff'
    },
  },
  typography: {
    fontFamily: `'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', Arial, sans-serif`,
  },
});

function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    sessionStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <ToastContainer
          position="top-center"
          autoClose={1000}
          hideProgressBar={true}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          style={{ width: "400px" }}
          toastStyle={{
              fontSize: "16px",
              padding: "20px",
              minHeight: "70px",
              borderRadius: "12px"
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <Navbar 
            style={{ height: "56px" }} 
            user={user} 
            onLogout={handleLogout} 
          />

          <div style={{ flex: 1, backgroundColor: "#fbfffc" }}>
            <Routes>

              <Route path="/" element={<Main user={user} />} />
              <Route path="/login" element={<Auth onLoginSuccess={handleLoginSuccess} />} />
              <Route path="/signup" element={<Auth onLoginSuccess={handleLoginSuccess} />} />
              <Route path="/greenlist" element={<GreenList />} />

              <Route path="/mypage" element={
                <PrivateRoute user={user}>
                  <MyPage user={user} />
                </PrivateRoute>
              } />

              <Route path="/emotion" element={
                <PrivateRoute user={user}>
                  <EmotionCheck user={user} />
                </PrivateRoute>
              } />

              <Route path="/waiting" element={
                <PrivateRoute user={user}>
                  <WaitingPage user={user} />
                </PrivateRoute>
              } />

              <Route path="/map" element={
                <PrivateRoute user={user}>
                  <Map user={user} />
                </PrivateRoute>
              } />
            </Routes>
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;