package com.cantte.cetus.worker.support;

import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import java.time.Clock;

public class Clocks {

    @Produces
    @Singleton
    Clock clock() {
        return Clock.systemUTC();
    }
}
