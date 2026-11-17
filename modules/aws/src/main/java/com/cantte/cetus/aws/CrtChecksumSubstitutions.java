package com.cantte.cetus.aws;

import com.oracle.svm.core.annotate.Substitute;
import com.oracle.svm.core.annotate.TargetClass;
import software.amazon.awssdk.checksums.SdkChecksum;
import software.amazon.awssdk.checksums.spi.ChecksumAlgorithm;

/**
 * Native image only: the SDK reaches the optional aws-crt checksums, which are not on the classpath, and Quarkus
 * links every class at build time. Without aws-crt they are unavailable on the JVM as well, so these keep the
 * SDK's own answer for that case: no CRT CRC32C (it falls back to Java's), and an error for CRC64NVME and xxHash,
 * which Cetus never asks for.
 */
@TargetClass(className = "software.amazon.awssdk.checksums.internal.ChecksumProvider")
final class CrtChecksumSubstitutions {

    private CrtChecksumSubstitutions() {}

    @Substitute
    static SdkChecksum createCrtCrc32C() {
        return null;
    }

    @Substitute
    static SdkChecksum crc64NvmeCrtImplementation() {
        throw new UnsupportedOperationException("CRC64NVME needs software.amazon.awssdk.crt:aws-crt");
    }

    @Substitute
    static SdkChecksum crtXxHash(ChecksumAlgorithm algorithm) {
        throw new UnsupportedOperationException(algorithm.algorithmId() + " needs software.amazon.awssdk.crt:aws-crt");
    }
}
