import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PermContactCalendarIcon from '@mui/icons-material/PermContactCalendar';
import { useNavigate } from "react-router-dom";
import api from "../axiosConfig";

export default function AuthPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false); // 로그인/회원가입 전환 state

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    const data = new FormData(event.currentTarget);
    const id = data.get("id");
    const password = data.get("password");

    if (!/^[A-Za-z0-9]{4,20}$/.test(id)) {
      alert("아이디는 영어, 숫자 4~20자로 입력해야 합니다.");
      setLoading(false);
      return;
    }
    if (!/^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>]).{8,20}$/.test(password)) {
      alert("비밀번호는 소문자, 숫자, 특수문자를 포함해 8~20자로 입력해야 합니다.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/login", { id, password });
      localStorage.setItem("token", response.data.access_token);
      if (onLoginSuccess) onLoginSuccess(response.data);
      alert("로그인 성공!");
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.detail || "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);

    const data = new FormData(event.currentTarget);
    const id = data.get("id");
    const password = data.get("password");
    const confirmPassword = data.get("confirmPassword");
    const nickname = data.get("nickname");

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }
    if (!/^[A-Za-z0-9]{4,20}$/.test(id)) {
      alert("아이디는 영어, 숫자 4~20자로 입력해야 합니다.");
      setLoading(false);
      return;
    }
    if (!/^(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?\":{}|<>]).{8,20}$/.test(password)) {
      alert("비밀번호는 소문자, 숫자, 특수문자를 포함해 8~20자로 입력해야 합니다.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/register", { id, nickname, password });
      console.log(response.data);
      alert(`회원가입 완료! (아이디: ${id})`);
      setIsSignUp(false); // 회원가입 끝나면 로그인 화면으로 전환
    } catch (error) {
      alert(error.response?.data?.detail || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <CssBaseline />
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            width: 420,
            p: 4,
            backgroundColor: "#fff",
            boxShadow: "0 0px 70px rgba(0,0,0,0.1)",
            borderTop: "5px solid #7ac142",
            borderRadius: 2,
            transition: "all 0.3s ease",
          }}
        >
          <Avatar sx={{ m: "0 auto", bgcolor: "#7ac142" }}>
            {isSignUp ? <PermContactCalendarIcon /> : <AccountCircleIcon />}
          </Avatar>
          <Typography
            component="h1"
            variant="h6"
            sx={{ textAlign: "left", mt: 2, mb: 2, fontWeight: "bold", color: "#7ac142", textTransform: "uppercase" }}
          >
            {isSignUp ? "Sign Up" : "Log In"}
          </Typography>

          <Box component="form" onSubmit={isSignUp ? handleSignup : handleLogin} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="id"
              label="아이디"
              name="id"
              variant="standard"
              InputProps={{
                sx: {
                  "&.Mui-focused:after": { borderBottomColor: "#7ac142" },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="비밀번호"
              type="password"
              id="password"
              variant="standard"
              inputProps={{ minLength: 8, maxLength: 20 }}
              placeholder="숫자, 특수문자가 포함된 8~20자"
              InputProps={{
                sx: {
                  "&.Mui-focused:after": { borderBottomColor: "#7ac142" },
                },
              }}
            />
            {isSignUp && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="비밀번호 확인"
                  type="password"
                  id="confirmPassword"
                  variant="standard"
                  inputProps={{ minLength: 8, maxLength: 20 }}
                  placeholder="숫자, 특수문자가 포함된 8~20자"
                  InputProps={{
                    sx: {
                      "&.Mui-focused:after": { borderBottomColor: "#7ac142" },
                    },
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
                  InputProps={{
                    sx: {
                      "&.Mui-focused:after": { borderBottomColor: "#7ac142" },
                    },
                  }}
                />
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 4,
                borderRadius: 25,
                backgroundColor: "#7ac142",
                "&:hover": { backgroundColor: "#66a936" },
              }}
            >
              {isSignUp ? "회원가입" : "로그인"}
            </Button>

            <Box textAlign="center" sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary">
                {isSignUp ? (
                  <>
                    이미 계정이 있으신가요?{" "}
                    <Link onClick={() => setIsSignUp(false)} sx={{ cursor: "pointer" }}>
                      로그인
                    </Link>
                  </>
                ) : (
                  <>
                    계정이 없으신가요?{" "}
                    <Link onClick={() => setIsSignUp(true)} sx={{ cursor: "pointer" }}>
                      회원가입
                    </Link>
                  </>
                )}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
