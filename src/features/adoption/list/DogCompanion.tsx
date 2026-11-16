/**
 * DogCompanion Component
 * Single bespoke rescue dog companion for the new Listing & Submission screens.
 * Wags tail joyfully upon successful submission while respecting prefers-reduced-motion.
 */

import React from 'react';

interface DogCompanionProps {
  celebrating?: boolean;
  caption?: string;
}

export const DogCompanion: React.FC<DogCompanionProps> = ({
  celebrating = false,
  caption,
}) => {
  return (
    <div
      className="inline-flex flex-col items-center gap-2 select-none"
      aria-label={celebrating ? 'Happy dog companion wagging its tail' : 'Pawfect rescue dog companion'}
    >
      <style>{`
        @keyframes pfDogTailWag {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(28deg); }
        }
        @keyframes pfDogEarPerk {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .pf-dog-tail {
          transform-box: fill-box;
          transform-origin: 12% 82%;
          transition: transform 200ms ease-out;
        }
        .pf-dog-tail-wagging {
          animation: pfDogTailWag 340ms ease-in-out infinite;
        }
        .pf-dog-ears-happy {
          animation: pfDogEarPerk 900ms ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pf-dog-tail-wagging,
          .pf-dog-ears-happy {
            animation: none !important;
          }
        }
      `}</style>

      <svg
        width="124"
        height="104"
        viewBox="0 0 124 104"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        {/* Ground Shadow */}
        <ellipse cx="62" cy="96" rx="38" ry="5" fill="#090708" opacity="0.65" />

        {/* Wagging Tail */}
        <g className={`pf-dog-tail ${celebrating ? 'pf-dog-tail-wagging' : ''}`}>
          <path
            d="M84 74 C98 66, 108 52, 105 40 C104 36, 98 37, 97 42 C96 52, 90 61, 80 68 Z"
            fill="#D49A6A"
          />
        </g>

        {/* Body */}
        <path
          d="M42 64 C42 54, 82 54, 84 68 L84 86 C84 91, 78 94, 72 94 L48 94 C42 94, 38 89, 38 82 Z"
          fill="#E5B181"
        />
        {/* Chest Patch */}
        <path
          d="M44 62 C50 62, 56 70, 56 82 L44 86 C40 80, 40 68, 44 62 Z"
          fill="#F5DFC8"
        />

        {/* Collar (Pawfect Burgundy + Gold Tag) */}
        <path
          d="M41 55 Q56 62 68 55"
          stroke="#A82C50"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="53" cy="61" r="3.5" fill="#E2B75B" />

        {/* Back & Front Paws */}
        <rect x="44" y="84" width="10" height="11" rx="5" fill="#F5DFC8" />
        <rect x="68" y="84" width="10" height="11" rx="5" fill="#F5DFC8" />

        {/* Head */}
        <circle cx="51" cy="40" r="19" fill="#E5B181" />

        {/* Ears */}
        <g className={celebrating ? 'pf-dog-ears-happy' : ''}>
          <path d="M35 28 C27 32, 26 48, 33 50 C37 51, 39 40, 38 30 Z" fill="#B67848" />
          <path d="M67 28 C75 32, 76 48, 69 50 C65 51, 63 40, 64 30 Z" fill="#B67848" />
        </g>

        {/* Snout */}
        <ellipse cx="51" cy="46" rx="10" ry="7.5" fill="#F5DFC8" />
        {/* Nose */}
        <ellipse cx="51" cy="43" rx="4.2" ry="3" fill="#231A1D" />

        {/* Eyes */}
        {celebrating ? (
          <>
            <path d="M41 37 Q44 33 47 37" stroke="#231A1D" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M55 37 Q58 33 61 37" stroke="#231A1D" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="44" cy="36" r="2.6" fill="#231A1D" />
            <circle cx="58" cy="36" r="2.6" fill="#231A1D" />
            <circle cx="43.2" cy="35.1" r="0.9" fill="#FFFFFF" />
            <circle cx="57.2" cy="35.1" r="0.9" fill="#FFFFFF" />
          </>
        )}

        {/* Smile / Tongue on celebrate */}
        <path
          d="M46 49 Q51 53 56 49"
          stroke="#231A1D"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        {celebrating && (
          <path
            d="M49 51 C49 56, 53 56, 53 51 Z"
            fill="#E26D8A"
          />
        )}
      </svg>

      {caption && (
        <span className="text-xs font-medium text-[#CBBBC2] tracking-wide text-center">
          {caption}
        </span>
      )}
    </div>
  );
};
