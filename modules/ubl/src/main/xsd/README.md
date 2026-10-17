# XSD de la DIAN

Copia aquí los XSD de la caja de herramientas de la DIAN (UBL 2.1 + extensiones `sts`).
No se usan para generar código: el modelo JAXB está escrito a mano en
`com.cantte.cetus.ubl.model`. Se usan en las pruebas para validar que el XML
generado cumple el esquema (`UblSchemaValidationTest`, pendiente de activar).

Estructura sugerida:

```
xsd/
├── maindoc/UBL-Invoice-2.1.xsd
├── maindoc/UBL-CreditNote-2.1.xsd
├── maindoc/UBL-DebitNote-2.1.xsd
└── common/...            # cac, cbc, ext, sts, xmldsig, xades
```
