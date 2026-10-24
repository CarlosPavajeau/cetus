package com.cantte.cetus.dian;

import com.cantte.cetus.signing.KeyMaterial;
import java.util.List;

/**
 * The DIAN web services the worker uses: {@link DianSoapClient} talks to the DIAN, and the sandbox
 * answers with a simulator that returns the same responses and throws the same exceptions.
 */
public interface DianGateway {

    DianResponse sendBillSync(String zipFileName, byte[] zip, KeyMaterial keys);

    UploadResponse sendTestSetAsync(String zipFileName, byte[] zip, String testSetId, KeyMaterial keys);

    /** Status by trackId; for documents sent with SendBillSync the trackId is the CUFE/CUDE. */
    DianResponse getStatus(String trackId, KeyMaterial keys);

    /** Status of an asynchronous upload, by the ZipKey returned by SendTestSetAsync. */
    List<DianResponse> getStatusZip(String zipKey, KeyMaterial keys);

    /**
     * The numbering ranges the DIAN authorized for an issuer and software, with their technical keys.
     *
     * @param accountCode  NIT of the issuer
     * @param accountCodeT NIT of the software provider: the issuer itself with "software propio"
     * @param softwareCode the software ID registered in the DIAN portal
     */
    NumberingRangeResponse getNumberingRange(
            String accountCode, String accountCodeT, String softwareCode, KeyMaterial keys);
}
