"""Writes the batch invoicing template, apps/console/public/plantillas/facturas-v1.xlsx.

The template is versioned in the repo; run this only to make a new version (and bump VERSION, the file name and
templateVersion in apps/console/src/features/batches/columns.ts). The labels must match columns.ts: the console's
unit tests read the committed file and fail otherwise.

    mise run batch-template
"""

import pathlib
import re

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

VERSION = "facturas-v1"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "apps/console/public/plantillas" / f"{VERSION}.xlsx"
ROWS = 5001

LISTS = {
    "identificationType": [
        "NIT",
        "Cédula de ciudadanía",
        "Cédula de extranjería",
        "Pasaporte",
        "Permiso especial de permanencia",
        "Documento de identificación extranjero",
    ],
    "personType": ["Persona jurídica", "Persona natural"],
    "taxLevel": [
        "Gran contribuyente (O-13)",
        "Autorretenedor (O-15)",
        "Agente de retención IVA (O-23)",
        "Régimen simple de tributación (O-47)",
        "No aplica – Otros (R-99-PN)",
    ],
    "taxScheme": ["Responsable de IVA", "No responsable de IVA"],
    "paymentMethod": ["De contado", "A crédito"],
    "paymentMeans": [
        "Efectivo",
        "Transferencia bancaria",
        "Consignación bancaria",
        "Tarjeta de crédito",
        "Tarjeta de débito",
        "Cheque",
        "Otro",
    ],
    "unitCode": ["Unidad (94)", "Kilogramo (KGM)", "Litro (LTR)", "Metro (MTR)", "Hora (HUR)", "Día (DAY)", "Mes (MON)"],
    "tax": ["IVA 19 %", "IVA 5 %", "Exento de IVA (0 %)", "Excluido de IVA"],
    "consumptionTax": ["Impuesto al consumo 8 %"],
}

COLUMNS = [
    ("reference", "Referencia", "Sí", "Tu referencia de la factura. Las filas con la misma referencia son una factura.", 18),
    ("identificationType", "Tipo de identificación", "Sí", "Del cliente.", 22),
    ("identificationNumber", "Número de identificación", "Sí", "Sin dígito de verificación. Si está en tus clientes, los demás datos del cliente se toman de allí.", 22),
    ("checkDigit", "DV", "No", "Dígito de verificación del NIT. Si lo dejas vacío, Cetus lo calcula.", 6),
    ("personType", "Tipo de persona", "Si no está en tus clientes", "", 18),
    ("legalName", "Nombre o razón social", "Si no está en tus clientes", "", 30),
    ("taxLevel", "Responsabilidad fiscal", "Si no está en tus clientes", "Como aparece en su RUT. Por defecto, No aplica.", 30),
    ("taxScheme", "Régimen de IVA", "Si no está en tus clientes", "", 22),
    ("municipality", "Municipio", "Con la dirección", "Elígelo de la lista, como «Montería - Córdoba».", 30),
    ("addressLine", "Dirección", "Con el municipio", "", 30),
    ("email", "Email", "No", "Sin correo, la factura no se le envía al cliente.", 28),
    ("phone", "Teléfono", "No", "", 16),
    ("paymentMethod", "Forma de pago", "Sí", "", 14),
    ("paymentMeans", "Medio de pago", "Sí", "", 22),
    ("dueDate", "Fecha de vencimiento", "Si es a crédito", "Como fecha de Excel, AAAA-MM-DD o DD/MM/AAAA.", 20),
    ("productCode", "Código de producto", "Si no hay descripción y precio", "Si está en tus productos, la descripción, la unidad, el precio y los impuestos vacíos se toman de allí.", 18),
    ("description", "Descripción", "Si el código no está en tus productos", "", 34),
    ("quantity", "Cantidad", "Sí", "Mayor que cero. Coma o punto para los decimales.", 10),
    ("unitCode", "Unidad", "No", "Por defecto, Unidad (94). Puedes escribir otro código DIAN.", 14),
    ("unitPrice", "Precio unitario", "Si el código no está en tus productos", "Antes de impuestos, sin separadores de miles.", 16),
    ("tax", "IVA", "Si el código no está en tus productos", "Vacío: excluido de IVA.", 22),
    ("consumptionTax", "Impuesto al consumo", "No", "Junto al IVA o en su lugar, como en restaurantes y bares.", 22),
    ("notes", "Notas", "No", "Aparecen en la factura.", 30),
]

EXAMPLE = [
    ["ARR-2026-11-001", "NIT", "900123456", "", "Persona jurídica", "Inmobiliaria Andina SAS", "No aplica – Otros (R-99-PN)",
     "Responsable de IVA", "Montería - Córdoba", "Calle 27 # 3-45", "pagos@andina.example", "", "A crédito",
     "Transferencia bancaria", "2026-12-15", "", "Arriendo local 101 - noviembre", "1", "Mes (MON)", "2500000",
     "IVA 19 %", "", "Contrato 2024-018"],
    ["ARR-2026-11-001", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Administración - noviembre", "1",
     "Mes (MON)", "350000", "Excluido de IVA", "", ""],
]

