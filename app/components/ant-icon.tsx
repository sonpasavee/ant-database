export default function AntIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="24" cy="25" r="4.5" />
      <ellipse cx="10.5" cy="25" rx="6" ry="5" />
      <ellipse cx="37.5" cy="25" rx="6" ry="5" />
      <path d="M24 20.5V8M20 21 15 10M28 21l5-11M24 29.5V42M20 29l-5 10M28 29l5 10" />
    </svg>
  );
}
