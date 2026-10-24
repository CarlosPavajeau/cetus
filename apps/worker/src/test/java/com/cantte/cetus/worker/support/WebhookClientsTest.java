package com.cantte.cetus.worker.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.cantte.cetus.worker.support.WebhookClients.BlockedTargetException;
import com.cantte.cetus.worker.support.WebhookClients.PublicOnlyDns;
import java.net.InetAddress;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import okhttp3.MediaType;
import okhttp3.Request;
import okhttp3.RequestBody;
import org.junit.jupiter.api.Test;

/** The SSRF guard lives in the client's own DNS lookup, so it checks the addresses the connection uses. */
class WebhookClientsTest {

    @Test
    void theClientRefusesToConnectToInternalAddresses() {
        WebhookClients clients = new WebhookClients(Duration.ofSeconds(1), Duration.ofSeconds(1), false);
        Request request = new Request.Builder()
                .url("http://localhost:9/hook")
                .post(RequestBody.create("{}", MediaType.get("application/json")))
                .build();

        assertThatThrownBy(() -> clients.http().newCall(request).execute())
                .isInstanceOf(BlockedTargetException.class)
                .hasMessageContaining("internal address");
    }

    /** DNS rebinding: a host that answers a public address first and an internal one next is caught on use. */
    @Test
    void everyLookupIsCheckedNotOnlyTheFirst() throws Exception {
        Deque<List<InetAddress>> answers = new ArrayDeque<>(List.of(
                List.of(InetAddress.getByName("93.184.216.34")), List.of(InetAddress.getByName("169.254.169.254"))));
        PublicOnlyDns dns = new PublicOnlyDns(hostname -> answers.poll());

        assertThat(dns.lookup("rebind.example.com")).hasSize(1);
        assertThatThrownBy(() -> dns.lookup("rebind.example.com")).isInstanceOf(BlockedTargetException.class);
    }

    @Test
    void oneInternalAddressAmongPublicOnesIsEnoughToRefuse() throws Exception {
        PublicOnlyDns dns = new PublicOnlyDns(
                hostname -> List.of(InetAddress.getByName("93.184.216.34"), InetAddress.getByName("10.0.0.5")));

        assertThatThrownBy(() -> dns.lookup("mixed.example.com")).isInstanceOf(BlockedTargetException.class);
    }
}
