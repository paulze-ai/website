import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    window.location.replace('./paulze');
  }, []);

  return (
    <p>Redirecting to <a href="./paulze">Paulze</a>…</p>
  );
}
