// Se muestra cuando un refresh en el resumen se llevó la tarjeta. Antes era un
// recuadro dentro del formulario, fácil de pasar por alto justo cuando hay que
// explicar que no se cobró nada; como diálogo hay que reconocerlo para seguir.
export default function CardReentryDialog({ onAccept }) {
  return (
    <div className="modal-overlay modal-overlay--stacked">
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="card-reentry-title"
        aria-describedby="card-reentry-detail"
      >
        <h2 className="dialog__title" id="card-reentry-title">
          Vuelve a ingresar tu tarjeta
        </h2>
        <p className="dialog__detail" id="card-reentry-detail">
          Por seguridad no guardamos los datos de tu tarjeta, así que se borraron al
          recargar la página. Tus datos de entrega siguen ahí y no se realizó ningún
          cobro.
        </p>
        {/* "Aceptar" y no "Continuar": el botón de enviar el formulario que
            queda detrás ya dice Continuar, y dos botones con el mismo nombre a
            la vez se leen igual de mal en pantalla que con un lector. */}
        <button type="button" className="btn-primary" onClick={onAccept} autoFocus>
          Aceptar
        </button>
      </div>
    </div>
  );
}
