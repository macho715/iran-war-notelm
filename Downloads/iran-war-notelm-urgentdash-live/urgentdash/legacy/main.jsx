import "leaflet/dist/leaflet.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    // StrictMode를 쓰면 dev에서 useEffect 2번 실행될 수 있어요.
    // App 내부에서 guard(ref)로 방지해둠.
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
