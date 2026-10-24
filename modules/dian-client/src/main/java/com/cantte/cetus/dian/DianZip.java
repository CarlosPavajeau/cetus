package com.cantte.cetus.dian;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public final class DianZip {

    private DianZip() {}

    /** Zip containing a single XML file, as required by SendBillSync and SendTestSetAsync. */
    public static byte[] single(String fileName, byte[] content) {
        try (ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                ZipOutputStream zip = new ZipOutputStream(bytes)) {
            zip.putNextEntry(new ZipEntry(fileName));
            zip.write(content);
            zip.closeEntry();
            zip.finish();
            return bytes.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
