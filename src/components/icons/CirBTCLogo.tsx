import React from "react";

const CirBTCLogo = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    width={size}
    height={size}
    className={className}
  >
    <defs>
      <linearGradient id="cirbtcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#60A5FA" />
      </linearGradient>
    </defs>
    {/* Background circle with gradient */}
    <circle cx="50" cy="50" r="50" fill="url(#cirbtcGrad)" />
    {/* Broken ring - top left arc */}
    <path
      d="M 50 15 A 35 35 0 0 0 15 50"
      fill="none"
      stroke="white"
      strokeWidth="7"
      strokeLinecap="round"
    />
    {/* Broken ring - top right arc */}
    <path
      d="M 85 50 A 35 35 0 0 0 50 15"
      fill="none"
      stroke="white"
      strokeWidth="7"
      strokeLinecap="round"
    />
    {/* Broken ring - bottom left */}
    <path
      d="M 15 50 A 35 35 0 0 0 50 85"
      fill="none"
      stroke="white"
      strokeWidth="7"
      strokeLinecap="round"
    />
    {/* Broken ring - bottom right */}
    <path
      d="M 50 85 A 35 35 0 0 0 85 50"
      fill="none"
      stroke="white"
      strokeWidth="7"
      strokeLinecap="round"
    />
    {/* Bitcoin B symbol */}
    <text
      x="52"
      y="67"
      textAnchor="middle"
      fontSize="42"
      fontWeight="bold"
      fontFamily="Arial, sans-serif"
      fill="white"
    >
      ₿
    </text>
  </svg>
);

export default CirBTCLogo;
