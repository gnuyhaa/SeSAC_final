import React, { useEffect, useState } from "react";
import axios from "axios";
import { Map, CustomOverlayMap, ZoomControl, MapMarker } from "react-kakao-maps-sdk"; 
import { FiSliders } from "react-icons/fi"; 
import campsite from "../assets/campsite.png"
import court from "../assets/court.png";
import fountain from "../assets/fountain.png";
import garden from "../assets/garden.png";
import gazebo from "../assets/gazebo.png";
import gym from "../assets/gym.png";
import parking from "../assets/parking.png";
import playground from "../assets/playground.png";
import pond from "../assets/pond.png";
import square from "../assets/square2.png";
import store from "../assets/store.png";
import theater from "../assets/theater.png";
import toilet from "../assets/toilet.png";
import trail from "../assets/trail.png";
import zoo from "../assets/zoo2.png";

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
  async function init() {
    async function getUserLocation() {
      const gpsOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      };

      const getGPS = () =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({ method: "GPS", coords: pos.coords });
            },
            () => {
              reject();
            },
            gpsOptions
          );
        });

      const getIP = async () => {
        try {
          const res = await fetch("https://ipapi.co/json/");
          const data = await res.json();
          return {
            method: "IP",
            coords: { latitude: data.latitude, longitude: data.longitude },
          };
        } catch {
          return null;
        }
      };

      try {
        const gps = await getGPS();
        return gps;
      } catch {
          const ip = await getIP();
          return ip || null;
        }
      }

    const loc = await getUserLocation();
    if (loc) {
      const coords = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      setCenter(coords);
      setMyPosition(coords);
    } else {
      setCenter({ lat: 37.5665, lng: 126.9780 });
      setMyPosition(null);
    }

    axios
      .get(`${process.env.REACT_APP_API_URL}/parks`)
      .then((res) => {
        setParks(res.data);
        const uniqueDistricts = [
          ...new Set(res.data.map((p) => p.address.split(" ")[1])),
        ];
        uniqueDistricts.sort((a, b) =>
          a.localeCompare(b, "ko", { sensitivity: "base" })
        );
        setDistricts(uniqueDistricts);
      })
      .catch(() => {});

    axios
      .get(`${process.env.REACT_APP_API_URL}/park_emotion`)
      .then((res) => setParkEmotions(res.data))
      .catch(() => {});
  }

  init();
}, []);

const handleSelect = (park) => {
  setCenter({ lat: park.lat, lng: park.lon });
  setSelectedPark(park);

  axios
    .get(`${process.env.REACT_APP_API_URL}/parks/${park.id}`)
    .then((res) => {
      setWeather({
        weather: res.data.weather,
        air: res.data.air,
        facilities: res.data.facilities || [],
      });
    })
    .catch(() => {});
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
              {selectedPark.des && selectedPark.des.trim() !== "" && (
                <p style={{ margin: "0 0 12px 0", color: "#444" }}>{selectedPark.des}</p>
              )}
              {weather?.facilities && weather.facilities.length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  <h4 style={{ fontSize: "16px", marginBottom: "8px" }}>공원 시설물</h4>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    {weather.facilities.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "70px",
                          height: "70px",
                          border: "1px solid #ddd",
                          borderRadius: "12px",
                          background: "#f9f9f9",
                        }}
                      >
                        <div style={{ fontSize: "24px" }}>
                          {(() => {
                            switch (item) {
                              case "광장":
                                return <img src={square} alt="광장" style={{ width: "1.7em", verticalAlign: "middle" }} />;
                              case "산책로":
                                return <img src={trail} alt="산책로" style={{ width: "1.3em", verticalAlign: "middle" }} />;
                              case "연못":
                                return <img src={pond} alt="연못" style={{ width: "1.5em", verticalAlign: "middle" }} />;
                              case "분수":
                                return <img src={fountain} alt="분수" style={{ width: "1.5em", verticalAlign: "middle" }} />;
                              case "야영장":
                                return <img src={campsite} alt="야영장" style={{ width: "1.5em", verticalAlign: "middle" }} />;
                              case "운동장":
                                return <img src={court} alt="운동장" style={{ width: "1.4em", verticalAlign: "middle" }} />;
                              case "놀이터":
                                return <img src={playground} alt="놀이터" style={{ width: "1.5em", verticalAlign: "middle" }} />;
                              case "운동기구":
                                return <img src={gym} alt="운동기구" style={{ width: "1.4em", verticalAlign: "middle" }} />;
                              case "정자":
                                return <img src={gazebo} alt="정자" style={{ width: "1.5em", verticalAlign: "middle" }} />;
                              case "문화시설":
                                return <img src={theater} alt="문화시설" style={{ width: "1.4em", verticalAlign: "middle" }} />;
                              case "식물원":
                                return <img src={garden} alt="식물원" style={{ width: "1.4em", verticalAlign: "middle" }} />;
                              case "주차장":
                                return <img src={parking} alt="주차장" style={{ width: "2.4em", verticalAlign: "middle" }} />;
                              case "화장실":
                                return <img src={toilet} alt="화장실" style={{ width: "1.3em", verticalAlign: "middle" }} />;
                              case "편의시설":
                                return <img src={store} alt="편의시설" style={{ width: "1.4em", verticalAlign: "middle" }} />;
                              case "동물원":
                                return <img src={zoo} alt="동물원" style={{ width: "1.5em", verticalAlign: "middle" }} />;
                              default:
                                return "🏞️";
                            }
                          })()}
                        </div>
                        <div style={{ fontSize: "12px", marginTop: "4px" }}>{item}</div>
                      </div>
                    ))}
                  </div>
                </div>
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
                    const emotion = parkEmotions.find(
                      (e) =>
                        e.name === park.name &&
                        Math.abs(e.lat - park.lat) < 0.0001 &&
                        Math.abs(e.lon - park.lon) < 0.0001
                    );
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
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", marginTop: "6px" }}>
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
