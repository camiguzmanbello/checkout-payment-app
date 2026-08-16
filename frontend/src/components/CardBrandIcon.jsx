// Marcas dibujadas en SVG inline: sin peticiones de red, nítidas en cualquier
// densidad y con el tamaño exacto que necesita el campo. Cada una lleva el
// rasgo que la hace reconocible de un vistazo — el subrayado naranja de Visa,
// los dos círculos de MasterCard, el recuadro azul de Amex — porque a este
// tamaño el nombre solo no alcanza para distinguirlas.
const LOGOS = {
  visa: (
    <svg viewBox="0 0 56 22" role="img" aria-label="Visa">
      <text
        x="28"
        y="15.5"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="16"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing="0.6"
        fill="#1a1f71"
      >
        VISA
      </text>
      <path d="M10 19h36l-3 2.6H13Z" fill="#f7a600" />
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 56 22" role="img" aria-label="MasterCard">
      <circle cx="22" cy="11" r="9.4" fill="#eb001b" />
      <circle cx="34" cy="11" r="9.4" fill="#f79e1b" />
      <path
        d="M28 3.7a9.4 9.4 0 0 0 0 14.6 9.4 9.4 0 0 0 0-14.6Z"
        fill="#ff5f00"
      />
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 56 22" role="img" aria-label="American Express">
      <rect width="56" height="22" rx="3" fill="#016fd0" />
      <text
        x="28"
        y="12.2"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7.6"
        fontWeight="700"
        letterSpacing="0.6"
        fill="#ffffff"
      >
        AMERICAN
      </text>
      <text
        x="28"
        y="19.4"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7.6"
        fontWeight="700"
        letterSpacing="0.6"
        fill="#ffffff"
      >
        EXPRESS
      </text>
    </svg>
  ),
};

// Sin marca todavía: contorno de tarjeta en gris, para que el espacio no salte
// cuando aparezca el logo real.
const PLACEHOLDER = (
  <svg viewBox="0 0 56 22" role="img" aria-label="Tarjeta">
    <rect
      x="0.8"
      y="0.8"
      width="54.4"
      height="20.4"
      rx="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <rect x="0.8" y="5.2" width="54.4" height="3.4" fill="currentColor" opacity="0.35" />
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
