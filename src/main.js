import React from "react";
import ReactDOM from "react-dom/client";
import { initRem } from "@/utils/rem";
import App from "./app";
import "./global.less";

initRem();

const root = ReactDOM.createRoot(document.getElementById("root"));
// TODO 暂时仅用严格模式
// root.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );
root.render(<App />);
