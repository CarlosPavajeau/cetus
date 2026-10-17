package com.cantte.cetus.persistence.entity;

import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

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

    public static Optional<SoftwareCredentialEntity> findActive(UUID issuerId) {
        return find("issuerId = ?1 and active = true", issuerId).firstResultOptional();
    }

    public static void deactivateAll(UUID issuerId) {
        update("active = false where issuerId = ?1 and active = true", issuerId);
    }
}
