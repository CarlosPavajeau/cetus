package com.cantte.cetus.persistence.entity;

import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.Environment;
import com.cantte.cetus.domain.model.IdentificationType;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PersonType;
import io.quarkus.hibernate.orm.panache.PanacheEntityBase;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Entity
@Table(name = "issuers")
public class IssuerEntity extends PanacheEntityBase {

    public enum OperationMode { OWN_SOFTWARE, TECHNOLOGY_PROVIDER }

    public enum Status { ONBOARDING, TESTING, ENABLED, DISABLED }

    @Id
    public UUID id;
    @Column(name = "account_id")
    public UUID accountId;
    @Enumerated(EnumType.STRING)
    public Environment environment;
    public String nit;
    @Column(name = "check_digit")
    public String checkDigit;
    @Column(name = "legal_name")
    public String legalName;
    @Column(name = "trade_name")
    public String tradeName;
    @Enumerated(EnumType.STRING)
    @Column(name = "person_type")
    public PersonType personType;
    @Column(name = "tax_level_codes")
    public String taxLevelCodes;
    @Column(name = "tax_scheme_id")
    public String taxSchemeId;
    @Column(name = "tax_scheme_name")
    public String taxSchemeName;
    @JdbcTypeCode(SqlTypes.JSON)
    public Address address;
    public String email;
    public String phone;
    @Enumerated(EnumType.STRING)
    @Column(name = "operation_mode")
    public OperationMode operationMode;
    @Enumerated(EnumType.STRING)
    public Status status = Status.ONBOARDING;

    public static Optional<IssuerEntity> findForAccount(UUID accountId, UUID issuerId) {
        return find("id = ?1 and accountId = ?2", issuerId, accountId).firstResultOptional();
    }

    /** Like {@link #findForAccount}, holding the row until the transaction ends to serialize changes to it. */
    public static Optional<IssuerEntity> findForAccountForUpdate(UUID accountId, UUID issuerId) {
        return find("id = ?1 and accountId = ?2", issuerId, accountId)
                .withLock(LockModeType.PESSIMISTIC_WRITE)
                .firstResultOptional();
    }

    public static List<IssuerEntity> listByAccount(UUID accountId) {
        return list("accountId", accountId);
    }

    /** Issuer as the supplier party of a document. */
    public Party toParty() {
        List<String> codes = taxLevelCodes == null || taxLevelCodes.isBlank()
                ? List.of() : Arrays.asList(taxLevelCodes.split(";"));
        return new Party(personType, IdentificationType.NIT, nit, checkDigit, legalName, tradeName,
                codes, taxSchemeId, taxSchemeName, address, email, phone);
    }
}
