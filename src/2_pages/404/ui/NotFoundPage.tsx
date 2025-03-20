import { useNavigate } from "react-router-dom";
import styles from "./NotFoundPage.module.scss";

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.wrapper}>
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <button onClick={() => navigate(-1)}>Go Back</button>
    </div>
  );
}
