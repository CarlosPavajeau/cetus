package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "document_artifacts")
public class DocumentArtifactEntity extends PanacheEntityBase {

    public enum Kind { SIGNED_XML, ZIP, DIAN_REQUEST, DIAN_RESPONSE, APPLICATION_RESPONSE, ATTACHED_DOCUMENT, PDF }

    @Id
    public UUID id;
    @Column(name = "document_id")
    public UUID documentId;
    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    public Kind kind;
    @Column(name = "s3_key")
    public String s3Key;
    public String sha256;
    @Column(name = "size_bytes")
    public long sizeBytes;
    @Column(name = "content_type")
    public String contentType;

    public static List<DocumentArtifactEntity> listByDocument(UUID documentId) {
        return list("documentId", documentId);
    }
}
