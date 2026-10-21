package com.cantte.cetus.persistence.audit;

/**
 * Who performed an audited action: a console user, an API key, a member of the Cetus team (PLATFORM, from
 * the administration) or Cetus itself.
 */
public record Actor(ActorType type, String id) {

    public enum ActorType { USER, API_KEY, PLATFORM, SYSTEM }

    public static Actor system() {
        return new Actor(ActorType.SYSTEM, null);
    }
}
