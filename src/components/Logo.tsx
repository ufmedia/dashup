'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.logo_url) {
          setLogoUrl(data.logo_url);
        }
      })
      .catch(() => {});
  }, []);

  if (!logoUrl) {
    return (
      <h1 className={`text-2xl font-light text-gray-800 tracking-wide ${className}`}>
        DashUp
      </h1>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt="Logo"
      width={150}
      height={50}
      className={`h-12 w-auto object-contain ${className}`}
      unoptimized
    />
  );
}
