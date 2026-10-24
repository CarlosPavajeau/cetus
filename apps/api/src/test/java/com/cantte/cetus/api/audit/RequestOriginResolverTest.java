package com.cantte.cetus.api.audit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RequestOriginResolverTest {

    @Test
    void acceptsIpLiterals() {
        assertThat(RequestOriginResolver.normalizeIp("203.0.113.10")).isEqualTo("203.0.113.10");
        assertThat(RequestOriginResolver.normalizeIp(" 2001:db8::1 ")).isEqualTo("2001:db8:0:0:0:0:0:1");
        assertThat(RequestOriginResolver.normalizeIp("::1")).isEqualTo("0:0:0:0:0:0:0:1");
    }

    @Test
    void rejectsAnythingElseWithoutResolvingIt() {
        assertThat(RequestOriginResolver.normalizeIp(null)).isNull();
        assertThat(RequestOriginResolver.normalizeIp("")).isNull();
        assertThat(RequestOriginResolver.normalizeIp("256.1.1.1")).isNull();
        assertThat(RequestOriginResolver.normalizeIp("1.2.3")).isNull();
        assertThat(RequestOriginResolver.normalizeIp("localhost")).isNull();
        assertThat(RequestOriginResolver.normalizeIp("evil.example.com")).isNull();
        assertThat(RequestOriginResolver.normalizeIp("1.2.3.4, 5.6.7.8")).isNull();
        assertThat(RequestOriginResolver.normalizeIp("1.2.3.4'); DROP TABLE x; --"))
                .isNull();
    }
}
