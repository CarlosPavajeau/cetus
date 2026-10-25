import { Link } from "@tanstack/react-router";

import { legalOwner } from "./documents";

export function TermsOfService() {
  return (
    <>
      <h2>1. Quiénes somos y aceptación</h2>
      <p>
        Cetus es un servicio prestado por {legalOwner.name}, identificado con {legalOwner.taxId},
        con domicilio en {legalOwner.city} (en adelante, «Cetus»). Estos términos regulan el uso de
        la consola, la API y los demás servicios de Cetus por parte de la persona natural o jurídica
        que crea una cuenta (en adelante, «el Cliente») y de los usuarios que actúan en su nombre.
      </p>
      <p>
        Al marcar la casilla de aceptación al crear una cuenta, o al aceptar una nueva versión desde
        la consola, el usuario declara que leyó estos términos, que los acepta y que tiene
        facultades para obligar al Cliente. Esa aceptación electrónica tiene plena validez conforme
        a la Ley 527 de 1999. Cetus guarda la fecha, la versión aceptada, la dirección IP y el
        navegador de cada aceptación.
      </p>

      <h2>2. Definiciones</h2>
      <ul>
        <li>
          <strong>Organización:</strong> el espacio de trabajo del Cliente en la consola, con sus
          miembros y roles.
        </li>
        <li>
          <strong>Emisor:</strong> cada contribuyente, identificado con su NIT, en cuyo nombre el
          Cliente expide documentos electrónicos.
        </li>
        <li>
          <strong>Documentos electrónicos:</strong> facturas electrónicas de venta, notas crédito,
          notas débito y los demás documentos que Cetus llegue a soportar.
        </li>
        <li>
          <strong>Ambientes:</strong> «Simulación» (<code>SANDBOX</code>), en el que la DIAN no
          interviene; «Pruebas» (<code>TEST</code>), que usa el ambiente de habilitación de la DIAN;
          y «Producción» (<code>LIVE</code>), en el que los documentos tienen validez fiscal.
        </li>
        <li>
          <strong>Llave de API:</strong> credencial que permite a los sistemas del Cliente usar la
          API de Cetus en un ambiente.
        </li>
      </ul>

      <h2>3. El servicio</h2>
      <p>
        Cetus es un software que se usa a través de internet para generar, firmar digitalmente,
        transmitir a la DIAN, consultar, conservar y entregar por correo electrónico los documentos
        electrónicos de los emisores del Cliente, a partir de los datos que el Cliente envía por la
        API o registra en la consola. Cetus también notifica eventos por webhooks y correo, y ofrece
        catálogos de clientes y productos.
      </p>
      <p>
        Cetus puede mejorar, cambiar o retirar funciones. Si un cambio afecta de forma sustancial el
        uso de la API, Cetus lo avisará con anticipación razonable al contacto técnico de la cuenta.
      </p>

      <h2>4. Responsabilidades ante la DIAN</h2>
      <p>
        <strong>
          El Cliente, o el emisor en cuyo nombre actúa, es el obligado a facturar ante la DIAN y el
          único responsable de sus obligaciones tributarias.
        </strong>{" "}
        Cetus provee la herramienta tecnológica; no es parte de las operaciones del Cliente, no
        actúa como su representante ante la DIAN y no tiene la calidad de proveedor tecnológico
        autorizado por la DIAN. En particular, corresponde al Cliente:
      </p>
      <ul>
        <li>
          Registrarse como facturador electrónico, habilitarse ante la DIAN y registrar a su nombre
          el software, su identificador, su PIN y la clave técnica que usa con Cetus.
        </li>
        <li>
          Obtener y mantener vigentes la autorización de numeración, sus rangos y resoluciones, y un
          certificado de firma digital a nombre del emisor, expedido por una entidad de
          certificación acreditada.
        </li>
        <li>
          La veracidad, integridad y legalidad de los datos de cada documento: adquirientes,
          productos, valores, impuestos, retenciones, formas de pago y demás contenido.
        </li>
        <li>
          Expedir y transmitir los documentos dentro de los plazos que fija la normativa, atender
          los rechazos de la DIAN, emitir las notas que correspondan y aplicar los procedimientos de
          contingencia cuando la DIAN o Cetus no estén disponibles.
        </li>
        <li>
          Entregar los documentos a sus adquirientes y conservarlos durante el término que exige la
          ley. La copia que guarda Cetus (sección 13) no reemplaza esta obligación.
        </li>
      </ul>
      <p>
        Cetus responde por que el software genere y transmita los documentos según el anexo técnico
        vigente de la DIAN a partir de los datos recibidos, y corregirá con diligencia los errores
        atribuibles al software.
      </p>

      <h2>5. Simulación y pruebas</h2>
      <p>
        Los documentos de los ambientes de simulación y de pruebas no tienen validez fiscal. En
        simulación, las respuestas de la DIAN son imitadas por Cetus, los documentos se eliminan a
        los 10 días y los correos se envían al contacto técnico de la cuenta, nunca al adquiriente.
        Cetus puede limitar el volumen de uso de estos ambientes para evitar abusos.
      </p>

      <h2>6. Cuenta, acceso y seguridad</h2>
      <ul>
        <li>
          El Cliente debe registrar información veraz y mantener actualizados sus contactos
          técnicos, fiscales y de facturación, a los que Cetus envía los avisos del servicio.
        </li>
        <li>
          El Cliente es responsable de quiénes son miembros de su organización y de los roles que
          les asigna, y responde por lo que hagan con sus credenciales y llaves de API. Debe
          guardarlas de forma segura, revocar las comprometidas y avisar a Cetus de cualquier uso no
          autorizado.
        </li>
        <li>
          Para dar soporte, el equipo de Cetus puede ver la consola como un usuario del Cliente. Esa
          sesión dura un tiempo limitado, queda registrada en la actividad de la cuenta y no permite
          emitir documentos de producción, cargar certificados ni crear o revocar llaves de API.
        </li>
      </ul>

      <h2>7. Planes, precios y pago</h2>
      <ul>
        <li>
          Cada cuenta tiene un plan con un precio mensual, un número de documentos incluidos, un
          número de emisores de producción y un valor por cada documento adicional. Los planes
          vigentes se publican en la consola y en el sitio de Cetus. Los precios no incluyen los
          impuestos que apliquen.
        </li>
        <li>
          Se cuenta como documento cada factura, nota crédito o nota débito de producción aceptada
          por la DIAN, en el mes calendario de Colombia en que fue validada. Los documentos de
          simulación y pruebas no se cobran.
        </li>
        <li>
          Superar los documentos incluidos no bloquea la emisión: el excedente se cobra con la
          siguiente factura. Cetus avisa al contacto de facturación al llegar al 80 % y al 100 % del
          plan.
        </li>
        <li>
          Cetus factura el plan por mes y el excedente por mes vencido, con el plazo de pago
          indicado en cada factura. Si un pago se atrasa más de 15 días después de un aviso, Cetus
          puede suspender la cuenta hasta que se ponga al día.
        </li>
        <li>
          Cetus avisará cualquier cambio de precio con al menos 30 días de anticipación. Si el
          Cliente no está de acuerdo, puede terminar el servicio antes de que el cambio aplique.
        </li>
      </ul>

      <h2>8. Uso aceptable</h2>
      <p>El Cliente se obliga a no usar Cetus para:</p>
      <ul>
        <li>
          Expedir documentos por operaciones inexistentes, simuladas o a nombre de terceros sin su
          autorización, o cualquier otra conducta contraria a la ley tributaria o penal.
        </li>
        <li>
          Cargar certificados, credenciales o datos de emisores sin la autorización de su titular.
        </li>
        <li>
          Intentar acceder a datos de otras cuentas, eludir los límites de uso, probar la seguridad
          del servicio sin autorización escrita de Cetus o cargar código malicioso.
        </li>
        <li>Revender o sublicenciar el servicio sin un acuerdo escrito con Cetus.</li>
      </ul>

      <h2>9. Suspensión y terminación</h2>
      <p>
        Cetus puede suspender una cuenta por incumplimiento de estos términos, por falta de pago,
        por orden de autoridad competente o para evitar un daño grave al servicio o a terceros.
        Siempre que sea posible avisará antes y explicará el motivo. Durante la suspensión la
        consola queda en solo lectura, las llaves de API dejan de funcionar y los documentos que ya
        tenían número asignado se terminan de procesar.
      </p>
      <p>
        El Cliente puede terminar el servicio en cualquier momento escribiendo a {legalOwner.email};
        los valores causados hasta esa fecha siguen siendo exigibles. Cetus puede terminarlo con un
        aviso de 30 días, o de inmediato ante un incumplimiento grave.
      </p>

      <h2>10. Disponibilidad y soporte</h2>
      <p>
        Cetus hace esfuerzos razonables para que el servicio esté disponible de forma continua, pero
        no garantiza un nivel de disponibilidad salvo que se pacte por escrito. Cetus no responde
        por las fallas o demoras de los servicios de la DIAN, de los proveedores de internet o de
        los sistemas del Cliente. Cuando la DIAN no responde, Cetus conserva los documentos en cola
        y los reintenta de forma automática. El soporte se presta por correo electrónico en días
        hábiles.
      </p>

      <h2>11. Propiedad intelectual y datos del Cliente</h2>
      <p>
        El software, la marca y la documentación de Cetus son de su titular; estos términos solo
        otorgan al Cliente una licencia de uso limitada, no exclusiva e intransferible mientras el
        servicio esté vigente. Los datos y documentos del Cliente son del Cliente: Cetus solo los
        usa para prestar el servicio, cumplir la ley y, de forma agregada y sin identificar al
        Cliente ni a sus adquirientes, para medir y mejorar el servicio.
      </p>

      <h2>12. Datos personales</h2>
      <p>
        Cetus trata los datos personales de los usuarios y contactos del Cliente como responsable,
        conforme a su{" "}
        <Link to="/legal/privacidad">política de tratamiento de datos personales</Link>. Los datos
        personales que el Cliente incluye en sus documentos, como los de sus adquirientes, los trata
        como encargado por cuenta del Cliente, según el{" "}
        <Link to="/legal/encargo">acuerdo de encargo de datos</Link>, que forma parte de estos
        términos. El Cliente garantiza que cuenta con la autorización de los titulares cuando la ley
        la exige.
      </p>

      <h2>13. Conservación y exportación</h2>
      <p>
        Cetus conserva los documentos de producción, su XML firmado y las respuestas de la DIAN
        durante cinco años desde su expedición, en almacenamiento que impide modificarlos o
        borrarlos antes de ese plazo. Al terminar el servicio, el Cliente tiene 30 días para
        descargar sus documentos; vencido ese plazo, Cetus puede cerrar la cuenta y conservará los
        documentos solo hasta que se cumpla el plazo de cinco años.
      </p>

      <h2>14. Limitación de responsabilidad</h2>
      <p>
        Cetus no responde por las sanciones, intereses, rechazos o perjuicios que se deriven de los
        datos suministrados por el Cliente, del incumplimiento de las obligaciones descritas en la
        sección 4, de las fallas de la DIAN o de terceros, ni por el lucro cesante o los daños
        indirectos. En todo caso, la responsabilidad total de Cetus por cualquier reclamación
        relacionada con el servicio se limita al valor pagado por el Cliente en los doce meses
        anteriores al hecho que la origina.
      </p>
      <p>
        Estas limitaciones no aplican a los daños causados con dolo o culpa grave, ni en los casos
        en que la ley no permite limitar la responsabilidad.
      </p>

      <h2>15. Cambios a estos términos</h2>
      <p>
        Cetus puede actualizar estos términos. Los cambios sustanciales se avisarán por correo
        electrónico y en la consola, que pedirá aceptar la nueva versión antes de seguir usándola.
        Si el Cliente no está de acuerdo, puede terminar el servicio; seguir usando la API después
        de la fecha de vigencia indicada en el aviso implica su aceptación.
      </p>

      <h2>16. Ley aplicable y controversias</h2>
      <p>
        Estos términos se rigen por las leyes de la República de Colombia. Las partes intentarán
        resolver cualquier diferencia de forma directa durante 30 días; si no lo logran, la
        someterán a los jueces de {legalOwner.city}, sin perjuicio de los derechos que la ley
        reconoce a los consumidores.
      </p>

      <h2>17. Contacto</h2>
      <p>
        Para cualquier asunto relacionado con estos términos, escribe a{" "}
        <a href={`mailto:${legalOwner.email}`}>{legalOwner.email}</a>.
      </p>
    </>
  );
}
