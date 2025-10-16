import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ko";
import axios from "axios";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useNavigate } from "react-router-dom";
import { Navigation } from "react-minimal-side-navigation";
import "react-minimal-side-navigation/lib/ReactMinimalSideNavigation.css";
import { FaCalendarCheck, FaMapLocationDot, FaChartSimple } from "react-icons/fa6";
import "./MyPage.css";
import { ReactComponent as SeoulMap } from "../images/seoul_districts.svg";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, ReferenceLine } from "recharts";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isoWeek from "dayjs/plugin/isoWeek";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isoWeek);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.tz.setDefault("Asia/Seoul");

ChartJS.register(ArcElement, Tooltip, Legend);
dayjs.locale("ko");

function FloatingButton({ label, to }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        width: "200px",
        backgroundColor: "#3cb371",
        color: "white",
        border: "none",
        borderRadius: "30px",
        padding: "10px 0",
        fontSize: "15px",
        fontWeight: 600,
        boxShadow: "0 4px 12px rgba(60, 179, 113, 0.3)",
        cursor: "pointer",
        transition: "0.3s ease",
        margin: "100px auto",
        display: "block",
        position: "fixed",
        bottom: "-30px",
        left: "15px",
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = "scale(1.05)";
        e.target.style.boxShadow = "0 6px 16px rgba(28,176,143,0.4)";
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "scale(1)";
        e.target.style.boxShadow = "0 4px 12px rgba(28,176,143,0.3)";
      }}
    >
      {label}
    </button>
  );
}

