package com.cantte.cetus.ubl;

import com.cantte.cetus.domain.dian.DianTime;
import com.cantte.cetus.domain.model.DocumentType;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.ubl.model.Cac;
import com.cantte.cetus.ubl.model.Ext;
import com.cantte.cetus.ubl.model.IdentifierType;
import com.cantte.cetus.ubl.model.UblAttachedDocument;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;

/** Wraps a validated document and its ApplicationResponse in the AttachedDocument delivered to the customer. */
public final class AttachedDocumentMapper {

    private static final String XML_MIME = "text/xml";
    private static final String UTF_8 = "UTF-8";

    /**
     * @param number              full number of the wrapped document (prefix + consecutive)
     * @param uniqueCode          its CUFE (invoice) or CUDE (notes)
     * @param signedXml           the signed document, exactly as sent to the DIAN
     * @param applicationResponse the DIAN's ApplicationResponse that accepted it
     * @param validatedAt         when the DIAN validated it
     * @param issuedAt            when the container is generated; never before the wrapped document
     */
    public record Contents(
            Environment environment,
            DocumentType documentType,
            String number,
            String uniqueCode,
            Party supplier,
            Party customer,
            byte[] signedXml,
            byte[] applicationResponse,
            OffsetDateTime validatedAt,
            OffsetDateTime issuedAt) {}

    public UblAttachedDocument map(Contents contents) {
        OffsetDateTime issued = colombia(contents.issuedAt());
        OffsetDateTime validated = colombia(contents.validatedAt());

        UblAttachedDocument ubl = new UblAttachedDocument();
        ubl.ublExtensions = new Ext.UblExtensions();
        ubl.ublVersionId = DianCodes.UBL_VERSION;
        ubl.customizationId = DianCodes.ATTACHED_CUSTOMIZATION;
        ubl.profileId = DianCodes.ATTACHED_PROFILE;
        ubl.profileExecutionId = contents.environment().dianCode();
        ubl.id = contents.number();
        ubl.issueDate = DianTime.date(issued.toLocalDate());
        ubl.issueTime = DianTime.time(issued.toLocalTime());
        ubl.documentType = DianCodes.ATTACHED_DOCUMENT_TYPE;
        ubl.parentDocumentId = contents.number();
        ubl.senderParty = UblParts.taxParty(contents.supplier());
        ubl.receiverParty = UblParts.taxParty(contents.customer());
        ubl.attachment = attachment(contents.signedXml());

        Cac.DocumentReference reference = new Cac.DocumentReference();
        reference.id = contents.number();
        String scheme = contents.documentType() == DocumentType.INVOICE ? "CUFE-SHA384" : "CUDE-SHA384";
        reference.uuid = IdentifierType.of(contents.uniqueCode()).scheme(null, scheme);
        reference.issueDate = DianTime.date(validated.toLocalDate());
        reference.documentType = "ApplicationResponse";
        reference.attachment = attachment(contents.applicationResponse());
        reference.resultOfVerification = new Cac.ResultOfVerification();
        reference.resultOfVerification.validatorId = DianCodes.DIAN_VALIDATOR;
        reference.resultOfVerification.validationResultCode = DianCodes.VALIDATION_ACCEPTED;
        reference.resultOfVerification.validationDate = DianTime.date(validated.toLocalDate());
        reference.resultOfVerification.validationTime = DianTime.time(validated.toLocalTime());

        ubl.parentDocumentLineReference = new Cac.LineReference();
        ubl.parentDocumentLineReference.lineId = "1";
        ubl.parentDocumentLineReference.documentReference = reference;
        return ubl;
    }

    private static Cac.Attachment attachment(byte[] xml) {
        Cac.Attachment attachment = new Cac.Attachment();
        attachment.externalReference = new Cac.ExternalReference();
        attachment.externalReference.mimeCode = XML_MIME;
        attachment.externalReference.encodingCode = UTF_8;
        attachment.externalReference.description = new String(xml, StandardCharsets.UTF_8);
        return attachment;
    }

    private static OffsetDateTime colombia(OffsetDateTime time) {
        return time.atZoneSameInstant(DianTime.ZONE).toOffsetDateTime();
    }
}
