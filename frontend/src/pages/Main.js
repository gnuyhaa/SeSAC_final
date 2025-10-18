import { TbPencilMinus } from "react-icons/tb";
import { useNavigate } from "react-router-dom";

function Main({ user }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (user) {
      navigate("/emotion");
    } else {
      navigate("/login");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          backgroundColor: "#ebfff0ff",
          color: "white",
          width: "100%",
          minHeight: "350px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <h2 className="fw-bold gradient-text">
          현대인을 위한 녹지 처방전
        </h2>
        <p className="text-muted mt-3">
          당신의 마음상태에 맞는 서울시 녹지를 추천받고,<br />
          자연과의 교감을 통해 마음의 평화를 되찾아보세요.
        </p>

        <button
          onClick={handleClick}
          className="btn btn-success btn-lg mt-4 d-inline-flex align-items-center justify-content-center"
        >
          <TbPencilMinus size={25} className="me-2" color="#ffffff" />
          <span style={{ fontSize: "18px", color: "white" }}>마음상태 진단</span>
        </button>
      </div>
      <footer
        className="container-fluid text-end"
        style={{
          color: "#888",
          fontSize: "15px",
          padding: "10px 40px",
          marginTop: "250px"
        }}
      >
        © 2025 그닥(Growth Doctor)
      </footer>
    </div>
  );
}

export default Main;