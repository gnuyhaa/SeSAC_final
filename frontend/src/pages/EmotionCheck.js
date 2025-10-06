import React, { useState } from "react";
import { Slider, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const emotions = [
  { key: "depression", label: "우울", icon: "😞", type: "negative", description: "슬픔, 무기력감을 느끼는 정도" },
  { key: "anxiety", label: "불안", icon: "😰", type: "negative", description: "모호한 긴장감, 두려움을 느끼는 정도" },
  { key: "stress", label: "스트레스", icon: "😵", type: "negative", description: "변화나 부담에 의해 긴장과 압박을 느끼는 정도" },
  { key: "happiness", label: "행복", icon: "😊", type: "positive", description: "기쁨과 만족감을 느끼는 정도" },
  { key: "energy", label: "에너지", icon: "😁", type: "positive", description: "행동이나 사고를 활발하게 유지하는 정도" },
  { key: "achievement", label: "성취감", icon: "🤩", type: "positive", description: "노력이나 목표 달성 등에서 만족, 보람을 느끼는 정도" },
];

const getStatus = (value, type) => {
  if (type === "negative") {
    if (value === 1) return { text: "매우 낮음", color: "#1c9348ff" };
    if (value === 2) return { text: "낮음", color: "#22C55E" };
    if (value === 3) return { text: "보통", color: "#FFC309" };
    if (value === 4) return { text: "높음", color: "#EF4444" };
    if (value === 5) return { text: "매우 높음", color: "#DC2626" };
  } else if (type === "positive") {
    if (value === 1) return { text: "매우 낮음", color: "#DC2626" };
    if (value === 2) return { text: "낮음", color: "#EF4444" };
    if (value === 3) return { text: "보통", color: "#FFC309" };
    if (value === 4) return { text: "높음", color: "#22C55E" };
    if (value === 5) return { text: "매우 높음", color: "#1c9348ff" };
  }
  return { text: "", color: "gray" };
};

export default function EmotionCheck({ user }) {
  const navigate = useNavigate();
  const [values, setValues] = useState({
    depression: 3,
    anxiety: 3,
    stress: 3,
    happiness: 3,
    energy: 3,
    achievement: 3,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (key, newValue) => {
    setValues((prev) => ({ ...prev, [key]: newValue }));
  };

  const handleSubmit = async () => {
    if (isLoading) return;
    setIsLoading(true);

    const data = {
      nickname: user.nickname,
      emotions: values,
    };

    try {
      await axios.post("https://growth-doctor.onrender.com/emotions", data);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await axios.put(
                `https://growth-doctor.onrender.com/emotions/${user.nickname}/location`,
                {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                }
              );
            } catch (err) {
              console.error("위치 저장 실패:", err);
            }
          },
          (err) => {
            console.error("위치 권한 거부:", err);
          }
        );
      }
      navigate("/waiting", { state: { emotions: values } });
    } catch (err) {
      console.error("요청 실패:", err);
      alert("처방 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: "16px",
        padding: "30px",
        maxWidth: "600px",
        margin: "40px auto",
        border: "1px solid #97deacff",
      }}
    >
      <h2><b>마음상태 체크</b></h2>

      {emotions.map((emo) => {
        const val = values[emo.key];
        const status = getStatus(val, emo.type);

        return (
          <div key={emo.key} style={{ marginBottom: "30px" }}>
            <Typography
              variant="h6"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.5rem", width: "36px", textAlign: "center" }}>
                  {emo.icon}
                </span>
                <div>
                  <span style={{ fontSize: "1.2rem" }}>{emo.label}</span>
                  <div style={{ fontSize: "0.85rem", color: "#575757ff" }}>
                    {emo.description}
                  </div>
                </div>
              </div>
              <span
                style={{
                  backgroundColor: status.color,
                  color: "white",
                  fontSize: "0.8rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  minWidth: "60px",
                  textAlign: "center",
                }}
              >
                {status.text}
              </span>
            </Typography>

            <Slider
              value={val}
              min={1}
              max={5}
              step={1}
              onChange={(e, newVal) => handleChange(emo.key, newVal)}
              sx={{
                color: "green",
                "& .MuiSlider-thumb": { backgroundColor: "white" },
              }}
            />
          </div>
        );
      })}

      <Typography variant="body2" style={{ marginTop: "20px" }}>
        💡 Tip: 3일 이상 기록하면 주간 마음상태 분석을 받을 수 있어요!
      </Typography>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="btn btn-success btn-lg d-inline-flex align-items-center justify-content-center"
          style={{
            opacity: isLoading ? 0.7 : 1,
            minWidth: "135px",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          <span style={{ fontSize: "18px", color: "white" }}>
            {isLoading ? "분석 중" : "녹지 처방 받기"}
          </span>
        </button>
      </div>
    </div>
  );
}