HEADER_FILL = PatternFill("solid", fgColor="1F2937")
HEADER_FONT = Font(bold=True, color="FFFFFF")


def municipalities():
    source = (ROOT / "apps/console/src/features/setup/divipola.ts").read_text(encoding="utf-8")
    labels = []
    for block in re.finditer(r'name: "([^"]+)",\s*municipalities: \[(.*?)\]', source, re.S):
        department = block.group(1)
        for name in re.findall(r'name: "([^"]+)"', block.group(2)):
            labels.append(f"{name} - {department}")
    return sorted(labels)


def main():
    book = Workbook()
    sheet = book.active
    sheet.title = "Facturas"
    for index, (_, header, *_rest) in enumerate(COLUMNS, start=1):
        cell = sheet.cell(row=1, column=index, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        sheet.column_dimensions[get_column_letter(index)].width = COLUMNS[index - 1][4]
    sheet.freeze_panes = "B2"

    lists = book.create_sheet("Listas")
    lists.sheet_state = "hidden"
    ranges = {}
    named = dict(LISTS, municipality=municipalities())
    for index, (key, values) in enumerate(named.items(), start=1):
        letter = get_column_letter(index)
        lists.cell(row=1, column=index, value=key)
        for row, value in enumerate(values, start=2):
            lists.cell(row=row, column=index, value=value)
        ranges[key] = f"Listas!${letter}$2:${letter}${len(values) + 1}"

    for index, (key, header, *_rest) in enumerate(COLUMNS, start=1):
        letter = get_column_letter(index)
        cells = f"{letter}2:{letter}{ROWS}"
        if key in ranges:
            validation = DataValidation(
                type="list",
                formula1=ranges[key],
                allow_blank=True,
                showErrorMessage=key != "unitCode",
                errorTitle=header,
                error="Elige un valor de la lista.",
            )
        elif key == "dueDate":
            validation = DataValidation(
                type="date", operator="greaterThan", formula1="DATE(2000,1,1)", allow_blank=True,
                showErrorMessage=True, errorTitle=header, error="Escribe una fecha.")
            for row in range(2, ROWS + 1):
                sheet.cell(row=row, column=index).number_format = "yyyy-mm-dd"
        elif key in ("quantity", "unitPrice"):
            validation = DataValidation(
                type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True,
                showErrorMessage=True, errorTitle=header, error="Escribe un número.")
        else:
            continue
        sheet.add_data_validation(validation)
        validation.add(cells)

    keys = [key for key, *_rest in COLUMNS]
    for key in ("identificationNumber", "checkDigit", "phone"):
        letter = get_column_letter(keys.index(key) + 1)
        for row in range(2, ROWS + 1):
            sheet[f"{letter}{row}"].number_format = "@"

    guide = book.create_sheet("Instrucciones")
    guide["A1"] = "Cómo llenar la plantilla"
    guide["A1"].font = Font(bold=True, size=14)
    guide["A2"] = ("Cada fila de la hoja Facturas es una línea. Las filas con la misma referencia forman una factura: "
                   "los datos del cliente, el pago y las notas van en su primera fila y en las demás pueden quedar vacíos.")
    guide["A2"].alignment = Alignment(wrap_text=True)
    guide.column_dimensions["A"].width = 28
    guide.column_dimensions["B"].width = 34
    guide.column_dimensions["C"].width = 80
    for index, header in enumerate(("Columna", "Obligatoria", "Qué va"), start=1):
        cell = guide.cell(row=4, column=index, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
    for row, (_, header, required, help_text, _width) in enumerate(COLUMNS, start=5):
        guide.cell(row=row, column=1, value=header)
        guide.cell(row=row, column=2, value=required)
        guide.cell(row=row, column=3, value=help_text).alignment = Alignment(wrap_text=True)
    start = 5 + len(COLUMNS) + 1
    guide.cell(row=start, column=1, value="Ejemplo: una factura de dos líneas").font = Font(bold=True)
    for index, (_, header, *_rest) in enumerate(COLUMNS, start=1):
        cell = guide.cell(row=start + 1, column=index, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
    for offset, values in enumerate(EXAMPLE, start=2):
        for index, value in enumerate(values, start=1):
            guide.cell(row=start + offset, column=index, value=value or None)

    meta = book.create_sheet("_meta")
    meta["A1"] = VERSION
    meta.sheet_state = "hidden"

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    book.save(OUTPUT)
    print(f"Wrote {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
