package com.cantte.cetus.api.status;

import com.cantte.cetus.persistence.entity.StatusIncidentEntity;
import com.cantte.cetus.persistence.entity.StatusIncidentEntity.IncidentImpact;
import com.cantte.cetus.persistence.entity.StatusIncidentEntity.StatusComponent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

public final class StatusViews {

    private StatusViews() {}

    public enum ComponentStatus {
        OPERATIONAL,
        DEGRADED,
        OUTAGE;

        ComponentStatus worst(ComponentStatus other) {
            return other.ordinal() > ordinal() ? other : this;
        }

        static ComponentStatus of(IncidentImpact impact) {
            return switch (impact) {
                case DEGRADED -> DEGRADED;
                case OUTAGE -> OUTAGE;
            };
        }
    }

    @Schema(description = "What the status page and the console show: each component and the recent incidents")
    public record PlatformStatusView(
            ComponentStatus status,
            List<ComponentView> components,
            List<IncidentView> incidents,
            OffsetDateTime checkedAt) {}

    public record ComponentView(StatusComponent component, ComponentStatus status) {}

    public record IncidentView(
            UUID id,
            StatusComponent component,
            IncidentImpact impact,
            String title,
            String message,
            OffsetDateTime startedAt,
            @Schema(nullable = true) OffsetDateTime resolvedAt) {

        public static IncidentView from(StatusIncidentEntity incident) {
            return new IncidentView(
                    incident.id,
                    incident.component,
                    incident.impact,
                    incident.title,
                    incident.message,
                    incident.startedAt,
                    incident.resolvedAt);
        }
    }

    public record IncidentRequest(
            @NotNull StatusComponent component,
            @NotNull IncidentImpact impact,
            @NotBlank @Size(max = 120) String title,
            @NotBlank @Size(max = 1000) String message) {}
}
