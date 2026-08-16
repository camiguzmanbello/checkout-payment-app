// Marcas dibujadas en SVG inline: sin peticiones de red, nítidas en cualquier
// densidad de pantalla y con el tamaño exacto que necesita el input.
const ICONS = {
  visa: (
    <svg viewBox="0 0 48 16" role="img" aria-label="Visa">
      <text
        x="24"
        y="13"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="14"
        fontStyle="italic"
        fontWeight="700"
        letterSpacing="1"
        fill="#1a1f71"
      >
        VISA
      </text>
    </svg>
  ),
  mastercard: (
    <svg viewBox="0 0 48 16" role="img" aria-label="MasterCard">
      <circle cx="19" cy="8" r="7" fill="#eb001b" />
      <circle cx="29" cy="8" r="7" fill="#f79e1b" />
      <path
        d="M24 2.6a7 7 0 0 0 0 10.8 7 7 0 0 0 0-10.8Z"
        fill="#ff5f00"
      />
    </svg>
  ),
  amex: (
    <svg viewBox="0 0 48 16" role="img" aria-label="American Express">
      <rect width="48" height="16" rx="3" fill="#2e77bc" />
      <text
        x="24"
        y="11.5"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7.5"
        fontWeight="700"
        letterSpacing="0.5"
        fill="#ffffff"
      >
        AMEX
      </text>
    </svg>
  ),
};

export default function CardBrandIcon({ brand }) {
  const icon = ICONS[brand];
  if (!icon) return null;

  return <span className={`card-brand card-brand--${brand}`}>{icon}</span>;
}
