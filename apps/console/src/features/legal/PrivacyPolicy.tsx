import { Link } from "@tanstack/react-router";

import { legalOwner } from "./documents";

export function PrivacyPolicy() {
  const mail = <a href={`mailto:${legalOwner.email}`}>{legalOwner.email}</a>;
  return (
    <>
      <p>
        Esta política explica cómo Cetus trata los datos personales, en cumplimiento de la Ley 1581
        de 2012, el Decreto 1074 de 2015 (capítulo 25, que compila el Decreto 1377 de 2013) y las
        demás normas que los modifiquen o complementen.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>Nombre: {legalOwner.name}</li>
        <li>Identificación: {legalOwner.taxId}</li>
        <li>
          Domicilio: {legalOwner.address}, {legalOwner.city}, Colombia
        </li>
        <li>Correo electrónico: {mail}</li>
      </ul>
      <p>
        Las consultas y reclamos sobre datos personales los atiende el responsable a través de ese
        correo.
      </p>

      <h2>2. Definiciones</h2>
      <ul>
        <li>
          <strong>Titular:</strong> la persona natural a quien se refieren los datos.
        </li>
        <li>
          <strong>Tratamiento:</strong> cualquier operación sobre datos personales, como
          recolectarlos, almacenarlos, usarlos, circularlos o suprimirlos.
        </li>
        <li>
          <strong>Responsable:</strong> quien decide sobre la base de datos y su tratamiento.
        </li>
        <li>
          <strong>Encargado:</strong> quien trata datos por cuenta del responsable.
        </li>
        <li>
          <strong>Autorización:</strong> el consentimiento previo, expreso e informado del titular.
        </li>
      </ul>

      <h2>3. Datos que tratamos como responsable y para qué</h2>
      <p>
        <strong>Usuarios de la consola:</strong> nombre, correo electrónico, contraseña (guardada
        solo como un resumen criptográfico que no permite recuperarla), configuración de
        verificación en dos pasos, organizaciones y roles, y la dirección IP y el navegador de cada
        sesión. Los usamos para crear y proteger la cuenta, autenticar el acceso, enviar los correos
        de verificación y recuperación, registrar la actividad para auditoría y seguridad, y dar
        soporte.
      </p>
      <p>
        <strong>Contactos de la cuenta:</strong> los correos técnicos, fiscales y de facturación que
        registra el Cliente. Los usamos para enviar avisos del servicio, como vencimientos de
        certificados, fallos de webhooks, consumo del plan y suspensiones.
      </p>
      <p>
        <strong>Datos de los emisores:</strong> cuando el emisor es una persona natural, su nombre,
        NIT, dirección, teléfono, correo y responsabilidades tributarias, además de su certificado
        de firma digital y las credenciales del software ante la DIAN. Los usamos para firmar y
        transmitir sus documentos. Los certificados y las credenciales se guardan cifrados y nadie
        del equipo de Cetus puede descargarlos.
      </p>
      <p>
        <strong>Facturación del servicio:</strong> los datos necesarios para facturar y cobrar el
        plan al Cliente y para cumplir las obligaciones contables y tributarias de Cetus.
      </p>
      <p>
        <strong>Comunicaciones comerciales:</strong> solo con autorización separada, que se puede
        revocar en cualquier momento, Cetus puede enviar novedades del producto. Los avisos del
        servicio no son comunicaciones comerciales.
      </p>

      <h2>4. Datos que tratamos como encargado</h2>
      <p>
        Los documentos electrónicos que el Cliente expide con Cetus contienen datos de sus
        adquirientes y de otras personas (nombre, identificación, dirección, teléfono, correo y
        detalle de la operación). Sobre esos datos el responsable es el Cliente; Cetus los trata
        solo por su cuenta y para generar, transmitir, entregar y conservar sus documentos, según el{" "}
        <Link to="/legal/encargo">acuerdo de encargo de datos</Link>. El Cliente es quien debe
        contar con la autorización de esos titulares cuando la ley la exige, y las solicitudes de
        los adquirientes se atienden con él.
      </p>

      <h2>5. Autorización</h2>
      <p>
        El usuario autoriza el tratamiento al crear su cuenta, marcando la casilla de aceptación.
        Cetus conserva la prueba de esa autorización: la versión aceptada, la fecha, la dirección IP
        y el navegador. Cetus no trata datos sensibles ni datos de niños, niñas o adolescentes; el
        servicio está dirigido a mayores de edad que actúan en nombre de una empresa o de su propia
        actividad.
      </p>

      <h2>6. Derechos de los titulares</h2>
      <p>De acuerdo con el artículo 8 de la Ley 1581 de 2012, el titular tiene derecho a:</p>
      <ul>
        <li>Conocer, actualizar y rectificar sus datos.</li>
        <li>Solicitar prueba de la autorización otorgada.</li>
        <li>Ser informado sobre el uso que se ha dado a sus datos.</li>
        <li>
          Presentar quejas ante la Superintendencia de Industria y Comercio, después de agotar el
          trámite de consulta o reclamo ante Cetus.
        </li>
        <li>
          Revocar la autorización o pedir la supresión de sus datos, cuando no exista un deber legal
          o contractual de conservarlos.
        </li>
        <li>Acceder de forma gratuita a sus datos.</li>
      </ul>
      <p>
        Muchos de estos datos se pueden consultar y actualizar directamente desde la consola. Para
        lo demás, escribe a {mail}.
      </p>

      <h2>7. Consultas y reclamos</h2>
      <p>
        <strong>Consultas:</strong> se atienden en un máximo de diez días hábiles desde su recibo.
        Si no es posible en ese plazo, se informará el motivo y la nueva fecha, que no superará
        cinco días hábiles adicionales.
      </p>
      <p>
        <strong>Reclamos</strong> (corrección, actualización, supresión o incumplimiento): deben
        incluir la identificación del titular, la descripción de los hechos, la dirección de
        respuesta y los documentos que se quieran hacer valer. Si el reclamo está incompleto, se
        pedirá completarlo dentro de los cinco días siguientes; si pasan dos meses sin respuesta, se
        entenderá desistido. Los reclamos se atienden en un máximo de quince días hábiles,
        prorrogables hasta por ocho días hábiles más avisando el motivo. Mientras se tramita, el
        dato quedará marcado como «reclamo en trámite».
      </p>
      <p>
        Puede presentar la solicitud el titular, sus causahabientes, su representante o apoderado, o
        quien actúe por estipulación a favor de otro, acreditando su calidad.
      </p>

      <h2>8. Encargados y transferencia internacional</h2>
      <p>
        Para prestar el servicio, Cetus se apoya en los siguientes proveedores, que tratan datos por
        su cuenta y bajo obligaciones de confidencialidad y seguridad:
      </p>
      <ul>
        <li>Railway: alojamiento de las aplicaciones, en Virginia, Estados Unidos.</li>
        <li>PlanetScale: base de datos, en Virginia, Estados Unidos.</li>
        <li>
          Amazon Web Services: almacenamiento de documentos y cifrado de secretos, en Virginia,
          Estados Unidos.
        </li>
        <li>Cloudflare: red de entrega y protección del tráfico de la consola.</li>
        <li>Resend: envío de correos electrónicos, en Estados Unidos.</li>
      </ul>
      <p>
        Esto implica una transmisión internacional de datos a Estados Unidos, país que la
        Superintendencia de Industria y Comercio reconoce con un nivel adecuado de protección.
        Además, Cetus envía a la DIAN los documentos electrónicos, como lo exige la ley, y entrega
        por correo los documentos a las direcciones que indica el Cliente.
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Cetus aplica medidas técnicas y administrativas para proteger los datos: conexiones
        cifradas, cifrado de certificados y credenciales con llaves administradas, verificación en
        dos pasos obligatoria para su equipo, permisos mínimos por servicio, registro de auditoría y
        almacenamiento de documentos que impide modificarlos. Si ocurre un incidente que afecte
        datos personales, Cetus lo informará a los afectados y a la Superintendencia de Industria y
        Comercio según la normativa.
      </p>

      <h2>10. Cookies</h2>
      <p>
        La consola usa solo cookies necesarias: la de la sesión y la que recuerda el ambiente
        elegido. Cetus no usa cookies de publicidad ni de analítica de terceros.
      </p>

      <h2>11. Conservación</h2>
      <ul>
        <li>Datos de la cuenta y sus usuarios: mientras la cuenta esté activa.</li>
        <li>
          Documentos de producción y sus respuestas de la DIAN: cinco años desde su expedición.
        </li>
        <li>Documentos de simulación: diez días.</li>
        <li>Avisos enviados a los contactos: un año.</li>
        <li>Registro de peticiones a la API: treinta días.</li>
        <li>
          Prueba de la autorización y registro de auditoría: mientras exista la cuenta y el tiempo
          que exijan las normas aplicables.
        </li>
      </ul>
      <p>
        Al vencer esos plazos, o cuando el titular lo pida y no exista un deber de conservarlos, los
        datos se suprimen.
      </p>

      <h2>12. Vigencia y cambios</h2>
      <p>
        Esta política rige desde la fecha indicada al inicio. Las bases de datos estarán vigentes
        mientras Cetus preste el servicio y durante los plazos de conservación anteriores. Los
        cambios sustanciales se avisarán por correo electrónico y en la consola, que pedirá aceptar
        la nueva versión.
      </p>
    </>
  );
}
