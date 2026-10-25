import { Link } from "@tanstack/react-router";

import { legalOwner } from "./documents";

export function DataProcessingAgreement() {
  return (
    <>
      <p>
        Este acuerdo es un anexo de los <Link to="/legal/terminos">términos de servicio</Link> y
        hace las veces del contrato de transmisión de datos personales previsto en el artículo
        2.2.2.25.5.2 del Decreto 1074 de 2015. Lo acepta el Cliente, como responsable, al aceptar
        los términos, y lo cumple Cetus, como encargado.
      </p>

      <h2>1. Objeto</h2>
      <p>
        Cetus trata, por cuenta del Cliente, los datos personales que este incluye en sus documentos
        electrónicos y en sus catálogos de clientes, principalmente los de sus adquirientes: nombre,
        identificación, dirección, teléfono, correo electrónico y detalle de las operaciones.
      </p>

      <h2>2. Instrucciones y finalidad</h2>
      <p>
        Cetus trata esos datos solo para generar, firmar, transmitir a la DIAN, entregar por correo,
        conservar y poner a disposición del Cliente sus documentos, siguiendo las instrucciones que
        el Cliente da a través de la API y la consola. No los usa para fines propios, no los vende y
        no los comparte con terceros, salvo con la DIAN, con los destinatarios que indique el
        Cliente, con los subencargados de la sección 5 o por orden de autoridad competente.
      </p>

      <h2>3. Obligaciones del Cliente</h2>
      <ul>
        <li>
          Contar con la autorización de los titulares cuando la ley la exige, o con la causal legal
          que permita el tratamiento sin ella, e informarles sobre el tratamiento.
        </li>
        <li>Entregar a Cetus solo los datos necesarios y mantenerlos veraces y actualizados.</li>
        <li>Atender las consultas y reclamos de los titulares como responsable.</li>
      </ul>

      <h2>4. Obligaciones de Cetus</h2>
      <ul>
        <li>
          Guardar confidencialidad sobre los datos y exigirla a las personas que tengan acceso a
          ellos, incluso después de terminado el servicio.
        </li>
        <li>
          Aplicar las medidas de seguridad descritas en la{" "}
          <Link to="/legal/privacidad">política de tratamiento de datos</Link> y limitar el acceso
          de su equipo a lo necesario para operar y dar soporte.
        </li>
        <li>
          Apoyar al Cliente, dentro de lo razonable, para responder las solicitudes de los
          titulares, y remitirle sin demora las que reciba directamente.
        </li>
        <li>
          Informar al Cliente, sin demora injustificada y a más tardar dentro de las 72 horas
          siguientes a conocerlo, cualquier incidente de seguridad que afecte sus datos, con la
          información disponible para que el Cliente pueda reportarlo a la Superintendencia de
          Industria y Comercio y a los titulares.
        </li>
        <li>
          Entregar al Cliente, cuando lo solicite, la información necesaria para demostrar el
          cumplimiento de este acuerdo.
        </li>
      </ul>

      <h2>5. Subencargados</h2>
      <p>
        El Cliente autoriza a Cetus a apoyarse en los proveedores listados en la política de
        tratamiento de datos, con obligaciones de protección equivalentes a las de este acuerdo.
        Cetus avisará con al menos 30 días de anticipación la incorporación o el cambio de un
        subencargado; si el Cliente se opone por motivos razonables, puede terminar el servicio
        antes de que el cambio aplique.
      </p>

      <h2>6. Transmisión internacional</h2>
      <p>
        Los datos se alojan en Estados Unidos, país con nivel adecuado de protección según la
        Superintendencia de Industria y Comercio. El Cliente autoriza esa transmisión.
      </p>

      <h2>7. Terminación</h2>
      <p>
        Al terminar el servicio, el Cliente tiene 30 días para descargar sus documentos. Después,
        Cetus suprime los datos, salvo los documentos electrónicos y sus respuestas de la DIAN, que
        conserva hasta cumplir cinco años desde su expedición en almacenamiento que no permite
        borrarlos antes, y los suprime al vencer ese plazo.
      </p>

      <h2>8. Contacto</h2>
      <p>
        Las comunicaciones sobre este acuerdo se dirigen a{" "}
        <a href={`mailto:${legalOwner.email}`}>{legalOwner.email}</a> y, del lado del Cliente, al
        contacto técnico y fiscal registrado en la consola.
      </p>
    </>
  );
}
