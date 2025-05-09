import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// 後でAmplifyを使用するときのために設定部分はコメントアウトしておく
// import { Amplify } from "aws-amplify";
// import { Authenticator } from "@aws-amplify/ui-react";
// import "@aws-amplify/ui-react/styles.css";
// import amplifyConfig from "./lib/amplify";
// Amplify.configure(amplifyConfig);

createRoot(document.getElementById("root")!).render(
  // <Authenticator>
    <App />
  // </Authenticator>
);
