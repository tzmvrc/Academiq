// src/components/three/FloatingObject.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Mesh } from 'three';

const FloatingObject: React.FC = () => {
  const mesh = useRef<Mesh>(null!);
  useFrame((state) => {
    mesh.current.rotation.y = state.clock.getElapsedTime() * 0.2;
  });
  return (
    <group>
      <mesh ref={mesh}>
        <torusGeometry args={[1, 0.05, 8, 64]} />
        <meshBasicMaterial color="#d1d5db" />
      </mesh>
      <Line points={[[-2, 0, 0], [2, 0, 0]]} color="#d1d5db" lineWidth={1} />
      <Line points={[[0, -2, 0], [0, 2, 0]]} color="#d1d5db" lineWidth={1} />
    </group>
  );
};

export default FloatingObject;