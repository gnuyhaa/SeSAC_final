import React, { useEffect, useState } from "react";
import axios from "axios";
import { Map, CustomOverlayMap, ZoomControl, MapMarker, Circle } from "react-kakao-maps-sdk";

export default function KakaoMap() {
  const [parks, setParks] = useState([]);
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 }); // 초기값: 서울시청
  const [selectedPark, setSelectedPark] = useState(null);
  const [parkEmotions, setParkEmotions] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [weather, setWeather] = useState(null);
  const [hoveredPark, setHoveredPark] = useState(null);

  const nickname =
    localStorage.getItem("nickname") ||
    new URLSearchParams(window.location.search).get("nickname");

  const getAirColor = (label) => {
    switch (label) {
      case "좋음":
        return "#2D9FF8";
      case "보통":
        return "#0CBF58";
      case "나쁨":
        return "#FF8F00";
      case "매우나쁨":
        return "#D32F2F";
      default:
        return "#494949";
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCenter(coords);
          setMyPosition(coords);
        },
        (err) => {
          console.error("위치 권한 거부 또는 에러:", err);
        }
      );
    }

    const fetchData = async () => {
      try {
        const [allRes, recRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/parks`),
          nickname
            ? axios.get(
                `${process.env.REACT_APP_API_URL}/latest_recommendation/${nickname}`
              )
            : Promise.resolve({ data: { recommended_parks: [] } }),
        ]);

        const allParks = allRes.data;

        const parksData = recRes.data?.recommended_parks || [];
        const latestNames = Array.isArray(parksData[0])
          ? parksData[parksData.length - 1]
          : Array.isArray(parksData)
          ? parksData
          : [];

        const validNames = latestNames.filter(Boolean);

        const filtered =
          validNames.length > 0
            ? allParks
                .filter((p) => validNames.includes(p.name))
                .sort(
                  (a, b) => validNames.indexOf(a.name) - validNames.indexOf(b.name)
                )
            : allParks;

        setParks(filtered);
      } catch (err) {
        console.error("parks/latest_recommendation API error:", err);
      }
    };

    fetchData();

    axios
      .get(`${process.env.REACT_APP_API_URL}/park_emotion`)
      .then((res) => setParkEmotions(res.data))
      .catch((err) => console.error("emotions API error:", err));
  }, []);

  const handleSelect = (park) => {
    setCenter({ lat: park.lat, lng: park.lon });
    setSelectedPark(park);

    axios
      .get(`${process.env.REACT_APP_API_URL}/park_weather/${park.name}`)
      .then((res) => setWeather(res.data))
      .catch((err) => console.error("weather API error:", err));
  };

  return (
    <div className="map-page" style={{ display: "flex" }}>
      <div
        className="map-sidebar"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          borderRight: "1px solid #ddd",
          width: "375px",
        }}
      >
        <div
          style={{
            padding: "16px",
            fontSize: "25px",
            fontWeight: "bold",
            marginTop: "-25px",
          }}
        >
          {selectedPark ? "공원 상세보기" : "녹지 리스트"}
          <div
            style={{
              fontSize: "14px",
              color: "#555",
              marginTop: "4px",
              textAlign: "right",
            }}
          >
            {new Date()
              .toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
              .replace(/\./g, "-")
              .replace(/ /g, "")
              .slice(0, -1)}
          </div>
        </div>
        <hr style={{ margin: 0 }} />

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {selectedPark ? (
            <div>
              {weather && (
                <div style={{ marginBottom: "25px" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      background: "white",
                      border: "1px solid #ddd",
                      borderRadius: "12px",
                      padding: "8px 12px",
                      width: "100%",
                      boxSizing: "border-box",
                      margin: "0 -1px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <img
                        src={`https://openweathermap.org/img/wn/${weather.weather.icon}@2x.png`}
                        alt="날씨 아이콘"
                        style={{
                          width: "70px",
                          height: "70px",
                          marginRight: "5px",
                        }}
                      />
                      <div
                        style={{
                          width: "70px",
                          marginRight: "15px",
                          textAlign: "center",
                        }}
                      >
                        <div style={{ fontWeight: "bold", fontSize: "30px" }}>
                          {weather.weather.temp}°
                        </div>
                      </div>
                      <div style={{ textAlign: "left", flex: 1 }}>
                        <div style={{ fontSize: "13px", color: "#494949ff" }}>
                          <b>습도</b>{" "}
                          <b style={{ color: "black" }}>
                            {weather.weather.humidity}%
                          </b>
                        </div>
                        <div style={{ fontSize: "13px", color: "#494949ff" }}>
                          <b>미세먼지</b>{" "}
                          <b style={{ color: getAirColor(weather.air.pm10_label) }}>
                            {weather.air.pm10_label}
                          </b>
                        </div>
                        <div style={{ fontSize: "13px", color: "#494949ff" }}>
                          <b>초미세먼지</b>{" "}
                          <b style={{ color: getAirColor(weather.air.pm2_5_label) }}>
                            {weather.air.pm2_5_label}
                          </b>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <h3 style={{ margin: 0, marginTop: "10px" }}>{selectedPark.name}</h3>
                <span style={{ color: "#666", fontSize: "14px" }}>{selectedPark.type}</span>
              </div>

              <p style={{ margin: "8px 0 4px 0" }}>{selectedPark.address}</p>

              {selectedPark.tel && (
                <p style={{ margin: "0 0 8px 0", color: "#555" }}>{selectedPark.tel}</p>
              )}

              {selectedPark.des && selectedPark.des.trim() !== "" && (
                <p style={{ margin: "0 0 12px 0", color: "#444", fontSize: "14px" }}>
                  {selectedPark.des}
                </p>
              )}

              <button
                onClick={() => {
                  setSelectedPark(null);
                  setWeather(null);
                }}
                style={{
                  marginTop: "20px",
                  padding: "8px 16px",
                  border: "1px solid #2ecc71",
                  borderRadius: "20px",
                  background: "#2ecc71",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                돌아가기
              </button>
            </div>
          ) : (
            <div>
              <p style={{ textAlign: "right", marginBottom: "8px" }}>
                Total: {parks.length}
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {parks.map((park) => {
                  const emotion = parkEmotions.find((e) => e.name === park.name);

                  return (
                    <li
                      key={park.name}
                      onClick={() => handleSelect(park)}
                      style={{
                        cursor: "pointer",
                        padding: "12px",
                        borderRadius: "8px",
                        background: "#fbfffc",
                        width: "100%",
                        boxSizing: "border-box",
                        marginLeft: "-10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <h5 style={{ margin: 0 }}>{park.name}</h5>
                        <span style={{ fontSize: "0.9em", color: "#555" }}>
                          {park.type}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 2px 0", color: "#555" }}>
                        {park.address}
                      </p>

                      {emotion && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "3px",
                            marginTop: "6px",
                          }}
                        >
                          {[emotion.keyword1, emotion.keyword2, emotion.keyword3].map(
                            (keyword, i) => (
                              <span
                                key={i}
                                style={{
                                  border: "1px solid #2ecc71",
                                  borderRadius: "20px",
                                  padding: "4px 10px",
                                  fontSize: "0.8em",
                                  color: "#2ecc71",
                                  backgroundColor: "rgba(255,255,255,0.3)",
                                }}
                              >
                                {keyword}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="map-container" style={{ flex: 1 }}>
        <Map
          center={center}
          style={{ width: "100%", height: "100%" }}
          level={7}
          scrollwheel={true}
          disableDoubleClick={true}
        >
          {myPosition && (
            <>
              <MapMarker
                position={myPosition}
                image={{
                  src: "/images/my_location.svg",
                  size: { width: 30, height: 30 },
                }}
                zIndex={100}
              />
              <Circle
                center={{ lat: myPosition.lat, lng: myPosition.lng }}
                radius={5000}
                strokeWeight={1}
                strokeColor={"#4285F4"}
                strokeOpacity={0.5}
                fillColor={"#4285F4"}
                fillOpacity={0.1}
              />
            </>
          )}

          {parks
            .filter((p) => p.lat && p.lon)
            .map((park, idx) => {
              const isSelected = selectedPark && selectedPark.name === park.name;
              const isHovered = hoveredPark && hoveredPark.name === park.name;

              return (
                <CustomOverlayMap
                  key={idx}
                  position={{ lat: park.lat, lng: park.lon }}
                  yAnchor={1}
                  zIndex={isSelected || isHovered ? 200 : 1}
                >
                  <div
                    onClick={() => handleSelect(park)}
                    onMouseEnter={() => setHoveredPark(park)}
                    onMouseLeave={() => setHoveredPark(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      background: "white",
                      border: "1px solid #2ecc71",
                      borderRadius: "30px",
                      padding: "3px 12px",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <img
                      src={
                        isSelected
                          ? "/images/map_pin_orange.svg"
                          : "/images/map_pin_green.svg"
                      }
                      alt="marker"
                      style={{ width: "20px", height: "28px", marginRight: "8px" }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                        {park.name}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          marginTop: "-3px",
                        }}
                      >
                        {park.type}
                      </div>
                    </div>
                  </div>
                </CustomOverlayMap>
              );
            })}
          <ZoomControl position={"BOTTOMRIGHT"} />
        </Map>
      </div>
    </div>
  );
}
