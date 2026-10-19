package com.cantte.cetus.webhooks;

import com.cantte.cetus.domain.model.Environment;
import org.junit.jupiter.api.Test;

import java.net.InetAddress;

import static org.assertj.core.api.Assertions.assertThat;

class WebhookTargetsTest {

    @Test
    void acceptsPublicHttpsUrls() {
        assertThat(WebhookTargets.problem("https://hooks.example.com/cetus", Environment.LIVE, false)).isEmpty();
        assertThat(WebhookTargets.problem("http://hooks.example.com/cetus", Environment.TEST, false)).isEmpty();
    }

    @Test
    void liveRequiresHttps() {
        assertThat(WebhookTargets.problem("http://hooks.example.com", Environment.LIVE, false)).isPresent();
    }

    @Test
    void rejectsOtherSchemesCredentialsAndMissingHosts() {
        assertThat(WebhookTargets.problem("ftp://hooks.example.com", Environment.TEST, false)).isPresent();
        assertThat(WebhookTargets.problem("https://user:pass@hooks.example.com", Environment.TEST, false)).isPresent();
        assertThat(WebhookTargets.problem("https:///path", Environment.TEST, false)).isPresent();
        assertThat(WebhookTargets.problem("not a url", Environment.TEST, false)).isPresent();
    }

    @Test
    void rejectsInternalHostsUnlessAllowed() {
        for (String url : new String[]{"https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x",
                "https://192.168.1.10/x", "https://169.254.169.254/latest", "https://[::1]/x", "https://db.internal/x"}) {
            assertThat(WebhookTargets.problem(url, Environment.TEST, false)).as(url).isPresent();
            assertThat(WebhookTargets.problem(url, Environment.TEST, true)).as(url).isEmpty();
        }
    }

    @Test
    void classifiesAddresses() throws Exception {
        assertThat(WebhookTargets.isPrivate(InetAddress.getByName("100.64.1.1"))).isTrue();
        assertThat(WebhookTargets.isPrivate(InetAddress.getByName("172.16.0.1"))).isTrue();
        assertThat(WebhookTargets.isPrivate(InetAddress.getByName("fd00::1"))).isTrue();
        assertThat(WebhookTargets.isPrivate(InetAddress.getByName("8.8.8.8"))).isFalse();
        assertThat(WebhookTargets.isPrivate(InetAddress.getByName("2606:4700:4700::1111"))).isFalse();
    }
}
