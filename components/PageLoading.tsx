import styles from "./PageLoading.module.css";

export default function PageLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.message}>{message}</p>
    </div>
  );
}