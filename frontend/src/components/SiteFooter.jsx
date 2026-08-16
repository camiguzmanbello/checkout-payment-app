const REPO_URL = 'https://github.com/camiguzmanbello/checkout-payment-app';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__intro">
        <p className="eyebrow">Sobre esta app</p>
        <h2>Compra en pocos pasos y paga con tarjeta</h2>
        <p className="site-footer__lead">
          Eliges tu producto, ingresas tus datos y confirmas el pago. Nada más.
        </p>
      </div>

      <div className="site-footer__side">
        <p className="site-footer__author">
          Desarrollado por <strong>María Camila Guzmán Bello</strong>
        </p>
        <a
          className="site-footer__link"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
        >
          Ver el código en GitHub
          <span aria-hidden="true">↗</span>
        </a>
        <p className="site-footer__meta">2026</p>
      </div>
    </footer>
  );
}
