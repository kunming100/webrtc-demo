import React from "react";
import ReactDOM from "react-dom/client";
import { initRem } from '@/utils/rem';
import App from "./app";
import './global.less';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
