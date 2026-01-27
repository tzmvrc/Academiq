interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return <h1 className={`font-black text-3xl ${className}`}>Academiq</h1>;
}
