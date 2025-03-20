import { createRoot } from "react-dom/client";
import { MainProviders } from "./providers";
import "./styles/global.scss";

createRoot(document.getElementById("root")!).render(<MainProviders />);
