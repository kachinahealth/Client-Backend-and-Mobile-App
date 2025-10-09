import React, { useEffect, useState } from 'react';
import Head from 'next/head';

export default function ClientHome() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Redirect to login if no token
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/';
      return;
    }
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  // For now, redirect to the static HTML file
  // In a production app, this would be a React component
  useEffect(() => {
    if (isClient) {
      window.location.href = '/clienthome.html';
    }
  }, [isClient]);

  return (
    <div>
      <Head>
        <title>KachinaHealth - Client Dashboard</title>
      </Head>
      <div>Redirecting to dashboard...</div>
    </div>
  );
}
