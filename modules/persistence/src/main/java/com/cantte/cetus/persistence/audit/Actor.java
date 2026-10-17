package com.cantte.cetus.persistence.audit;

/** Who performed an audited action: a console user, an API key or Cetus itself. */
public record Actor(ActorType type, String id) {

    public enum ActorType { USER, API_KEY, SYSTEM }

    public static Actor system() {
        return new Actor(ActorType.SYSTEM, null);
    }
}
