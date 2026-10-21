package com.cantte.cetus.persistence.audit;

/**
 * Who performed an audited action: a console user, an API key, a member of the Cetus team (PLATFORM, from
 * the administration) or Cetus itself. {@code impersonatedBy} is the Cetus admin acting as a console user.
 */
public record Actor(ActorType type, String id, String impersonatedBy) {

    public enum ActorType { USER, API_KEY, PLATFORM, SYSTEM }

    public Actor(ActorType type, String id) {
        this(type, id, null);
    }

    public static Actor system() {
        return new Actor(ActorType.SYSTEM, null);
    }
}
