package com.cantte.cetus.api.support;

import io.restassured.response.Response;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public final class Concurrency {

    private Concurrency() {}

    /** Runs the requests at once, on threads that see the test's classes as RestAssured needs. */
    public static List<Response> race(List<Callable<Response>> racers) throws Exception {
        ClassLoader classes = Thread.currentThread().getContextClassLoader();
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(racers.size(), task -> {
            Thread thread = new Thread(task);
            thread.setContextClassLoader(classes);
            return thread;
        });
        try {
            List<Future<Response>> futures = new ArrayList<>();
            for (Callable<Response> racer : racers) {
                futures.add(pool.submit(() -> {
                    start.await();
                    return racer.call();
                }));
            }
            start.countDown();
            List<Response> responses = new ArrayList<>();
            for (Future<Response> future : futures) {
                responses.add(future.get(60, TimeUnit.SECONDS));
            }
            return responses;
        } finally {
            pool.shutdownNow();
        }
    }
}