export default function WeeklyCalendar({ user }) {
  const navigate = useNavigate();
  const today = dayjs();
  const currentWeekStart = today.day() === 0
    ? today.subtract(6, "day")
    : today.day(1);
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [showAll, setShowAll] = useState(false);
  const [events, setEvents] = useState({});
  const [emotions, setEmotions] = useState(null);
  const [activeTab, setActiveTab] = useState("/calendar");
  const [visitedParks, setVisitedParks] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [heatmap, setHeatmap] = useState({});
  const [tempToggles, setTempToggles] = useState({});

  useEffect(() => {
    if (!user?.nickname) return;
    axios
      .get(`${process.env.REACT_APP_API_URL}/latest_recommendation/${user.nickname}`)
      .then((res) => {
        const emotionsList = res.data.latest_emotions || [];
        const todayStr = dayjs().format("YYYY-MM-DD");
        const todayEmotions = emotionsList.filter((item) =>
          item.create_date?.startsWith(todayStr)
        );

        if (todayEmotions.length > 0) {
          const avg = {
            depression:
              todayEmotions.reduce((a, b) => a + b.depression, 0) / todayEmotions.length,
            anxiety:
              todayEmotions.reduce((a, b) => a + b.anxiety, 0) / todayEmotions.length,
            stress:
              todayEmotions.reduce((a, b) => a + b.stress, 0) / todayEmotions.length,
            happiness:
              todayEmotions.reduce((a, b) => a + b.happiness, 0) / todayEmotions.length,
            achievement:
              todayEmotions.reduce((a, b) => a + b.achievement, 0) / todayEmotions.length,
            energy:
              todayEmotions.reduce((a, b) => a + b.energy, 0) / todayEmotions.length,
          };
          setEmotions(avg);
        } else {
          setEmotions(null);
        }
      })
      .catch(() => {});
  }, [user]);

useEffect(() => {
  if (!user?.nickname) return;

  const fetchRecommendations = axios.get(
    `${process.env.REACT_APP_API_URL}/latest_recommendation/${user.nickname}`
  );
  const fetchVisits = axios.get(
    `${process.env.REACT_APP_API_URL}/get_user_visits`,
    { params: { nickname: user.nickname } }
  );

  Promise.all([fetchRecommendations, fetchVisits])
    .then(([recRes, visitRes]) => {
      const nameToIdMap = {};
      (visitRes.data.parks || []).forEach((p) => {
        const key = `${p.park_name}_${p.recommend_date}`;
        nameToIdMap[key] = p.park_id;
      });

      const parkInfo = (visitRes.data.parks || []).reduce((acc, p) => {
        const key = `${p.park_id}_${p.recommend_date}`;
        acc[key] = {
          id: p.park_id,
          address: p.address,
          visit_count: p.visit_count || 0,
          is_visited: p.is_visited || 0,
        };
        return acc;
      }, {});

    const parksData = recRes.data.recommended_parks || [];
    const mapped = {};

    parksData.forEach(([createDate, ...parks]) => {
      const date = dayjs(createDate).format("YYYY-MM-DD");
      if (!mapped[date]) mapped[date] = [];

      parks.forEach((parkName) => {
        const matchingVisit = (visitRes.data.parks || []).find(
          (p) => p.park_name === parkName && 
                 p.recommend_date === createDate
        );

        if (!matchingVisit) return;

        const parkId = matchingVisit.park_id;
        const uniqueKey = `${parkId}_${createDate}`;

        mapped[date].push({
          name: parkName,
          address: matchingVisit.address || "주소 정보 없음",
          park_id: parkId,
          visit_count: matchingVisit.visit_count || 0,
          uniqueKey: uniqueKey,
          createDate,
        });
      });
    });
    setEvents(mapped);
  })
    .catch(() => {});
}, [user]);

useEffect(() => {
  const storedNick = user?.nickname || localStorage.getItem("lastLoggedNickname");
  if (!storedNick) return;

  localStorage.setItem("lastLoggedNickname", storedNick);

  const cached = JSON.parse(localStorage.getItem(`visitedParks_${storedNick}`) || "[]");
  if (cached.length > 0) setVisitedParks(cached);

  if (user?.nickname) {
    axios
      .get(`${process.env.REACT_APP_API_URL}/get_user_visits`, {
        params: { nickname: user.nickname },
      })
      .then((res) => {
        const serverVisited = (res.data.parks || [])
          .filter((p) => p.is_visited === 1)
          .map((p) => `${p.park_id}_${p.recommend_date}`);

        const merged = Array.from(new Set(serverVisited));
        setVisitedParks(merged);
        localStorage.setItem(`visitedParks_${storedNick}`, JSON.stringify(merged));
      })
      .catch(() => {});
  }
}, [user?.nickname]);

useEffect(() => {
  axios.get(`${process.env.REACT_APP_API_URL}/get_district_heatmap`, {params: { nickname: user?.nickname }})
    .then(res => {
      const mapData = {};
      res.data.districts.forEach(d => {
        mapData[d.district_name] = d.weighted_ratio;
      });
      setHeatmap(mapData);
    });
}, []);

const handleToggle = async (uniqueKey, parkId, isChecked, createDate) => {
  setTempToggles((prev) => ({ ...prev, [uniqueKey]: isChecked }));

  try {
    const res = await axios.post(
      `${process.env.REACT_APP_API_URL}/toggle_visit_status`,
      {},
      {
        params: { nickname: user.nickname, park_id: parkId, create_date: createDate },
      }
    );

    const action = res.data.action;

    const visitRes = await axios.get(
      `${process.env.REACT_APP_API_URL}/get_user_visits`,
      { params: { nickname: user.nickname } }
    );

    const serverVisited = (visitRes.data.parks || [])
      .filter((p) => p.is_visited === 1)
      .map((p) => `${p.park_id}_${p.recommend_date}`);

    const merged = Array.from(new Set(serverVisited));

    setVisitedParks(merged);
    localStorage.setItem(`visitedParks_${user.nickname}`, JSON.stringify(merged));

    setTempToggles((prev) => ({
      ...prev,
      [uniqueKey]: action === "on",
    }));

    const heatmapRes = await axios.get(
      `${process.env.REACT_APP_API_URL}/get_district_heatmap`,
      { params: { nickname: user.nickname } }
    );

    const mapData = {};
    heatmapRes.data.districts.forEach((d) => {
      mapData[d.district_name] = d.weighted_ratio;
    });
    setHeatmap(mapData);
  } catch {
    setTempToggles((prev) => ({ ...prev, [uniqueKey]: !isChecked }));
  }
};

const getDistrictColor = (district) => {
  const weighted = heatmap[district] || 0;
  const opacity = Math.min(weighted * 0.7 + 0.1, 1);
  return `rgba(28, 150, 100, ${opacity})`;
};

const districtIdMap = {
  강남구: "Gangnam-gu",
  강동구: "Gangdong-gu",
  강북구: "Gangbuk-gu",
  강서구: "Gangseo-gu",
  관악구: "Gwanak-gu",
  광진구: "Gwangjin-gu",
  구로구: "Guro-gu",
  금천구: "Geumcheon-gu",
  노원구: "Nowon-gu",
  도봉구: "Dobong-gu",
  동대문구: "Dongdaemun-gu",
  동작구: "Dongjak-gu",
  마포구: "Mapo-gu",
  서대문구: "Seodaemun-gu",
  서초구: "Seocho-gu",
  성동구: "Seongdong-gu",
  성북구: "Seongbuk-gu",
  송파구: "Songpa-gu",
  양천구: "Yangcheon-gu",
  영등포구: "Yeongdeungpo-gu_1_",
  용산구: "Yongsan-gu",
  은평구: "Eunpyeong-gu",
  종로구: "Jongno-gu",
  중구: "Jung-gu",
  중랑구: "Jungnang-gu",
};

useEffect(() => {
  if (activeTab !== "/map" || selectedDistrict) return;

  Object.keys(heatmap).forEach((ko) => {
    const engId = districtIdMap[ko];
    if (!engId) return;
    const group = document.getElementById(engId);
    if (!group) return;

    const color = getDistrictColor(ko);

    group.style.fill = "none";

    group.querySelectorAll("path, polygon, rect, circle, ellipse").forEach((node) => {
      const originalFill = node.getAttribute("fill");
      if (originalFill && originalFill.toLowerCase() === "black") return;
      node.style.fill = color;
      node.style.transition = "fill 0.5s ease";
    });

    group.querySelectorAll("text").forEach((t) => {
      t.style.fill = "#000";
      t.style.fillOpacity = 1;
    });
  });
}, [heatmap, activeTab, selectedDistrict]);

useEffect(() => {
  if (activeTab !== "/map") {
    setSelectedDistrict(null);
  }
}, [activeTab]);

  const weekDays = Array.from({ length: 7 }).map((_, i) => currentWeekStart.add(i, "day"));
  const allDates = Object.keys(events).sort();
  const datesToDisplay = showAll
    ? allDates.filter((d) => dayjs(d).isValid()).map((d) => dayjs(d))
    : weekDays;
  const emotionLabels = ["우울", "불안", "스트레스", "행복", "성취감", "에너지"];
  const emotionValues = emotions
    ? [
        emotions.depression,
        emotions.anxiety,
        emotions.stress,
        emotions.happiness,
        emotions.achievement,
        emotions.energy,
      ]
    : [];
  const chartData = {
    labels: emotionLabels,
    datasets: [{data: emotionValues, backgroundColor: [
          "#e74c3c",
          "#e67e22",
          "#f1c40f",
          "#2ecc71",
          "#3498db",
          "#9b59b6",
        ], borderWidth: 0, },],};
  const idToKo = Object.fromEntries(Object.entries(districtIdMap).map(([ko, en]) => [en, ko]));
  const handleDistrictClick = (e) => {
    const g = e.target.closest("g[id]");
    const ko = g ? idToKo[g.id] : null;
    if (ko) setSelectedDistrict(ko);
  };

  return (
    <div style={{ display: "flex"}}>
      <div
        className="side-nav"
        style={{ width: "230px", borderRight: "1px solid #ddd", display: "flex", flexDirection: "column", justifyContent: "flex-start", backgroundColor: "#f9fafb" }}
      >
        <Navigation
          activeItemId={activeTab}
          onSelect={({ itemId }) => setActiveTab(itemId)}
          items={[
            { title: "달력", itemId: "/calendar", elemBefore: () => <FaCalendarCheck /> },
            { title: "지도", itemId: "/map", elemBefore: () => <FaMapLocationDot /> },
            { title: "감정 리포트", itemId: "/graph", elemBefore: () => <FaChartSimple /> },
          ]}
        />
        <FloatingButton label="마음상태 진단 →" to="/emotion" />
      </div>

      <div style={{ flex: 1, padding: activeTab === "/map" ? "0" : "20px", overflowY: activeTab === "/map" && !selectedDistrict ? "hidden" : "auto" }}>
        {activeTab === "/calendar" && (
          <>
            <div style={{ marginBottom: 20, textAlign: "right" }}>
              <button
                onClick={() => setShowAll(!showAll)}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #ddd", background: showAll ? "#2ecc71" : "#f7f7f7", color: showAll ? "#fff" : "#333", cursor: "pointer" }}
              >
                {showAll ? "이번 주만 보기" : "전체 기록 보기"}
              </button>
            </div>
            <div
              style={{ display: "flex", gap: "12px", marginBottom: 20, flexWrap: showAll ? "nowrap" : "wrap" }}
            >
              {datesToDisplay.map((day) => {
                const dateKey = day.format("YYYY-MM-DD");
                const hasEvent = !!events[dateKey];
                const isSelected = selectedDate === dateKey;
                return (
                  <div
                    key={dateKey}
                    onClick={hasEvent ? () => setSelectedDate(dateKey) : undefined}
                    style={{
                      flex: "1 0 60px",
                      cursor: hasEvent ? "pointer" : "not-allowed",
                      opacity: hasEvent ? 1 : 0.4,
                      textAlign: "center",
                      padding: "10px",
                      marginBottom: "10px",
                      borderRadius: "12px",
                      background: isSelected ? "#2ecc71" : "#f7f7f7",
                      color: isSelected ? "#fff" : "#333",
                      fontWeight: isSelected ? "bold" : "normal",
                    }}
                  >
                    <div>{day.format("ddd")}</div>
                    <div>{day.format("D")}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {events[selectedDate] ? (
                <>
                  {Object.entries(
                    [...events[selectedDate]]
                      .sort(
                        (a, b) =>
                          dayjs(a.createDate, "YYYY-MM-DD HH:mm:ss").valueOf() -
                          dayjs(b.createDate, "YYYY-MM-DD HH:mm:ss").valueOf()
                      )
                      .reduce((acc, event) => {
                        const timeKey = dayjs(event.createDate, "YYYY-MM-DD HH:mm:ss").format(
                          "HH:mm"
                        );
                        if (!acc[timeKey]) acc[timeKey] = [];
                        acc[timeKey].push(event);
                        return acc;
                      }, {})
                  ).map(([time, group], idx, arr) => (
                    <div key={time} style={{ marginBottom: "24px" }}>
                      <h3
                        style={{ margin: "10px 0", color: "#2ecc71", fontWeight: "bold", fontSize: "16px" }}
                      >
                        처방 시간 {time}
                      </h3>
                      <div
                        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}
                      >
                        {group.map((event, i) => (
                          <React.Fragment key={i}>
                            <div
                              style={{
                                border: "1px solid #ddd",
                                borderRadius: "12px",
                                padding: "16px",
                                background: "#fff",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                                position: "relative",
                              }}
                            >
                              <h4 style={{ margin: "0 0 6px 0" }}>{event.name}</h4>
                              <p style={{ margin: "0 0 4px 0", color: "#777" }}>
                                {event.address}
                              </p>
                              {event.park_id && (
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={
                                      tempToggles[event.uniqueKey] !== undefined
                                        ? tempToggles[event.uniqueKey]
                                        : visitedParks.includes(event.uniqueKey)
                                    }
                                    onChange={(e) =>
                                      handleToggle(
                                        event.uniqueKey,
                                        event.park_id,
                                        e.target.checked,
                                        event.createDate
                                      )
                                    }
                                  />
                                  <span className="slider"></span>
                                </label>
                              )}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      {idx < arr.length - 1 && (
                        <hr
                          style={{ border: "none", borderTop: "1.5px solid #626262ff", margin: "24px 0" }}
                        />
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <p
                  style={{
                    gridColumn: "1 / -1",
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  녹지 처방 기록이 없습니다.
                </p>
              )}
            </div>
          </>
        )}
        {activeTab === "/map" && (
          <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            <div
              style={{
                flex: selectedDistrict ? "2.5" : "1",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: selectedDistrict ? "80%" : "90%",
                borderRight: selectedDistrict ? "1px dashed #e0e0e0" : "none",
                transition: "all 0.4s ease",
              }}
            >
              <SeoulMap
                onClick={handleDistrictClick}
                style={{
                  width: selectedDistrict ? "80%" : "85%",
                  maxWidth: "700px",
                  height: "auto",
                  cursor: "pointer",
                }}
              />
            </div>

            {selectedDistrict && (
              <div
                style={{
                  flex: "1",
                  overflowY: "auto",
                  padding: "40px",
                  backgroundColor: "#fff",
                  animation: "slideIn 0.4s ease-out forwards"
                }}
              >
                <h2
                  style={{
                    textAlign: "center",
                    color: "#2f8a5a",
                    fontWeight: "bold",
                    marginBottom: "16px",
                  }}
                >
                  {selectedDistrict}
                </h2>
                <p
                  style={{
                    color: "#777",
                    textAlign: "center",
                    marginBottom: "24px",
                  }}
                >
                  방문한 {selectedDistrict}의 공원 목록
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px" }}>
                  {(() => {
                    const districtParks = Object.values(events)
                      .flat()
                      .filter((p) => {
                        if (!p.address) return false;
                        const district = p.address.split(" ")[1] || "";
                        return district.includes(selectedDistrict);
                      });

                    const parkVisitMap = districtParks.reduce((acc, park) => {
                      if (!acc[park.park_id]) {
                        acc[park.park_id] = {
                          park_id: park.park_id,
                          name: park.name,
                          address: park.address,
                          totalVisits: 0
                        };
                      }
                      const uniqueKey = `${park.park_id}_${park.createDate}`;
                      if (visitedParks.includes(uniqueKey)) {
                        acc[park.park_id].totalVisits += 1;
                      }
                      return acc;
                    }, {});

                    return Object.values(parkVisitMap)
                      .filter(park => park.totalVisits > 0)
                      .map((park) => (
                        <div
                          key={park.park_id}
                          style={{
                            width: "280px",
                            border: "1px solid #ddd",
                            borderRadius: "12px",
                            padding: "16px",
                            background: "#fff",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                            textAlign: "left",
                          }}
                        >
                          <h4 style={{ margin: "0 0 8px 0", color: "#2f8a5a" }}>
                            {park.name}
                          </h4>
                          <p style={{ margin: "0 0 4px 0", color: "#555" }}>{park.address}</p>
                          <p style={{ margin: "6px 0", color: "#333", fontWeight: 500 }}>
                            방문횟수: {park.totalVisits}회
                          </p>
                        </div>
                      ));
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "/graph" && (
          <GraphSection nickname={user?.nickname} />
        )}
      </div>
    </div>
  );
}

const CustomLegend = ({ payload, order }) => {
  if (!payload) return null;
  const ordered = order
    .map((key) => payload.find((p) => p.value === key))
    .filter(Boolean);
  return (
    <ul style={{ display: "flex", justifyContent: "center", listStyle: "none", padding: 0, marginLeft: "45px" }}>
      {ordered.map((entry) => (
        <li key={entry.value} style={{ marginRight: 16, color: entry.color }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              backgroundColor: entry.color,
              borderRadius: "3px",
              marginRight: 6,
            }}
          />
          {entry.value}
        </li>
      ))}
    </ul>
  );
};


function GraphSection({ nickname }) {
  const [qualified, setQualified] = useState(false);
  const [recent3, setRecent3] = useState([]);
  const [weekRange, setWeekRange] = useState("");

  useEffect(() => {
    if (!nickname) return;
    // const cached = JSON.parse(localStorage.getItem(`graphData_${nickname}`) || "null");
    // if (cached?.qualified && Array.isArray(cached.recent3)) {
    //   setQualified(true);
    //   setRecent3(cached.recent3);
    // }

    axios
      .get(`${process.env.REACT_APP_API_URL}/latest_recommendation/${nickname}`)
      .then((res) => {
        const rows = res.data.latest_emotions || [];
        if (!rows.length) return;

        const raw = rows.map((r) => ({
          date: dayjs(r.create_date).format("YYYY-MM-DD"),
          우울: r.depression,
          불안: r.anxiety,
          스트레스: r.stress,
          행복: r.happiness,
          에너지: r.energy,
          성취감: r.achievement,
        }));

        const grouped = Object.values(
          raw.reduce((acc, cur) => {
            if (!acc[cur.date]) acc[cur.date] = { ...cur, count: 1 };
            else {
              acc[cur.date].우울 += cur.우울;
              acc[cur.date].불안 += cur.불안;
              acc[cur.date].스트레스 += cur.스트레스;
              acc[cur.date].행복 += cur.행복;
              acc[cur.date].에너지 += cur.에너지;
              acc[cur.date].성취감 += cur.성취감;
              acc[cur.date].count += 1;
            }
            return acc;
          }, {})
        ).map((d) => ({
          date: dayjs(d.date),
          우울: d.우울 / d.count,
          불안: d.불안 / d.count,
          스트레스: d.스트레스 / d.count,
          행복: d.행복 / d.count,
          에너지: d.에너지 / d.count,
          성취감: d.성취감 / d.count,
        }));

        const today = dayjs();
        const startOfThisWeek = today.startOf("isoWeek");
        const startOfLastWeek = startOfThisWeek.subtract(1, "week");
        const endOfLastWeek = startOfThisWeek.subtract(1, "day");

        const formattedRange = `${startOfLastWeek.format("YYYY.MM.DD")} ~ ${endOfLastWeek.format("YYYY.MM.DD")}`;
        setWeekRange(formattedRange);

        const filtered = grouped.filter(
          (d) =>
            d.date.isSameOrAfter(startOfLastWeek, "day") &&
            d.date.isSameOrBefore(endOfLastWeek, "day")
        );

        if (filtered.length >= 3) {
          const last3 = filtered.sort((a, b) => a.date - b.date).slice(-3);
          const result = last3.map((f) => ({
            date: f.date.format("MM/DD"),
            우울: f.우울,
            불안: f.불안,
            스트레스: f.스트레스,
            행복: f.행복,
            에너지: f.에너지,
            성취감: f.성취감,
          }));

          setQualified(true);
          setRecent3(result);
          localStorage.setItem(
            `graphData_${nickname}`,
            JSON.stringify({ qualified: true, recent3: result })
          );
        }
      })
      .catch(() => {});
  }, [nickname]);

  if (!qualified)
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#777", minHeight: "100vh" }}>
        <p>지난주 3일 이상 마음 진단을 완료했을 때 리포트가 표시됩니다.</p>
      </div>
    );

  const positiveKeys = ["행복", "에너지", "성취감"];
  const negativeKeys = ["우울", "불안", "스트레스"];

  const makeBars = (keys, colors) =>
    keys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i]} />);

  const renderDateLines = (data) =>
    data.slice(0, -1).map((entry, idx) => (
      <ReferenceLine
        key={idx}
        x={entry.date}
        stroke="#e0e0e0"
        strokeWidth={1}
        strokeDasharray="2 2"
      />
    ));

  const CustomSeparatorLines = ({ xAxisMap, offset, data }) => {
    if (!xAxisMap || !data?.length) return null;
    const xAxis = Object.values(xAxisMap)[0];
    const ticks = xAxis?.ticks || [];
    if (ticks.length < 2) return null;

    const positions = ticks.slice(0, -1).map((tick, i) => {
      const nextTick = ticks[i + 1];
      return (tick.coordinate + nextTick.coordinate) / 2;
    });

    return (
      <g className="custom-separators">
        {positions.map((x, i) => (
          <line
            key={i}
            x1={x}
            x2={x}
            y1={offset.top}
            y2={offset.top + offset.height}
            stroke="#bfbfbf"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ))}
      </g>
    );
  };

  return (
  <>
    <div
      style={{
        backgroundColor: "#fefefe",
        borderRadius: "16px",
        padding: "40px 60px 40px 60px",
        margin: "40px auto",
        width: "90%",
        maxWidth: "1100px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
    <div style={{ textAlign: "center"}}>
      <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#444", marginBottom: "6px" }}>
        지난주 리포트
      </h2>
      <div style={{ fontSize: "15px", color: "#777" }}>{weekRange}</div>
    </div>
    <div style={{ textAlign: "left", marginTop: "20px", marginBottom: "0" }}>
      <blockquote
        style={{
          display: "inline-block",
          borderLeft: "3px solid #2f8a5a",
          padding: "4px 0 4px 12px",
          marginTop: "8px",
          marginRight: 0,
          marginBottom: 0,
          marginLeft: "85px",
          background: "transparent",
          textAlign: "left",
        }}
      >
        <p style={{ fontSize: "16px", color: "#2f8a5a", fontWeight: 600, margin: 0 }}>
          주간 감정 변화
        </p>
        <p style={{ fontSize: "14px", color: "#555", margin: "4px 0 0 0" }}>
          가장 최근 3회 기록을 반영한 그래프입니다.
        </p>
      </blockquote>
    </div>
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: "24px 40px 10px 40px",
        gap: "60px",
      }}
    >
      <div style={{ width: "420px", textAlign: "center" }}>
        <p style={{ fontSize: "22px", fontWeight: 600, color: "#3FA966", marginBottom: "20px" }}>긍정적 감정</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={recent3} margin={{ right: 20 }}>
            {recent3.map((entry, idx) => (
              <ReferenceLine
                key={idx}
                x={entry.date}
                stroke="#bfbfbf"
                strokeWidth={1}
                strokeDasharray="4 3"
                ifOverflow="extendDomain"
                position="right"
              />
            ))}
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
              <RechartsTooltip formatter={(value) => value.toFixed(2)} />
              <RechartsLegend
                content={<CustomLegend order={["행복", "에너지", "성취감"]} />}
              />
              <Bar dataKey="행복" fill="#5FBF7F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="에너지" fill="#5FBFD4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="성취감" fill="#4C8DDC" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ width: "420px", textAlign: "center" }}>
        <p style={{ fontSize: "22px", fontWeight: 600, color: "#D14E42", marginBottom: "20px" }}>부정적 감정</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={recent3} margin={{ right: 20 }}>
            {recent3.map((entry, idx) => (
              <ReferenceLine
                key={idx}
                x={entry.date}
                stroke="#bfbfbf"
                strokeWidth={1}
                strokeDasharray="4 3"
                ifOverflow="extendDomain"
                position="right"
              />
            ))}
              <XAxis dataKey="date" />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
              <RechartsTooltip formatter={(value) => value.toFixed(2)} />
              <RechartsLegend
                content={<CustomLegend order={["우울", "불안", "스트레스"]} />}
              />
              <Bar dataKey="우울" fill="#E46A5F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="불안" fill="#E98B55" radius={[4, 4, 0, 0]} />
              <Bar dataKey="스트레스" fill="#F2B04D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div style={{ textAlign: "left", marginTop: "20px", marginBottom: "0" }}>
      <blockquote
        style={{
          display: "inline-block",
          borderLeft: "3px solid #2f8a5a",
          padding: "4px 0 4px 12px",
          marginTop: "8px",
          marginRight: 0,
          marginBottom: 0,
          marginLeft: "85px",
          background: "transparent",
          textAlign: "left",
        }}
      >
        <p style={{ fontSize: "16px", color: "#2f8a5a", fontWeight: 600, margin: 0 }}>
          주간 총평
        </p>
        <p style={{ fontSize: "14px", color: "#555", margin: "4px 0 0 0" }}>
          마음 진단 기록을 바탕으로 한 주의 감정 흐름을 분석했습니다.
        </p>
      </blockquote>
    </div>
    <WeeklyReview nickname={nickname} />
  </div>
  </>
  );
}

function WeeklyReview({ nickname }) {
  const [review, setReview] = useState("");

  useEffect(() => {
    if (!nickname) return;
    axios
      .post(`${process.env.REACT_APP_API_URL}/generate_weekly_review`, {
        nickname,
      })
      .then((res) => {
        if (res.data.review) setReview(res.data.review);
        else setReview(res.data.message || "주간 총평을 불러오지 못했습니다.");
      })
      .catch(() => setReview("총평 불러오기 중 오류가 발생했습니다."));
  }, [nickname]);

  return (
    <div className="sample2" style={{ marginTop: "40px", textAlign: "center" }}>
      <blockquote>
        <p style={{ fontSize: "18px", lineHeight: "1.8", textAlign: "left"}}>
          {review || "주간 총평을 생성 중입니다..."}
        </p>
      </blockquote>
    </div>
  );
}