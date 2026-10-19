package com.cantte.cetus.ubl.model;

import jakarta.xml.bind.annotation.XmlElement;
import jakarta.xml.bind.annotation.XmlRootElement;
import jakarta.xml.bind.annotation.XmlType;

/**
 * Root of the electronic container (AttachedDocument-2, annex section 6.4) that is delivered to the
 * customer: the signed document plus the DIAN's ApplicationResponse that validated it.
 */
@XmlRootElement(name = "AttachedDocument", namespace = Ns.ATTACHED_DOCUMENT)
@XmlType(name = "AttachedDocument", propOrder = {"ublExtensions", "ublVersionId", "customizationId", "profileId",
        "profileExecutionId", "id", "issueDate", "issueTime", "documentType", "parentDocumentId", "senderParty",
        "receiverParty", "attachment", "parentDocumentLineReference"})
public class UblAttachedDocument {

    /** Empty when marshalled: its only extension, the signature slot, is appended right before signing. */
    @XmlElement(name = "UBLExtensions", namespace = Ns.EXT)
    public Ext.UblExtensions ublExtensions;
    @XmlElement(name = "UBLVersionID", namespace = Ns.CBC)
    public String ublVersionId;
    @XmlElement(name = "CustomizationID", namespace = Ns.CBC)
    public String customizationId;
    @XmlElement(name = "ProfileID", namespace = Ns.CBC)
    public String profileId;
    @XmlElement(name = "ProfileExecutionID", namespace = Ns.CBC)
    public String profileExecutionId;
    @XmlElement(name = "ID", namespace = Ns.CBC)
    public String id;
    @XmlElement(name = "IssueDate", namespace = Ns.CBC)
    public String issueDate;
    @XmlElement(name = "IssueTime", namespace = Ns.CBC)
    public String issueTime;
    @XmlElement(name = "DocumentType", namespace = Ns.CBC)
    public String documentType;
    @XmlElement(name = "ParentDocumentID", namespace = Ns.CBC)
    public String parentDocumentId;
    @XmlElement(name = "SenderParty", namespace = Ns.CAC)
    public Cac.Party senderParty;
    @XmlElement(name = "ReceiverParty", namespace = Ns.CAC)
    public Cac.Party receiverParty;
    @XmlElement(name = "Attachment", namespace = Ns.CAC)
    public Cac.Attachment attachment;
    @XmlElement(name = "ParentDocumentLineReference", namespace = Ns.CAC)
    public Cac.LineReference parentDocumentLineReference;
}
