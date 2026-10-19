package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
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
    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    public static List<DocumentArtifactEntity> listByDocument(UUID documentId) {
        return list("documentId", documentId);
    }

    /**
     * The newest artifact of a kind. A document is signed again on every send attempt, so the last
     * SIGNED_XML is the one the DIAN validated. Ids are UUID v7, so they break ties in creation order.
     */
    public static Optional<DocumentArtifactEntity> findLatest(UUID documentId, Kind kind) {
        return find("documentId = ?1 and kind = ?2 order by createdAt desc, id desc", documentId, kind)
                .firstResultOptional();
    }
}
