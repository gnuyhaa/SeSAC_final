import React, { useEffect, useState } from "react";
import axios from "axios";
import { Map, CustomOverlayMap, ZoomControl, MapMarker, Circle } from "react-kakao-maps-sdk"; 
import { FiSliders } from "react-icons/fi"; 

export default function GreenListMap() {
  const [parks, setParks] = useState([]);
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.9780 });
  const [selectedPark, setSelectedPark] = useState(null);
  const [parkEmotions, setParkEmotions] = useState([]);
  const [myPosition, setMyPosition] = useState(null);
  const [weather, setWeather] = useState(null);
  const [hoveredPark, setHoveredPark] = useState(null);
  
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

  // 구 필터
  const [selectedDistrict, setSelectedDistrict] = useState("전체");
  const [districts, setDistricts] = useState([]);
  const [openFilter, setOpenFilter] = useState(false);

  // 거리순 정렬
  const [sortByDistance, setSortByDistance] = useState(false);

  // 거리 계산 함수
  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

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

    axios.get(`${process.env.REACT_APP_API_URL}/parks`)
      .then((res) => {
        console.log("parks API response:", res.data);
        setParks(res.data);
        const uniqueDistricts = [...new Set(res.data.map((p) => p.address.split(" ")[1]))];
        uniqueDistricts.sort((a, b) => a.localeCompare(b, "ko", { sensitivity: "base" }));
        setDistricts(uniqueDistricts);
      })
      .catch((err) => console.error("parks API error:", err));

    axios.get(`${process.env.REACT_APP_API_URL}/park_emotion`)
      .then((res) => setParkEmotions(res.data))
      .catch((err) => console.error("emotions API error:", err));
  }, []);

  const handleSelect = (park) => {
    setCenter({ lat: park.lat, lng: park.lon });
    setSelectedPark(park);

    axios.get(`${process.env.REACT_APP_API_URL}/park_weather/${encodeURIComponent(park.name)}?lat=${park.lat}&lon=${park.lon}`)
      .then((res) => setWeather(res.data))
      .catch((err) => console.error("weather API error:", err));
  };

  useEffect(() => {
    const handleReset = () => {
      setSelectedPark(null);
      setWeather(null);
      setSelectedDistrict("전체");
      setSortByDistance(false);
      setOpenFilter(false); 
    };
    window.addEventListener("resetGreenList", handleReset);
    return () => window.removeEventListener("resetGreenList", handleReset);
  }, []);

  const filteredForMap =
    selectedDistrict === "전체"
      ? parks
      : parks.filter((p) => p.address.includes(selectedDistrict));

  let filteredForList = [...filteredForMap];
  if (sortByDistance && myPosition) {
    filteredForList.sort(
      (a, b) =>
        getDistance(myPosition.lat, myPosition.lng, a.lat, a.lon) -
        getDistance(myPosition.lat, myPosition.lng, b.lat, b.lon)
    );
  } else {
  filteredForList.sort((a, b) => a.name.localeCompare(b.name, "ko", { sensitivity: "base" }));
}

  return (
    <div className="map-page" style={{ display: "flex" }}>
      <div
        className="map-sidebar"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          borderRight: "1px solid #ddd",
          width: "390px",
        }}
      >
        <div style={{ padding: "16px", fontSize: "25px", fontWeight: "bold", marginTop: "-25px" }}>
          {selectedPark ? "녹지 상세보기" : "녹지 리스트"}
        </div>
        {/* <hr style={{ margin: 0 }} /> */}

        {!selectedPark && (
          <div style={{ padding: "12px 16px", textAlign: "right" }}>
            <button
              onClick={() => setOpenFilter(!openFilter)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                background: "white",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              <FiSliders /> 자치구 ({selectedDistrict})
            </button>

            {openFilter && (
              <div
                style={{
                  marginTop: "10px",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <button
                  onClick={() => {
                    setSelectedDistrict("전체");
                    setOpenFilter(false);
                  }}
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    border: selectedDistrict === "전체" ? "2px solid #2ecc71" : "1px solid #ccc",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  전체
                </button>
                {districts.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setSelectedDistrict(d);
                      setOpenFilter(false);
                      const parksInDistrict = parks.filter((p) => p.address.includes(d));
                      if (parksInDistrict.length > 0) {
                        const avgLat =
                          parksInDistrict.reduce((sum, p) => sum + p.lat, 0) /
                          parksInDistrict.length;
                        const avgLon =
                          parksInDistrict.reduce((sum, p) => sum + p.lon, 0) /
                          parksInDistrict.length;
                        setCenter({ lat: avgLat, lng: avgLon });
                       }
                    }}
                    style={{
                      padding: "6px",
                      borderRadius: "6px",
                      border: selectedDistrict === d ? "2px solid #2ecc71" : "1px solid #ccc",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 4px"}}>
          {selectedPark ? (
            <div>
              {weather && (
                <div
                  style={{
                    marginBottom: "25px",
                  }}
                >
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
                        style={{ width: "70px", height: "70px", marginRight: "5px" }}
                      />

                      <div style={{ width: "70px", marginRight: "15px", textAlign: "center" }}>
                        <div style={{ fontWeight: "bold", fontSize: "30px" }}>
                          {weather.weather.temp}°
                        </div>
                      </div>

                      <div style={{ textAlign: "left", flex: 1 }}>
                        <div style={{ fontSize: "13px", color: "#494949ff" }}>
                          <b>습도</b>
                          <span style={{ color: "black" }}>
                            {" "}
                            <b>{weather.weather.humidity}%</b>
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#494949ff" }}>
                          <b>미세먼지</b>
                          <span style={{ color: getAirColor(weather.air.pm10_label) }}>
                            {" "}
                            <b>{weather.air.pm10_label}</b>
                          </span>
                        </div>
                        <div style={{ fontSize: "13px", color: "#494949ff" }}>
                          <b>초미세먼지</b>
                          <span style={{ color: getAirColor(weather.air.pm2_5_label) }}>
                            {" "}
                            <b>{weather.air.pm2_5_label}</b>
                          </span>
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
                <span style={{ color: "#666", fontSize: "14px" }}>
                  {selectedPark.type}
                </span>
              </div>
              <p style={{ margin: "8px 0 4px 0" }}>{selectedPark.address}</p>
              {selectedPark.tel && <p style={{ margin: "0 0 8px 0", color: "#555" }}>{selectedPark.tel}</p>}
              {selectedPark.des && <p style={{ margin: "0 0 12px 0", color: "#444"}}>{selectedPark.des}</p>}
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
            !openFilter && (
              <div>
                <p style={{ textAlign: "right", marginBottom: "8px" }}>Total: {filteredForList.length}</p>

                {myPosition && (
                  <div style={{ textAlign: "right", marginBottom: "12px" }}>
                    <button
                      title="내 위치 기준 가까운 녹지부터 정렬합니다."
                      onClick={() => setSortByDistance(!sortByDistance)}
                      style={{
                        padding: "4px 4px",
                        border: "1px solid #ddd", 
                        borderColor: sortByDistance ? "#2ecc71" : "#ddd",
                        borderRadius: "6px",
                        background: "#ffffffff",
                        cursor: "pointer",
                        fontSize: "12px",
                        minWidth: "70px",
                      }}
                    >
                      📍 거리순
                    </button>
                  </div>
                )}

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {filteredForList.map((park) => {
                    const emotion = parkEmotions.find((e) => e.name === park.name);
                    return (
                      <li
                        key={`${park.id || park.name}-${park.lat}-${park.lon}`}
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h5 style={{ margin: 0 }}>{park.name}</h5>
                          <span style={{ fontSize: "0.9em", color: "#555" }}>{park.type}</span>
                        </div>
                        <p style={{ margin: "4px 0 2px 0", color: "#555" }}>{park.address}</p>
                        {emotion && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "6px" }}>
                            {[emotion.keyword1, emotion.keyword2, emotion.keyword3]
                              .filter(Boolean)
                              .map((keyword) => (
                              <span
                                key={keyword}
                                style={{
                                  border: "1px solid #2ecc71",
                                  borderRadius: "20px",
                                  padding: "3px 8px",
                                  fontSize: "0.8em",
                                  color: "#2ecc71",
                                  backgroundColor: "rgba(255,255,255,0.3)",
                                }}
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          )}
        </div>
      </div>

      <div className="map-container" style={{ flex: 1 }}>
        <Map center={center} style={{ width: "100%", height: "100%" }} level={6} scrollwheel={true} disableDoubleClick={true}>
          {myPosition && (
            <>
              <MapMarker
                position={myPosition}
                image={{ src: "/images/my_location.svg", size: { width: 30, height: 30 } }}
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

          {filteredForMap
            .filter((p) => p.lat && p.lon)
            .map((park) => {
              const isSelected =
                selectedPark &&
                selectedPark.lat === park.lat &&
                selectedPark.lon === park.lon;

              const isHovered = hoveredPark && hoveredPark.name === park.name;

              return (
                <CustomOverlayMap
                  key={`${park.id || park.name}-${park.lat}-${park.lon}`}
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
                      src={isSelected ? "/images/map_pin_orange.svg" : "/images/map_pin_green.svg"}
                      alt="marker"
                      style={{ width: "20px", height: "28px", marginRight: "8px" }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#000" }}>{park.name}</div>
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "-3px" }}>{park.type}</div>
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
