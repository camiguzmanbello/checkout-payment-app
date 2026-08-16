// Marcas dibujadas en SVG inline: sin peticiones de red, nítidas en cualquier
// densidad y con el tamaño exacto que necesita el campo. Van dentro de una
// ficha con borde para que se lean como una tarjeta y no como un adorno suelto.
const LOGOS = {
  visa: (
    <svg viewBox="0 0 40 14" role="img" aria-label="Visa">
      <text
        x="20"
        y="11.5"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="12"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing="0.5"
        fill="#1a1f71"
      >
        VISA
      </text>
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 40 14" role="img" aria-label="MasterCard">
      <circle cx="16" cy="7" r="6.2" fill="#eb001b" />
      <circle cx="24" cy="7" r="6.2" fill="#f79e1b" />
      <path
        d="M20 2.2a6.2 6.2 0 0 0 0 9.6 6.2 6.2 0 0 0 0-9.6Z"
        fill="#ff5f00"
      />
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 40 14" role="img" aria-label="American Express">
      <rect width="40" height="14" rx="2.5" fill="#2e77bc" />
      <text
        x="20"
        y="10"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7"
        fontWeight="700"
        letterSpacing="0.4"
        fill="#ffffff"
      >
        AMEX
      </text>
    </svg>
  ),
};

// Sin marca todavía: contorno de tarjeta en gris, para que el espacio no salte
// cuando aparezca el logo real.
const PLACEHOLDER = (
  <svg viewBox="0 0 40 14" role="img" aria-label="Tarjeta">
    <rect
      x="0.6"
      y="0.6"
      width="38.8"
      height="12.8"
      rx="2.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect x="0.6" y="3.6" width="38.8" height="2.4" fill="currentColor" opacity="0.35" />
  </svg>
);

export default function CardBrandIcon({ brand }) {
  const known = Boolean(LOGOS[brand]);

  return (
    <span
      className={`card-brand${known ? ` card-brand--${brand}` : ' card-brand--empty'}`}
    >
      {LOGOS[brand] ?? PLACEHOLDER}
    </span>
  );
}
