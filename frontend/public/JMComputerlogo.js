import React from 'react';

const JMCircleLogo = ({ width = 200, height = 200, ...props }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 200 200" 
      width={width} 
      height={height} 
      {...props}
    >
      {/* Fondo circular verde */}
      <circle 
        cx="100" 
        cy="100" 
        r="95" 
        fill="#2a4620"
      />
      
      {/* Letra J */}
      <path 
        d="M 60 70 L 90 70 L 90 120 C 90 135 80 145 65 145 C 50 145 40 135 40 120 L 40 105 L 60 105 L 60 120 C 60 123 62 125 65 125 C 68 125 70 123 70 120 L 70 70 Z" 
        fill="white"
      />
      
      {/* Letra M */}
      <path 
        d="M 110 70 L 130 70 L 130 140 L 160 90 L 160 140 L 180 140 L 180 70 L 160 70 L 130 120 L 110 70 Z" 
        fill="white"
      />
    </svg>
  );
};

export default JMCircleLogo;