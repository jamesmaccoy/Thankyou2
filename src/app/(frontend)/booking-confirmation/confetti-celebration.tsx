"use client"

import { useEffect } from "react"
import confetti from "canvas-confetti"

// Confetti celebration component for booking confirmation
export function ConfettiCelebration() {
  useEffect(() => {
    // Create a spectacular confetti celebration
    const celebrateBooking = () => {
      const duration = 3000; // 3 seconds
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      // First burst - from center
      confetti({
        ...defaults,
        particleCount: 50,
        origin: { x: 0.5, y: 0.5 }
      });

      // Multiple bursts from different positions
      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Left side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        
        // Right side
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });

        // Center burst
        confetti({
          ...defaults,
          particleCount: particleCount * 2,
          origin: { x: 0.5, y: 0.3 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4'],
          shapes: ['star', 'circle']
        });
      }, 250);

      // Final big burst after 1 second
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 160,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4', '#9370DB'],
          shapes: ['star', 'circle'],
          scalar: 1.2
        });
      }, 1000);
    };

    // Trigger celebration on mount
    celebrateBooking();
  }, []);

  // This component doesn't render anything visible
  return null;
} 