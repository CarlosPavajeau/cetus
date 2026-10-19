package com.cantte.cetus.worker.support;

import com.cantte.cetus.domain.dian.DianFileNames;
import com.cantte.cetus.domain.dian.SoftwareSecurityCode;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.SoftwareInfo;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Optional;

/**
 * Who appears as software provider. With "software propio" it is the issuer itself; once Cetus
 * is an authorized technology provider, configure its NIT and DIAN file code.
 */
@ApplicationScoped
public class ProviderSettings {

    @ConfigProperty(name = "cetus.provider.nit")
    Optional<String> nit;
    @ConfigProperty(name = "cetus.provider.check-digit")
    Optional<String> checkDigit;
    @ConfigProperty(name = "cetus.provider.file-code")
    Optional<String> fileCode;

    public String providerNit(Party supplier) {
        return nit.orElse(supplier.identificationNumber());
    }

    public String providerCheckDigit(Party supplier) {
        return checkDigit.orElse(supplier.checkDigit());
    }

    public String fileCode() {
        return fileCode.orElse(DianFileNames.OWN_SOFTWARE_CODE);
    }

    /** Software data of the DIAN extensions for one document. */
    public SoftwareInfo software(ProcessingContext ctx, String pin) {
        return new SoftwareInfo(
                providerNit(ctx.supplier()),
                providerCheckDigit(ctx.supplier()),
                ctx.softwareId(),
                SoftwareSecurityCode.compute(ctx.softwareId(), pin, ctx.fullNumber()));
    }
}
