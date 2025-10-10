import React from "react";
import { useEffect, useState, useRef, useMemo, memo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Lottie from "lottie-react";
import axios from "axios";
import pillsAnimation from "../assets/pills.json";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { toast } from "react-toastify";
import { Typewriter } from "react-simple-typewriter";
import { PiSealCheckFill } from "react-icons/pi";

const EmotionChart = memo(({ emotions }) => {
  const data = useMemo(() => [
    { subject: "우울", value: emotions.depression ?? 0 },
    { subject: "불안", value: emotions.anxiety ?? 0 },
    { subject: "스트레스", value: emotions.stress ?? 0 },
    { subject: "행복", value: emotions.happiness ?? 0 },
    { subject: "성취감", value: emotions.achievement ?? 0 },
    { subject: "에너지", value: emotions.energy ?? 0 },
  ], [emotions]);

  if (Object.keys(emotions).length === 0) return null;

  return (
    <ResponsiveContainer width="110%" height="110%" style={{ transform: "translateX(-35px)" }}>
      <RadarChart outerRadius="100%" data={data} margin={{ top: 20, right: 30, bottom: 30, left: 50 }}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} tickCount={6} />
        <Radar
          name="감정 상태"
          dataKey="value"
          stroke="#3cb371"
          fill="#3cb371"
          fillOpacity={0.3}
          isAnimationActive={true}
          animationDuration={800}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
});

EmotionChart.displayName = 'EmotionChart';

export default function WaitingPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasRun = useRef(false);
  const inFlightRef = useRef(false);

  const [categories, setCategories] = useState([]);
  const [position, setPosition] = useState({ lat: null, lng: null });

  const [step, setStep] = useState(0);
  const [showPrescription, setShowPrescription] = useState(false);
  const [startAnimation, setStartAnimation] = useState(false);
  const [dateDone, setDateDone] = useState(false);
  const [usernameDone, setUsernameDone] = useState(false);
  const [mindLabelDone, setMindLabelDone] = useState(false);
  const [mindTypeDone, setMindTypeDone] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [visibleCards, setVisibleCards] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [showStamp, setShowStamp] = useState(false);
  const [startTransition, setStartTransition] = useState(false);
  const emotions = location.state?.emotions || {};

  const TYPING_SPEED = 40;

  const today = useMemo(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function getApproxLocation() {
      try {
        const res = await axios.get("https://ipapi.co/json/");
        const { latitude, longitude } = res.data;
        console.log("🌍 IP 기반 위치:", latitude, longitude);
        return { lat: latitude, lng: longitude };
      } catch (err) {
        console.error("⚠️ IP 기반 위치 조회 실패:", err);
        return null;
      }
    }

    async function handlePosition(lat, lng) {
      if (inFlightRef.current) {
        console.log("🔁 handlePosition skipped (in-flight)");
        return;
      }
      inFlightRef.current = true;

      try {
        if (position.lat && position.lng) return;
        setPosition({ lat, lng });

        console.log("⏱️ 위치 업데이트 API 호출 시작");
        const locationStartTime = Date.now();
        await axios.put(
          `${process.env.REACT_APP_API_URL}/emotions/${user.nickname}/location`,
          { latitude: lat, longitude: lng }
        );
        console.log(`✅ 위치 업데이트 완료 (${Date.now() - locationStartTime}ms)`);

        console.log("⏱️ 추천 알고리즘 API 호출 시작");
        const recommendStartTime = Date.now();
        const recRes = await axios.post(
          `${process.env.REACT_APP_API_URL}/recommend_for_user`,
          null,
          { params: { user_nickname: user.nickname } }
        );
        console.log(`✅ 추천 완료 (${Date.now() - recommendStartTime}ms)`);
        setCategories(recRes.data.recommended_categories || []);
      } catch (err) {
        console.error("추천 처리 실패:", err);
      } finally {
        inFlightRef.current = false;
      }
    }

    if ("geolocation" in navigator) {
      console.log("⏱️ 위치 정보 요청 시작");

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          console.log("✅ 위치 정보 획득:", pos.coords);
          await handlePosition(pos.coords.latitude, pos.coords.longitude);
        },
        async (err) => {
          console.log("⚠️ GPS 위치 획득 실패:", err);
          if (!position.lat || !position.lng) {
            const approx = await getApproxLocation();
            if (approx) await handlePosition(approx.lat, approx.lng);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
  (async () => {
    const approx = await getApproxLocation();
    if (approx) await handlePosition(approx.lat, approx.lng);
    else toast.error("위치 서비스를 사용할 수 없습니다.");
  })();
}
}, [user.nickname]);

  useEffect(() => {
    if (categories.length === 0) return;
    console.log("카테고리 로드 완료, 처방전 표시");
    
    const timer = setTimeout(() => {
      setShowPrescription(true);
      setStartAnimation(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [categories]);

  useEffect(() => {
    if (!startAnimation) return;
    console.log("애니메이션 시작");
    
    const runSequence = async () => {
      // 날짜 타이핑
      setStep(-1);
      const dateDelay = today.length * TYPING_SPEED + 200;
      await new Promise(resolve => setTimeout(resolve, dateDelay));
      setDateDone(true);
      
      // 사용자명 라벨 타이핑
      setStep(0);
      await new Promise(resolve => setTimeout(resolve, "사용자명:".length * TYPING_SPEED + 100));
      
      // 사용자명 값 타이핑
      setUsernameDone(true);
      const nicknameDelay = user.nickname.length * TYPING_SPEED + 200;
      await new Promise(resolve => setTimeout(resolve, nicknameDelay));
      
      // 차트 표시
      setShowChart(true);
      
      // 차트 애니메이션 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 카드 순차 표시
      for (let i = 0; i < categories.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setVisibleCards(i + 1);
      }
      
      // 모든 카드 표시 후 버튼 표시
      await new Promise(resolve => setTimeout(resolve, 500));
      setShowButton(true);
      console.log("버튼 표시 - 사용자 대기");
    };
    
    runSequence();
  }, [startAnimation, today, user.nickname, categories, TYPING_SPEED]);

  const handleGoToMap = () => {
    console.log("지도로 이동 시작");
    setShowButton(false);
    setShowStamp(true);
    
    setTimeout(() => {
      setStartTransition(true);
      setTimeout(() => {
        navigate(`/map?nickname=${user.nickname}`);
      }, 1500);
    }, 1200);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70dvh",
        padding: "15px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {!showPrescription ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Lottie animationData={pillsAnimation} loop={true} style={{ width: 120, height: 120 }} />
          <div style={{ fontSize: "20px", color: "#525252ff", marginTop: "15px", fontWeight: 500 }}>조제 중...</div>
        </div>
      ) : (
        <>
          <div
            style={{
              maxWidth: "880px",
              width: "100%",
              background: "white",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "20px",
              minHeight: "480px",
              position: "relative",
              animation: startTransition 
                ? "shrinkAndFadeOut 1.5s ease-in-out forwards" 
                : "fadeIn 0.5s ease-in",
              transformOrigin: "top center",
            }}
          >
            {showStamp && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1000,
                  animation: "stampAppear 0.8s ease-out",
                }}
              >
                <div
                  style={{
                    width: "150px",
                    height: "150px",
                    borderRadius: "50%",
                    border: "2.5px solid #F97316",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(249, 115, 22, 0.1)",
                    transform: "rotate(-15deg)",
                  }}
                >
                  <PiSealCheckFill style={{ fontSize: "40px", marginBottom: "10px", color: "#F97316" }} />
                  <div style={{ 
                    fontSize: "24px", 
                    fontWeight: "bold", 
                    color: "#F97316",
                    textAlign: "center",
                    lineHeight: 1.3
                  }}>
                    처방<br/>완료
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
              <span
                style={{
                  backgroundColor: "#3cb371",
                  color: "white",
                  padding: "2px 20px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  fontSize: "20px",
                }}
              >
                녹지 처방전
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "30px",
              }}
            >
              <div style={{ marginTop: "30px" }}>
                {/* 날짜 */}
                <h6 style={{ color: "#666", marginBottom: "10px", fontWeight: 400,}}>
                  <Typewriter
                    words={[today]}
                    typeSpeed={TYPING_SPEED}
                    cursor={false}
                  />
                </h6>

                {/* 사용자명 */}
                {dateDone && (
                  <h5>
                    <strong>
                      <Typewriter
                        words={["사용자명:"]}
                        typeSpeed={TYPING_SPEED}
                        cursor={false}
                      />
                    </strong>
                    <span style={{ fontWeight: 400 }}>
                      {usernameDone && (
                        <Typewriter
                          words={[` ${user.nickname}`]}
                          typeSpeed={TYPING_SPEED}
                          cursor={false}
                        />
                      )}
                    </span>
                  </h5>
                )}
              </div>

              {/* 차트 */}
              <div style={{ width: "250px", height: "250px" }}>
                {showChart && <EmotionChart emotions={emotions} />}
              </div>
            </div>

            {/* 카드 리스트 */}
            <div
              style={{
                display: "flex",
                gap: "15px",
                justifyContent: "center",
                marginTop: "10px",
              }}
            >
              {categories.map((cat, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    border: "1px solid #3cb371",
                    borderRadius: "12px",
                    padding: "15px 12px",
                    minWidth: "250px",
                    height: "180px",
                    textAlign: "left",
                    opacity: i < visibleCards ? 1 : 0,
                    visibility: i < visibleCards ? "visible" : "hidden",
                    transform: i < visibleCards ? "translateY(0)" : "translateY(10px)",
                    transition: "opacity 0.5s ease-out, transform 0.5s ease-out, visibility 0.5s",
                  }}
                >
                  <h5 style={{ color: "#3cb371", fontWeight: 600, textAlign: "center", marginBottom: "15px"}}>
                    {cat.category}
                  </h5>
                  <div
                    style={{
                      color: "#333",
                      lineHeight: "1.5",
                      whiteSpace: "pre-line",
                      marginTop: "10px",
                      textAlign: "center",
                      // letterSpacing: "-0.2px",
                      fontSize: "16px",
                      margin: 0
                    }}
                  >
                    {cat.content.map((line, idx) => {
                      let replaced = line;
                      
                      // 에너지 충전에 좋은 활력 공원
                      replaced = replaced
                        .replace("활력 충전", "<br/><span style='font-size:17px; font-weight:600; color:#2f8a5a;'>활력 충전</span>")
                        .replace("스트레스 해소", "<br/><span style='font-size:17px; font-weight:600; color:#2f8a5a;'>스트레스 해소</span>")

                      // 성취감 키우는 도전형 공원
                      replaced = replaced
                        .replace("목표 달성", "<br/><span style='font-size:17px; font-weight:600; color:#2f8a5a;'>목표 달성</span>")
                        .replace("새로운 활동 도전과 자기효능감 강화", "새로운 활동 도전과 <span style='font-size:17px; font-weight:600; color:#2f8a5a;'>자기효능감 강화</span>")

                      // 함께 즐기는 커뮤니티 공원
                      replaced = replaced
                        .replace("가족과 친구와 함께", "가족과 친구와 함께<br/>")
                        .replace("피크닉, 소규모 모임", "<span style='font-size:17px; font-weight:600; color:#2f8a5a;'>피크닉, 소규모 모임</span>")
                        .replace("다양한 커뮤니티 활동", "<br/><span style='white-space:nowrap;'>다양한 <span style='font-size:17px; font-weight:600; color:#2f8a5a;'>커뮤니티 활동</span></span>")

                      // 마음 회복에 좋은 녹음길
                      replaced = replaced
                        .replace("마음 편안", "<br/><span style='font-size:17px; font-weight:600; color:#2f8a5a;'>마음 편안</span>")
                        .replace("내면 평화", "<br/><span style='font-size:17px; font-weight:600; color:#2f8a5a;'>내면 평화</span>")

                      // 스트레스 풀기 좋은 공원
                      replaced = replaced
                        .replace("땀 흘리기", "<br/><span style='font-size:17px; font-weight:600; color:#2f8a5a;'>땀 흘리기</span>")
                        .replace("기분 전환", "<span style='font-size:17px; font-weight:600; color:#2f8a5a;'>기분 전환</span>")

                      // 명상에 좋은 조용한 공원
                      replaced = replaced
                        .replace("마음 정리", "<br/><span style='font-size:17px; font-weight:600; color:#2f8a5a;'>마음 정리</span>")
                        .replace("명상과 사색", "<span style='font-size:17px; font-weight:600; color:#2f8a5a;'>명상과 사색</span>");
                      
                  return (
                    <div
                      key={idx}
                      style={{ marginBottom: "10px" }}
                      dangerouslySetInnerHTML={{ __html: `• ${replaced}` }}
                    />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showButton && (
            <button
              onClick={handleGoToMap}
              style={{
                position: "fixed",
                bottom: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#3cb371",
                color: "white",
                border: "none",
                borderRadius: "30px",
                padding: "15px 40px",
                fontSize: "16px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(60, 179, 113, 0.3)",
                zIndex: 1000,
                animation: "fadeInUp 0.5s ease-out",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateX(-50%) scale(1.05)";
                e.target.style.boxShadow = "0 6px 16px rgba(60, 179, 113, 0.4)"
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateX(-50%) scale(1)";
                e.target.style.boxShadow = "0 4px 12px rgba(60, 179, 113, 0.3)";
              }}
            >
              지도에서 녹지 보기 →
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @keyframes stampAppear {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(-15deg);
            opacity: 0;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2) rotate(-15deg);
          }
          100% {
            transform: translate(-50%, -50%) scale(1) rotate(-15deg);
            opacity: 1;
          }
        }

        @keyframes shrinkAndFadeOut {
          0% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          60% {
            transform: scale(0.5) translateY(-40vh);
            opacity: 0.5;
          }
          100% {
            transform: scale(0.2) translateY(-100vh);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}