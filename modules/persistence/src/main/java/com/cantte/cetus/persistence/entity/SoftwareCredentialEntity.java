package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

/** Software ID, PIN (sealed) and test set id registered in the DIAN portal. */
@Entity
@Table(name = "issuer_software_credentials")
public class SoftwareCredentialEntity extends PanacheEntityBase {

    @Id
    public UUID id;
    @Column(name = "issuer_id")
    public UUID issuerId;
    @Column(name = "software_id")
    public String softwareId;
    @Column(name = "pin_sealed")
    public byte[] pinSealed;
    @Column(name = "test_set_id")
    public String testSetId;
    public boolean active = true;
    @Generated(event = EventType.INSERT)
    @Column(name = "created_at", insertable = false, updatable = false)
    public OffsetDateTime createdAt;

    public static Optional<SoftwareCredentialEntity> findActive(UUID issuerId) {
        return find("issuerId = ?1 and active = true", issuerId).firstResultOptional();
    }

    /**
     * When the issuer first registered this test set: saving the software again with the same
     * TestSetId keeps counting from there, and a different one starts over.
     */
    public static OffsetDateTime testSetStart(UUID issuerId, String testSetId) {
        return getEntityManager().createQuery("""
                        select min(c.createdAt) from SoftwareCredentialEntity c
                        where c.issuerId = :issuerId and c.testSetId = :testSetId""", OffsetDateTime.class)
                .setParameter("issuerId", issuerId)
                .setParameter("testSetId", testSetId)
                .getSingleResult();
    }

    public static void deactivateAll(UUID issuerId) {
        update("active = false where issuerId = ?1 and active = true", issuerId);
    }
}
