package com.cantte.cetus.api.json;

import com.cantte.cetus.domain.model.Address;
import com.cantte.cetus.domain.model.LineInput;
import com.cantte.cetus.domain.model.Party;
import com.cantte.cetus.domain.model.PaymentInfo;
import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * The domain records Hibernate stores as JSON columns. Jackson reads them by reflection, which the native binary
 * only allows for registered classes; the domain module cannot carry the annotation itself.
 */
@RegisterForReflection(targets = {Party.class, Address.class, PaymentInfo.class, LineInput.LineTax.class})
final class JsonColumnTypes {

    private JsonColumnTypes() {}
}
