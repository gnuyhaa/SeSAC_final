import * as React from 'react';
import { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Box from '@mui/material/Box';
import { useNavigate } from "react-router-dom";
import api from "../axiosConfig";
import './Auth.css';
import { toast } from 'react-toastify';

export default function AuthPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    const data = new FormData(event.currentTarget);
    const id = data.get("id");
    const password = data.get("password");

    // 아이디 유효성 검사
    if (!/^[A-Za-z0-9]{4,20}$/.test(id)) {
      toast.error("아이디는 영어, 숫자 4~20자로 입력해야 합니다.");
      setLoading(false);
      return;
    }
    // 비밀번호 유효성 검사
    if (!/^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>]).{8,20}$/.test(password)) {
      toast.error("비밀번호는 소문자, 숫자, 특수문자를 포함해 8~20자로 입력해야 합니다.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/login", {
        id: id,
        password: password,
      });

      console.log("로그인 성공:", response.data);
      localStorage.setItem("token", response.data.access_token);
      if (onLoginSuccess) onLoginSuccess(response.data);

      navigate("/");
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.detail || "로그인 실패");
      } else {
        toast.error("로그인 실패");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    const data = new FormData(event.currentTarget);
    const id = data.get("signup-id");
    const password = data.get("signup-password");
    const nickname = data.get("nickname");

    // 아이디 유효성 검사
    if (!/^[A-Za-z0-9]{4,20}$/.test(id)) {
      toast.error("아이디는 영어, 숫자 4~20자로 입력해야 합니다.");
      setLoading(false);
      return;
    }
    // 비밀번호 유효성 검사
    if (!/^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>]).{8,20}$/.test(password)) {
      toast.error("비밀번호는 소문자, 숫자, 특수문자를 포함해 8~20자로 입력해야 합니다.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/register", {
        id: id,
        nickname: nickname,
        password: password,
      });

      toast.success(`${nickname}님, 환영합니다!`);
      console.log(response.data);
      
      // 회원가입 후 로그인 폼으로 전환
      setIsSignUp(false);
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.detail || "회원가입 실패");
      } else {
        toast.error("서버 연결 오류");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className={`auth-content auth-content-signin ${isSignUp ? 'hidden' : ''}`}>
        <div className="form-wrapper">
          <h2>로그인</h2>
          <Box component="form" onSubmit={handleLogin} noValidate className="form-box">
            <TextField
              margin="normal"
              required
              fullWidth
              id="id"
              label="아이디"
              name="id"
              autoComplete="id"
              variant="standard"
              sx={{
                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(0,0,0,0.1)' },
                '& .MuiInput-underline:after': { borderBottomColor: '#3cb371' },
                '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(0,0,0,0.3)' }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="비밀번호"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              variant="standard"
              inputProps={{ minLength: 8, maxLength: 20 }}
              placeholder="숫자, 특수문자가 포함된 8~20자"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(0,0,0,0.1)' },
                '& .MuiInput-underline:after': { borderBottomColor: '#3cb371' },
                '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(0,0,0,0.3)' }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              className="submit-btn"
              sx={{
                mt: 5,
                backgroundColor: '#3cb371',
                borderRadius: '25px',
                textTransform: 'none',
                fontWeight: 'bold',
                padding: '6px 20px',
                '&:hover': {
                  backgroundColor: '#fff',
                  color: '#3cb371',
                  border: '2px solid #3cb371'
                }
              }}
            >
              로그인
            </Button>
          </Box>
        </div>
      </div>

      <div className={`auth-content auth-content-signup ${!isSignUp ? 'hidden' : ''}`}>
        <div className="form-wrapper">
          <h2>회원가입</h2>
          <Box component="form" onSubmit={handleSignup} noValidate className="form-box">
            <TextField
              margin="normal"
              required
              fullWidth
              id="signup-id"
              label="아이디"
              name="signup-id"
              variant="standard"
              sx={{
                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(0,0,0,0.1)' },
                '& .MuiInput-underline:after': { borderBottomColor: '#3cb371' },
                '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(0,0,0,0.3)' }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="signup-password"
              label="비밀번호"
              type={showPassword ? "text" : "password"}
              id="signup-password"
              variant="standard"
              inputProps={{ minLength: 8, maxLength: 20 }}
              placeholder="숫자, 특수문자가 포함된 8~20자"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{
                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(0,0,0,0.1)' },
                '& .MuiInput-underline:after': { borderBottomColor: '#3cb371' },
                '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(0,0,0,0.3)' }
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="nickname"
              label="닉네임"
              name="nickname"
              variant="standard"
              sx={{
                '& .MuiInput-underline:before': { borderBottomColor: 'rgba(0,0,0,0.1)' },
                '& .MuiInput-underline:after': { borderBottomColor: '#3cb371' },
                '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'rgba(0,0,0,0.3)' }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              className="submit-btn"
              sx={{
                mt: 5,
                backgroundColor: '#3cb371',
                borderRadius: '25px',
                textTransform: 'none',
                fontWeight: 'bold',
                padding: '6px 20px',
                '&:hover': {
                  backgroundColor: '#fff',
                  color: '#3cb371',
                  border: '2px solid #3cb371'
                }
              }}
            >
              회원가입
            </Button>
          </Box>
        </div>
      </div>

      <div className="auth-switcher">
        <div className={`switcher-signin ${!isSignUp ? 'hidden' : ''}`}>
          <h3>이미 계정이 있으신가요?</h3>
          <button onClick={() => setIsSignUp(false)}>로그인</button>
        </div>
        <div className={`switcher-signup ${isSignUp ? 'hidden' : ''}`}>
          <h3>계정이 없으신가요?</h3>
          <button onClick={() => setIsSignUp(true)}>회원가입</button>
        </div>
    </div>
    </div>
  );
}
