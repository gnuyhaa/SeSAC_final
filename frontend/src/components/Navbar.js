import { Link, useNavigate, useLocation } from "react-router-dom";
import { LuLeaf } from "react-icons/lu";
import { FaUserCircle } from "react-icons/fa";
import { useState, useRef, useEffect } from "react";
import api from "../axiosConfig";
import "./Navbar.css";

function Logo() {
  return (
    <div className="d-flex align-items-center">
      <div
        style={{
          width: "35px",
          height: "35px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #5ce495, #3cb371)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "10px",
        }}
      >
        <LuLeaf size={22} color="white" />
      </div>
      <span className="fw-bold text-success" style={{ fontSize: "20px" }}>
        마음C
      </span>
    </div>
  );
}

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  let isLoggingOut = false;

  const handleLogout = () => {
    if (isLoggingOut) return;
    isLoggingOut = true;
    const token = localStorage.getItem("token");
    localStorage.removeItem("token");
    onLogout();

    if (token) {
      api
        .post("/logout", {}, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => console.log("서버 로그아웃 성공:", res.data))
        .catch((err) => console.error("서버 로그아웃 실패:", err))
        .finally(() => {
          isLoggingOut = false;
        });
    } else {
      isLoggingOut = false;
    }

    document.body.style.opacity = "0";
    setTimeout(() => {
      document.body.style.opacity = "1";
      navigate("/");
    }, 150);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className="navbar navbar-expand-lg navbar-light border-bottom"
      style={{ backgroundColor: "#fbfffc" }}
    >
      <div className="container d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand">
          <Logo />
        </Link>

        <div className="d-flex align-items-center">
          <Link
            to="/emotion"
            className="nav-link text-success fw-semibold me-3"
          >
            마음 진단
          </Link>
          <Link
            to="/greenlist"
            className="nav-link text-success fw-semibold me-3"
            onClick={() => window.dispatchEvent(new Event("resetGreenList"))}
          >
            녹지 리스트
          </Link>

          {!user ? (
            <Link
              to="/login"
              className="nav-link text-success fw-semibold me-3"
            >
              로그인
            </Link>
          ) : (
            <div className="position-relative" ref={menuRef}>
              <FaUserCircle
                size={32}
                color="#3cb371"
                style={{ cursor: "pointer" }}
                onClick={() => setMenuOpen(!menuOpen)}
              />
              {menuOpen && (
                <div className="dropdown-menu-custom" style={{ right: 0 }}>
                  <div className="dropdown-header">
                    {user.nickname || "사용자"}
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/mypage");
                    }}
                  >
                    마이페이지
                  </button>
                  <button
                    className="dropdown-item logout"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;